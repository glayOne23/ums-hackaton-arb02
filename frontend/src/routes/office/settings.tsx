import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { SettingsView } from '@/features/setting/components/SettingsView'

// W8 — business rules and lists (PG-01 … PG-07, PG-09)
export const Route = createFileRoute('/office/settings')({
  component: () => (
    <PermissionGate permission="setting.manage">
      <SettingsView />
    </PermissionGate>
  ),
})
