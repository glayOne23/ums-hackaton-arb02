import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlobUrl } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { DiscountFormInput, ProductFormInput } from './schemas'
import { toDiscountPayload, toProductPayload } from './schemas'
import type {
  Category,
  Discount,
  DiscountFilters,
  Paginated,
  PriceList,
  Product,
  ProductFilters,
  ProductStockBreakdown,
  ProductStockTotals,
  Ref,
} from './types'

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters & { per_page?: number }) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  categories: ['product-categories'] as const,
  discounts: ['discounts'] as const,
  discountList: (filters: DiscountFilters) => ['discounts', 'list', filters] as const,
  stock: (id: string) => ['products', 'stock', id] as const,
  priceList: (outletTypeId: string, date: string) => ['price-list', outletTypeId, date] as const,
}

export function useProducts(filters: ProductFilters & { per_page?: number }) {
  return useQuery({
    queryKey: productKeys.list(filters),
    // "stock" (product_id => totals) comes only for product.manage / inventory.view
    queryFn: ({ signal }) =>
      api<Paginated<Product> & { stock?: Record<string, ProductStockTotals> }>(
        `/products${toQueryString({ ...filters })}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

/** Where the product is now: warehouse batches, outlets holding it, sales carrying it. */
export function useProductStock(id: string, enabled: boolean) {
  return useQuery({
    queryKey: productKeys.stock(id),
    queryFn: ({ signal }) =>
      api<{ data: ProductStockBreakdown }>(`/products/${id}/stock`, { signal }).then((r) => r.data),
    enabled,
  })
}

/** PR-01: the product photo as an object URL; the version changes when it is replaced. */
export function useProductPhoto(id: string, version: number | null) {
  return useQuery({
    queryKey: [...productKeys.detail(id), 'photo', version] as const,
    queryFn: ({ signal }) => apiBlobUrl(`/products/${id}/photo`, signal),
    enabled: version !== null,
    staleTime: Infinity,
  })
}

export function useUploadProductPhoto(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (photo: Blob) => {
      const body = new FormData()
      body.append('photo', photo, 'produk.jpg')
      return api(`/products/${id}/photo`, { method: 'POST', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useRemoveProductPhoto(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api(`/products/${id}/photo`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => api<{ data: Product }>(`/products/${id}`, { signal }).then((r) => r.data),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: ({ signal }) => api<{ data: Category[] }>('/product-categories', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

/** Outlet types and outlets for the discount form (read-only use of the Outlet API). */
export function useOutletTypeOptions() {
  return useQuery({
    queryKey: ['outlet-types'],
    queryFn: ({ signal }) => api<{ data: Ref[] }>('/outlet-types', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

export function useOutletOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['outlets', 'options'],
    queryFn: ({ signal }) =>
      api<Paginated<Ref & { district: string }>>('/outlets?per_page=500&sort=name', { signal }).then((r) => r.data),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/**
 * What to do with the photo after saving: a Blob = upload it, null = remove it,
 * undefined = leave it. The photo is a separate request (PR-01), so a failed
 * upload does not lose the product data: it comes back as photoError.
 */
export type PhotoChange = Blob | null | undefined

export function useSaveProduct(id?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ input, photo }: { input: ProductFormInput; photo?: PhotoChange }) => {
      const product = await api<{ data: Product }>(id ? `/products/${id}` : '/products', {
        method: id ? 'PATCH' : 'POST',
        body: toProductPayload(input),
      }).then((r) => r.data)

      let photoError: string | null = null
      try {
        if (photo) {
          const body = new FormData()
          body.append('photo', photo, 'produk.jpg')
          await api(`/products/${product.id}/photo`, { method: 'POST', body })
        } else if (photo === null && product.has_photo) {
          await api(`/products/${product.id}/photo`, { method: 'DELETE' })
        }
      } catch (error) {
        photoError = error instanceof Error ? error.message : 'Foto tidak bisa disimpan.'
      }

      return { product, photoError }
    },
    networkMode: 'always',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api<void>(`/products/${id}`, { method: 'DELETE' }),
    networkMode: 'always',
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export function useRestoreProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api<{ data: Product }>(`/products/${id}/restore`, { method: 'POST' }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export function useDiscounts(filters: DiscountFilters) {
  return useQuery({
    queryKey: productKeys.discountList(filters),
    queryFn: ({ signal }) =>
      api<Paginated<Discount>>(
        `/discounts${toQueryString({
          status: filters.status ?? 'current',
          outlet_id: filters.outlet_id,
          product_id: filters.product_id,
          outlet_type_id: filters.outlet_type_id,
          per_page: 200,
        })}`,
        { signal },
      ).then((r) => r.data),
    placeholderData: (previous) => previous,
  })
}

/** Every discount change also changes prices */
function useInvalidateDiscounts() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: productKeys.discounts })
    queryClient.invalidateQueries({ queryKey: ['price-list'] })
  }
}

export function useSaveDiscount() {
  const invalidate = useInvalidateDiscounts()

  return useMutation({
    mutationFn: (input: DiscountFormInput) =>
      api<{ data: Discount }>('/discounts', { method: 'POST', body: toDiscountPayload(input) }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

type DiscountAction = { id: string; action: 'approve' | 'reject' | 'deactivate'; note?: string }

export function useDiscountAction() {
  const invalidate = useInvalidateDiscounts()

  return useMutation({
    mutationFn: ({ id, action, note }: DiscountAction) =>
      api<{ data: Discount }>(`/discounts/${id}/${action}`, {
        method: 'POST',
        body: note === undefined ? undefined : { note },
      }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: invalidate,
  })
}

export function usePriceList(outletTypeId: string, date: string) {
  return useQuery({
    queryKey: productKeys.priceList(outletTypeId, date),
    queryFn: ({ signal }) =>
      api<PriceList>(`/price-list${toQueryString({ outlet_type_id: outletTypeId, date })}`, { signal }),
    enabled: outletTypeId !== '',
  })
}
