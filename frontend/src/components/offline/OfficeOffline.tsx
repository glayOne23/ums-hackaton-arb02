import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudOff, LoaderCircle, RotateCw, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { useLastSync } from '@/lib/offline/lastSync'
import { dropOutboxItem, flushOutbox, type OutboxItem, outboxDb, retryOutboxItem } from '@/lib/offline/outbox'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { usePermission, useSession } from '@/stores/session'

const RETRY_MS = 30_000

/** Sends the warehouse documents waiting on this device: at start, when the signal returns, and every 30 s (PW-06). */
export function OutboxSync() {
  const queryClient = useQueryClient()
  const userId = useSession((s) => s.user?.id)

  useEffect(() => {
    if (!userId) return
    const flush = () => void flushOutbox(queryClient, userId)
    flush()
    window.addEventListener('online', flush)
    const timer = window.setInterval(() => navigator.onLine && flush(), RETRY_MS)
    return () => {
      window.removeEventListener('online', flush)
      window.clearInterval(timer)
    }
  }, [queryClient, userId])

  return null
}

/**
 * PW-07: without a signal, office screens show what was last loaded; this
 * says from when, and what can still be recorded (PW-06).
 */
export function OfflineDataNotice() {
  const online = useOnlineStatus()
  const lastSync = useLastSync()
  const canRecord = usePermission('inventory.manage')
  if (online) return null

  return (
    <p role="status" className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-info-text print:hidden">
      <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        Tanpa sinyal.{' '}
        {lastSync
          ? `Data yang tampil per ${formatDate(lastSync)} jam ${formatTime(lastSync)}.`
          : 'Yang tampil adalah data terakhir yang tersimpan di perangkat ini.'}{' '}
        {canRecord
          ? 'Barang masuk, retur, dan opname tetap bisa dicatat dan terkirim saat sinyal kembali; perubahan lain menunggu sinyal.'
          : 'Perubahan menunggu sinyal.'}
      </span>
    </p>
  )
}

/** PW-06 / KR-12: what is still on this device, with "Kirim ulang" for what the server refused. */
export function OutboxNotice() {
  const userId = useSession((s) => s.user?.id ?? 0)
  const items = useLiveQuery(async () => outboxDb.items.where('user_id').equals(userId).sortBy('created_at'), [userId])
  if (!items || items.length === 0) return null

  const queued = items.filter((i) => i.status === 'queued')
  const failed = items.filter((i) => i.status === 'failed')

  return (
    <section aria-label="Data menunggu terkirim" className="flex flex-col gap-2 print:hidden">
      {queued.length > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-info-text">
          <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            {queued.length} data tersimpan di perangkat ini, terkirim saat ada sinyal:{' '}
            {queued.map((i) => i.label).join('; ')}
          </span>
        </p>
      )}
      {failed.map((item) => (
        <FailedItem key={item.id} item={item} />
      ))}
    </section>
  )
}

function FailedItem({ item }: { item: OutboxItem }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md bg-danger-soft px-3 py-2 text-danger-text">
      <p className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>
          {item.label} gagal terkirim: {item.error}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await retryOutboxItem(queryClient, item).finally(() => setBusy(false))
          }}
        >
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
          Kirim ulang
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void dropOutboxItem(item)}>
          <Trash2 aria-hidden />
          Hapus dari perangkat
        </Button>
      </div>
    </div>
  )
}
