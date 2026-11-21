import { BookLock, CircleAlert, LoaderCircle, LockOpen } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatDate, formatTime } from '@/lib/format'
import { useClosedPeriods, useClosePeriod, useClosePreview } from '../api'

/**
 * KR-15 tutup buku on W8: close a finished month so its reports never change
 * quietly, or open the last closed month again. Shown when the rule is on.
 */
export function PeriodClosingPanel({ enabled }: { enabled: boolean }) {
  const id = useId()
  const info = useClosedPeriods(enabled)
  const [chosen, setChosen] = useState<string | null>(null)
  const period = chosen ?? info.data?.offered[0]?.period ?? null
  const preview = useClosePreview(enabled ? period : null)
  const close = useClosePeriod()
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)

  if (!enabled) return null

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold">
        <BookLock className="size-5" aria-hidden />
        Tutup buku
      </h2>
      {info.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : info.isError ? (
        <ErrorState message={info.error.message} onRetry={() => info.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg">
              {info.data.closed_through ? (
                <>
                  Buku ditutup sampai <strong>{info.data.closed_through.label}</strong>.
                </>
              ) : (
                'Belum ada bulan yang ditutup.'
              )}
            </p>
            {info.data.closed_through && (
              <ConfirmDialog
                open={reopening}
                onOpenChange={(next) => {
                  setReopening(next)
                  if (!next) close.reset()
                }}
                trigger={
                  <Button variant="outline">
                    <LockOpen aria-hidden />
                    Buka kembali {info.data.closed_through.label}
                  </Button>
                }
                title={`Buka kembali buku ${info.data.closed_through.label}?`}
                description="Dokumen bertanggal bulan itu bisa diubah lagi, sehingga laporannya bisa berubah. Tercatat di riwayat siapa yang membukanya."
                confirmLabel="Buka kembali"
                pending={close.isPending}
                error={close.error?.message}
                onConfirm={() =>
                  close.mutate('reopen', {
                    onSuccess: (r) => {
                      setReopening(false)
                      toast.success(`Buku ${r.data.label} dibuka kembali`)
                    },
                  })
                }
              />
            )}
          </div>

          {info.data.offered.length === 0 ? (
            <p className="text-muted-foreground">Semua bulan yang sudah lewat sudah ditutup.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:max-w-xs">
                <Label htmlFor={`${id}-month`}>Tutup sampai bulan</Label>
                <NativeSelect id={`${id}-month`} value={period ?? ''} onChange={(e) => setChosen(e.target.value)}>
                  {info.data.offered.map((m) => (
                    <option key={m.period} value={m.period}>
                      {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {preview.isPending ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Memeriksa…
                </p>
              ) : preview.isError ? (
                <ErrorState message={preview.error.message} onRetry={() => preview.refetch()} />
              ) : (
                <>
                  {preview.data.blockers.length > 0 && (
                    <div
                      role="alert"
                      className="flex flex-col gap-1 rounded-md bg-warning-soft px-3 py-2 text-warning-text"
                    >
                      <p className="flex items-center gap-2 font-semibold">
                        <CircleAlert className="size-5" aria-hidden />
                        Selesaikan dulu sebelum menutup {preview.data.label}:
                      </p>
                      <ul className="list-disc pl-6">
                        {preview.data.blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ul className="list-disc pl-6 text-muted-foreground">
                    {preview.data.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <ConfirmDialog
                    open={closing}
                    onOpenChange={(next) => {
                      setClosing(next)
                      if (!next) close.reset()
                    }}
                    trigger={
                      <Button className="self-start" disabled={preview.data.blockers.length > 0}>
                        <BookLock aria-hidden />
                        Tutup buku sampai {preview.data.label}
                      </Button>
                    }
                    title={`Tutup buku sampai ${preview.data.label}?`}
                    description="Nota, pembayaran, barang masuk, dan retur bertanggal bulan itu atau sebelumnya tidak bisa dibuat, dikoreksi, atau dibatalkan lagi. Perbaikannya dicatat di bulan berjalan."
                    confirmLabel="Tutup buku"
                    pending={close.isPending}
                    error={close.error?.message}
                    onConfirm={() =>
                      close.mutate(
                        { period: preview.data.period },
                        {
                          onSuccess: (r) => {
                            setClosing(false)
                            setChosen(null)
                            toast.success(`Buku ditutup sampai ${r.data.label}`)
                          },
                        },
                      )
                    }
                  />
                </>
              )}
            </div>
          )}

          {info.data.history.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground" aria-label="Riwayat tutup buku">
              {info.data.history.map((h) => (
                <li key={h.id}>
                  {h.title} · {h.by ?? '—'} · {h.at && `${formatDate(new Date(h.at))} ${formatTime(new Date(h.at))}`}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
