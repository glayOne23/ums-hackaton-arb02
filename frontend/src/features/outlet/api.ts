import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { AssignmentFormInput, OutletFormInput } from './schemas'
import { toOutletPayload } from './schemas'
import type { Assignee, Outlet, OutletFilters, Paginated, Reference } from './types'

export const outletKeys = {
  all: ['outlets'] as const,
  list: (filters: OutletFilters & { per_page?: number }) => ['outlets', 'list', filters] as const,
  detail: (id: string) => ['outlets', 'detail', id] as const,
  similar: (params: SimilarParams) => ['outlets', 'similar', params] as const,
  assignees: ['outlets', 'assignees'] as const,
  regions: ['regions'] as const,
  outletTypes: ['outlet-types'] as const,
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function useOutlets(filters: OutletFilters & { per_page?: number }) {
  return useQuery({
    queryKey: outletKeys.list(filters),
    queryFn: ({ signal }) => api<Paginated<Outlet>>(`/outlets${query({ ...filters })}`, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useOutlet(id: string) {
  return useQuery({
    queryKey: outletKeys.detail(id),
    queryFn: ({ signal }) => api<{ data: Outlet }>(`/outlets/${id}`, { signal }).then((r) => r.data),
  })
}

export function useRegions() {
  return useQuery({
    queryKey: outletKeys.regions,
    queryFn: ({ signal }) => api<{ data: Reference[] }>('/regions', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

export function useOutletTypes() {
  return useQuery({
    queryKey: outletKeys.outletTypes,
    queryFn: ({ signal }) => api<{ data: Reference[] }>('/outlet-types', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

export function useAssignees() {
  return useQuery({
    queryKey: outletKeys.assignees,
    queryFn: ({ signal }) => api<{ data: Assignee[] }>('/outlets/assignees', { signal }).then((r) => r.data),
  })
}

export interface SimilarParams {
  name: string
  region_id: string
  district: string
  except_id?: string
}

/** OT-02: similar outlets in the same district. Only runs once name and region are filled. */
export function useSimilarOutlets(params: SimilarParams) {
  const enabled = params.name.trim().length >= 3 && params.region_id !== ''

  return useQuery({
    queryKey: outletKeys.similar(params),
    queryFn: ({ signal }) =>
      api<{ data: Outlet[] }>(`/outlets/similar${query({ ...params })}`, {
        signal,
      }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })
}

export function useSaveOutlet(id?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OutletFormInput) =>
      api<{ data: Outlet }>(id ? `/outlets/${id}` : '/outlets', {
        method: id ? 'PATCH' : 'POST',
        body: toOutletPayload(input),
      }).then((r) => r.data),
    networkMode: 'always',
    // Lists and the profile (which also holds assignment history) are refetched
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outletKeys.all }),
  })
}

export function useAssignOutlet(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AssignmentFormInput) =>
      api<{ data: Outlet }>(`/outlets/${id}/assignments`, {
        method: 'PUT',
        body: {
          sales_user_ids: input.sales_user_ids,
          reason: input.reason || null,
        },
      }).then((r) => r.data),
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outletKeys.all }),
  })
}

/** Move an outlet to the trash. */
export function useDeleteOutlet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api<void>(`/outlets/${id}`, { method: 'DELETE' }),
    networkMode: 'always',
    onSuccess: (_, id) => {
      // Drop the profile instead of refetching it: it would answer 404 while the page is still open
      queryClient.removeQueries({ queryKey: outletKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: ['outlets', 'list'] })
    },
  })
}

/**
 * Plain function, not a hook: the "Urungkan" button of the delete toast runs
 * after the profile page has already closed.
 */
export function restoreOutlet(id: string): Promise<Outlet> {
  return api<{ data: Outlet }>(`/outlets/${id}/restore`, { method: 'POST' }).then((r) => r.data)
}

/** Take an outlet out of the trash. */
export function useRestoreOutlet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: restoreOutlet,
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outletKeys.all }),
  })
}
