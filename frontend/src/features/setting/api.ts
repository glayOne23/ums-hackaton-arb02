import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { ReferenceItem, SettingChange, SettingsResponse, SettingValue } from './types'

export const settingKeys = {
  all: ['settings'] as const,
  history: ['settings', 'history'] as const,
  list: (path: string) => ['settings', 'list', path] as const,
}

export function useSettings() {
  return useQuery({
    queryKey: settingKeys.all,
    queryFn: ({ signal }) => api<SettingsResponse>('/settings', { signal }),
  })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, SettingValue>) =>
      api<SettingsResponse>('/settings', { method: 'PATCH', body: { values } }),
    onSuccess: (data) => {
      queryClient.setQueryData(settingKeys.all, data)
      return queryClient.invalidateQueries({ queryKey: settingKeys.history })
    },
  })
}

export function useSettingHistory(enabled: boolean) {
  return useQuery({
    queryKey: settingKeys.history,
    queryFn: ({ signal }) => api<{ data: SettingChange[] }>('/settings/history', { signal }).then((r) => r.data),
    enabled,
  })
}

/**
 * Lists kept by other modules but changed here (PG-05): regions, outlet
 * types, product categories. They share one API shape.
 */
export const REFERENCE_LISTS = [
  { path: '/outlet-types', title: 'Jenis outlet', placeholder: 'Misalnya: Apotek' },
  { path: '/regions', title: 'Wilayah (kabupaten/kota)', placeholder: 'Misalnya: Kab. Klaten' },
  { path: '/product-categories', title: 'Kategori produk', placeholder: 'Misalnya: Madu' },
] as const

export function useReferenceList(path: string) {
  return useQuery({
    queryKey: settingKeys.list(path),
    queryFn: ({ signal }) => api<{ data: ReferenceItem[] }>(`${path}?status=all`, { signal }).then((r) => r.data),
  })
}

export function useSaveReference(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name?: string; is_active?: boolean }) =>
      api<{ data: ReferenceItem }>(id ? `${path}/${id}` : path, { method: id ? 'PATCH' : 'POST', body }),
    // The outlet and product forms read the same lists under their own keys
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
