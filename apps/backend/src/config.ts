import { z } from 'zod'

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    AUTH_MODE: z.enum(['oidc', 'none']).default('none'),
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_AUDIENCE: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(1).optional(),
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
  .superRefine((data, ctx) => {
    if (data.AUTH_MODE === 'oidc') {
      if (!data.OIDC_ISSUER_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'OIDC_ISSUER_URL is required when AUTH_MODE=oidc',
          path: ['OIDC_ISSUER_URL'],
        })
      }
      if (!data.OIDC_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'OIDC_CLIENT_ID is required when AUTH_MODE=oidc',
          path: ['OIDC_CLIENT_ID'],
        })
      }
    }
  })

export type EnvConfig = z.infer<typeof envSchema>

export const config = envSchema.parse(process.env)
export { envSchema }
