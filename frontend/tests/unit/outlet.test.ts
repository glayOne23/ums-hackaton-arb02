import { describe, expect, it } from 'vitest'
import { outletFormSchema, toOutletPayload } from '@/features/outlet/schemas'
import { whatsappLink } from '@/lib/whatsapp'

const valid = {
  name: 'Apotek Sumber Waras',
  outlet_type_id: '01JTYPE',
  region_id: '01JREGION',
  district: 'Laweyan',
  address: '',
  whatsapp_number: '',
  sale_mode: 'consignment' as const,
  visit_cycle_days: '',
  is_active: true,
}

describe('outlet form', () => {
  it('explains every missing required field', () => {
    const result = outletFormSchema.safeParse({
      ...valid,
      name: ' ',
      outlet_type_id: '',
      region_id: '',
      district: '',
    })
    const messages = result.error?.issues.map((issue) => issue.message)

    expect(messages).toEqual(
      expect.arrayContaining([
        'Nama outlet wajib diisi.',
        'Jenis outlet wajib dipilih.',
        'Kabupaten/kota wajib dipilih.',
        'Kecamatan wajib diisi.',
      ]),
    )
  })

  it('accepts common ways of writing a WhatsApp number', () => {
    for (const number of ['081234567890', '+62 812-3456-7890', '0812 3456 7890']) {
      expect(outletFormSchema.safeParse({ ...valid, whatsapp_number: number }).success).toBe(true)
    }
    expect(outletFormSchema.safeParse({ ...valid, whatsapp_number: 'abc' }).success).toBe(false)
  })

  it('only accepts a visit cycle of 1–365 days, or empty', () => {
    expect(outletFormSchema.safeParse({ ...valid, visit_cycle_days: '30' }).success).toBe(true)
    expect(outletFormSchema.safeParse({ ...valid, visit_cycle_days: '0' }).success).toBe(false)
    expect(outletFormSchema.safeParse({ ...valid, visit_cycle_days: '2x' }).success).toBe(false)
  })

  it('sends empty optional fields as null and the cycle as a number', () => {
    expect(toOutletPayload({ ...valid, visit_cycle_days: '45' })).toMatchObject({
      address: null,
      whatsapp_number: null,
      visit_cycle_days: 45,
    })
    expect(toOutletPayload(valid).visit_cycle_days).toBeNull()
  })
})

describe('WhatsApp link', () => {
  it('turns the local 0 prefix into 62', () => {
    expect(whatsappLink('081234567890')).toBe('https://wa.me/6281234567890')
    expect(whatsappLink('0812-3456-7890')).toBe('https://wa.me/6281234567890')
  })
})
