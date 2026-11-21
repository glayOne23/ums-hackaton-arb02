import { CircleAlert, CircleCheck, Download, FileUp, LoaderCircle, TriangleAlert, Undo2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { formatDate, formatNumber, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { downloadFile, usePreviewImport, useRevertImport, useRunImport, useImports } from '../api'
import type { ImportBatchItem, ImportPreview, ImportTypeInfo, ImportTypeKey, RowStatus, PreviewRow } from '../types'

/** Rows drawn at once; the rest are counted, and still imported. */
const SHOWN_ROWS = 200

/**
 * W10 — Impor Excel (IE-01): pick what to import, fill the template, check
 * the preview (ready / similar / problems), import, and undo a session if it
 * was the wrong file (KR-14).
 */
export function ImportView() {
  const imports = useImports()
  const preview = usePreviewImport()
  const [type, setType] = useState<ImportTypeKey>('outlets')
  const fileInput = useRef<HTMLInputElement>(null)
  const fileId = useId()

  if (imports.isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (imports.isError) return <ErrorState message={imports.error.message} onRetry={() => imports.refetch()} />

  const current = imports.data.types.find((t) => t.key === type) ?? imports.data.types[0]
  const fileError =
    preview.error instanceof ApiError ? (preview.error.fieldErrors.file?.[0] ?? preview.error.message) : null

  const reset = () => {
    preview.reset()
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Impor Excel</h1>
        <p className="text-muted-foreground">
          Masukkan data lama dari Excel. Semua baris dicek dulu; tidak ada yang tersimpan sebelum Anda menekan Impor.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">1. Data apa yang diimpor?</legend>
        <div role="radiogroup" aria-label="Jenis data" className="grid gap-3 md:grid-cols-3">
          {imports.data.types.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={type === t.key}
              onClick={() => {
                setType(t.key)
                reset()
              }}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-4 text-left',
                type === t.key ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary',
              )}
            >
              <span className="font-semibold">
                {i + 1}. {t.title}
              </span>
              <span className="text-sm text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Urutannya: outlet dan produk lebih dulu, baru stok titipan.</p>
      </fieldset>

      <TemplateStep type={current} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Pilih file yang sudah diisi</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            id={fileId}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) preview.mutate({ type: current.key, file })
            }}
          />
          <Button asChild variant={preview.data ? 'outline' : 'default'}>
            <label htmlFor={fileId} className="cursor-pointer">
              {preview.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
              {preview.data ? 'Pilih file lain' : `Pilih file Excel ${current.title.toLowerCase()}`}
            </label>
          </Button>
          {preview.isPending && <span className="text-muted-foreground">Membaca dan mengecek setiap baris…</span>}
        </div>
        {fileError && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {fileError}
          </p>
        )}
      </div>

      {preview.data && <PreviewStep key={preview.data.token} preview={preview.data} type={current} onDone={reset} />}

      <History batches={imports.data.batches} />
    </section>
  )
}

function TemplateStep({ type }: { type: ImportTypeInfo }) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">2. Isi template</h2>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <p>
          Kolom:{' '}
          {type.columns.map((c, i) => (
            <span key={c.key}>
              {i > 0 && ', '}
              <span className={c.required ? 'font-semibold' : undefined}>{c.label}</span>
              {c.required && <span className="text-muted-foreground"> (wajib)</span>}
            </span>
          ))}
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Urutan kolom boleh beda dan baris judul boleh di bawah judul tabel. Sheet "Pilihan" di template berisi nama
          jenis, wilayah, dan kategori yang dikenali.
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await downloadFile(`/imports/${type.key}/template`, `Template impor ${type.title}.xlsx`)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Template gagal diunduh.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          Unduh template {type.title.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}

const FILTERS: { value: RowStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'ready', label: 'Siap' },
  { value: 'similar', label: 'Mirip' },
  { value: 'error', label: 'Bermasalah' },
]

