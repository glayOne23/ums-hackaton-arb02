import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { UpdatePrompt } from '@/components/layout/UpdatePrompt'
import { SessionWatcher } from '@/features/auth/components/SessionWatcher'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <SessionWatcher />
      <UpdatePrompt />
      <Outlet />
      <Toaster position="bottom-center" richColors closeButton />
    </>
  ),
})
