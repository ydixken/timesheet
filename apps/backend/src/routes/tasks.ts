import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { CreateTaskSchema, UpdateTaskSchema } from '@timesheet/shared'
import { db } from '../db/index.js'
import { tasks } from '../db/schema.js'

export default async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/tasks', async (request) => {
    const { projectId } = request.query as { projectId?: string }

    if (projectId) {
      return db.select().from(tasks).where(eq(tasks.projectId, projectId))
    }
    return db.select().from(tasks)
  })

  fastify.post('/tasks', async (request, reply) => {
    const parsed = CreateTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [task] = await db.insert(tasks).values(parsed.data).returning()
    return reply.code(201).send(task)
  })

  fastify.put('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const [task] = await db
      .update(tasks)
      .set(parsed.data)
      .where(eq(tasks.id, id))
      .returning()

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' })
    }
    return task
  })

  fastify.delete('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [task] = await db.delete(tasks).where(eq(tasks.id, id)).returning()

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' })
    }
    return reply.code(204).send()
  })
}
