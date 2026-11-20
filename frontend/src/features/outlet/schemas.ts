import { z } from 'zod'

/** Mirrors App\Modules\Outlet\Http\Requests\SaveOutletRequest; the server checks again. */
export const outletFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama outlet wajib diisi.').max(150, 'Nama outlet terlalu panjang (maks. 150 huruf).'),
  outlet_type_id: z.string().min(1, 'Jenis outlet wajib dipilih.'),
  region_id: z.string().min(1, 'Kabupaten/kota wajib dipilih.'),
  district: z
    .string()
    .trim()
    .min(1, 'Kecamatan wajib diisi.')
    .max(100, 'Nama kecamatan terlalu panjang (maks. 100 huruf).'),
  address: z.string().trim().max(500, 'Alamat terlalu panjang (maks. 500 huruf).'),
  whatsapp_number: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[+\d][\d\s-]{8,19}$/.test(value),
      'Nomor WA tidak dikenali. Tulis seperti 0812 3456 7890.',
    ),
  sale_mode: z.enum(['consignment', 'cash', 'credit'], {
    message: 'Cara jual wajib dipilih.',
  }),
  // Empty string = follow the visit cycle in Settings
  visit_cycle_days: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 365),
      'Isi 1–365 hari, atau kosongkan untuk mengikuti Pengaturan.',
    ),
  is_active: z.boolean(),
})

export type OutletFormInput = z.infer<typeof outletFormSchema>

/** Form values → API body (empty optional fields become null). */
export function toOutletPayload(input: OutletFormInput) {
  return {
    ...input,
    address: input.address || null,
    whatsapp_number: input.whatsapp_number || null,
    visit_cycle_days: input.visit_cycle_days === '' ? null : Number(input.visit_cycle_days),
  }
}

export const assignmentFormSchema = z.object({
  sales_user_ids: z.array(z.number()),
  reason: z.string().trim().max(255, 'Alasan terlalu panjang (maks. 255 huruf).'),
})

export type AssignmentFormInput = z.infer<typeof assignmentFormSchema>
