import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/auth/config', async () => {
    if (config.AUTH_MODE === 'oidc') {
      return {
        mode: config.AUTH_MODE,
        oidc: {
          issuerUrl: config.OIDC_ISSUER_URL,
          clientId: config.OIDC_CLIENT_ID,
        },
      }
    }
    return { mode: config.AUTH_MODE }
  })

  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
    return { user: request.user }
  })
}
