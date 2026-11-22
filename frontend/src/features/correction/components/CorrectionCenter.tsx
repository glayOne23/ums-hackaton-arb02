import { Link } from '@tanstack/react-router'
import {
  ArchiveRestore,
  CircleAlert,
  CircleCheck,
  CloudOff,
  LoaderCircle,
  PencilLine,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/features/sales/types'
import { formatDate, formatRelativeDay, formatTableDate, formatTime } from '@/lib/format'
import { useSession } from '@/stores/session'
import { type CorrectionTab, TABS, useCorrectionTabs } from '../tabs'
import { useDeviceSyncs, useMarkReviewed, useNeedsReview, usePendingCorrections, useRestore, useTrash } from '../api'
import type { TrashItem } from '../types'
import { PendingCorrectionCard } from './PendingCorrectionCard'

/**
 * W13: everything that needs fixing or can be brought back — notas marked
 * "Perlu dicek" and phones that still hold visits (KR-11, KR-12),
 * corrections waiting for approval (KR-02), and the trash (KR-09).
 */
export function CorrectionCenter({ tab }: { tab: CorrectionTab }) {
  const tabs = useCorrectionTabs()
  const shown = tabs.includes(tab) ? tab : tabs[0]

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Koreksi & pemulihan</h1>
        <p className="text-muted-foreground">Data yang perlu dicek, koreksi yang menunggu, dan data yang terhapus.</p>
      </header>

      {tabs.length > 1 && (
        <nav aria-label="Menu koreksi">
          <ul className="flex flex-wrap gap-2">
            {TABS.filter((t) => tabs.includes(t.key)).map((t) => (
              <li key={t.key}>
                <Link
                  to="/office/corrections"
                  search={{ tab: t.key }}
                  aria-current={shown === t.key ? 'page' : undefined}
                  className={
                    shown === t.key
                      ? 'flex h-11 items-center rounded-full border border-primary bg-accent px-4 font-medium whitespace-nowrap text-accent-foreground'
                      : 'flex h-11 items-center rounded-full border border-border bg-card px-4 font-medium whitespace-nowrap'
                  }
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {shown === 'cek' && <ReviewList />}
      {shown === 'persetujuan' && <PendingList />}
      {shown === 'sampah' && <TrashList />}
    </section>
  )
}

function ReviewList() {
  const notas = useNeedsReview()
  const devices = useDeviceSyncs()

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="review-title" className="flex flex-col gap-3">
        <h2 id="review-title" className="text-lg font-semibold">
          Nota perlu dicek{notas.data ? ` (${notas.data.length})` : ''}
        </h2>
        <p className="text-muted-foreground">
          Angka dari HP berbeda dengan server, misalnya outlet dikunjungi dua sales atau stok di HP sudah usang. Server
          mencatat sebisanya; tidak ada data yang hilang.
        </p>
        {notas.isPending ? (
          <Skeleton />
        ) : notas.isError ? (
          <ErrorState message={notas.error.message} onRetry={() => notas.refetch()} />
        ) : notas.data.length === 0 ? (
          <Empty text="Tidak ada nota yang perlu dicek." />
        ) : (
          <ul className="flex flex-col gap-3">
            {notas.data.map((t) => (
              <ReviewRow key={t.id} transaction={t} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="devices-title" className="flex flex-col gap-3">
        <h2 id="devices-title" className="text-lg font-semibold">
          HP yang belum mengirim semua data
        </h2>
        {devices.isPending ? (
          <Skeleton />
        ) : devices.isError ? (
          <ErrorState message={devices.error.message} onRetry={() => devices.refetch()} />
        ) : devices.data.length === 0 ? (
          <Empty text="Semua HP sales sudah mengirim datanya." />
        ) : (
          <ul className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card shadow-card">
            {devices.data.map((d) => (
              <li key={d.user.id} className="flex flex-col gap-1 p-3">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <Smartphone className="size-5" aria-hidden />
                  {d.user.name}
                  {d.failed > 0 && (
                    <StatusChip variant="danger" icon={CircleAlert}>
                      {d.failed} gagal kirim
                    </StatusChip>
                  )}
                  {d.queued > 0 && (
                    <StatusChip variant="info" icon={CloudOff}>
                      {d.queued} menunggu sinyal
                    </StatusChip>
                  )}
                </p>
                {d.last_error && <p className="wrap-break-word">Alasan terakhir: {d.last_error}</p>}
                <p className="text-sm text-muted-foreground">
                  {d.last_sent_at
                    ? `Terakhir terkirim ${formatDate(new Date(d.last_sent_at))} ${formatTime(new Date(d.last_sent_at))}`
                    : 'Belum pernah mengirim nota'}{' '}
                  · dilaporkan HP {formatRelativeDay(new Date(d.reported_at))}. Minta sales membuka "Hari ini" dan
                  menekan "Kirim ulang".
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ReviewRow({ transaction: t }: { transaction: Transaction }) {
  const review = useMarkReviewed()
  const at = new Date(t.transacted_at)

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/office/visits/$transactionId"
            params={{ transactionId: t.id }}
            className="font-semibold text-leaf-700 underline-offset-4 hover:underline"
          >
            {t.number} · {t.outlet?.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {t.sales?.name} · {formatDate(at)} {formatTime(at)}
          </p>
        </div>
      </div>
      <ul className="list-disc pl-6">
        {t.review_notes.map((note) => (
          <li key={note} className="wrap-break-word">
            {note}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={review.isPending}
          onClick={() =>
            review.mutate(t.id, {
              onSuccess: () => toast.success(`${t.number} ditandai sudah dicek`),
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {review.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <CircleCheck aria-hidden />}
          Pakai data server
        </Button>
        <Button asChild variant="outline">
          <Link to="/office/visits/$transactionId" params={{ transactionId: t.id }} search={{ pakai: 'hp' }}>
            <Smartphone aria-hidden />
            Pakai data HP
          </Link>
        </Button>
        <Button asChild variant="ghost" className="text-leaf-700">
          <Link to="/office/visits/$transactionId" params={{ transactionId: t.id }}>
            <PencilLine aria-hidden />
            Sesuaikan manual
          </Link>
        </Button>
      </div>
    </li>
  )
}

function PendingList() {
  const pending = usePendingCorrections()

  if (pending.isPending) return <Skeleton />
  if (pending.isError) return <ErrorState message={pending.error.message} onRetry={() => pending.refetch()} />
  if (pending.data.length === 0) return <Empty text="Tidak ada koreksi yang menunggu persetujuan." />

  return (
    <ul className="flex flex-col gap-3">
      {pending.data.map((c) => (
        <li key={c.id} className="flex flex-col gap-1">
          <PendingCorrectionCard correction={c} showNota />
          <Link
            to="/office/visits/$transactionId"
            params={{ transactionId: c.transaction.id }}
            className="self-start px-1 text-leaf-700 underline-offset-4 hover:underline"
          >
            Buka nota {c.transaction.number}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function TrashList() {
  const trash = useTrash()

  if (trash.isPending) return <Skeleton />
  if (trash.isError) return <ErrorState message={trash.error.message} onRetry={() => trash.refetch()} />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        Outlet dan produk yang dihapus bisa dipulihkan selama {trash.data.meta.retention_days} hari, lalu dihapus
        permanen. Nota dan pembayaran tidak pernah dihapus; yang salah dibatalkan dan tetap terlihat dicoret.
      </p>
      {trash.data.data.length === 0 ? (
        <Empty text="Tempat sampah kosong." icon={Trash2} />
      ) : (
        <ul className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card shadow-card">
          {trash.data.data.map((item) => (
            <TrashRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TrashRow({ item }: { item: TrashItem }) {
  const restore = useRestore()
  const permission = useSession((s) => s.user?.permissions.includes(`${item.type}.manage`) ?? false)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="font-medium wrap-break-word">
          {item.type === 'outlet' ? 'Outlet' : 'Produk'} "{item.name}" · {item.code}
        </p>
        <p className="text-sm text-muted-foreground">
          Dihapus {formatTableDate(new Date(item.deleted_at))}
          {item.deleted_by && ` oleh ${item.deleted_by}`} · dihapus permanen {formatTableDate(new Date(item.purge_on))}
        </p>
      </div>
      {permission && (
        <Button
          variant="outline"
          disabled={restore.isPending}
          onClick={() =>
            restore.mutate(item, {
              onSuccess: () => toast.success(`${item.name} dipulihkan`),
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {restore.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArchiveRestore aria-hidden />}
          Pulihkan
        </Button>
      )}
    </li>
  )
}

function Skeleton() {
  return <div className="h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
}

function Empty({ text, icon: Icon = CircleCheck }: { text: string; icon?: typeof CircleCheck }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-muted-foreground">
      <Icon className="size-6 shrink-0" aria-hidden />
      {text}
    </p>
  )
}
