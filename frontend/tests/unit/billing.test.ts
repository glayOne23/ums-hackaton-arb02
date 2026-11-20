import { describe, expect, it } from 'vitest'
import { collectionText, groupByOutlet } from '@/features/billing/collection'
import type { Invoice } from '@/features/billing/types'

const outlet = (id: string, name: string) => ({
  id,
  code: id,
  name,
  address: 'Jl. Contoh 1',
  district: 'Laweyan',
  region: 'Kota Surakarta',
  whatsapp_number: null,
})

const invoice = (number: string, outletRef: ReturnType<typeof outlet>, owed: number, age: number): Invoice => ({
  id: number,
  number,
  type: 'sales',
  transaction_id: null,
  outlet: outletRef,
  sales: { id: 1, name: 'Endri' },
  invoice_date: '2026-10-10',
  due_date: '2026-10-10',
  amount: owed,
  paid_amount: 0,
  owed,
  age_days: age,
  overdue: true,
  status: { value: 'unpaid', label: 'Belum dibayar' },
})

describe('collection list (TG-01)', () => {
  const sari = outlet('a', 'Ap Sari Farma')
  const balapan = outlet('b', 'Ap Balapan')
  const groups = groupByOutlet([
    invoice('TG-1', sari, 86000.1, 12),
    invoice('TG-2', balapan, 50000, 42),
    invoice('TG-3', sari, 0.2, 5),
  ])

  it('groups per outlet, the longest waiting first, adding money without drift', () => {
    expect(groups.map((g) => g.outlet.name)).toEqual(['Ap Balapan', 'Ap Sari Farma'])
    expect(groups[1].owed).toBe(86000.3)
    expect(groups[1].oldestDays).toBe(12)
  })

  it('writes a WhatsApp text with totals and every invoice', () => {
    const text = collectionText(groups, 'Daftar tagihan')
    expect(text).toContain('2 outlet')
    expect(text).toContain('*Ap Balapan*')
    expect(text).toContain('TG-3')
  })
})
