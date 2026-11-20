import { CircleCheck, CircleX, Clock, Wallet } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
/** Invoice status from the API (Billing\Enums\InvoiceStatus). */
export interface InvoiceStatus {
  value: 'unpaid' | 'partial' | 'paid' | 'void'
  label: string
}

/** Colour + icon + words (UI guide §2.3). */
export function InvoiceStatusChip({ status }: { status: InvoiceStatus }) {
  switch (status.value) {
    case 'paid':
      return (
        <StatusChip variant="success" icon={CircleCheck}>
          {status.label}
        </StatusChip>
      )
    case 'partial':
      return (
        <StatusChip variant="info" icon={Wallet}>
          {status.label}
        </StatusChip>
      )
    case 'void':
      return (
        <StatusChip variant="neutral" icon={CircleX}>
          {status.label}
        </StatusChip>
      )
    default:
      return (
        <StatusChip variant="warning" icon={Clock}>
          {status.label}
        </StatusChip>
      )
  }
}
