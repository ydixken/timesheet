import { z } from 'zod'

export const CreateEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  description: z.string().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  durationMin: z.number().int().positive(),
  billable: z.boolean().default(true),
})

export const UpdateEntrySchema = CreateEntrySchema.partial()

export type CreateEntryInput = z.infer<typeof CreateEntrySchema>
export type UpdateEntryInput = z.infer<typeof UpdateEntrySchema>
