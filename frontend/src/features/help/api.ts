import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

/** UX-09: the admin's WhatsApp for "Bantuan" (kept on the device, so it works without a signal too). */
export function useHelpInfo() {
  return useQuery({
    queryKey: ['help'],
    queryFn: ({ signal }) =>
      api<{ data: { whatsapp: string | null; company_name: string } }>('/help', { signal }).then((r) => r.data),
    staleTime: 60 * 60_000,
  })
}
