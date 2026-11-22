import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/features/auth/api'
import { api } from '@/lib/api/client'
import type { AccessChange, Area, RoleItem, RolesResponse, UserInput, UserItem } from './types'

export const accessKeys = {
  all: ['access'] as const,
  roles: ['access', 'roles'] as const,
  users: (filters: UserFilters) => ['access', 'users', filters] as const,
  history: ['access', 'history'] as const,
}

export interface UserFilters {
  search: string
  role: string
  status: 'all' | 'active' | 'inactive'
}

/**
 * Any change here can change what the signed-in admin may do, so their own
 * /auth/me is fetched again together with the lists.
 */
function useInvalidateAccess() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accessKeys.all }),
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
    ])
}

export function useRoles() {
  return useQuery({
    queryKey: accessKeys.roles,
    queryFn: ({ signal }) => api<RolesResponse>('/roles', { signal }),
  })
}

export function useSaveRole() {
  const invalidate = useInvalidateAccess()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id?: number
      label?: string
      description?: string | null
      area?: Area
      permissions?: string[]
      copy_from?: number | null
    }) => api<{ data: RoleItem }>(id ? `/roles/${id}` : '/roles', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => void invalidate(),
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateAccess()
  return useMutation({
    mutationFn: (id: number) => api<null>(`/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  })
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: accessKeys.users(filters),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.role) params.set('role', filters.role)
      params.set('status', filters.status)
      return api<{ data: UserItem[] }>(`/users?${params}`, { signal }).then((r) => r.data)
    },
    placeholderData: (previous) => previous,
  })
}

export function useSaveUser() {
  const invalidate = useInvalidateAccess()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<UserInput> & { id?: number }) =>
      api<{ data: UserItem }>(id ? `/users/${id}` : '/users', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => void invalidate(),
  })
}

export function useResetPassword() {
  const invalidate = useInvalidateAccess()
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api<{ message: string }>(`/users/${id}/password`, { method: 'POST', body: { password } }),
    onSuccess: () => void invalidate(),
  })
}

export function useAccessHistory(enabled: boolean) {
  return useQuery({
    queryKey: accessKeys.history,
    queryFn: ({ signal }) => api<{ data: AccessChange[] }>('/users/history', { signal }).then((r) => r.data),
    enabled,
  })
}

/**
 * A password the admin can read out or send by WhatsApp: no look-alike
 * characters (0/O, 1/l/I), 10 characters long.
 */
export function generatePassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
