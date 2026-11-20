import { formatCurrency, formatTableDate } from '@/lib/format'
import type { Invoice } from './types'

export interface OutletGroup {
  outletId: string
  outlet: NonNullable<Invoice['outlet']>
  invoices: Invoice[]
  owed: number
  oldestDays: number
}

/** Unpaid invoices grouped per outlet, the outlet waiting longest first (TG-01). Pure, unit tested. */
export function groupByOutlet(invoices: Invoice[]): OutletGroup[] {
  const groups = new Map<string, OutletGroup>()
  for (const invoice of invoices) {
    if (!invoice.outlet) continue
    const group = groups.get(invoice.outlet.id) ?? {
      outletId: invoice.outlet.id,
      outlet: invoice.outlet,
      invoices: [],
      owed: 0,
      oldestDays: 0,
    }
    group.invoices.push(invoice)
    group.owed = Math.round((group.owed + invoice.owed) * 100) / 100
    group.oldestDays = Math.max(group.oldestDays, invoice.age_days)
    groups.set(invoice.outlet.id, group)
  }
  return [...groups.values()].sort(
    (a, b) => b.oldestDays - a.oldestDays || a.outlet.name.localeCompare(b.outlet.name, 'id'),
  )
}

/** The collection list as WhatsApp text, for a collector without the app (TG-01). */
export function collectionText(groups: OutletGroup[], title: string): string {
  const total = groups.reduce((sum, g) => sum + Math.round(g.owed * 100), 0) / 100
  const lines = groups.flatMap((g, i) => [
    `${i + 1}. *${g.outlet.name}* — ${formatCurrency(g.owed)}`,
    [g.outlet.address, g.outlet.district, g.outlet.region].filter(Boolean).join(', '),
    ...g.invoices.map(
      (inv) =>
        `   ${inv.number} (${formatTableDate(new Date(inv.invoice_date))}, ${inv.age_days} hari): ${formatCurrency(inv.owed)}`,
    ),
  ])

  return [
    `*${title}*`,
    `${groups.length} outlet · total ${formatCurrency(total)}`,
    '',
    ...lines,
    '',
    'Mohon kabari hasil penagihan ke admin kantor.',
  ].join('\n')
}
