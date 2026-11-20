import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { areaHome, useSession } from '@/stores/session'
import { useCurrentUser } from '../api'

const AREA_PATHS = ['/field', '/office'] as const

/**
 * Keeps the screen in step with the session. Route guards only run on navigation,
 * so this covers what happens while a screen is already open:
 * - the server rejects the token (401) or the user signs out → back to /login,
 *   and cached data of the previous user is dropped;
 * - the latest user from /auth/me is saved, and a user whose area changed
 *   (e.g. an admin gave them another role) is moved to their own area.
 */
export function SessionWatcher() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const user = useSession((s) => s.user)
  const updateUser = useSession((s) => s.updateUser)
  const { data: latestUser } = useCurrentUser()

  useEffect(() => {
    if (latestUser) updateUser(latestUser)
  }, [latestUser, updateUser])

  useEffect(() => {
    const inArea = AREA_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    if (!inArea) return

    if (!user) {
      queryClient.clear()
      navigate({ to: '/login', replace: true })
      return
    }

    const home = areaHome(user.area)
    if (pathname !== home && !pathname.startsWith(`${home}/`)) {
      navigate({ to: home, replace: true })
    }
  }, [user, pathname, navigate, queryClient])

  return null
}
