import { describe, expect, it } from 'vitest'
import { settleInvoices } from '@/features/sales/invoices'
import type { OpenInvoice } from '@/features/sales/types'

const open = (number: string, owed: number): OpenInvoice => ({
  number,
  invoice_date: '2026-11-01',
  due_date: '2026-11-15',
  owed,
  overdue: true,
})

describe('settleInvoices (tagih tanpa barang laku)', () => {
  it('settles the oldest nota first and drops the paid ones', () => {
    const left = settleInvoices([open('A', 100_000), open('B', 50_000)], 0, 120_000, '2026-11-28T09:00:00Z')
    expect(left).toEqual([{ ...open('B', 30_000) }])
  })

  it('adds this visit as the newest nota, paid after the old ones', () => {
    const left = settleInvoices([open('A', 40_000)], 25_000, 50_000, '2026-11-28T09:00:00Z')
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ pending: true, owed: 15_000, invoice_date: '2026-11-28' })
  })

  it('keeps everything when nothing is paid, and does not change the input', () => {
    const before = [open('A', 10_000.5)]
    const left = settleInvoices(before, 0, 0, '2026-11-28T09:00:00Z')
    expect(left).toEqual(before)
    expect(left[0]).not.toBe(before[0])
  })
})
