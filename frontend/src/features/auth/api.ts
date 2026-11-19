import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
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

export function useLogin() {
  const save = useSession((s) => s.save)

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { login: input.login, password: input.password, device_name: deviceName() },
      }),
    // Signing in always needs a signal; never queue it while offline
    networkMode: 'always',
    onSuccess: ({ token, user }) => save(token, user),
  })
}

export function useLogout() {
  const clear = useSession((s) => s.clear)

  return useMutation({
    // Sign out on the device even when the server cannot be reached
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    networkMode: 'always',
    onSettled: () => clear(),
  })
}
