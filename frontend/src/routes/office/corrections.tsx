import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { CorrectionCenter } from '@/features/correction/components/CorrectionCenter'
import type { CorrectionTab } from '@/features/correction/tabs'

const TABS: CorrectionTab[] = ['cek', 'persetujuan', 'sampah']

// W13 — Perlu dicek, koreksi menunggu persetujuan, Tempat sampah (KR-02, KR-09, KR-11, KR-12)
export const Route = createFileRoute('/office/corrections')({
  validateSearch: (search: Record<string, unknown>): { tab: CorrectionTab } => ({
    tab: TABS.includes(search.tab as CorrectionTab) ? (search.tab as CorrectionTab) : 'cek',
  }),
  component: function CorrectionsPage() {
    const { tab } = Route.useSearch()
    return (
      <PermissionGate permission={['visit.correct', 'correction.approve', 'outlet.manage', 'product.manage']}>
        <CorrectionCenter tab={tab} />
      </PermissionGate>
    )
  },
})
