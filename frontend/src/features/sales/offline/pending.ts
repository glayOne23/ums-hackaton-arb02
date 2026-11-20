import type { WorkPackage } from '../types'
import type { Receipt } from './db'

/**
 * The work package as it is after the visits saved on this phone: a visit
 * saved without a signal must already show in "Outlet saya", in the stock
 * carried, and in the next outlet's numbers (NF-01: ≥ 30 visits offline).
 *
 * A receipt is applied when the server copy cannot contain it yet: not sent,
 * or sent after the package was made.
 */
export function applyPending(pkg: WorkPackage, receipts: Receipt[]): WorkPackage {
  // Compare instants, not strings: the server writes "+07:00", the phone writes "Z"
  const madeAt = Date.parse(pkg.generated_at)
  const pending = receipts
    .filter((r) => r.status !== 'sent' || (r.sent_at !== null && Date.parse(r.sent_at) > madeAt))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (pending.length === 0) return pkg

  const next: WorkPackage = structuredClone(pkg)
  const carried = new Map(next.carried.map((c) => [c.product_id, c]))

  for (const receipt of pending) {
    const outlet = next.outlets.find((o) => o.id === receipt.input.outlet_id)
    const consignment = receipt.input.type === 'consignment_visit'

    for (const line of receipt.lines) {
      const delta = consignment ? line.withdrawn - line.refill : -line.sold
      const row = carried.get(line.productId)
      if (row) {
        row.qty = Math.max(0, row.qty + delta)
        if (consignment) row.near_expiry_qty += line.withdrawn
      } else if (delta > 0) {
        const added = { product_id: line.productId, qty: delta, near_expiry_qty: line.withdrawn, nearest_expiry: '' }
        carried.set(line.productId, added)
        next.carried.push(added)
      }

      if (outlet && consignment && line.closing !== null) {
        const stock = outlet.stock.find((s) => s.product_id === line.productId)
        if (stock) {
          stock.near_expiry_qty = Math.max(0, stock.near_expiry_qty - line.withdrawn - line.sold)
          stock.qty = line.closing
        } else if (line.closing > 0) {
          outlet.stock.push({ product_id: line.productId, qty: line.closing, near_expiry_qty: 0, nearest_expiry: '' })
        }
      }
    }

    if (outlet) {
      outlet.stock = outlet.stock.filter((s) => s.qty > 0)
      outlet.last_visit_at = receipt.input.transacted_at
      outlet.unpaid = Math.max(0, Math.round((outlet.unpaid + receipt.total - receipt.paid) * 100) / 100)
    }
    if (isToday(receipt.input.transacted_at)) {
      if (!next.today.visited_outlet_ids.includes(receipt.input.outlet_id)) {
        next.today.visited_outlet_ids.push(receipt.input.outlet_id)
      }
      if (receipt.input.payment.method === 'cash') next.today.cash += receipt.paid
      else next.today.transfer += receipt.paid
    }
  }

  next.carried = next.carried.filter((c) => c.qty > 0)
  return next
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}
