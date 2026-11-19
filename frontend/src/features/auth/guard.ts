import { redirect } from '@tanstack/react-router'
import { type Area, areaHome, useSession } from '@/stores/session'

/**
 * Used in the beforeLoad of area routes. Not signed in → /login.
 * Wrong area → moved to their own area (sales cannot open office screens, and vice versa).
 */
export function requireArea(area: Area) {
  const { user } = useSession.getState()
  if (!user) throw redirect({ to: '/login' })
  if (user.area !== area) throw redirect({ to: areaHome(user.area) })
}
