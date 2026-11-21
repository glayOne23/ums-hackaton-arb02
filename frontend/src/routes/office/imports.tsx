import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ImportView } from '@/features/import/components/ImportView'

// W10 — Excel import (IE-01, KR-14)
export const Route = createFileRoute('/office/imports')({
  component: () => (
    <PermissionGate permission="data.import">
      <ImportView />
    </PermissionGate>
  ),
})
