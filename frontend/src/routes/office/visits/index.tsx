import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { VisitList } from '@/features/sales/components/VisitList'

export const Route = createFileRoute('/office/visits/')({
  component: () => (
    <PermissionGate permission="visit.view">
      <VisitList />
    </PermissionGate>
  ),
})
