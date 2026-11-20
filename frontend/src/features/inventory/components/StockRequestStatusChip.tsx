import { CircleCheck, CircleX, Clock, Hourglass } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import type { StockRequest } from '../types'

/** UI guide §2.4: fixed look per status. */
export function StockRequestStatusChip({ status }: { status: StockRequest['status'] }) {
  switch (status.value) {
    case 'submitted':
      return (
        <StatusChip variant="warning" icon={Clock}>
          Menunggu disiapkan
        </StatusChip>
      )
    case 'prepared':
      return (
        <StatusChip variant="info" icon={Hourglass}>
          Menunggu persetujuan
        </StatusChip>
      )
    case 'issued':
      return (
        <StatusChip variant="success" icon={CircleCheck}>
          {status.label}
        </StatusChip>
      )
    case 'rejected':
      return (
        <StatusChip variant="danger" icon={CircleX}>
          Ditolak
        </StatusChip>
      )
  }
}
