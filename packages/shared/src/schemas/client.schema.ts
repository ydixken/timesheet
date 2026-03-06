import { z } from 'zod'

export const CreateClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
})

export const UpdateClientSchema = CreateClientSchema.partial()

export type CreateClientInput = z.infer<typeof CreateClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>
