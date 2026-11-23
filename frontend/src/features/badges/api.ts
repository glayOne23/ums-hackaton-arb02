import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useSession } from '@/stores/session'

/**
 * What waits for the signed-in person, per place in the menu (backend
 * App\Core\Badges\TaskCounts), e.g. { "inventory.requests": 3 }. Places the
 * person cannot act on are not in it.
 */
export type BadgeKey =
  | 'outlets.proposals'
  | 'corrections.review'
  | 'corrections.approval'
  | 'inventory.requests'
  | 'inventory.count'
  | 'discounts.pending'
  | 'billing.remittances'

export const badgeKeys = ['badges'] as const
const POLL_MS = 60_000

export function useBadges() {
  const area = useSession((s) => s.user?.area)
  return useQuery({
    queryKey: badgeKeys,
    queryFn: ({ signal }) =>
      api<{ data: Partial<Record<BadgeKey, number>> }>('/badges', { signal }).then((r) => r.data),
    // Field users have nothing here; their phone shows its own unsent visits
    enabled: area === 'office',
    refetchInterval: POLL_MS,
    staleTime: 0,
  })
}

/** The sum for one or more places; 0 when none or not allowed. */
export function useBadgeCount(keys: readonly BadgeKey[] | undefined): number {
  const badges = useBadges()
  if (!keys || !badges.data) return 0
  return keys.reduce((sum, key) => sum + (badges.data[key] ?? 0), 0)
}
