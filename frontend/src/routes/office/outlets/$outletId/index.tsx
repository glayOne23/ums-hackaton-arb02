import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { OutletProfile } from '@/features/outlet/components/OutletProfile'

export const Route = createFileRoute('/office/outlets/$outletId/')({
  component: OutletProfilePage,
})

function OutletProfilePage() {
  const { outletId } = Route.useParams()

  return (
    <PermissionGate permission="outlet.view">
      <OutletProfile outletId={outletId} />
    </PermissionGate>
  )
}
