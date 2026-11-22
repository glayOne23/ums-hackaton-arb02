import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Hourglass,
  LoaderCircle,
  RotateCcw,
  Undo2,
  ClipboardCheck,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FieldError } from '@/components/common/FieldError'
import { NumberStepper } from '@/components/common/NumberStepper'
import { StatusChip } from '@/components/common/StatusChip'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { formatExpiry, formatNumber, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import {
  useDecideAdjustment,
  useReopenAdjustment,
  useSaveStockCount,
  useStockAdjustments,
  useTodayMovements,
  useWarehouseStock,
} from '../api'
import type { StockAdjustment } from '../types'
import { InventoryTabs } from './InventoryTabs'

/** W5 / GD-06 — stock count: system numbers are filled in, change only what differs. */
export function StockCountView() {
  const canManage = usePermission('inventory.manage')
  // Shared with the history: "Buka ulang" puts that count's numbers back into the form (KR-13)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  const reopened = (adjustment: StockAdjustment) => {
    setCounts(Object.fromEntries(adjustment.items.map((item) => [item.batch_id, item.physical_qty])))
    setReason(adjustment.reason)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <PageHeader
        icon={ClipboardCheck}
        title="Opname gudang"
        description="Jumlah sistem sudah terisi. Ubah hanya yang berbeda dengan hitungan fisik."
      />
      <InventoryTabs />
      {canManage && (
        <div ref={formRef} className="scroll-mt-20">
          <CountForm counts={counts} setCounts={setCounts} reason={reason} setReason={setReason} />
        </div>
      )}
      <AdjustmentHistory onReopened={reopened} />
    </section>
  )
}

interface CountFormProps {
  counts: Record<string, number>
  setCounts: Dispatch<SetStateAction<Record<string, number>>>
  reason: string
  setReason: (reason: string) => void
}

