import '@fontsource-variable/inter'
import '@/styles/globals.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routeTree } from '@/routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    // Data terakhir tetap tampil saat tanpa sinyal (PW-07); refetch saat online kembali
    queries: { staleTime: 60_000, networkMode: 'offlineFirst' },
  },
})

const router = createRouter({ routeTree, context: { queryClient } })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
