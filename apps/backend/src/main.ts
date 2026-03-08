import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { config } from './config.js'
import { db } from './db/index.js'
import authPlugin from './plugins/auth.js'
import uploadsPlugin from './plugins/uploads.js'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import entryRoutes from './routes/entries.js'
import projectRoutes from './routes/projects.js'
import clientRoutes from './routes/clients.js'
import taskRoutes from './routes/tasks.js'
import dashboardRoutes from './routes/dashboard.js'
import reportRoutes from './routes/reports.js'
import pdfRoutes from './routes/pdf.js'
import settingsRoutes from './routes/settings.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
await migrate(db, { migrationsFolder: resolve(__dirname, './db/migrations') })

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

await app.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
})

await app.register(authPlugin)
await app.register(uploadsPlugin)

await app.register(healthRoutes, { prefix: '/api' })
await app.register(authRoutes, { prefix: '/api' })
await app.register(entryRoutes, { prefix: '/api' })
await app.register(projectRoutes, { prefix: '/api' })
await app.register(clientRoutes, { prefix: '/api' })
await app.register(taskRoutes, { prefix: '/api' })
await app.register(dashboardRoutes, { prefix: '/api' })
await app.register(reportRoutes, { prefix: '/api' })
await app.register(pdfRoutes, { prefix: '/api' })
await app.register(settingsRoutes, { prefix: '/api' })

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`)
  await app.close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
