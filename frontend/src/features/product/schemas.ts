import { z } from 'zod'

/** "60.000" or "60000" or "62500,5" → 60000 / 62500.5; empty → NaN */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[Rp\s.]/gi, '').replace(',', '.')
  return cleaned === '' ? Number.NaN : Number(cleaned)
}

/** Mirrors App\Modules\Product\Http\Requests\SaveProductRequest; the server checks again. */
export const productFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Kode produk wajib diisi, misalnya MDK02.')
    .max(30, 'Kode terlalu panjang (maks. 30 huruf).')
    .regex(/^[A-Za-z0-9._-]+$/, 'Kode hanya boleh huruf, angka, titik, garis bawah, atau tanda minus, tanpa spasi.'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi.').max(150, 'Nama produk terlalu panjang (maks. 150 huruf).'),
  category_id: z.string().min(1, 'Kategori wajib dipilih.'),
  bpom_number: z
    .string()
    .trim()
    .min(1, 'Nomor BPOM wajib diisi.')
    .max(50, 'Nomor BPOM terlalu panjang (maks. 50 huruf).'),
  unit: z.string().trim().min(1, 'Satuan wajib diisi, misalnya pcs atau botol.').max(20),
  selling_price: z
    .string()
    .trim()
    .min(1, 'Harga jual wajib diisi.')
    .refine((v) => Number.isFinite(parseRupiah(v)), 'Harga jual harus berupa angka, misalnya 60000.')
    .refine((v) => parseRupiah(v) >= 0, 'Harga jual tidak boleh minus.'),
  min_stock_qty: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), 'Stok minimum harus berupa angka bulat, atau kosongkan.'),
  is_active: z.boolean(),
  /** One alias per line */
  aliases: z.string(),
})

export type ProductFormInput = z.infer<typeof productFormSchema>

export function toProductPayload(input: ProductFormInput) {
  return {
    ...input,
    code: input.code.toUpperCase(),
    selling_price: parseRupiah(input.selling_price),
    min_stock_qty: input.min_stock_qty === '' ? 0 : Number(input.min_stock_qty),
    aliases: input.aliases
      .split('\n')
      .map((alias) => alias.trim())
      .filter(Boolean),
  }
}

/** Which combination the discount is for (≤ 5 options → buttons, UI guide §7.5) */
export const DISCOUNT_SCOPES = [
  { value: 'type', label: 'Jenis outlet' },
  { value: 'type_product', label: 'Jenis outlet + produk' },
  { value: 'product', label: 'Produk' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'outlet_product', label: 'Outlet + produk' },
] as const

export type DiscountScope = (typeof DISCOUNT_SCOPES)[number]['value']

export const discountFormSchema = z
  .object({
    scope: z.enum(['type', 'type_product', 'product', 'outlet', 'outlet_product']),
    outlet_type_id: z.string(),
    product_id: z.string(),
    outlet_id: z.string(),
    discount_percent: z
      .string()
      .trim()
      .min(1, 'Besar potongan wajib diisi.')
      .refine((v) => /^\d{1,3}([.,]\d{1,2})?$/.test(v), 'Tulis seperti 16 atau 12,5.')
      .refine((v) => {
        const n = Number(v.replace(',', '.'))
        return n > 0 && n <= 100
      }, 'Potongan harus lebih dari 0% dan paling besar 100%.'),
    valid_from: z.string().min(1, 'Tanggal mulai berlaku wajib diisi.'),
  })
  .superRefine((value, ctx) => {
    const needs = {
      outlet_type_id: value.scope === 'type' || value.scope === 'type_product',
      product_id: value.scope.endsWith('product'),
      outlet_id: value.scope.startsWith('outlet'),
    }
    const messages = {
      outlet_type_id: 'Jenis outlet wajib dipilih.',
      product_id: 'Produk wajib dipilih.',
      outlet_id: 'Outlet wajib dipilih.',
    }
    for (const field of Object.keys(needs) as (keyof typeof needs)[]) {
      if (needs[field] && !value[field]) ctx.addIssue({ code: 'custom', path: [field], message: messages[field] })
    }
  })

export type DiscountFormInput = z.infer<typeof discountFormSchema>

/** Only the fields of the chosen scope are sent */
export function toDiscountPayload(input: DiscountFormInput) {
  return {
    outlet_type_id: input.scope === 'type' || input.scope === 'type_product' ? input.outlet_type_id : null,
    product_id: input.scope.endsWith('product') ? input.product_id : null,
    outlet_id: input.scope.startsWith('outlet') ? input.outlet_id : null,
    discount_percent: Number(input.discount_percent.replace(',', '.')),
    valid_from: input.valid_from,
  }
}
