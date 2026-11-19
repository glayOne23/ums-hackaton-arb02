import { createFileRoute, redirect } from '@tanstack/react-router'
import { areaHome, useSession } from '@/stores/session'

// "/" only redirects: not signed in → /login; sales → /field; other roles → /office
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { user } = useSession.getState()
    if (!user) throw redirect({ to: '/login' })
    throw redirect({ to: areaHome(user.area) })
  },
})
