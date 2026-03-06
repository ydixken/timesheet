import type { FastifyInstance } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { CreateProjectSchema, UpdateProjectSchema } from '@timesheet/shared'
import { db } from '../db/index.js'
import { projects, timeEntries, clients } from '../db/schema.js'

export default async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/projects', async (request) => {
    const { active } = request.query as { active?: string }

    const query = db
      .select({
        project: projects,
        clientName: clients.name,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))

    if (active !== undefined) {
      const isActive = active === 'true'
      const rows = await query.where(eq(projects.active, isActive))
      return rows.map((r) => ({ ...r.project, clientName: r.clientName }))
    }

    const rows = await query
    return rows.map((r) => ({ ...r.project, clientName: r.clientName }))
  })

  fastify.post('/projects', async (request, reply) => {
    const parsed = CreateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const values = {
      ...parsed.data,
      hourlyRate: parsed.data.hourlyRate?.toString() ?? null,
      estimatedHours: parsed.data.estimatedHours?.toString() ?? null,
    }

    const [project] = await db.insert(projects).values(values).returning()
    return reply.code(201).send(project)
  })

  fastify.get('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' })
    }
    return project
  })

  fastify.put('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const values: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }
    if (parsed.data.hourlyRate !== undefined) {
      values.hourlyRate = parsed.data.hourlyRate?.toString() ?? null
    }
    if (parsed.data.estimatedHours !== undefined) {
      values.estimatedHours = parsed.data.estimatedHours?.toString() ?? null
    }

    const [project] = await db
      .update(projects)
      .set(values)
      .where(eq(projects.id, id))
      .returning()

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' })
    }
    return project
  })

  fastify.delete('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [project] = await db.delete(projects).where(eq(projects.id, id)).returning()

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' })
    }
    return reply.code(204).send()
  })

  fastify.get('/projects/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' })
    }

    const [stats] = await db
      .select({
        totalEntries: sql<number>`count(*)::int`,
        totalMinutes: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)::int`,
        billableMinutes: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMin} else 0 end), 0)::int`,
      })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, id))

    return {
      ...project,
      totalEntries: stats.totalEntries,
      totalMinutes: stats.totalMinutes,
      billableMinutes: stats.billableMinutes,
    }
  })
}
