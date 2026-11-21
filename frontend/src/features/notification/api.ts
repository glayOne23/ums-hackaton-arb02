import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface AppNotification {
  id: string
  title: string
  body: string
  url: string | null
  category: 'approval' | 'assignment' | 'expiry' | 'billing' | 'request' | null
  read: boolean
  created_at: string
}

const KEY = ['notifications'] as const
const POLL_MS = 60_000

/** PW-08: the bell. Checked every minute while the app is open and online. */
export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => api<{ data: AppNotification[]; meta: { unread: number } }>('/notifications', { signal }),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) =>
      api<{ meta: { unread: number } }>('/notifications/read', { method: 'POST', body: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
