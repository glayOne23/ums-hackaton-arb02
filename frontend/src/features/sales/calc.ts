/**
 * Visit arithmetic on the phone (SDD §4.1), the same rules the server applies.
 * Shown live so the sales never counts by hand (UX-05); the server recounts
 * everything when the visit arrives. Pure functions, unit tested.
 */
import type { PackageOutlet, PackageSettings, WorkPackage } from './types'

export interface VisitLine {
  productId: string
  name: string
  unit: string
  /** On the shelf at the last visit ("titipan") */
  opening: number
  nearExpiryQty: number
  nearestExpiry: string | null
  /** Price after discount */
  price: number
  discountPercent: number
  /** What the sales carries of this product */
  carried: number
}

/** What the sales changed on one line; anything left out follows the suggestion. */
export interface LineInput {
  remaining?: number
  withdrawn?: number
  refill?: number
}

export interface LineResult {
  remaining: number
  sold: number
  withdrawn: number
  refill: number
  closing: number
  total: number
  /** "Sisa" typed above "titipan" (UX-06): blocks saving until fixed */
  remainingTooHigh: boolean
  /** More refill than the sales carries */
  refillTooHigh: boolean
  /** Refill suggested by the rules (KS-05) */
  suggestedRefill: number
  suggestedWithdrawal: number
}

/** Products on the shelf, and the others the sales carries (to start consigning them). */
export function visitLines(outlet: PackageOutlet, pkg: WorkPackage): { shelf: VisitLine[]; others: VisitLine[] } {
  const names = new Map(pkg.products.map((p) => [p.id, p]))
  const carried = new Map(pkg.carried.map((c) => [c.product_id, c.qty]))
  const line = (
    productId: string,
    opening: number,
    nearExpiryQty: number,
    nearestExpiry: string | null,
  ): VisitLine => ({
    productId,
    name: names.get(productId)?.name ?? 'Produk',
    unit: names.get(productId)?.unit ?? 'pcs',
    opening,
    nearExpiryQty,
    nearestExpiry,
    price: outlet.prices[productId]?.price ?? 0,
    discountPercent: outlet.prices[productId]?.discount_percent ?? 0,
    carried: carried.get(productId) ?? 0,
  })

  const shelf = outlet.stock
    .map((s) => line(s.product_id, s.qty, s.near_expiry_qty, s.nearest_expiry))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
  const onShelf = new Set(shelf.map((l) => l.productId))
  const others = pkg.carried
    .filter((c) => c.qty > 0 && !onShelf.has(c.product_id))
    .map((c) => line(c.product_id, 0, 0, null))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))

  return { shelf, others }
}

/**
 * sold = opening − remaining (BR-01); withdrawal suggested for near-expiry
 * goods (BR-03); refill suggested back to the previous consignment, limited
 * by what the sales carries (KS-05); closing = remaining − withdrawn + refill.
 */
export function computeLine(line: VisitLine, input: LineInput = {}): LineResult {
  const typed = input.remaining ?? line.opening
  const remaining = Math.min(typed, line.opening)
  const sold = line.opening - remaining
  const suggestedWithdrawal = Math.min(line.nearExpiryQty, remaining)
  const withdrawn = Math.min(input.withdrawn ?? suggestedWithdrawal, remaining)
  const suggestedRefill = Math.min(Math.max(0, line.opening - (remaining - withdrawn)), line.carried)
  const refill = input.refill ?? suggestedRefill

  return {
    remaining,
    sold,
    withdrawn,
    refill,
    closing: remaining - withdrawn + refill,
    total: lineTotal(sold, line.price),
    remainingTooHigh: typed > line.opening,
    refillTooHigh: refill > line.carried + withdrawn,
    suggestedRefill,
    suggestedWithdrawal,
  }
}

/** Quantity × price in whole rupiah cents, like the server. */
export function lineTotal(qty: number, price: number): number {
  return (qty * Math.round(price * 100)) / 100
}

export function sumMoney(values: number[]): number {
  return values.reduce((sum, v) => sum + Math.round(v * 100), 0) / 100
}

/**
 * BR-02: suggest collecting now when sold > threshold, counted per unit
 * (total sold) or per product (number of products sold), as set (PG-01).
 */
export function billingSuggestion(soldPerProduct: number[], settings: PackageSettings) {
  const count =
    settings.billing_threshold_unit === 'product'
      ? soldPerProduct.filter((n) => n > 0).length
      : soldPerProduct.reduce((a, b) => a + b, 0)

  return {
    count,
    threshold: settings.billing_threshold,
    unit: settings.billing_threshold_unit === 'product' ? 'produk' : 'pcs',
    collectNow: count > settings.billing_threshold,
  }
}

/** Days since the last visit, null when never visited. */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null
  const start = new Date(iso)
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((b - a) / 86_400_000)
}

/** KS-01: due when never visited or the visit cycle has passed. */
export function isDue(outlet: PackageOutlet, now: Date = new Date()): boolean {
  const days = daysSince(outlet.last_visit_at, now)
  return days === null || days >= outlet.visit_cycle_days
}
