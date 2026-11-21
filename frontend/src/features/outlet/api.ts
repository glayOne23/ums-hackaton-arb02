import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toQueryString } from '@/lib/api/query'
import type { AssignmentFormInput, OutletFormInput } from './schemas'
import { toOutletPayload } from './schemas'
import type { Assignee, Outlet, OutletFilters, OutletOverview, OutletProposal, Paginated, Reference } from './types'

export const outletKeys = {
  all: ['outlets'] as const,
  list: (filters: OutletFilters & { per_page?: number }) => ['outlets', 'list', filters] as const,
  detail: (id: string) => ['outlets', 'detail', id] as const,
  similar: (params: SimilarParams) => ['outlets', 'similar', params] as const,
  assignees: ['outlets', 'assignees'] as const,
  regions: ['regions'] as const,
  outletTypes: ['outlet-types'] as const,
  overview: (id: string) => ['outlets', 'overview', id] as const,
  proposals: (mine: boolean) => ['outlets', 'proposals', mine] as const,
}

const query = toQueryString

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
    // Not awaited: the trash list empties on refetch and unmounts the row, whose
    // own onSuccess (go to the restored outlet) must still run
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: outletKeys.all })
    },
  })
}

/** OT-03: shelf, visits, and what the outlet still owes, for the profile page. */
export function useOutletOverview(id: string) {
  return useQuery({
    queryKey: outletKeys.overview(id),
    queryFn: ({ signal }) => api<{ data: OutletOverview }>(`/outlets/${id}/overview`, { signal }).then((r) => r.data),
  })
}

/** OT-07: save the stok standar per product; empty clears it. */
export function useSaveStockTargets(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targets: { product_id: string; target_qty: number | null }[]) =>
      api<{ data: OutletOverview; changed: number }>(`/outlets/${id}/stock-targets`, {
        method: 'PUT',
        body: { targets },
      }),
    networkMode: 'always',
    onSuccess: (r) => {
      queryClient.setQueryData(outletKeys.overview(id), r.data)
      return queryClient.invalidateQueries({ queryKey: ['correction', 'history'] })
    },
  })
}

/**
 * OT-05: for the office, proposals waiting for a decision; for a sales (or
 * with `mine`), their own proposals and what became of them.
 */
export function useOutletProposals(mine = false, enabled = true) {
  return useQuery({
    queryKey: outletKeys.proposals(mine),
    queryFn: ({ signal }) =>
      api<{ data: OutletProposal[] }>(`/outlet-proposals${mine ? '?mine=1' : ''}`, { signal }).then((r) => r.data),
    enabled,
  })
}

export function useProposeOutlet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OutletFormInput & { note?: string }) =>
      api<{ data: OutletProposal }>('/outlet-proposals', {
        method: 'POST',
        body: { ...toOutletPayload(input), note: input.note || null },
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outlets', 'proposals'] }),
  })
}

export function useDecideProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approve' | 'reject'; note?: string }) =>
      api<{ data: OutletProposal }>(`/outlet-proposals/${id}/${decision}`, { method: 'POST', body: { note } }).then(
        (r) => r.data,
      ),
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outletKeys.all }),
  })
}
