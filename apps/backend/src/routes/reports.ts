import type { FastifyInstance } from 'fastify'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { timeEntries, projects, clients } from '../db/schema.js'

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /reports/summary?start=&end=&groupBy=project|client
  fastify.get('/reports/summary', async (request, reply) => {
    const { start, end, groupBy = 'project' } = request.query as {
      start?: string
      end?: string
      groupBy?: string
    }

    if (!start || !end) {
      return reply.code(400).send({ error: 'start and end query params are required' })
    }

    const dateConditions = and(
      gte(timeEntries.date, start),
      lte(timeEntries.date, end),
    )

    if (groupBy === 'client') {
      const rows = await db
        .select({
          id: clients.id,
          name: clients.name,
          totalMinutes: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)`.as('total_minutes'),
          billableMinutes: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMin} else 0 end), 0)`.as('billable_minutes'),
          entries: sql<number>`count(*)`.as('entries'),
        })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(dateConditions)
        .groupBy(clients.id, clients.name)

      const groups = rows.map(r => ({
        id: r.id,
        name: r.name,
        color: '#888888',
        totalMinutes: Number(r.totalMinutes),
        billableMinutes: Number(r.billableMinutes),
        entries: Number(r.entries),
      }))

      return {
        groups,
        totalMinutes: groups.reduce((s, g) => s + g.totalMinutes, 0),
        billableMinutes: groups.reduce((s, g) => s + g.billableMinutes, 0),
      }
    }

    // Default: group by project
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        totalMinutes: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)`.as('total_minutes'),
        billableMinutes: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMin} else 0 end), 0)`.as('billable_minutes'),
        entries: sql<number>`count(*)`.as('entries'),
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(dateConditions)
      .groupBy(projects.id, projects.name, projects.color)

    const groups = rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      totalMinutes: Number(r.totalMinutes),
      billableMinutes: Number(r.billableMinutes),
      entries: Number(r.entries),
    }))

    return {
      groups,
      totalMinutes: groups.reduce((s, g) => s + g.totalMinutes, 0),
      billableMinutes: groups.reduce((s, g) => s + g.billableMinutes, 0),
    }
  })

  // GET /reports/detailed?start=&end=&projectId=&clientId=
  fastify.get('/reports/detailed', async (request, reply) => {
    const { start, end, projectId, clientId } = request.query as {
      start?: string
      end?: string
      projectId?: string
      clientId?: string
    }

    if (!start || !end) {
      return reply.code(400).send({ error: 'start and end query params are required' })
    }

    const conditions = [
      gte(timeEntries.date, start),
      lte(timeEntries.date, end),
    ]
    if (projectId) conditions.push(eq(timeEntries.projectId, projectId))
    if (clientId) conditions.push(eq(projects.clientId, clientId))

    const rows = await db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        date: timeEntries.date,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        durationMin: timeEntries.durationMin,
        billable: timeEntries.billable,
        projectName: projects.name,
        projectColor: projects.color,
        clientName: clients.name,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.date))

    return {
      entries: rows,
      totalMinutes: rows.reduce((s, r) => s + r.durationMin, 0),
    }
  })

  // GET /reports/weekly?week=YYYY-Www
  fastify.get('/reports/weekly', async (request, reply) => {
    const { week } = request.query as { week?: string }

    if (!week || !/^\d{4}-W\d{2}$/.test(week)) {
      return reply.code(400).send({ error: 'week param required in YYYY-Www format' })
    }

    const [yearStr, weekStr] = week.split('-W')
    const year = parseInt(yearStr, 10)
    const weekNum = parseInt(weekStr, 10)

    // ISO 8601 week date to calendar date
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (weekNum - 1) * 7)
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    const weekStart = monday.toISOString().slice(0, 10)
    const weekEnd = sunday.toISOString().slice(0, 10)

    const rows = await db
      .select({
        date: timeEntries.date,
        durationMin: timeEntries.durationMin,
        projectId: projects.id,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(gte(timeEntries.date, weekStart), lte(timeEntries.date, weekEnd)))

    // Build project -> day -> minutes map
    const projectMap = new Map<string, {
      projectId: string
      projectName: string
      color: string
      days: Record<string, number>
      total: number
    }>()

    const dailyTotals: Record<string, number> = {}
    let grandTotal = 0

    for (const r of rows) {
      const pid = r.projectId
      if (!projectMap.has(pid)) {
        projectMap.set(pid, {
          projectId: pid,
          projectName: r.projectName,
          color: r.projectColor,
          days: {},
          total: 0,
        })
      }
      const proj = projectMap.get(pid)!
      proj.days[r.date] = (proj.days[r.date] ?? 0) + r.durationMin
      proj.total += r.durationMin
      dailyTotals[r.date] = (dailyTotals[r.date] ?? 0) + r.durationMin
      grandTotal += r.durationMin
    }

    return {
      week,
      projects: [...projectMap.values()],
      dailyTotals,
      grandTotal,
    }
  })

  // GET /reports/export/csv?start=&end=&projectId=
  fastify.get('/reports/export/csv', async (request, reply) => {
    const { start, end, projectId } = request.query as {
      start?: string
      end?: string
      projectId?: string
    }

    if (!start || !end) {
      return reply.code(400).send({ error: 'start and end query params are required' })
    }

    const conditions = [
      gte(timeEntries.date, start),
      lte(timeEntries.date, end),
    ]
    if (projectId) conditions.push(eq(timeEntries.projectId, projectId))

    const rows = await db
      .select({
        date: timeEntries.date,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        durationMin: timeEntries.durationMin,
        billable: timeEntries.billable,
        projectName: projects.name,
        clientName: clients.name,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.date))

    const csvRows = [
      'Date,Project,Client,Description,Start,End,Duration (h),Billable',
      ...rows.map(r => {
        const hours = (r.durationMin / 60).toFixed(2)
        return [
          r.date,
          csvEscape(r.projectName),
          csvEscape(r.clientName ?? ''),
          csvEscape(r.description),
          r.startTime ?? '',
          r.endTime ?? '',
          hours,
          r.billable ? 'Yes' : 'No',
        ].join(',')
      }),
    ]

    const filename = `timesheet_${start}_${end}.csv`
    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    return reply.send(csvRows.join('\n'))
  })
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
