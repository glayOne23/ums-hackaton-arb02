import { Cloud, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Connection status in the screen header (UI guide §7.7). No "offline"/"sync" wording on screen. */
export function ConnectionStatus() {
  const isOnline = useOnlineStatus()

  return isOnline ? (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-muted-foreground [[data-surface=brand]_&]:bg-white/10"
      title="Tersambung"
    >
      <Cloud className="size-4" aria-hidden />
      <span className="max-sm:sr-only">Tersambung</span>
    </span>
  ) : (
    <span
      role="status"
      className="flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-sm text-info-text"
    >
      <CloudOff className="size-4" aria-hidden />
      Tersimpan di HP
    </span>
  )
}
