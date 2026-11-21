import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ReportMenu } from '@/features/report/components/ReportMenu'

// W7 — report menu (SRS 3.6)
export const Route = createFileRoute('/office/reports/')({
  component: () => (
    <PermissionGate permission="report.view">
      <ReportMenu />
    </PermissionGate>
  ),
})
