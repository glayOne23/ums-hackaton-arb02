import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Paginated, Transaction } from '@/features/sales/types'
import type {
  Correction,
  CorrectionInput,
  CorrectionPreview,
  DeviceSync,
  HistoryEntry,
  HistoryType,
  MergePreview,
  TrashItem,
} from './types'

const ROOT = ['correction'] as const

export const correctionKeys = {
  history: (type: HistoryType, id: string) => [...ROOT, 'history', type, id] as const,
  pending: [...ROOT, 'pending'] as const,
  review: [...ROOT, 'review'] as const,
  devices: [...ROOT, 'devices'] as const,
  trash: [...ROOT, 'trash'] as const,
}

/**
 * A correction moves stock, invoices, and reports, so everything is fetched
 * again afterwards (same as an import).
 */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

/** W12: change history of one record, loaded when opened. */
export function useHistory(type: HistoryType, id: string, enabled: boolean) {
  return useQuery({
    queryKey: correctionKeys.history(type, id),
    queryFn: ({ signal }) => api<{ data: HistoryEntry[] }>(`/history/${type}/${id}`, { signal }).then((r) => r.data),
    enabled,
  })
}

/** W11 "Dampak": what saving would do, computed by the server without saving. */
export function useCorrectionPreview(transactionId: string, input: CorrectionInput | null) {
  return useQuery({
    queryKey: [...ROOT, 'preview', transactionId, input] as const,
    queryFn: ({ signal }) =>
      api<{ data: CorrectionPreview }>(`/sales/transactions/${transactionId}/corrections/preview`, {
        method: 'POST',
        body: input,
        signal,
      }).then((r) => r.data),
    enabled: input !== null,
    placeholderData: (previous) => previous,
    retry: false,
    staleTime: Infinity,
  })
}

export function useRequestCorrection(transactionId: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (input: CorrectionInput) =>
      api<{ data: Correction }>(`/sales/transactions/${transactionId}/corrections`, {
        method: 'POST',
        body: input,
      }).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function usePendingCorrections(enabled = true) {
  return useQuery({
    queryKey: correctionKeys.pending,
    queryFn: ({ signal }) => api<{ data: Correction[] }>('/sales/corrections', { signal }).then((r) => r.data),
    enabled,
  })
}

export function useDecideCorrection() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approve' | 'reject'; note?: string }) =>
      api<{ data: Correction }>(`/sales/corrections/${id}/${decision}`, { method: 'POST', body: { note } }).then(
        (r) => r.data,
      ),
    onSuccess: invalidate,
  })
}

/** KR-11: notas marked "Perlu dicek", still open. */
export function useNeedsReview(enabled = true) {
  return useQuery({
    queryKey: correctionKeys.review,
    queryFn: ({ signal }) =>
      api<Paginated<Transaction>>('/sales/transactions?needs_review=1&per_page=100', { signal }).then((r) => r.data),
    enabled,
  })
}

export function useMarkReviewed() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (transactionId: string) =>
      api(`/sales/transactions/${transactionId}/review`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  })
}

export function useDeviceSyncs(enabled = true) {
  return useQuery({
    queryKey: correctionKeys.devices,
    queryFn: ({ signal }) => api<{ data: DeviceSync[] }>('/sales/sync-status', { signal }).then((r) => r.data),
    enabled,
  })
}

export function useTrash(enabled = true) {
  return useQuery({
    queryKey: correctionKeys.trash,
    queryFn: ({ signal }) => api<{ data: TrashItem[]; meta: { retention_days: number } }>('/trash', { signal }),
    enabled,
  })
}

export function useRestore() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (item: Pick<TrashItem, 'type' | 'id'>) =>
      api(`/${item.type === 'outlet' ? 'outlets' : 'products'}/${item.id}/restore`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  })
}

const MERGE_PATH = { outlet: 'outlets', product: 'products' } as const

/** KR-08: what merging `fromId` into `intoId` would move, before anything is saved. */
export function useMergePreview(kind: 'outlet' | 'product', intoId: string, fromId: string | null) {
  return useQuery({
    queryKey: [...ROOT, 'merge', kind, intoId, fromId] as const,
    queryFn: ({ signal }) =>
      api<{ data: MergePreview }>(`/${MERGE_PATH[kind]}/${intoId}/merge?from_id=${fromId}`, { signal }).then(
        (r) => r.data,
      ),
    enabled: fromId !== null,
    retry: false,
  })
}

export function useMerge(kind: 'outlet' | 'product', intoId: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (input: { from_id: string; reason?: string }) =>
      api(`/${MERGE_PATH[kind]}/${intoId}/merge`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}
