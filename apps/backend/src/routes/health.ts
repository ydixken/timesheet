import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { sql } from 'drizzle-orm'

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok' }
  })

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return { status: 'ok', db: 'ok' }
    } catch {
      reply.code(503).send({ status: 'error', db: 'unreachable' })
    }
  })
}
