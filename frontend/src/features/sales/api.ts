import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { api, apiBlobUrl } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import { PERSIST_MAX_AGE } from '@/lib/offline/persister'
import { useSession } from '@/stores/session'
import { type Receipt, salesDb } from './offline/db'
import { applyPending } from './offline/pending'
import { flushReceipts } from './offline/sync'
import type { Paginated, Transaction, WorkPackage } from './types'

export const salesKeys = {
  // "offline" first: kept on the phone (lib/offline/persister)
  workPackage: (userId: number) => ['offline', 'work-package', userId] as const,
  transactions: (filters: TransactionFilters) => ['sales', 'transactions', filters] as const,
  transaction: (id: string) => ['sales', 'transaction', id] as const,
  photo: (id: string) => ['sales', 'photo', id] as const,
}

function useUserId(): number {
  return useSession((s) => s.user?.id ?? 0)
}

/** The sales' receipts on this phone, newest first (live: updates when one is sent). */
export function useReceipts(): Receipt[] | undefined {
  const userId = useUserId()
  return useLiveQuery(
    async () => (await salesDb.receipts.where('user_id').equals(userId).sortBy('created_at')).reverse(),
    [userId],
  )
}

export function useReceipt(clientUuid: string): Receipt | null | undefined {
  return useLiveQuery(async () => (await salesDb.receipts.get(clientUuid)) ?? null, [clientUuid])
}

/**
 * The work package with the visits saved on this phone already applied, so
 * the screens are right even before they reach the server.
 */
export function useWorkPackage() {
  const userId = useUserId()
  const query = useQuery({
    queryKey: salesKeys.workPackage(userId),
    queryFn: ({ signal }) => api<{ data: WorkPackage }>('/sales/work-package', { signal }).then((r) => r.data),
    staleTime: 5 * 60_000,
    gcTime: PERSIST_MAX_AGE,
    enabled: userId > 0,
  })
  const receipts = useReceipts()
  const data = useMemo(
    () => (query.data && receipts ? applyPending(query.data, receipts) : undefined),
    [query.data, receipts],
  )

  return { ...query, data }
}

/** Save a visit or sale on the phone, then try to send it right away. */
export function useSaveReceipt() {
  const queryClient = useQueryClient()
  return async (receipt: Receipt) => {
    await salesDb.receipts.put(receipt)
    void flushReceipts(queryClient, receipt.user_id)
  }
}

export interface TransactionFilters {
  page?: number
  from?: string
  to?: string
  needs_review?: boolean
  type?: string
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: salesKeys.transactions(filters),
    queryFn: ({ signal }) =>
      api<Paginated<Transaction>>(
        `/sales/transactions${toQueryString({ page: filters.page, from: filters.from, to: filters.to, type: filters.type, needs_review: filters.needs_review ? 1 : undefined })}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: salesKeys.transaction(id),
    queryFn: ({ signal }) => api<{ data: Transaction }>(`/sales/transactions/${id}`, { signal }).then((r) => r.data),
  })
}

/** The form photo as an object URL (the API needs the session token, so no plain <img src>). */
export function useTransactionPhoto(id: string, enabled: boolean) {
  return useQuery({
    queryKey: salesKeys.photo(id),
    queryFn: ({ signal }) => apiBlobUrl(`/sales/transactions/${id}/photo`, signal),
    enabled,
    staleTime: Infinity,
  })
}
