import { z } from 'zod'

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  billable: z.boolean().default(true),
  active: z.boolean().default(true),
})

export const UpdateTaskSchema = CreateTaskSchema.omit({ projectId: true }).partial()

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
