import { describe, expect, it } from 'vitest'
import {
  discountFormSchema,
  parseRupiah,
  productFormSchema,
  toDiscountPayload,
  toProductPayload,
} from '@/features/product/schemas'
import { formatDiscountPercent } from '@/lib/format'

const product = {
  code: 'mdk02',
  name: 'Madu Daun Kelor',
  description: '  ',
  category_id: '01JCAT',
  bpom_number: 'TR-CONTOH-017',
  unit: 'botol',
  selling_price: '60.000',
  min_stock_qty: '',
  is_active: true,
  aliases: ' MADU KELOR \n\nMDK 250 ',
}

describe('product form', () => {
  it('reads a price written with thousand dots or "Rp"', () => {
    expect(parseRupiah('60.000')).toBe(60000)
    expect(parseRupiah('Rp 1.250.000')).toBe(1250000)
    expect(parseRupiah('62500,5')).toBe(62500.5)
    expect(Number.isNaN(parseRupiah(''))).toBe(true)
  })

  it('sends an upper-case code, a number price, 0 as empty minimum, and one alias per line', () => {
    expect(toProductPayload(product)).toMatchObject({
      code: 'MDK02',
      selling_price: 60000,
      min_stock_qty: 0,
      aliases: ['MADU KELOR', 'MDK 250'],
      // An empty description is sent as null, so the server clears it
      description: null,
    })
  })

  it('rejects a code with spaces and a negative price', () => {
    const messages = productFormSchema
      .safeParse({ ...product, code: 'MD 01', selling_price: '-5' })
      .error?.issues.map((issue) => issue.message)

    expect(messages).toContain('Kode hanya boleh huruf, angka, titik, garis bawah, atau tanda minus, tanpa spasi.')
    expect(messages).toContain('Harga jual tidak boleh minus.')
  })
})

describe('discount form', () => {
  const base = { outlet_type_id: '', product_id: '', outlet_id: '', discount_percent: '16', valid_from: '2026-11-01' }

  it('asks for exactly the fields of the chosen scope', () => {
    const missing = (scope: string) =>
      discountFormSchema.safeParse({ ...base, scope }).error?.issues.map((issue) => issue.path[0])

    expect(missing('type')).toEqual(['outlet_type_id'])
    expect(missing('type_product')).toEqual(['outlet_type_id', 'product_id'])
    expect(missing('outlet_product')).toEqual(['product_id', 'outlet_id'])
  })

  it('accepts 12,5 and rejects 0 or more than 100', () => {
    const ok = (percent: string) =>
      discountFormSchema.safeParse({ ...base, scope: 'type', outlet_type_id: 'x', discount_percent: percent }).success

    expect(ok('12,5')).toBe(true)
    expect(ok('0')).toBe(false)
    expect(ok('120')).toBe(false)
  })

  it('only sends the fields of the chosen scope', () => {
    expect(
      toDiscountPayload({
        ...base,
        scope: 'outlet',
        outlet_type_id: 'leftover',
        outlet_id: 'o1',
        discount_percent: '12,5',
      }),
    ).toEqual({
      outlet_type_id: null,
      product_id: null,
      outlet_id: 'o1',
      discount_percent: 12.5,
      valid_from: '2026-11-01',
    })
  })

  it('shows discounts exactly', () => {
    expect(formatDiscountPercent(16)).toBe('16%')
    expect(formatDiscountPercent(12.5)).toBe('12,5%')
    expect(formatDiscountPercent(12.75)).toBe('12,75%')
  })
})
