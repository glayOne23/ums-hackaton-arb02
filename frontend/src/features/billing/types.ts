/** Shapes of the Billing API (backend: App\Modules\Billing). */
import type { InvoiceStatus } from '@/components/common/InvoiceStatusChip'

export type PaymentMethodValue = 'cash' | 'transfer'

export interface Payment {
  id: string
  amount: number
  method: { value: PaymentMethodValue; label: string }
  paid_at: string
  received_by?: { id: number; name: string }
  transaction_id: string | null
  note: string | null
  is_void: boolean
  void_reason: string | null
  voided_by?: string | null
  /** Already handed over to the office (part of a remittance) */
  remitted: boolean
}

export interface Invoice {
  id: string
  number: string
  type: string
  transaction_id: string | null
  outlet?: {
    id: string
    code: string
    name: string
    address: string | null
    district: string
    region: string | null
    whatsapp_number: string | null
  }
  sales?: { id: number; name: string } | null
  invoice_date: string
  due_date: string
  amount: number
  paid_amount: number
  owed: number
  age_days: number
  overdue: boolean
  status: InvoiceStatus
  payments?: Payment[]
}

export interface InvoiceList {
  data: Invoice[]
  summary: { open_count: number; owed: number }
  meta: { current_page: number; last_page: number; total: number }
}

export interface PendingRemittance {
  sales: { id: number; name: string }
  amount: number
  payments: number
  since: string
}

export interface Remittance {
  id: string
  number: string
  sales?: { id: number; name: string }
  remittance_date: string
  expected_amount: number
  amount: number
  difference: number
  note: string | null
  received_by?: string
  received_at: string
  status: { value: 'received' | 'discrepancy'; label: string }
  payments_count?: number
}
