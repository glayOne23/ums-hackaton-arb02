import '@fontsource-variable/inter'
import '@/styles/globals.css'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PERSIST_MAX_AGE, queryPersister, shouldPersistQuery } from '@/lib/offline/persister'
import { routeTree } from '@/routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    // Last data stays visible without a signal (PW-07); refetches when back online
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
    {/* Field data survives closing the app without a signal (PW-05); see lib/offline/persister */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
)