function CountForm({ counts, setCounts, reason, setReason }: CountFormProps) {
  const stock = useWarehouseStock()
  const save = useSaveStockCount()
  const [search, setSearch] = useState('')

  const rows = (stock.data?.data ?? []).flatMap((row) =>
    (row.batches ?? []).map((batch) => ({ product: row.product, batch })),
  )
  const shown = rows.filter(
    (r) =>
      !search ||
      r.product.name.toLowerCase().includes(search.toLowerCase()) ||
      r.batch.batch_number.includes(search.toUpperCase()),
  )
  const changed = rows.filter((r) => counts[r.batch.id] !== undefined && counts[r.batch.id] !== r.batch.qty)
  const today = useTodayMovements(changed.map((r) => r.batch.id))
  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {}

  const submit = () =>
    save.mutate(
      { reason, items: changed.map((r) => ({ batch_id: r.batch.id, physical_qty: counts[r.batch.id] })) },
      {
        onSuccess: (result) => {
          if (result.queued) {
            toast.info('Opname tersimpan di perangkat. Terkirim otomatis saat ada sinyal.')
          } else {
            const adjustment = result.data
            toast.success(
              adjustment.status.value === 'applied'
                ? `Opname ${adjustment.number} tersimpan, stok disesuaikan`
                : `Opname ${adjustment.number} menunggu persetujuan`,
            )
          }
          setCounts({})
          setReason('')
        },
      },
    )

  if (stock.isPending) return <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (stock.isError) return <ErrorState message={stock.error.message} onRetry={() => stock.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        aria-label="Cari produk atau batch"
        placeholder="Cari produk atau batch"
        className="sm:max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Belum ada stok di gudang untuk dihitung.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card shadow-card">
          {shown.map(({ product, batch }) => {
            const physical = counts[batch.id] ?? batch.qty
            const difference = physical - batch.qty
            return (
              <li key={batch.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                {/* Phones: the text takes its own line, the stepper goes below (no squeezed column) */}
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {batch.batch_number} · {formatExpiry(new Date(batch.expiry_date))} · sistem{' '}
                    {formatNumber(batch.qty)}
                  </p>
                  {difference !== 0 && today.data?.[batch.id] && (
                    <p className="text-sm text-muted-foreground">Hari ini: {today.data[batch.id].join(' · ')}</p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <NumberStepper
                    id={`count-${batch.id}`}
                    label={`Fisik ${product.name} ${batch.batch_number}`}
                    value={physical}
                    initial={batch.qty}
                    onChange={(value) => setCounts((all) => ({ ...all, [batch.id]: value }))}
                  />
                  <span
                    className={`w-12 text-right font-semibold tabular-nums ${difference < 0 ? 'text-danger-text' : difference > 0 ? 'text-info-text' : 'text-muted-foreground'}`}
                    aria-label={`Selisih ${difference}`}
                  >
                    {difference > 0 ? `+${difference}` : difference}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {changed.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="count-reason" className="text-base">
            Alasan selisih (wajib)
          </Label>
          <Input
            id="count-reason"
            value={reason}
            maxLength={255}
            placeholder="Misalnya: 2 botol pecah saat dipindah"
            onChange={(e) => setReason(e.target.value)}
          />
          <FieldError id="count-reason-error" message={fieldErrors.reason?.[0]} />
        </div>
      )}
      {save.error && !fieldErrors.reason && (
        <p role="alert" className="flex items-start gap-2 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {fieldErrors.items?.[0] ?? save.error.message}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          size="cta"
          className="sm:h-10 sm:w-auto"
          disabled={changed.length === 0 || save.isPending}
          onClick={submit}
        >
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {changed.length === 0 ? 'Belum ada selisih' : `Simpan opname (${changed.length} selisih)`}
        </Button>
      </div>
    </div>
  )
}

function AdjustmentHistory({ onReopened }: { onReopened: (adjustment: StockAdjustment) => void }) {
  const adjustments = useStockAdjustments()
  const paged = usePagedItems(adjustments.data, 10)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Riwayat opname</h2>
      {adjustments.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : adjustments.isError ? (
        <ErrorState message={adjustments.error.message} onRetry={() => adjustments.refetch()} />
      ) : adjustments.data.length === 0 ? (
        <p className="text-muted-foreground">Belum ada opname dengan selisih.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {paged.items.map((adjustment) => (
              <AdjustmentCard key={adjustment.id} adjustment={adjustment} onReopened={onReopened} />
            ))}
          </ul>
          <Pagination meta={paged.meta} onPageChange={paged.setPage} noun="opname" />
        </>
      )}
    </div>
  )
}

function AdjustmentCard({
  adjustment,
  onReopened,
}: {
  adjustment: StockAdjustment
  onReopened: (adjustment: StockAdjustment) => void
}) {
  const canApprove = usePermission('stock_adjustment.approve')
  const decide = useDecideAdjustment()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState('')
  const pending = adjustment.status.value === 'pending'

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{adjustment.number}</p>
          <p className="text-sm text-muted-foreground">
            {formatTableDate(new Date(adjustment.counted_date))} · {adjustment.created_by} · {adjustment.reason}
          </p>
        </div>
        {pending ? (
          <StatusChip variant="info" icon={Hourglass}>
            Menunggu persetujuan
          </StatusChip>
        ) : adjustment.status.value === 'reopened' ? (
          <StatusChip variant="neutral" icon={RotateCcw}>
            Dibuka ulang
          </StatusChip>
        ) : adjustment.status.value === 'applied' ? (
          <StatusChip variant="success" icon={CircleCheck}>
            Berlaku
          </StatusChip>
        ) : (
          <StatusChip variant="danger" icon={CircleX}>
            Ditolak
          </StatusChip>
        )}
      </div>
      <ul className="text-sm">
        {adjustment.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3 border-t border-earth-200 py-1.5">
            <span>
              {item.product.name} <span className="text-muted-foreground">· {item.batch_number}</span>
            </span>
            <span className="tabular-nums">
              {item.system_qty} → {item.physical_qty} ({item.difference_qty > 0 ? '+' : ''}
              {item.difference_qty})
            </span>
          </li>
        ))}
      </ul>
      {adjustment.decision_note && <p className="text-sm text-danger-text">Catatan: {adjustment.decision_note}</p>}
      {adjustment.reopened && (
        <p className="text-sm text-muted-foreground">
          Dibuka ulang{adjustment.reopened.by && ` oleh ${adjustment.reopened.by}`}
          {adjustment.reopened.reason && `: ${adjustment.reopened.reason}`}. Selisihnya sudah dibalik.
        </p>
      )}
      {adjustment.can_reopen && <ReopenButton adjustment={adjustment} onReopened={onReopened} />}
      {canApprove && pending && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: adjustment.id, approve: true },
                {
                  onSuccess: () => toast.success(`Opname ${adjustment.number} disetujui`),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Setujui
          </Button>
          <ConfirmDialog
            open={rejectOpen}
            onOpenChange={(open) => {
              setRejectOpen(open)
              if (!open) decide.reset()
            }}
            trigger={<Button variant="danger-outline">Tolak</Button>}
            title={`Tolak opname ${adjustment.number}?`}
            description="Stok tidak berubah. Admin gudang akan melihat catatan Anda."
            confirmLabel="Tolak opname"
            pending={decide.isPending}
            error={decide.error?.message}
            onConfirm={() =>
              decide.mutate({ id: adjustment.id, approve: false, note }, { onSuccess: () => setRejectOpen(false) })
            }
          >
            <Textarea aria-label="Alasan penolakan" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </ConfirmDialog>
        </div>
      )}
    </li>
  )
}

/** KR-13: today's count only; later days are fixed with a new count and its reason. */
function ReopenButton({
  adjustment,
  onReopened,
}: {
  adjustment: StockAdjustment
  onReopened: (adjustment: StockAdjustment) => void
}) {
  const reopen = useReopenAdjustment()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const applied = adjustment.status.value === 'applied'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reopen.reset()
      }}
      trigger={
        <Button variant="ghost" className="self-start text-leaf-700">
          <Undo2 aria-hidden />
          Buka ulang
        </Button>
      }
      title={`Buka ulang opname ${adjustment.number}?`}
      description={
        (applied
          ? 'Selisih yang sudah dibukukan dibalik, jadi stok kembali seperti sebelum opname ini. '
          : 'Opname ini belum disetujui, jadi stok tidak berubah. ') +
        'Hitungannya diisi lagi di form di atas: ubah yang salah, lalu simpan sebagai opname baru. Catatan opname ini tetap ada.'
      }
      confirmLabel="Buka ulang"
      pending={reopen.isPending}
      error={reopen.error?.message}
      onConfirm={() =>
        reopen.mutate(
          { id: adjustment.id, reason: reason.trim() || undefined },
          {
            onSuccess: (result) => {
              setOpen(false)
              toast.success(`Opname ${adjustment.number} dibuka ulang. Hitung lagi lalu simpan.`)
              onReopened(result)
            },
          },
        )
      }
    >
      <Textarea
        aria-label="Alasan (boleh kosong)"
        placeholder="Alasan (boleh kosong), misalnya: rak B belum dihitung"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmDialog>
  )
}
