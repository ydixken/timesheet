import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { LoginSchema } from '@timesheet/shared'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { config } from '../config.js'

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() })
    }

    const { username, password } = parsed.data
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign(
      { sub: user.id, username: user.username },
      { expiresIn: `${config.JWT_EXPIRY_HOURS}h` },
    )

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: config.JWT_EXPIRY_HOURS * 3600,
      })
      .send({ user: { id: user.id, username: user.username, createdAt: user.createdAt } })
  })

  fastify.post('/auth/logout', async (_request, reply) => {
    reply
      .clearCookie('token', { path: '/' })
      .send({ success: true })
  })

  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const [user] = await db
      .select({ id: users.id, username: users.username, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1)

    if (!user) {
      return { error: 'User not found' }
    }

    return { user }
  })
}
