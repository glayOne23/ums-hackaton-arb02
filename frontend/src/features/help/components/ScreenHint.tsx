import { useRouterState } from '@tanstack/react-router'
import { Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/preferences'
import { useSession } from '@/stores/session'
import { hintFor } from '../hints'
import { markHintSeen, useSeenHints } from '../seen'

/**
 * UX-09: a short tip the first time a screen is opened. "Mengerti" closes it
 * for good on this device; "Bantuan" brings all tips back or turns them off.
 */
export function ScreenHint() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const userId = useSession((s) => s.user?.id ?? 0)
  const seen = useSeenHints(userId)
  const { hintsOff } = usePreferences()
  const hint = hintFor(pathname)

  if (!hint || hintsOff || seen.includes(hint.id)) return null

  return (
    <aside
      aria-label={`Petunjuk: ${hint.title}`}
      className="flex items-start gap-3 rounded-lg border border-info-text/20 bg-info-soft p-3 text-info-text print:hidden"
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p>
          <span className="font-semibold">{hint.title}.</span> {hint.text}
        </p>
        <Button variant="outline" className="self-start" onClick={() => markHintSeen(userId, hint.id)}>
          Mengerti
        </Button>
      </div>
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-info-text/10"
        aria-label="Tutup petunjuk"
        onClick={() => markHintSeen(userId, hint.id)}
      >
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  )
}
