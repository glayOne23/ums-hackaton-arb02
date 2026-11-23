import { formatCurrency, formatTableDate } from '@/lib/format'
import type { Invoice } from './types'

/* WhatsApp reminder texts for one invoice (TG-04). The user can still edit them in WhatsApp. */

/** Reminder for the outlet: polite, with the numbers it needs to pay. */
export function outletReminderText(invoice: Invoice): string {
  const due = formatTableDate(new Date(invoice.due_date))
  return [
    `Yth. ${invoice.outlet?.name ?? 'Bapak/Ibu'},`,
    '',
    `Kami dari CV Arba'in Jaya Mandiri ingin mengingatkan tagihan ${invoice.number} tanggal ${formatTableDate(new Date(invoice.invoice_date))}.`,
    `Sisa tagihan: ${formatCurrency(invoice.owed)}`,
    `Jatuh tempo: ${due}${invoice.overdue ? ' (sudah lewat)' : ''}`,
    '',
    'Mohon pembayarannya disiapkan untuk sales kami saat kunjungan berikutnya, atau hubungi kami bila sudah dibayar. Terima kasih.',
  ].join('\n')
}

/** Reminder for the sales: which outlet to collect from, and where it is. */
export function salesReminderText(invoice: Invoice): string {
  const outlet = invoice.outlet
  const place = [outlet?.district, outlet?.region].filter(Boolean).join(', ')
  return [
    `Halo ${invoice.sales?.name ?? ''}, mohon bantu tagih:`,
    '',
    `Outlet: ${outlet?.name ?? '-'}${place ? ` (${place})` : ''}`,
    `Tagihan: ${invoice.number}`,
    `Sisa: ${formatCurrency(invoice.owed)}`,
    `Jatuh tempo: ${formatTableDate(new Date(invoice.due_date))}${invoice.overdue ? ' (sudah lewat)' : ''}`,
    '',
    'Catat pembayarannya di SIGAP saat kunjungan. Terima kasih.',
  ].join('\n')
}
