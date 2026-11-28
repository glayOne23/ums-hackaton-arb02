import { sumMoney } from './calc'
import type { OpenInvoice } from './types'

/**
 * The open notas after one visit saved on the phone, as the server will book
 * it: this visit's bill becomes the newest nota, then the money paid settles
 * notas oldest first (ApplyOutletPayment). Settled notas drop out.
 */
export function settleInvoices(invoices: OpenInvoice[], total: number, paid: number, at: string): OpenInvoice[] {
  const date = at.slice(0, 10)
  const all: OpenInvoice[] = invoices.map((invoice) => ({ ...invoice }))
  if (total > 0) {
    all.push({
      number: 'Nota baru (belum terkirim)',
      invoice_date: date,
      due_date: date,
      owed: total,
      overdue: false,
      pending: true,
    })
  }

  let left = paid
  for (const invoice of all) {
    if (left <= 0) break
    const take = Math.min(left, invoice.owed)
    invoice.owed = sumMoney([invoice.owed, -take])
    left = sumMoney([left, -take])
  }

  return all.filter((invoice) => invoice.owed > 0)
}
