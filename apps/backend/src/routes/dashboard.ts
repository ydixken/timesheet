import type { FastifyInstance } from 'fastify'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { timeEntries, projects, clients, settings } from '../db/schema.js'

function getDateRange(range: string, start?: string, end?: string): { start: string; end: string } {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = today.getMonth()
  const dd = today.getDate()

  switch (range) {
    case 'this_week': {
      const day = today.getDay() || 7 // Sunday=0 -> 7
      const monday = new Date(yyyy, mm, dd - day + 1)
      return {
        start: fmtDate(monday),
        end: fmtDate(today),
      }
    }
    case 'last_week': {
      const day = today.getDay() || 7
      const thisMonday = new Date(yyyy, mm, dd - day + 1)
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)
      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      return { start: fmtDate(lastMonday), end: fmtDate(lastSunday) }
    }
    case 'this_month':
      return {
        start: `${yyyy}-${pad(mm + 1)}-01`,
        end: fmtDate(today),
      }
    case 'last_month': {
      const first = new Date(yyyy, mm - 1, 1)
      const last = new Date(yyyy, mm, 0)
      return { start: fmtDate(first), end: fmtDate(last) }
    }
    case 'today':
      return { start: fmtDate(today), end: fmtDate(today) }
    case 'last_3_months': {
      const first3 = new Date(yyyy, mm - 2, 1)
      return { start: fmtDate(first3), end: fmtDate(today) }
    }
    case 'last_6_months': {
      const first6 = new Date(yyyy, mm - 5, 1)
      return { start: fmtDate(first6), end: fmtDate(today) }
    }
    case 'custom':
      if (start && end) return { start, end }
      return { start: fmtDate(today), end: fmtDate(today) }
    default:
      return { start: `${yyyy}-${pad(mm + 1)}-01`, end: fmtDate(today) }
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function countWorkingDays(year: number, month: number, upToDay?: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  const limit = upToDay !== undefined ? Math.min(upToDay, daysInMonth) : daysInMonth
  let count = 0
  for (let d = 1; d <= limit; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow >= 1 && dow <= 5) count++
  }
  return count
}

function countWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

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

    // dailySeries
    const dailyMap = new Map<string, Map<string, { projectId: string; projectName: string; color: string; minutes: number; hourlyRate: number }>>()
    for (const r of rows) {
      if (!dailyMap.has(r.date)) dailyMap.set(r.date, new Map())
      const dayProjects = dailyMap.get(r.date)!
      const pid = r.projectId ?? 'unknown'
      const cur = dayProjects.get(pid) ?? {
        projectId: pid,
        projectName: r.projectName ?? 'Unknown',
        color: r.projectColor ?? '#888888',
        minutes: 0,
        hourlyRate: r.hourlyRate ? parseFloat(r.hourlyRate) : 0,
      }
      cur.minutes += r.durationMin
      dayProjects.set(pid, cur)
    }
    const dailySeries = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pMap]) => ({
        date,
        totalMinutes: [...pMap.values()].reduce((s, p) => s + p.minutes, 0),
        projects: [...pMap.values()],
      }))

    // projectSplit
    const projectSplit = [...projectMinutes.entries()]
      .map(([projectId, { name, minutes }]) => {
        const row = rows.find(r => r.projectId === projectId)
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

    const revenueProjects = ytdRevRows.map(r => {
      const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
      const trackedHours = Number(r.totalMin) / 60
      const budgetHours = r.estimatedHours ? parseFloat(r.estimatedHours) : null
      return {
        projectId: r.projectId,
        projectName: r.projectName,
        earned: Math.round(trackedHours * rate * 100) / 100,
        budgetHours,
        trackedHours: Math.round(trackedHours * 100) / 100,
        remainingHours: budgetHours !== null ? Math.round((budgetHours - trackedHours) * 100) / 100 : null,
      }
    })

    // Revenue forecast — adapts to the selected range
    const isPastPeriod = range === 'last_week' || range === 'last_month' || range === 'custom'

    // Compute revenue for the selected period (from the already-fetched rows)
    const periodRevenue = rows
      .filter((r) => r.billable)
      .reduce((s, r) => {
        const rate = r.hourlyRate ? parseFloat(r.hourlyRate) : 0
        return s + (r.durationMin / 60) * rate
      }, 0)

    // Working days for the selected period
    const drStart = new Date(dr.start + 'T12:00:00')
    const drEnd = new Date(dr.end + 'T12:00:00')
    const periodWorkingDays = countWorkingDaysBetween(drStart, drEnd)

    let workingDaysTotal: number
    let workingDaysElapsed: number
    let avgDailyRevenue: number
    let forecastedMonthEnd: number
    let periodLabel: string

    if (isPastPeriod) {
      // Past period: show actuals, no projection
      workingDaysTotal = periodWorkingDays
      workingDaysElapsed = periodWorkingDays
      avgDailyRevenue = periodWorkingDays > 0 ? periodRevenue / periodWorkingDays : 0
      forecastedMonthEnd = periodRevenue // actual total, no forecast
      periodLabel = range === 'last_week' ? 'Last Week' : range === 'last_month' ? 'Last Month' : 'Custom Range'
    } else {
      // Current period: project forward
      workingDaysTotal = countWorkingDays(currentYear, currentMonth)
      workingDaysElapsed = countWorkingDays(currentYear, currentMonth, now.getDate())
      avgDailyRevenue = workingDaysElapsed > 0 ? earnedThisMonth / workingDaysElapsed : 0
      forecastedMonthEnd = Math.round(avgDailyRevenue * workingDaysTotal * 100) / 100
      const currentLabels: Record<string, string> = {
        today: 'Today',
        this_week: 'This Week',
        this_month: 'This Month',
        last_3_months: 'Last 3 Months',
        last_6_months: 'Last 6 Months',
      }
      periodLabel = currentLabels[range] ?? 'This Month'
    }

    const [targetRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'monthlyRevenueTarget'))
      .limit(1)

    const monthlyTarget = targetRow ? parseFloat(targetRow.value) : null
    const targetProgress = monthlyTarget !== null && monthlyTarget > 0
      ? Math.round((earnedThisMonth / monthlyTarget) * 100 * 100) / 100
      : null

    return {
      totalMinutes,
      topProject,
      topClient,
      dailySeries,
      projectSplit,
      topDescriptions,
      revenue: {
        earnedThisMonth: Math.round(earnedThisMonth * 100) / 100,
        earnedYTD: Math.round(earnedYTD * 100) / 100,
        projects: revenueProjects,
        forecast: {
          workingDaysTotal,
          workingDaysElapsed,
          avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
          forecastedMonthEnd: Math.round(forecastedMonthEnd * 100) / 100,
          monthlyTarget,
          targetProgress,
          periodRevenue: Math.round(periodRevenue * 100) / 100,
          periodLabel,
          isPastPeriod,
        },
      },
    }
  })
}
