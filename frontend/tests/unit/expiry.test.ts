import { describe, expect, it } from 'vitest'
import { applyPicks, fefoPlan, pickedTotal } from '@/features/inventory/pick'
import { computeLine, type VisitLine } from '@/features/sales/calc'
import {
  cutoffMonth,
  expiryLabel,
  expirySummary,
  nearQty,
  otherMonths,
  shelfRows,
  suggestRefillMonth,
} from '@/lib/expiry'

describe('ED months (doc 11)', () => {
  it('labels and summarises months as sales read them', () => {
    expect(expiryLabel('2027-03')).toBe('ED 03/2027')
    expect(
      expirySummary([
        { month: '2027-03', qty: 3 },
        { month: '2029-01', qty: 6 },
        { month: '2030-01', qty: 0 },
      ]),
    ).toBe('3 × ED 03/2027 · 6 × ED 01/2029')
  })

  it('finds the near-expiry cut-off across years', () => {
    expect(cutoffMonth('2026-11-28', 6)).toBe('2027-05')
    expect(nearQty({ '2027-05': 2, '2027-06': 4 }, '2027-05')).toBe(2)
  })

  it('starts the shelf count at the ledger and keeps what the sales changed or added', () => {
    const shelf = [
      { month: '2027-03', qty: 4 },
      { month: '2029-01', qty: 2 },
    ]
    expect(shelfRows(shelf, undefined)).toEqual(shelf)
    expect(shelfRows(shelf, { '2027-03': 1, '2029-01': 2, '2030-02': 3 })).toEqual([
      { month: '2027-03', qty: 1 },
      { month: '2029-01', qty: 2 },
      { month: '2030-02', qty: 3 },
    ])
    expect(otherMonths(shelf, [{ month: '2029-01', qty: 5 }, { month: '2030-02', qty: 5 }], undefined)).toEqual(['2030-02'])
  })

  it('refills from the oldest month the sales carries that is not near expiry', () => {
    const carried = [
      { month: '2029-01', qty: 5 },
      { month: '2027-02', qty: 5 },
      { month: '2028-06', qty: 5 },
    ]
    expect(suggestRefillMonth(carried, '2027-05')).toBe('2028-06')
    expect(suggestRefillMonth([{ month: '2027-02', qty: 2 }], '2027-05')).toBe('2027-02')
    expect(suggestRefillMonth([], '2027-05')).toBeNull()
  })
})

describe('visit with an ED count', () => {
  const line: VisitLine = {
    productId: 'madu',
    name: 'Madu',
    unit: 'botol',
    opening: 6,
    nearExpiryQty: 4,
    nearestExpiry: '2027-03-10',
    price: 50000,
    discountPercent: 0,
    carried: 10,
    shelfExpiry: [
      { month: '2027-03', qty: 4 },
      { month: '2029-01', qty: 2 },
    ],
    carriedExpiry: [
      { month: '2027-02', qty: 4 },
      { month: '2029-06', qty: 6 },
    ],
    checkExpiry: true,
    cutoffMonth: '2027-05',
  }

  it('takes the shelf from the months counted, and suggests withdrawing the near ones found', () => {
    const result = computeLine(line, { byExpiry: { '2027-03': 1, '2029-01': 3 } })
    expect(result).toMatchObject({ remaining: 4, sold: 2, suggestedWithdrawal: 1, refillMonth: '2029-06' })
  })

  it('keeps the chosen refill month', () => {
    expect(computeLine(line, { refillMonth: '2027-02' }).refillMonth).toBe('2027-02')
  })
})

describe('warehouse pick list', () => {
  const batches = [
    { id: 'b', batch_number: 'B', expiry_date: '2029-01-31', qty: 10 },
    { id: 'a', batch_number: 'A', expiry_date: '2027-03-31', qty: 3 },
  ]

  it('suggests the nearest expiry first', () => {
    expect(fefoPlan(batches, 5)).toEqual([
      { batch_id: 'a', qty: 3 },
      { batch_id: 'b', qty: 2 },
    ])
  })

  it('applies what the admin typed and adds it up', () => {
    const picks = applyPicks(fefoPlan(batches, 5), { a: '0', b: '5' })
    expect(picks).toEqual([{ batch_id: 'b', qty: 5 }])
    expect(pickedTotal(picks)).toBe(5)
  })
})
