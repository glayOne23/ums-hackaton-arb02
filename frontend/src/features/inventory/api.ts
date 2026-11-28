import type { VoidResult } from '@/lib/void-request'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { sendOrQueue } from '@/lib/offline/outbox'
import { useSession } from '@/stores/session'
import { toQueryString } from '@/lib/api/query'
import type {
  GoodsReceipt,
  LocationMovements,
  MovementFilters,
  MovementOptions,
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
  movements: (filters: MovementFilters) => [...ROOT, 'movements', filters] as const,
}

/** Stock in and out of the warehouse, an outlet, or a bag over a period. */
export function useLocationMovements(filters: MovementFilters, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: ({ signal }) => api<LocationMovements>(`/inventory/movements${toQueryString({ ...filters })}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMovementOptions() {
  return useQuery({
    queryKey: [...ROOT, 'movement-options'],
    queryFn: ({ signal }) => api<MovementOptions>('/inventory/movement-options', { signal }),
    staleTime: 5 * 60_000,
  })
}

function useInvalidateInventory() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ROOT })
}

export function useWarehouseStock(enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.stock,
    queryFn: ({ signal }) => api<WarehouseStock>('/inventory/stock', { signal }),
    enabled,
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

/** PW-06: saved on the device when there is no signal, sent once it is back (lib/offline/outbox). */
export function useReceiveGoods() {
  const invalidate = useInvalidateInventory()
  const userId = useSession((s) => s.user?.id ?? 0)
  return useMutation({
    mutationFn: (body: { received_date: string; note: string; items: ReceiptLineInput[] }) =>
      sendOrQueue<GoodsReceipt>({
        userId,
        kind: 'goods_receipt',
        label: `Barang masuk ${body.received_date} · ${body.items.length} produk`,
        path: '/inventory/goods-receipts',
        body,
      }),
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
  | {
      id: string
      action: 'prepare'
      body: {
        note: string
        // Doc 11: batches confirmed on the pick list; left out = nearest expiry
        items: { id: string; issued_qty: number; allocations?: { batch_id: string; qty: number }[] }[]
      }
    }
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

export interface ExpiryCheckResult {
  id: string
  number: string
  is_match: boolean
  corrected_qty: number
}

/** Doc 11: the sales counts their bag per ED (needs a signal); the batches follow the count. */
export function useBagExpiryCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      client_uuid: string
      trigger: 'receipt' | 'manual'
      stock_request_id?: string
      items: { product_id: string; expiry: { month: string; qty: number }[] }[]
    }) => api<{ data: ExpiryCheckResult }>('/inventory/expiry-checks', { method: 'POST', body }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT })
      // The work package carries the bag per ED for the visit screen
      void queryClient.invalidateQueries({ queryKey: ['offline', 'work-package'] })
    },
  })
}

/** KR-04: void goods received by mistake; the stock leaves the warehouse again. */
export function useVoidGoodsReceipt() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<VoidResult<GoodsReceipt>>(`/inventory/goods-receipts/${id}/void`, { method: 'POST', body: { reason } }),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

/** KR-04: void a return entered by mistake; the goods go back to the sales. */
export function useVoidStockReturn() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<VoidResult<StockReturn>>(`/inventory/returns/${id}/void`, { method: 'POST', body: { reason } }),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

/** PW-06: saved on the device when there is no signal, sent once it is back. */
export function useReceiveReturn() {
  const invalidate = useInvalidateInventory()
  const userId = useSession((s) => s.user?.id ?? 0)
  return useMutation({
    mutationFn: (body: {
      sales_user_id: number
      note: string
      items: { product_id: string; qty: number; condition: ReturnConditionValue }[]
      /** Who it is from, for the list of documents waiting on the device */
      sales_name?: string
    }) =>
      sendOrQueue<StockReturn>({
        userId,
        kind: 'return',
        label: `Retur dari ${body.sales_name ?? 'sales'} · ${body.items.length} produk`,
        path: '/inventory/returns',
        body: { sales_user_id: body.sales_user_id, note: body.note, items: body.items },
      }),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

/** PW-06: saved on the device when there is no signal, sent once it is back (the server compares with its stock then). */
export function useSaveStockCount() {
  const invalidate = useInvalidateInventory()
  const userId = useSession((s) => s.user?.id ?? 0)
  return useMutation({
    mutationFn: (body: { reason: string; items: { batch_id: string; physical_qty: number }[] }) =>
      sendOrQueue<StockAdjustment>({
        userId,
        kind: 'stock_count',
        label: `Opname · ${body.items.length} selisih`,
        path: '/inventory/adjustments',
        body,
      }),
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
