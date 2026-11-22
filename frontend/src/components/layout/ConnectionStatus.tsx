import { Cloud, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { t } from '@/i18n'

/** Connection status in the screen header (UI guide §7.7). No "offline"/"sync" wording on screen. */
export function ConnectionStatus() {
  const isOnline = useOnlineStatus()

  return isOnline ? (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-muted-foreground [[data-surface=brand]_&]:bg-white/10"
      title={t('connection.online')}
    >
      <Cloud className="size-4" aria-hidden />
      <span className="max-sm:sr-only">{t('connection.online')}</span>
    </span>
  ) : (
    <span
      role="status"
      className="flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-sm text-info-text"
    >
      <CloudOff className="size-4" aria-hidden />
      {t('connection.offline')}
    </span>
  )
}
