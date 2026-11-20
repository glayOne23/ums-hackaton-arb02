import { describe, expect, it } from 'vitest'
import { billingSuggestion, computeLine, daysSince, isDue, sumMoney, type VisitLine } from '@/features/sales/calc'
import type { Receipt } from '@/features/sales/offline/db'
import { applyPending } from '@/features/sales/offline/pending'
import { owedAfter } from '@/features/sales/receipt'
import type { PackageOutlet, PackageSettings, WorkPackage } from '@/features/sales/types'

const madu: VisitLine = {
  productId: 'madu',
  name: 'Madu Hitam Pahit 470',
  unit: 'botol',
  opening: 4,
  nearExpiryQty: 0,
  nearestExpiry: null,
  price: 50400,
  discountPercent: 16,
  carried: 24,
}

const settings: PackageSettings = {
  billing_threshold: 2,
  billing_threshold_unit: 'unit',
  expiry_withdrawal_months: 6,
  visit_cycle_days: 30,
  credit_term_days: 30,
  form_photo_required: false,
}

describe('computeLine (SDD §4.1)', () => {
  it('starts with remaining = consignment: nothing sold, nothing to refill', () => {
    expect(computeLine(madu)).toMatchObject({ remaining: 4, sold: 0, refill: 0, closing: 4, total: 0 })
  })

  it('SRS §7.4: remaining 1 of 4 → sold 3, refill back to 4', () => {
    expect(computeLine(madu, { remaining: 1 })).toMatchObject({ sold: 3, refill: 3, closing: 4, total: 151200 })
  })

  it('suggests withdrawing near-expiry goods and refilling them', () => {
    const kurma = { ...madu, opening: 2, nearExpiryQty: 2 }
    expect(computeLine(kurma)).toMatchObject({ withdrawn: 2, refill: 2, closing: 2 })
  })

  it('limits the refill to what the sales carries', () => {
    expect(computeLine({ ...madu, carried: 1 }, { remaining: 0 })).toMatchObject({ sold: 4, refill: 1, closing: 1 })
  })

  it('flags a remaining above the consignment instead of counting it (UX-06)', () => {
    const result = computeLine(madu, { remaining: 6 })
    expect(result.remainingTooHigh).toBe(true)
    expect(result.sold).toBe(0)
  })

  it('keeps what the sales typed over the suggestion', () => {
    expect(computeLine(madu, { remaining: 1, refill: 5 })).toMatchObject({ refill: 5, closing: 6 })
    expect(computeLine(madu, { refill: 30 }).refillTooHigh).toBe(true)
  })
})

describe('billingSuggestion (BR-02, PG-01)', () => {
  it('counts per unit by default: collect when sold > 2', () => {
    expect(billingSuggestion([3], settings).collectNow).toBe(true)
    expect(billingSuggestion([1, 1], settings).collectNow).toBe(false)
  })

  it('follows a changed threshold without code changes (SRS §7.6)', () => {
    expect(billingSuggestion([3], { ...settings, billing_threshold: 3 }).collectNow).toBe(false)
  })

  it('can count per product', () => {
    const perProduct = { ...settings, billing_threshold_unit: 'product' as const }
    expect(billingSuggestion([5, 0, 1], perProduct)).toMatchObject({ count: 2, collectNow: false })
  })
})

describe('visit dates (KS-01)', () => {
  const now = new Date(2026, 10, 21, 9)

  it('counts calendar days since the last visit', () => {
    expect(daysSince(new Date(2026, 9, 10, 17).toISOString(), now)).toBe(42)
    expect(daysSince(null, now)).toBeNull()
  })

  it('is due when never visited or past the cycle', () => {
    const outlet = { last_visit_at: null, visit_cycle_days: 30 } as PackageOutlet
    expect(isDue(outlet, now)).toBe(true)
    expect(isDue({ ...outlet, last_visit_at: new Date(2026, 10, 1).toISOString() }, now)).toBe(false)
  })
})

describe('money', () => {
  it('adds rupiah amounts without float drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })
})

describe('applyPending (NF-01: visits saved offline show at once)', () => {
  const pkg: WorkPackage = {
    generated_at: '2026-11-21T01:00:00+07:00',
    today: { date: '2026-11-21', visited_outlet_ids: [], cash: 0, transfer: 0 },
    settings,
    products: [{ id: 'madu', code: 'MDH01', name: 'Madu', unit: 'botol' }],
    carried: [{ product_id: 'madu', qty: 24, near_expiry_qty: 0, nearest_expiry: '2028-11-30' }],
    outlets: [
      {
        id: 'sari',
        stock: [{ product_id: 'madu', qty: 4, near_expiry_qty: 0, nearest_expiry: '2028-11-30' }],
        unpaid: 86000,
        last_visit_at: null,
      } as unknown as PackageOutlet,
    ],
  }
  const receipt = (status: Receipt['status'], extra: Partial<Receipt> = {}): Receipt => ({
    client_uuid: `u-${status}`,
    user_id: 1,
    input: {
      client_uuid: `u-${status}`,
      type: 'consignment_visit',
      outlet_id: 'sari',
      transacted_at: new Date().toISOString(),
      items: [],
      payment: { amount: 151200, method: 'cash' },
    },
    outlet: { id: 'sari', name: 'Ap Sari Farma', whatsapp_number: null, sale_mode: 'Titip jual' },
    lines: [
      { productId: 'madu', name: 'Madu', sold: 3, withdrawn: 0, refill: 3, closing: 4, price: 50400, total: 151200 },
    ],
    total: 151200,
    previous_unpaid: 86000,
    paid: 151200,
    status,
    error: null,
    transaction: null,
    photo: null,
    photo_status: 'none',
    created_at: new Date().toISOString(),
    sent_at: null,
    ...extra,
  })

  it('applies a queued visit to the outlet, carried goods, and today', () => {
    const next = applyPending(pkg, [receipt('queued')])
    expect(next.carried[0].qty).toBe(21)
    expect(next.outlets[0].stock[0].qty).toBe(4)
    expect(next.outlets[0].unpaid).toBe(86000)
    expect(next.outlets[0].last_visit_at).not.toBeNull()
    expect(next.today.visited_outlet_ids).toEqual(['sari'])
    expect(next.today.cash).toBe(151200)
    // The cached package itself is left alone
    expect(pkg.carried[0].qty).toBe(24)
  })

  it('skips a visit the downloaded package already contains, comparing instants across time zones', () => {
    // 2026-11-20T18:30Z is 01:30 +07:00 on the 21st: after the package → still applied
    expect(applyPending(pkg, [receipt('sent', { sent_at: '2026-11-20T18:30:00Z' })])).not.toBe(pkg)
    // 17:30Z = 00:30 +07:00: before the package → already in it
    expect(applyPending(pkg, [receipt('sent', { sent_at: '2026-11-20T17:30:00Z' })])).toBe(pkg)
  })

  it('works out what is still owed after the nota', () => {
    expect(owedAfter(receipt('queued', { paid: 100000 }))).toBe(137200)
  })
})
