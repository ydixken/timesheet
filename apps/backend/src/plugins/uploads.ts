import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { config } from '../config.js'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export default fp(async (fastify) => {
  await mkdir(config.UPLOADS_DIR, { recursive: true })

  await fastify.register(multipart, {
    limits: {
      fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    },
  })

  await fastify.register(fastifyStatic, {
    root: path.resolve(config.UPLOADS_DIR),
    prefix: '/api/uploads/',
    decorateReply: false,
  })
})
