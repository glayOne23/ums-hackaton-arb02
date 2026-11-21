import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { forgetLastSync } from '@/lib/offline/lastSync'
import { queryPersister } from '@/lib/offline/persister'
import { type User, useSession } from '@/stores/session'
import type { LoginInput } from './schemas'

interface LoginResponse {
  token: string
  user: User
}

/** Device name that admins can recognize in the session list, e.g. "HP Android". */
export function deviceName(userAgent: string = navigator.userAgent): string {
  if (/android/i.test(userAgent)) return /mobile/i.test(userAgent) ? 'HP Android' : 'Tablet Android'
  if (/iphone/i.test(userAgent)) return 'iPhone'
  if (/ipad/i.test(userAgent)) return 'iPad'
  if (/windows/i.test(userAgent)) return 'PC Windows'
  if (/mac os/i.test(userAgent)) return 'Mac'
  if (/linux/i.test(userAgent)) return 'PC Linux'
  return 'Perangkat lain'
}

/**
 * PW-07 keeps what each person opened on the device. A sign-in or sign-out
 * starts clean, so the next person on a shared device never sees it.
 * (Unsent visits and warehouse documents are separate and stay to be sent.)
 */
async function forgetCachedData(queryClient: QueryClient): Promise<void> {
  queryClient.clear()
  forgetLastSync()
  await queryPersister.removeClient()
}

export function useLogin() {
  const save = useSession((s) => s.save)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { login: input.login, password: input.password, device_name: deviceName() },
      }),
    // Signing in always needs a signal; never queue it while offline
    networkMode: 'always',
    onSuccess: async ({ token, user }) => {
      await forgetCachedData(queryClient)
      save(token, user)
    },
  })
}

export const currentUserQueryKey = ['auth', 'me'] as const

/**
 * The signed-in user as the server sees it now. Refetched when the app opens or
 * regains focus, so role or permission changes made by an admin reach the device
 * without signing in again. Paused without a signal (the saved user is used).
 */
export function useCurrentUser() {
  const token = useSession((s) => s.token)

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => api<{ data: User }>('/auth/me', { signal }).then((response) => response.data),
    enabled: token !== null,
    retry: false,
  })
}

export function useLogout() {
  const clear = useSession((s) => s.clear)
  const queryClient = useQueryClient()

  return useMutation({
    // Sign out on the device even when the server cannot be reached
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    networkMode: 'always',
    onSettled: async () => {
      clear()
      await forgetCachedData(queryClient)
    },
  })
}
