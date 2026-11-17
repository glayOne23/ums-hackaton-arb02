import { z } from 'zod'

export const skemaMasuk = z.object({
  login: z.string().trim().min(1, 'Isi nomor HP atau username.').max(50),
  kataSandi: z.string().min(1, 'Isi kata sandi.').max(100),
})

export type DataMasuk = z.infer<typeof skemaMasuk>
