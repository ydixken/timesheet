import fp from 'fastify-plugin'
import fastifyCookie from '@fastify/cookie'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { config } from '../config.js'

interface UserInfo {
  sub: string
  username: string
  email: string
  groups: string[]
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user: UserInfo
  }
}

const defaultUser: UserInfo = {
  sub: 'dev',
  username: 'developer',
  email: 'dev@local',
  groups: [],
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyCookie)

  fastify.decorateRequest('user', {
    getter() {
      return defaultUser
    },
  })

  if (config.AUTH_MODE === 'none') {
    fastify.decorate('authenticate', async (_request: FastifyRequest, _reply: FastifyReply) => {
      // no-op in none mode — user is already set to defaultUser via decorator getter
    })
  } else {
    // OIDC mode
    const issuerUrl = config.OIDC_ISSUER_URL!
    const jwksUrl = new URL(
      `${issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/certs`,
    )
    const jwks = createRemoteJWKSet(jwksUrl)

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing or invalid Authorization header' })
        return
      }

      const token = authHeader.slice(7)
      try {
        const verifyOptions: { issuer: string; audience?: string } = {
          issuer: issuerUrl,
        }
        if (config.OIDC_AUDIENCE) {
          verifyOptions.audience = config.OIDC_AUDIENCE
        }
        const { payload } = await jwtVerify(token, jwks, verifyOptions)

        request.user = {
          sub: payload.sub ?? '',
          username: (payload as Record<string, unknown>).preferred_username as string ?? '',
          email: (payload as Record<string, unknown>).email as string ?? '',
          groups: ((payload as Record<string, unknown>).groups as string[]) ?? [],
        }
      } catch (err) {
        request.log.error({ err }, 'OIDC token verification failed')
        reply.code(401).send({ error: 'Invalid or expired token' })
      }
    })
  }
})