function PreviewStep({ preview, type, onDone }: { preview: ImportPreview; type: ImportTypeInfo; onDone: () => void }) {
  const run = useRunImport()
  const [filter, setFilter] = useState<RowStatus | 'all'>(() =>
    preview.counts.error + preview.counts.similar > 0 ? (preview.counts.error > 0 ? 'error' : 'similar') : 'all',
  )
  // Per "mirip" row: skip (default), import as new, or join an existing record ([Gabung])
  const [choices, setChoices] = useState<Record<number, string>>({})
  const included = Object.entries(choices)
    .filter(([, c]) => c === NEW)
    .map(([line]) => Number(line))
  const merge = Object.fromEntries(Object.entries(choices).filter(([, c]) => c !== NEW && c !== SKIP))
  const { counts } = preview
  const total = counts.ready + included.length + Object.keys(merge).length
  const rows = preview.rows.filter((r) => filter === 'all' || r.status === filter)
  const shownColumns = preview.columns.slice(0, 4)
  const runError = run.error instanceof ApiError ? (run.error.fieldErrors.token?.[0] ?? run.error.message) : null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">4. Periksa lalu impor</h2>
      <p className="text-lg" aria-live="polite">
        <span className="font-semibold">{preview.file_name}</span>: {formatNumber(counts.total)} baris ·{' '}
        <span className="text-success-text">{formatNumber(counts.ready)} siap</span>
        {counts.similar > 0 && <span className="text-warning-text"> · {formatNumber(counts.similar)} mirip</span>}
        {counts.error > 0 && <span className="text-danger-text"> · {formatNumber(counts.error)} bermasalah</span>}
      </p>
      {counts.similar > 0 && (
        <p className="text-muted-foreground">
          Baris "mirip" dilewati kecuali Anda pilih <strong>Impor sebagai data baru</strong> (memang berbeda) atau{' '}
          <strong>Gabung</strong> ke data yang sudah ada: baris itu tidak dibuat baru, tetapi melengkapi isian yang
          masih kosong di data lama.
        </p>
      )}
      {counts.error > 0 && (
        <p className="text-muted-foreground">
          Baris bermasalah dilewati. Perbaiki di Excel lalu impor lagi file yang sama: baris yang sudah masuk akan
          ditandai mirip atau sudah ada, jadi tidak tercatat dua kali.
        </p>
      )}

      <div role="radiogroup" aria-label="Tampilkan baris" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.value === 'all' ? counts.total : counts[f.value]
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-11 rounded-full border px-4 sm:h-10',
                filter === f.value ? 'border-primary bg-accent font-semibold' : 'border-border bg-card',
              )}
            >
              {f.label} ({formatNumber(count)})
            </button>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          Tidak ada baris di sini.
        </p>
      ) : (
        <ul
          className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card"
          aria-label="Baris file"
        >
          {rows.slice(0, SHOWN_ROWS).map((row) => (
            <li key={row.line} className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-start sm:gap-4">
              <span className="w-20 shrink-0 text-sm text-muted-foreground">Baris {row.line}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="break-words">
                  {shownColumns
                    .map((c) => row.values[c.key])
                    .filter(Boolean)
                    .join(' · ') || '(kosong)'}
                </span>
                {row.problems.map((p) => (
                  <span key={p} className="text-sm text-danger-text">
                    {p}
                  </span>
                ))}
                {row.similar.map((s) => (
                  <span key={s} className="text-sm text-warning-text">
                    {s}
                  </span>
                ))}
                {row.status === 'similar' && (
                  <SimilarChoice
                    row={row}
                    noun={type.title.toLowerCase()}
                    value={choices[row.line] ?? SKIP}
                    onChange={(value) => setChoices((all) => ({ ...all, [row.line]: value }))}
                  />
                )}
              </div>
              <RowChip status={row.status} />
            </li>
          ))}
          {rows.length > SHOWN_ROWS && (
            <li className="p-3 text-center text-muted-foreground">
              {formatNumber(rows.length - SHOWN_ROWS)} baris lain tidak ditampilkan, tetap ikut diimpor bila siap.
            </li>
          )}
        </ul>
      )}

      {runError && (
        <p role="alert" className="text-danger-text">
          {runError}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="cta"
          className="sm:h-10 sm:w-auto"
          disabled={total === 0 || run.isPending}
          onClick={() =>
            run.mutate(
              { type: preview.type, token: preview.token, includeSimilar: included, merge },
              {
                onSuccess: (r) => {
                  toast.success(
                    `${formatNumber(r.data.imported_count)} ${type.title.toLowerCase()} diimpor` +
                      (r.data.merged_count ? `, ${formatNumber(r.data.merged_count)} digabung` : '') +
                      (r.data.skipped_count ? `, ${formatNumber(r.data.skipped_count)} baris dilewati.` : '.'),
                  )
                  onDone()
                },
              },
            )
          }
        >
          {run.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {total === 0 ? 'Belum ada baris yang siap' : `Impor ${formatNumber(total)} baris`}
        </Button>
        <Button variant="outline" onClick={onDone}>
          Batal
        </Button>
      </div>
    </div>
  )
}

const SKIP = 'skip'
const NEW = 'new'

/** W10: what to do with a "mirip" row — skip it, import it as new, or [Gabung] into a record that exists. */
function SimilarChoice({
  row,
  noun,
  value,
  onChange,
}: {
  row: PreviewRow
  noun: string
  value: string
  onChange: (value: string) => void
}) {
  const name = `similar-${row.line}`
  const options = [
    { value: SKIP, label: 'Lewati' },
    ...row.merge_into.map((m) => ({ value: m.id, label: `Gabung ke ${m.name} (${m.code})` })),
    { value: NEW, label: `Impor sebagai ${noun} baru` },
  ]

  return (
    <fieldset className="flex flex-col gap-1 pt-1">
      <legend className="sr-only">Baris {row.line}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex min-h-11 items-center gap-3 self-start sm:min-h-9">
          <input
            type="radio"
            name={name}
            className="size-5 shrink-0 accent-primary"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="wrap-break-word">{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

function RowChip({ status }: { status: RowStatus }) {
  if (status === 'ready')
    return (
      <StatusChip variant="success" icon={CircleCheck} className="self-start">
        Siap
      </StatusChip>
    )
  if (status === 'similar')
    return (
      <StatusChip variant="warning" icon={TriangleAlert} className="self-start">
        Mirip
      </StatusChip>
    )
  return (
    <StatusChip variant="danger" icon={CircleAlert} className="self-start">
      Bermasalah
    </StatusChip>
  )
}

function History({ batches }: { batches: ImportBatchItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Riwayat impor</h2>
      {batches.length === 0 ? (
        <p className="text-muted-foreground">Belum pernah ada impor.</p>
      ) : (
        <ul
          className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card"
          aria-label="Riwayat impor"
        >
          {batches.map((batch) => (
            <HistoryRow key={batch.id} batch={batch} />
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryRow({ batch }: { batch: ImportBatchItem }) {
  const revert = useRevertImport()
  const [open, setOpen] = useState(false)
  const at = new Date(batch.created_at)
  const error = revert.error instanceof ApiError ? (revert.error.fieldErrors.batch?.[0] ?? revert.error.message) : null
  const reverted = batch.status === 'reverted'

  return (
    <li
      className={cn(
        'flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between',
        reverted && 'bg-muted/50',
      )}
    >
      <div className="min-w-0">
        <p className={cn('font-medium break-words', reverted && 'line-through')}>
          {batch.type_title} · {batch.file_name}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatNumber(batch.imported_count)} diimpor
          {batch.merged_count > 0 && `, ${formatNumber(batch.merged_count)} digabung`}
          {batch.skipped_count > 0 && `, ${formatNumber(batch.skipped_count)} dilewati`} · {batch.created_by} ·{' '}
          {formatDate(at)} {formatTime(at)}
          {reverted &&
            batch.reverted_at &&
            ` · dibatalkan ${batch.reverted_by ?? ''} ${formatDate(new Date(batch.reverted_at))}`}
        </p>
      </div>
      {!reverted && (
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              className="self-start sm:self-auto"
              aria-label={`Batalkan impor ${batch.file_name}`}
            >
              <Undo2 aria-hidden />
              Batalkan impor
            </Button>
          }
          title={`Batalkan impor ${batch.type_title.toLowerCase()}?`}
          description={
            `${formatNumber(batch.imported_count)} ${batch.type_title.toLowerCase()} dari ${batch.file_name} akan dihapus lagi. Hanya bisa bila datanya belum dipakai transaksi.` +
            (batch.merged_count > 0
              ? ` Isian yang dilengkapi lewat Gabung (${formatNumber(batch.merged_count)} baris) dikembalikan kosong, kecuali yang sudah diubah orang sejak itu.`
              : '')
          }
          confirmLabel="Batalkan impor"
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) revert.reset()
          }}
          pending={revert.isPending}
          error={error}
          onConfirm={() =>
            revert.mutate(batch.id, {
              onSuccess: () => {
                setOpen(false)
                toast.success('Impor dibatalkan.')
              },
            })
          }
        />
      )}
    </li>
  )
}
