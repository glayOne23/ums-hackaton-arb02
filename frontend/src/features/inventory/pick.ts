/**
 * Doc 11: the warehouse pick list. The plan follows the nearest expiry first
 * (like the server); the admin changes it when other cartons were taken.
 * Pure functions, unit tested.
 */

export interface PickBatch {
  id: string
  batch_number: string
  expiry_date: string
  qty: number
}

export interface Pick {
  batch_id: string
  qty: number
}

/** Nearest expiry first, up to the quantity (less when stock runs out). */
export function fefoPlan(batches: PickBatch[], qty: number): Pick[] {
  const plan: Pick[] = []
  let left = qty
  for (const batch of [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))) {
    if (left <= 0) break
    const take = Math.min(left, batch.qty)
    if (take > 0) plan.push({ batch_id: batch.id, qty: take })
    left -= take
  }
  return plan
}

/** The plan with the admin's changes (batch id → typed quantity); empty fields count as 0. */
export function applyPicks(plan: Pick[], typed: Record<string, string> | undefined): Pick[] {
  if (!typed) return plan
  const planned = new Map(plan.map((p) => [p.batch_id, p.qty]))
  const ids = new Set([...planned.keys(), ...Object.keys(typed)])
  return [...ids]
    .map((id) => ({ batch_id: id, qty: id in typed ? Number(typed[id] || 0) : (planned.get(id) ?? 0) }))
    .filter((p) => p.qty > 0)
}

export function pickedTotal(picks: Pick[]): number {
  return picks.reduce((sum, p) => sum + p.qty, 0)
}
