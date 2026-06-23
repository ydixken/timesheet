import type { FastifyInstance } from 'fastify'
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm'
import type { DashboardResponse } from '@timesheet/shared'
import { db } from '../db/index.js'
import { timeEntries, projects, clients, settings } from '../db/schema.js'
import {
  fmtDate,
  pad,
  round2,
  getDateRange,
  countWorkingDays,
  countWorkingDaysBetween,
  getForecastMode,
  monthsBetweenInclusive,
  weekStartStr,
  pickGranularity,
  buildForecast,
  RANGE_LABELS,
} from './dashboard.helpers.js'

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/dashboard', async (request) => {
    const { range = 'this_month', start, end } = request.query as {
      range?: string
      start?: string
      end?: string
    }

    const dr = getDateRange(range, start, end)
    const dateConditions = and(
      gte(timeEntries.date, dr.start),
      lte(timeEntries.date, dr.end),
    )

    // Main query: all entries in range joined with project + client
    const rows = await db
      .select({
        entryId: timeEntries.id,
        date: timeEntries.date,
        durationMin: timeEntries.durationMin,
        description: timeEntries.description,
        billable: timeEntries.billable,
        projectId: projects.id,
        projectName: projects.name,
        projectColor: projects.color,
        hourlyRate: projects.hourlyRate,
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(dateConditions)

    // Settings: monthly target + chart granularity threshold (default 2 months)
    const settingRows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, ['monthlyRevenueTarget', 'chartWeekThresholdMonths']))
    const settingMap = new Map(settingRows.map((r) => [r.key, r.value]))

    const rawTarget = settingMap.get('monthlyRevenueTarget')
    const monthlyTarget =
      rawTarget != null && rawTarget !== '' && !Number.isNaN(parseFloat(rawTarget))
        ? parseFloat(rawTarget)
        : null
    const parsedThreshold = parseInt(settingMap.get('chartWeekThresholdMonths') ?? '2', 10)
    const chartWeekThresholdMonths = Number.isNaN(parsedThreshold) ? 2 : Math.max(1, parsedThreshold)

    const monthsInPeriod = monthsBetweenInclusive(dr.start, dr.end)
    const granularity = pickGranularity(monthsInPeriod, chartWeekThresholdMonths)

    // totalMinutes
    const totalMinutes = rows.reduce((s, r) => s + r.durationMin, 0)

    // topProject
    const projectMinutes = new Map<string, { name: string; minutes: number }>()
    for (const r of rows) {
      if (!r.projectId) continue
      const cur = projectMinutes.get(r.projectId) ?? { name: r.projectName ?? '', minutes: 0 }
      cur.minutes += r.durationMin
      projectMinutes.set(r.projectId, cur)
    }
    const topProject = [...projectMinutes.values()].sort((a, b) => b.minutes - a.minutes)[0] ?? null

    // topClient
    const clientMinutes = new Map<string, { name: string; minutes: number }>()
    for (const r of rows) {
      if (!r.clientId) continue
      const cur = clientMinutes.get(r.clientId) ?? { name: r.clientName ?? '', minutes: 0 }
      cur.minutes += r.durationMin
      clientMinutes.set(r.clientId, cur)
    }
    const topClient = [...clientMinutes.values()].sort((a, b) => b.minutes - a.minutes)[0] ?? null

    // Chart series — bucketed by day or by ISO week depending on the range span
    const bucketMap = new Map<string, Map<string, { projectId: string; projectName: string; color: string; minutes: number; hourlyRate: number }>>()
    for (const r of rows) {
      const bucketKey = granularity === 'week' ? weekStartStr(r.date) : r.date
      if (!bucketMap.has(bucketKey)) bucketMap.set(bucketKey, new Map())
      const bucketProjects = bucketMap.get(bucketKey)!
      const pid = r.projectId ?? 'unknown'
      const cur = bucketProjects.get(pid) ?? {
        projectId: pid,
        projectName: r.projectName ?? 'Unknown',
        color: r.projectColor ?? '#888888',
        minutes: 0,
        hourlyRate: r.hourlyRate ? parseFloat(r.hourlyRate) : 0,
      }
      cur.minutes += r.durationMin
      bucketProjects.set(pid, cur)
    }
    const series = [...bucketMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pMap]) => ({
        date,
        totalMinutes: [...pMap.values()].reduce((s, p) => s + p.minutes, 0),
        projects: [...pMap.values()],
      }))

    // projectSplit
    const projectSplit = [...projectMinutes.entries()]
      .map(([projectId, { name, minutes }]) => {
        const row = rows.find((r) => r.projectId === projectId)
        return {
          projectId,
          projectName: name,
          color: row?.projectColor ?? '#888888',
          totalMinutes: minutes,
          percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 10000) / 100 : 0,
        }
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes)

    // topDescriptions
    const descMinutes = new Map<string, number>()
    for (const r of rows) {
      if (!r.description) continue
      descMinutes.set(r.description, (descMinutes.get(r.description) ?? 0) + r.durationMin)
    }
    const topDescriptions = [...descMinutes.entries()]
      .map(([description, minutes]) => ({ description, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5)

    // Revenue calculations (always full month / YTD, not affected by range filter)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const monthStart = `${currentYear}-${pad(currentMonth)}-01`
    const yearStart = `${currentYear}-01-01`
    const todayStr = fmtDate(now)

    // Revenue per project for current month
    const monthRevRows = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        hourlyRate: projects.hourlyRate,
        estimatedHours: projects.estimatedHours,
        totalMin: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)`.as('total_min'),
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(
        gte(timeEntries.date, monthStart),
        lte(timeEntries.date, todayStr),
        eq(timeEntries.billable, true),
      ))
      .groupBy(projects.id, projects.name, projects.hourlyRate, projects.estimatedHours)

    const earnedThisMonth = monthRevRows.reduce((s, r) => {
      const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
      return s + (Number(r.totalMin) / 60) * rate
    }, 0)

    // Revenue per project YTD
    const ytdRevRows = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        hourlyRate: projects.hourlyRate,
        estimatedHours: projects.estimatedHours,
        totalMin: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)`.as('total_min'),
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(
        gte(timeEntries.date, yearStart),
        lte(timeEntries.date, todayStr),
        eq(timeEntries.billable, true),
      ))
      .groupBy(projects.id, projects.name, projects.hourlyRate, projects.estimatedHours)

    const earnedYTD = ytdRevRows.reduce((s, r) => {
      const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
      return s + (Number(r.totalMin) / 60) * rate
    }, 0)

    const revenueProjects = ytdRevRows.map((r) => {
      const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
      const trackedHours = Number(r.totalMin) / 60
      const budgetHours = r.estimatedHours ? parseFloat(r.estimatedHours) : null
      return {
        projectId: r.projectId,
        projectName: r.projectName,
        earned: round2(trackedHours * rate),
        budgetHours,
        trackedHours: round2(trackedHours),
        remainingHours: budgetHours !== null ? round2(budgetHours - trackedHours) : null,
      }
    })

    // Revenue card — adapts to the selected range: month forecast, year forecast, or period summary
    const mode = getForecastMode(range)

    const periodRevenue = rows
      .filter((r) => r.billable)
      .reduce((s, r) => {
        const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
        return s + (r.durationMin / 60) * rate
      }, 0)

    const drStart = new Date(dr.start + 'T12:00:00')
    const drEnd = new Date(dr.end + 'T12:00:00')
    const yearStartD = new Date(`${currentYear}-01-01T12:00:00`)
    const yearEndD = new Date(`${currentYear}-12-31T12:00:00`)
    const todayD = new Date(todayStr + 'T12:00:00')

    const forecast = buildForecast({
      mode,
      periodLabel: RANGE_LABELS[range] ?? 'This Month',
      monthlyTarget,
      monthsInPeriod,
      periodRevenue,
      periodWorkingDays: countWorkingDaysBetween(drStart, drEnd),
      earnedThisMonth,
      earnedYTD,
      monthWorkingDaysTotal: countWorkingDays(currentYear, currentMonth),
      monthWorkingDaysElapsed: countWorkingDays(currentYear, currentMonth, now.getDate()),
      yearWorkingDaysTotal: countWorkingDaysBetween(yearStartD, yearEndD),
      yearWorkingDaysElapsed: countWorkingDaysBetween(yearStartD, todayD),
    })

    const response: DashboardResponse = {
      totalMinutes,
      topProject,
      topClient,
      series,
      granularity,
      chartWeekThresholdMonths,
      projectSplit,
      topDescriptions,
      revenue: {
        earnedThisMonth: round2(earnedThisMonth),
        earnedYTD: round2(earnedYTD),
        projects: revenueProjects,
        forecast,
      },
    }

    return response
  })
}
