import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  ADMIN_USER: z.string().default('admin'),
  ADMIN_PASS: z.string().default('changeme'),
  UPLOADS_DIR: z.string().default('./uploads'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUPPETEER_NO_SANDBOX: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
})

export type EnvConfig = z.infer<typeof envSchema>

export const config = envSchema.parse(process.env)
export { envSchema }
