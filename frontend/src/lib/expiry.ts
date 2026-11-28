/**
 * ED monitoring on the phone (doc 11). Sales see expiry as month/year, never
 * batch numbers; batches of one month count together. Pure functions, unit tested.
 */

/** Pieces of one product per expiry month, "YYYY-MM" */
export interface ExpiryMonth {
  month: string
  qty: number
}

/** "2027-03" → "ED 03/2027" */
export function expiryLabel(month: string): string {
  return `ED ${month.slice(5, 7)}/${month.slice(0, 4)}`
}

/** The last expiry month that counts as near: today + the withdrawal window (PG-02). */
export function cutoffMonth(today: string, withdrawalMonths: number): string {
  const [year, month] = today.split('-').map(Number)
  const date = new Date(year, month - 1 + withdrawalMonths, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isNear(month: string, cutoff: string): boolean {
  return month <= cutoff
}

/** "3 × ED 03/2027 · 6 × ED 01/2029" */
export function expirySummary(months: ExpiryMonth[]): string {
  return months
    .filter((m) => m.qty > 0)
    .map((m) => `${m.qty} × ${expiryLabel(m.month)}`)
    .join(' · ')
}

/**
 * Rows of the shelf count per ED: the months the ledger knows at the outlet,
 * plus months the sales added. Each starts at what the ledger expects, so
 * only what differs is changed (like "Sisa di rak").
 */
export function shelfRows(shelf: ExpiryMonth[], counted: Record<string, number> | undefined): ExpiryMonth[] {
  const expected = new Map(shelf.map((m) => [m.month, m.qty]))
  const months = new Set([...expected.keys(), ...Object.keys(counted ?? {})])
  return [...months].sort().map((month) => ({ month, qty: counted?.[month] ?? expected.get(month) ?? 0 }))
}

/** Months the sales carries that are not on the shelf yet: the "ED lain" choices. */
export function otherMonths(shelf: ExpiryMonth[], carried: ExpiryMonth[], counted: Record<string, number> | undefined): string[] {
  const shown = new Set([...shelf.map((m) => m.month), ...Object.keys(counted ?? {})])
  return carried.filter((m) => m.qty > 0 && !shown.has(m.month)).map((m) => m.month)
}

export function total(months: Record<string, number> | ExpiryMonth[]): number {
  const values = Array.isArray(months) ? months.map((m) => m.qty) : Object.values(months)
  return values.reduce((sum, qty) => sum + qty, 0)
}

/** Counted pieces whose ED is near: what should be withdrawn (BR-03). */
export function nearQty(counted: Record<string, number>, cutoff: string): number {
  return Object.entries(counted).reduce((sum, [month, qty]) => (isNear(month, cutoff) ? sum + qty : sum), 0)
}

/**
 * Where the refill should come from: the oldest month the sales carries that
 * is not near expiry (near ones were just withdrawn), else the oldest.
 */
export function suggestRefillMonth(carried: ExpiryMonth[], cutoff: string | undefined): string | null {
  const available = carried.filter((m) => m.qty > 0).sort((a, b) => a.month.localeCompare(b.month))
  if (available.length === 0) return null
  return (cutoff ? available.find((m) => !isNear(m.month, cutoff)) : undefined)?.month ?? available[0].month
}
