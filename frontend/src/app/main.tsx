import '@fontsource-variable/inter'
import '@/styles/globals.css'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { trackLastSync } from '@/lib/offline/lastSync'
import { applyPreferences } from '@/lib/preferences'
import { PERSIST_MAX_AGE, queryPersister, shouldPersistQuery } from '@/lib/offline/persister'
import { routeTree } from '@/routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    // Last data stays visible without a signal (PW-07); refetches when back online
    queries: { staleTime: 60_000, networkMode: 'offlineFirst' },
  },
})

// UX-08: bigger text / high contrast chosen on this device, before the first paint
applyPreferences()

// PW-07: "data per jam …" on screens opened without a signal
trackLastSync(queryClient)

const router = createRouter({ routeTree, context: { queryClient } })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* What was last opened survives closing the app without a signal (PW-05, PW-07); see lib/offline/persister */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      // Restored data shows at once, but counts as old: it is fetched again as soon as there is a signal,
      // so a reload never hides what changed meanwhile (not awaited, so the screen does not wait for it)
      onSuccess={() => {
        void queryClient.invalidateQueries()
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
)
