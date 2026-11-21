import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

/** How often an open app asks whether a new version was deployed */
const CHECK_EVERY_MS = 60 * 60_000

/**
 * PW-09: a new version is ready → "Muat ulang". The app never reloads by
 * itself, so a visit being typed is never lost; the new version waits until
 * the user taps the button (or the app is closed and opened again).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg print:hidden"
    >
      <RefreshCw className="size-5 shrink-0 text-leaf-700" aria-hidden />
      <p className="min-w-0 flex-1">Versi baru SIGAP tersedia.</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
          Nanti
        </Button>
        <Button onClick={() => void updateServiceWorker(true)}>Muat ulang</Button>
      </div>
    </div>
  )
}
