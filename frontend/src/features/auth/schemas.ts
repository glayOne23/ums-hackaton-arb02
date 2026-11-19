import { z } from 'zod'

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Isi nomor HP atau username.').max(50),
  password: z.string().min(1, 'Isi kata sandi.').max(100),
})

export type LoginInput = z.infer<typeof loginSchema>
