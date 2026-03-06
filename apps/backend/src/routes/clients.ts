import type { FastifyInstance } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { CreateClientSchema, UpdateClientSchema } from '@timesheet/shared'
import { db } from '../db/index.js'
import { clients, projects, timeEntries } from '../db/schema.js'
import { config } from '../config.js'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'

export default async function clientRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/clients', async () => {
    const rows = await db
      .select({
        client: clients,
        projectCount: sql<number>`count(distinct ${projects.id})::int`,
        totalMinutes: sql<number>`coalesce(sum(${timeEntries.durationMin}), 0)::int`,
      })
      .from(clients)
      .leftJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.active, true)))
      .leftJoin(timeEntries, eq(timeEntries.projectId, projects.id))
      .groupBy(clients.id)

    return rows.map((r) => ({
      ...r.client,
      projectCount: r.projectCount,
      totalMinutes: r.totalMinutes,
    }))
  })

  fastify.post('/clients', async (request, reply) => {
    const parsed = CreateClientSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [client] = await db.insert(clients).values(parsed.data).returning()
    return reply.code(201).send(client)
  })

  fastify.get('/clients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)

    if (!client) {
      return reply.code(404).send({ error: 'Client not found' })
    }
    return client
  })

  fastify.put('/clients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateClientSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [client] = await db
      .update(clients)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()

    if (!client) {
      return reply.code(404).send({ error: 'Client not found' })
    }
    return client
  })

  fastify.delete('/clients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [client] = await db.delete(clients).where(eq(clients.id, id)).returning()

    if (!client) {
      return reply.code(404).send({ error: 'Client not found' })
    }
    return reply.code(204).send()
  })

  fastify.post('/clients/:id/logo', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
    if (!client) return reply.code(404).send({ error: 'Client not found' })

    const file = await request.file()
    if (!file) return reply.code(400).send({ error: 'No file uploaded' })
    if (!file.mimetype.startsWith('image/')) {
      return reply.code(400).send({ error: 'File must be an image' })
    }

    const ext = file.filename.split('.').pop() || 'png'
    const filename = `client-${id}-${Date.now()}.${ext}`
    const filepath = path.join(config.UPLOADS_DIR, filename)

    if (client.logoPath) {
      const oldPath = path.join(config.UPLOADS_DIR, client.logoPath)
      await unlink(oldPath).catch(() => {})
    }

    const writeStream = createWriteStream(filepath)
    await pipeline(file.file, writeStream)

    const [updated] = await db
      .update(clients)
      .set({ logoPath: filename, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()

    return updated
  })
}
