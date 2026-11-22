import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Screen area after signing in: "field" = sales phone screens, "office" = admin/warehouse/manager. */
export type Area = 'field' | 'office'

export interface User {
  id: number
  name: string
  username: string
  phone: string | null
  roles: string[]
  /** UI labels for `roles`, sent by the API. Optional: sessions saved before it existed lack it. */
  role_labels?: string[]
  permissions: string[]
  /** FP-07: features rolled out to this user. Missing in sessions saved before flags existed */
  features?: string[]
  area: Area
}

interface SessionState {
  token: string | null
  user: User | null
  save: (token: string, user: User) => void
  updateUser: (user: User) => void
  clear: () => void
}

/**
 * The session is kept on the device so sales staff stay signed in even when the
 * app is closed or there is no signal (AK-01). Cleared on sign out.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      save: (token, user) => set({ token, user }),
      updateUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: 'sigap-session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
)

/** Permission check for the UI. The server still checks every request. */
export function hasPermission(permission: string): boolean {
  return useSession.getState().user?.permissions.includes(permission) ?? false
}

export function usePermission(permission: string): boolean {
  return useSession((s) => s.user?.permissions.includes(permission) ?? false)
}

/**
 * FP-07: is a step-by-step feature on for this user? A session saved before
 * flags existed has no list yet: treat every feature as on until /auth/me refreshes it.
 */
export function useFeature(feature: string): boolean {
  return useSession((s) => s.user?.features?.includes(feature) ?? true)
}

/** Area home path, used after signing in and when redirecting from the wrong area. */
export function areaHome(area: Area): '/field' | '/office' {
  return area === 'field' ? '/field' : '/office'
}
