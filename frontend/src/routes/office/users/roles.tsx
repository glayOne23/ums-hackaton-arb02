import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RoleEditor } from '@/features/access/components/RoleEditor'

// W9 — roles & permissions (PG-08)
export const Route = createFileRoute('/office/users/roles')({
  component: () => (
    <PermissionGate permission="user.manage">
      <RoleEditor />
    </PermissionGate>
  ),
})
