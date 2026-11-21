import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type {
  GoodsReceipt,
  Paginated,
  ProductRef,
  ReturnConditionValue,
  SalesStock,
  StockAdjustment,
  StockCard,
  StockRequest,
  StockReturn,
  UserOption,
  WarehouseStock,
} from './types'

/** Every stock change refreshes all inventory screens (and nothing else). */
const ROOT = ['inventory'] as const

export const inventoryKeys = {
  stock: [...ROOT, 'stock'] as const,
  salesStock: (salesUserId?: number) => [...ROOT, 'sales-stock', salesUserId ?? 'me'] as const,
  card: (productId: string, from: string, to: string, batchId?: string) =>
    [...ROOT, 'card', productId, from, to, batchId ?? ''] as const,
  receipts: (page: number) => [...ROOT, 'receipts', page] as const,
  requests: (status: string) => [...ROOT, 'requests', status] as const,
  returns: (page: number) => [...ROOT, 'returns', page] as const,
  adjustments: [...ROOT, 'adjustments'] as const,
  today: (batchIds: string[]) => [...ROOT, 'today', batchIds] as const,
}

function useInvalidateInventory() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ROOT })
}

export function useWarehouseStock() {
  return useQuery({
    queryKey: inventoryKeys.stock,
    queryFn: ({ signal }) => api<WarehouseStock>('/inventory/stock', { signal }),
  })
}

/** Without salesUserId: the signed-in sales' own stock. */
export function useSalesStock(salesUserId?: number, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.salesStock(salesUserId),
    queryFn: ({ signal }) =>
      api<SalesStock>(`/inventory/sales-stock${toQueryString({ sales_user_id: salesUserId })}`, { signal }),
    enabled,
  })
}

export function useStockCard(productId: string, from: string, to: string, batchId?: string) {
  return useQuery({
    queryKey: inventoryKeys.card(productId, from, to, batchId),
    queryFn: ({ signal }) =>
      api<StockCard>(`/inventory/stock-card${toQueryString({ product_id: productId, from, to, batch_id: batchId })}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useGoodsReceipts(page = 1) {
  return useQuery({
    queryKey: inventoryKeys.receipts(page),
    queryFn: ({ signal }) => api<Paginated<GoodsReceipt>>(`/inventory/goods-receipts?page=${page}`, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useStockRequests(status: string) {
  return useQuery({
    queryKey: inventoryKeys.requests(status),
    queryFn: ({ signal }) =>
      api<Paginated<StockRequest>>(`/inventory/stock-requests${toQueryString({ status, per_page: 100 })}`, {
        signal,
      }).then((r) => r.data),
  })
}

export function useStockReturns(page = 1) {
  return useQuery({
    queryKey: inventoryKeys.returns(page),
    queryFn: ({ signal }) => api<Paginated<StockReturn>>(`/inventory/returns?page=${page}`, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useStockAdjustments() {
  return useQuery({
    queryKey: inventoryKeys.adjustments,
    queryFn: ({ signal }) =>
      api<Paginated<StockAdjustment>>('/inventory/adjustments?per_page=50', { signal }).then((r) => r.data),
  })
}

/** What moved today for some batches (shown next to a count difference). */
export function useTodayMovements(batchIds: string[]) {
  return useQuery({
    queryKey: inventoryKeys.today(batchIds),
    queryFn: ({ signal }) =>
      api<{ data: Record<string, string[]> }>(
        `/inventory/adjustments/today?${batchIds.map((id) => `batch_ids[]=${encodeURIComponent(id)}`).join('&')}`,
        { signal },
      ).then((r) => r.data),
    enabled: batchIds.length > 0,
  })
}

/** Products to pick from (read-only use of the Product API). */
export function useProductOptions() {
  return useQuery({
    queryKey: ['products', 'options'],
    queryFn: ({ signal }) =>
      api<{ data: (ProductRef & { unit: string })[] }>('/products?per_page=500&sort=name', { signal }).then(
        (r) => r.data,
      ),
    staleTime: 5 * 60_000,
  })
}

export function useSalesUsers() {
  return useQuery({
    queryKey: [...ROOT, 'sales-users'],
    queryFn: ({ signal }) => api<{ data: UserOption[] }>('/inventory/sales-users', { signal }).then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}

export interface ReceiptLineInput {
  product_id: string
  batch_number: string
  expiry_date: string
  qty: number
}

export function useReceiveGoods() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: { received_date: string; note: string; items: ReceiptLineInput[] }) =>
      api<{ data: GoodsReceipt }>('/inventory/goods-receipts', { method: 'POST', body }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

export function useSubmitStockRequest() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: { note: string; items: { product_id: string; qty: number }[] }) =>
      api<{ data: StockRequest }>('/inventory/stock-requests', { method: 'POST', body }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

type RequestAction =
  | { id: string; action: 'prepare'; body: { note: string; items: { id: string; issued_qty: number }[] } }
  | { id: string; action: 'approve' }
  | { id: string; action: 'reject'; body: { note: string } }
  | { id: string; action: 'revert-status'; body: { reason: string } }

export function useStockRequestAction() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (input: RequestAction) =>
      api<{ data: StockRequest }>(`/inventory/stock-requests/${input.id}/${input.action}`, {
        method: 'POST',
        body: 'body' in input ? input.body : undefined,
      }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

/** KR-04: void goods received by mistake; the stock leaves the warehouse again. */
export function useVoidGoodsReceipt() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<{ data: GoodsReceipt }>(`/inventory/goods-receipts/${id}/void`, { method: 'POST', body: { reason } }).then(
        (r) => r.data,
      ),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

export function useReceiveReturn() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: {
      sales_user_id: number
      note: string
      items: { product_id: string; qty: number; condition: ReturnConditionValue }[]
    }) => api<{ data: StockReturn }>('/inventory/returns', { method: 'POST', body }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

export function useSaveStockCount() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (body: { reason: string; items: { batch_id: string; physical_qty: number }[] }) =>
      api<{ data: StockAdjustment }>('/inventory/adjustments', { method: 'POST', body }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

/** KR-13: open today's count again; its difference is reversed. */
export function useReopenAdjustment() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api<{ data: StockAdjustment }>(`/inventory/adjustments/${id}/reopen`, { method: 'POST', body: { reason } }).then(
        (r) => r.data,
      ),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

export function useDecideAdjustment() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      api<{ data: StockAdjustment }>(`/inventory/adjustments/${id}/${approve ? 'approve' : 'reject'}`, {
        method: 'POST',
        body: { note },
      }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}
