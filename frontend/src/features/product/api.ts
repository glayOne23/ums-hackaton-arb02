import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlobUrl } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { DiscountFormInput, ProductFormInput } from './schemas'
import { toDiscountPayload, toProductPayload } from './schemas'
import type {
  Category,
  Discount,
  DiscountStatusFilter,
  Paginated,
  PriceList,
  Product,
  ProductFilters,
  Ref,
} from './types'

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters & { per_page?: number }) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  categories: ['product-categories'] as const,
  discounts: ['discounts'] as const,
  discountList: (status: DiscountStatusFilter) => ['discounts', 'list', status] as const,
  priceList: (outletTypeId: string, date: string) => ['price-list', outletTypeId, date] as const,
}

export function useProducts(filters: ProductFilters & { per_page?: number }) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ signal }) => api<Paginated<Product>>(`/products${toQueryString({ ...filters })}`, { signal }),
    placeholderData: keepPreviousData,
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

export function useSaveProduct(id?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProductFormInput) =>
      api<{ data: Product }>(id ? `/products/${id}` : '/products', {
        method: id ? 'PATCH' : 'POST',
        body: toProductPayload(input),
      }).then((r) => r.data),
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

export function useDiscounts(status: DiscountStatusFilter) {
  return useQuery({
    queryKey: productKeys.discountList(status),
    queryFn: ({ signal }) =>
      api<Paginated<Discount>>(`/discounts${toQueryString({ status, per_page: 200 })}`, { signal }).then((r) => r.data),
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
