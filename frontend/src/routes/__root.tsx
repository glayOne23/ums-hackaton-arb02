import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { SessionWatcher } from '@/features/auth/components/SessionWatcher'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <SessionWatcher />
      <Outlet />
      <Toaster position="bottom-center" richColors closeButton />
    </>
  ),
})
