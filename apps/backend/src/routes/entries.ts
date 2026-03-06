import type { FastifyInstance } from 'fastify'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { CreateEntrySchema, UpdateEntrySchema } from '@timesheet/shared'
import { db } from '../db/index.js'
import { timeEntries, projects, clients } from '../db/schema.js'

export default async function entryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/entries', async (request) => {
    const { start, end, projectId, week } = request.query as {
      start?: string
      end?: string
      projectId?: string
      week?: string
    }

    const conditions = []

    if (week && /^\d{4}-W\d{2}$/.test(week)) {
      const [yearStr, weekStr] = week.split('-W')
      const year = parseInt(yearStr, 10)
      const weekNum = parseInt(weekStr, 10)
      // ISO 8601: Week 1 contains January 4th. Monday is day 1.
      const jan4 = new Date(Date.UTC(year, 0, 4))
      const dayOfWeek = jan4.getUTCDay() || 7 // Convert Sunday=0 to 7
      const monday = new Date(jan4)
      monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (weekNum - 1) * 7)
      const sunday = new Date(monday)
      sunday.setUTCDate(monday.getUTCDate() + 6)
      const weekStart = monday.toISOString().slice(0, 10)
      const weekEnd = sunday.toISOString().slice(0, 10)
      conditions.push(gte(timeEntries.date, weekStart))
      conditions.push(lte(timeEntries.date, weekEnd))
    } else {
      if (start) conditions.push(gte(timeEntries.date, start))
      if (end) conditions.push(lte(timeEntries.date, end))
    }

    if (projectId) conditions.push(eq(timeEntries.projectId, projectId))

    const rows = await db
      .select({
        entry: timeEntries,
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color,
          clientId: projects.clientId,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(timeEntries.date), desc(timeEntries.startTime))

    return rows.map(r => ({
      ...r.entry,
      project: r.project,
      client: r.client,
    }))
  })

  fastify.post('/entries', async (request, reply) => {
    const parsed = CreateEntrySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [entry] = await db.insert(timeEntries).values(parsed.data).returning()
    return reply.code(201).send(entry)
  })

  fastify.get('/entries/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)

    if (!entry) {
      return reply.code(404).send({ error: 'Entry not found' })
    }
    return entry
  })

  fastify.put('/entries/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateEntrySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [entry] = await db
      .update(timeEntries)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning()

    if (!entry) {
      return reply.code(404).send({ error: 'Entry not found' })
    }
    return entry
  })

  fastify.delete('/entries/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [entry] = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning()

    if (!entry) {
      return reply.code(404).send({ error: 'Entry not found' })
    }
    return reply.code(204).send()
  })
}
