import { createFileRoute } from '@tanstack/react-router'
import { FieldOutletList } from '@/features/sales/components/FieldOutletList'

// M1 Outlet saya — assigned outlets, longest since the last visit first
export const Route = createFileRoute('/field/')({
  component: FieldOutletList,
})
