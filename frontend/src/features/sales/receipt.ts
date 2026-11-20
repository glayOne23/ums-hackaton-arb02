import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { uuid } from '@/lib/uuid'
import { sumMoney } from './calc'
import type { Receipt, ReceiptLine } from './offline/db'
import type { PackageOutlet, PaymentMethodValue, TransactionItemInput, TransactionTypeValue } from './types'

interface Draft {
  userId: number
  outlet: PackageOutlet
  type: TransactionTypeValue
  items: TransactionItemInput[]
  lines: ReceiptLine[]
  paid: number
  method: PaymentMethodValue
  photo: Blob | null
}

/** A visit or sale as saved on the phone, ready to send (KS-11). */
export function buildReceipt(draft: Draft, now: Date = new Date()): Receipt {
  const clientUuid = uuid()
  return {
    client_uuid: clientUuid,
    user_id: draft.userId,
    input: {
      client_uuid: clientUuid,
      type: draft.type,
      outlet_id: draft.outlet.id,
      transacted_at: now.toISOString(),
      items: draft.items,
      payment: { amount: draft.paid, method: draft.method },
    },
    outlet: {
      id: draft.outlet.id,
      name: draft.outlet.name,
      whatsapp_number: draft.outlet.whatsapp_number,
      sale_mode: draft.outlet.sale_mode.label,
    },
    lines: draft.lines,
    total: sumMoney(draft.lines.map((l) => l.total)),
    previous_unpaid: draft.outlet.unpaid,
    paid: draft.paid,
    status: 'queued',
    error: null,
    transaction: null,
    photo: draft.photo,
    photo_status: draft.photo ? 'queued' : 'none',
    created_at: now.toISOString(),
    sent_at: null,
  }
}

/** What is still owed after this nota: earlier unpaid + this one − paid now. */
export function owedAfter(receipt: Receipt): number {
  return Math.max(0, sumMoney([receipt.previous_unpaid, receipt.total, -receipt.paid]))
}

/** Nota as plain text for WhatsApp (KS-09). */
export function receiptText(receipt: Receipt): string {
  const at = new Date(receipt.created_at)
  const number = receipt.transaction?.number ?? '(nomor menyusul)'
  const lines = receipt.lines
    .filter((l) => l.sold > 0 || l.withdrawn > 0 || l.refill > 0)
    .map((l) => {
      const parts = [
        l.sold > 0 ? `laku ${l.sold} × ${formatCurrency(l.price)} = ${formatCurrency(l.total)}` : null,
        l.withdrawn > 0 ? `tarik ${l.withdrawn}` : null,
        l.refill > 0 ? `isi ${l.refill}` : null,
        l.closing !== null ? `stok ${l.closing}` : null,
      ].filter(Boolean)
      return `- ${l.name}: ${parts.join(', ')}`
    })

  return [
    "*CV Arba'in Jaya Mandiri*",
    `Nota ${number}`,
    `${receipt.outlet.name} · ${formatDate(at)} ${formatTime(at)}`,
    '',
    ...(lines.length ? lines : ['Tidak ada yang laku']),
    '',
    `Tagihan nota ini: ${formatCurrency(receipt.total)}`,
    receipt.previous_unpaid > 0 ? `Belum dibayar sebelumnya: ${formatCurrency(receipt.previous_unpaid)}` : null,
    `Dibayar: ${formatCurrency(receipt.paid)}`,
    `Sisa belum dibayar: ${formatCurrency(owedAfter(receipt))}`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}
