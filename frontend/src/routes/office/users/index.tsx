import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { UserList } from '@/features/access/components/UserList'

// Kelola pengguna (PG-08, AK-02)
export const Route = createFileRoute('/office/users/')({
  component: () => (
    <PermissionGate permission="user.manage">
      <UserList />
    </PermissionGate>
  ),
})
