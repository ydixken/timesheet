import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { settings } from '../db/schema.js'

const ALLOWED_KEYS = ['monthlyRevenueTarget', 'defaultRoundingMin'] as const

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/settings/:key', async (request, reply) => {
    const { key } = request.params as { key: string }

    if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return reply.code(400).send({ error: `Unknown setting key: ${key}` })
    }

    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)

    return { key, value: row?.value ?? null }
  })

  fastify.put('/settings/:key', async (request, reply) => {
    const { key } = request.params as { key: string }
    const { value } = request.body as { value: string }

    if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return reply.code(400).send({ error: `Unknown setting key: ${key}` })
    }

    if (typeof value !== 'string') {
      return reply.code(400).send({ error: 'value must be a string' })
    }

    const [row] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning()

    return row
  })
}
