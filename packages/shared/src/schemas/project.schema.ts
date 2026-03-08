import { z } from 'zod'

export const CreateProjectSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#39ff14'),
  hourlyRate: z.number().positive().optional().nullable(),
  estimatedHours: z.number().positive().optional().nullable(),
  billable: z.boolean().default(true),
  showAmount: z.boolean().default(true),
  roundingMin: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).optional().nullable(),
  active: z.boolean().default(true),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
