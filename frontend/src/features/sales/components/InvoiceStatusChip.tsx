import { CircleCheck, CircleX, Clock, Wallet } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import type { Transaction } from '../types'

type Status = NonNullable<Transaction['invoice']>['status']

export function InvoiceStatusChip({ status }: { status: Status }) {
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
