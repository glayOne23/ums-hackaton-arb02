import { useRouter } from '@tanstack/react-router'
import { Bell, BellOff, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { formatRelativeDay, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { type AppNotification, useMarkRead, useNotifications } from '../api'
import { disablePush, enablePush, pushState, type PushState } from '../push'

/**
 * PW-08: the bell in the header of both areas, with how many are unread.
 * Opens the list (newest first); tapping one opens its screen. Push to this
 * device is switched on from here, per device.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const notifications = useNotifications()
  const unread = notifications.data?.meta.unread ?? 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-lg"
        className="relative"
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        onClick={() => setOpen(true)}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-semibold text-white tabular-nums"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>
      <SheetContent>
        <SheetTitle>Notifikasi</SheetTitle>
        <SheetDescription>Persetujuan, penugasan, ED dekat, dan tagihan jatuh tempo.</SheetDescription>
        {open && <NotificationList query={notifications} onOpen={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function NotificationList({ query, onOpen }: { query: ReturnType<typeof useNotifications>; onOpen: () => void }) {
  const markRead = useMarkRead()
  const router = useRouter()

  const go = (n: AppNotification) => {
    if (!n.read) markRead.mutate([n.id])
    if (n.url) {
      onOpen()
      router.history.push(n.url)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PushSwitch />
      {query.isPending ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Belum ada notifikasi.</p>
      ) : (
        <>
          {query.data.meta.unread > 0 && (
            <Button
              variant="ghost"
              className="self-end text-leaf-700"
              disabled={markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
            >
              <CheckCheck aria-hidden />
              Tandai semua sudah dibaca
            </Button>
          )}
          <ul
            className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border"
            aria-label="Daftar notifikasi"
          >
            {query.data.data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col gap-0.5 p-3 text-left hover:bg-accent',
                    !n.read && 'bg-info-soft/60',
                  )}
                  onClick={() => go(n)}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn('wrap-break-word', !n.read && 'font-semibold')}>{n.title}</span>
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="belum dibaca" />
                    )}
                  </span>
                  <span className="text-sm wrap-break-word text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDay(new Date(n.created_at))} {formatTime(new Date(n.created_at))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

const PUSH_TEXT: Record<PushState, string> = {
  on: 'Notifikasi muncul di perangkat ini walau SIGAP sedang ditutup.',
  off: 'Nyalakan agar notifikasi muncul di perangkat ini walau SIGAP sedang ditutup.',
  blocked: 'Notifikasi diblokir di pengaturan browser. Izinkan dulu untuk situs ini.',
  unsupported: 'Perangkat ini belum bisa menerima notifikasi. Pasang SIGAP di layar utama (iPhone: iOS 16.4 ke atas).',
}

function PushSwitch() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void pushState().then(setState)
  }, [])

  if (state === null) return null

  const toggle = async () => {
    setBusy(true)
    try {
      const next = state === 'on' ? await disablePush() : await enablePush()
      setState(next)
      if (next === 'on') toast.success('Notifikasi di perangkat ini menyala')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyalakan notifikasi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <p className="flex items-start gap-2">
        {state === 'on' ? (
          <BellRing className="mt-0.5 size-5 shrink-0 text-success-text" aria-hidden />
        ) : (
          <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        {PUSH_TEXT[state]}
      </p>
      {(state === 'on' || state === 'off') && (
        <Button variant="outline" className="self-start" disabled={busy} onClick={() => void toggle()}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {state === 'on' ? 'Matikan di perangkat ini' : 'Nyalakan di perangkat ini'}
        </Button>
      )}
    </div>
  )
}
