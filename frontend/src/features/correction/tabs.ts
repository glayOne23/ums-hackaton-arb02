import { useSession } from '@/stores/session'

export type CorrectionTab = 'cek' | 'persetujuan' | 'sampah'

export const TABS: { key: CorrectionTab; label: string; allowed: (p: string[]) => boolean }[] = [
  { key: 'cek', label: 'Perlu dicek', allowed: (p) => p.includes('visit.view') && p.includes('visit.correct') },
  {
    key: 'persetujuan',
    label: 'Menunggu persetujuan',
    allowed: (p) => p.includes('correction.approve') || (p.includes('visit.view') && p.includes('visit.correct')),
  },
  {
    key: 'sampah',
    label: 'Tempat sampah',
    allowed: (p) => p.includes('outlet.manage') || p.includes('product.manage'),
  },
]

/** The tabs this user may open, in screen order. */
export function useCorrectionTabs(): CorrectionTab[] {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  return TABS.filter((t) => t.allowed(permissions)).map((t) => t.key)
}
