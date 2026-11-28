import { BadgeCheck, Check, ClipboardList, LoaderCircle, PackageCheck, Printer, Undo2, Truck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { FilterBar, PageHeader } from '@/components/common/PageHeader'
import { FieldError } from '@/components/common/FieldError'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { formatExpiry, formatNumber, formatTableDate, formatTime } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useStockRequestAction, useStockRequests, useWarehouseStock } from '../api'
import { applyPicks, fefoPlan, pickedTotal, type PickBatch } from '../pick'
import type { StockRequest } from '../types'
import { InventoryTabs } from './InventoryTabs'
import { StockRequestStatusChip } from './StockRequestStatusChip'
import { HistoryPanel } from '@/features/correction/components/HistoryPanel'

const FILTERS = [
  { value: 'open', label: 'Perlu diproses' },
  { value: 'issued', label: 'Sudah keluar' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'all', label: 'Semua' },
] as const

/** P2 for the warehouse: prepare (nearest expiry chosen automatically), approve, or reject. */
export function StockRequestBoard() {
  const [status, setStatus] = useState<string>('open')
  const requests = useStockRequests(status)
  const paged = usePagedItems(requests.data)

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        icon={Truck}
        title="Permintaan barang sales"
        description="Batch dengan ED terdekat disarankan. Cocokkan dengan kardus yang diambil, ubah bila berbeda."
      />
      <InventoryTabs />

      <FilterBar>
        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="request-status">Tampilkan</Label>
          <NativeSelect id="request-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </FilterBar>

      {requests.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : requests.isError ? (
        <ErrorState message={requests.error.message} onRetry={() => requests.refetch()} />
      ) : requests.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <ClipboardList className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">
            {status === 'open' ? 'Tidak ada permintaan yang menunggu.' : 'Tidak ada permintaan.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {paged.items.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </ul>
          <Pagination meta={paged.meta} onPageChange={paged.setPage} noun="permintaan" />
        </>
      )}
    </section>
  )
}

function RequestCard({ request }: { request: StockRequest }) {
  const canPrepare = usePermission('stock_request.prepare')
  const canApprove = usePermission('stock_request.approve')
  const action = useStockRequestAction()
  const [issued, setIssued] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.items.map((item) => [item.id, String(item.issued_qty ?? item.requested_qty)])),
  )
  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  // Doc 11: the pick list per batch, and whether the admin matched it to the cartons
  const [picks, setPicks] = useState<Record<string, Record<string, string>>>({})
  const [matched, setMatched] = useState(false)

  // Prepared again after "Ubah status" (KR-05): the numbers may change before approving
  const editing = canPrepare && (request.status.value === 'submitted' || request.status.value === 'prepared')
  const fieldErrors = action.error instanceof ApiError ? action.error.fieldErrors : {}
  const warehouse = useWarehouseStock(editing)
  const batchesOf = (productId: string): PickBatch[] =>
    (warehouse.data?.data.find((row) => row.product.id === productId)?.batches ?? []).filter((b) => b.qty > 0)
  const picksOf = (itemId: string, productId: string) =>
    applyPicks(fefoPlan(batchesOf(productId), Number(issued[itemId] || 0)), picks[itemId])
  const pickMismatch = request.items.some(
    (item) => matched && pickedTotal(picksOf(item.id, item.product.id)) !== Number(issued[item.id] || 0),
  )
  const generalError = action.error
    ? (fieldErrors.request?.[0] ?? (Object.keys(fieldErrors).length === 0 ? action.error.message : null))
    : null

  const prepare = () =>
    action.mutate(
      {
        id: request.id,
        action: 'prepare',
        body: {
          note,
          items: request.items.map((item) => ({
            id: item.id,
            issued_qty: Number(issued[item.id] || 0),
            // Sent only when the admin matched the batches: they then count as confirmed
            ...(matched && Number(issued[item.id] || 0) > 0 ? { allocations: picksOf(item.id, item.product.id) } : {}),
          })),
        },
      },
      {
        onSuccess: (result) =>
          toast.success(
            result.status.value === 'issued'
              ? `${request.number} keluar ke ${request.sales.name}`
              : `${request.number} disiapkan, menunggu persetujuan`,
          ),
      },
    )

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{request.sales.name}</p>
          <p className="text-sm text-muted-foreground">
            {request.number} · {formatTableDate(new Date(request.created_at))}{' '}
            {formatTime(new Date(request.created_at))}
          </p>
        </div>
        <StockRequestStatusChip status={request.status} />
      </div>
      {request.note && <p className="text-sm">Catatan sales: {request.note}</p>}
      {request.warehouse_note && (
        <p className="text-sm text-muted-foreground">Catatan gudang: {request.warehouse_note}</p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left">
          <thead className="bg-table-head text-sm text-table-head-foreground print:bg-transparent print:text-foreground">
            <tr>
              <th scope="col" className="h-10 px-3 font-semibold">
                Produk
              </th>
              <th scope="col" className="h-10 px-3 text-right font-semibold">
                Diminta
              </th>
              <th scope="col" className="h-10 px-3 text-right font-semibold">
                Keluar
              </th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, i) => (
              <tr key={item.id} className="border-t border-border align-top hover:bg-row-hover">
                <td className="px-3 py-2.5">
                  <span className="font-medium">{item.product.name}</span>
                  {editing && Number(issued[item.id] || 0) > 0 && batchesOf(item.product.id).length > 0 && (
                    <PickList
                      itemId={item.id}
                      batches={batchesOf(item.product.id)}
                      picks={picksOf(item.id, item.product.id)}
                      issued={Number(issued[item.id] || 0)}
                      onChange={(batchId, value) =>
                        setPicks((all) => ({ ...all, [item.id]: { ...all[item.id], [batchId]: value } }))
                      }
                    />
                  )}
                  <FieldError id={`alloc-${item.id}-error`} message={fieldErrors[`items.${i}.allocations`]?.[0]} />
                  {!editing && item.allocations && item.allocations.length > 0 && (
                    <span className="block text-sm text-muted-foreground">
                      {item.allocations
                        .map(
                          (a) =>
                            `${a.batch_number} (${a.expiry_date ? formatExpiry(new Date(a.expiry_date)) : ''}) ${a.qty}`,
                        )
                        .join(' · ')}
                      {item.allocations_confirmed && (
                        <span className="ml-1 inline-flex items-center gap-1 text-success-text">
                          <BadgeCheck className="size-4" aria-hidden />
                          dicocokkan
                        </span>
                      )}
                    </span>
                  )}
                  <FieldError id={`issued-${item.id}-error`} message={fieldErrors[`items.${i}.issued_qty`]?.[0]} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(item.requested_qty)}</td>
                <td className="px-3 py-2.5 text-right">
                  {editing ? (
                    <Input
                      aria-label={`Jumlah keluar ${item.product.name}`}
                      inputMode="numeric"
                      className="ml-auto w-20 text-right tabular-nums"
                      value={issued[item.id]}
                      onChange={(e) => setIssued((all) => ({ ...all, [item.id]: e.target.value.replace(/\D/g, '') }))}
                    />
                  ) : (
                    <span className="tabular-nums">
                      {item.issued_qty === null ? '—' : formatNumber(item.issued_qty)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {generalError && <p className="text-sm text-danger-text">{generalError}</p>}

      {editing && (
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-[var(--primary)]"
            checked={matched}
            onChange={(e) => setMatched(e.target.checked)}
          />
          <span>
            Batch sudah dicocokkan dengan kardus yang diambil
            <span className="block text-sm text-muted-foreground">
              Tanpa centang, SIGAP mencatat batch ED terdekat sebagai perkiraan.
            </span>
          </span>
        </label>
      )}

      {editing && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`note-${request.id}`}>Catatan untuk sales</Label>
          <Input
            id={`note-${request.id}`}
            value={note}
            maxLength={255}
            placeholder="Wajib bila jumlah keluar dikurangi"
            onChange={(e) => setNote(e.target.value)}
          />
          <FieldError id={`note-${request.id}-error`} message={fieldErrors.note?.[0]} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editing && (
          <Button disabled={action.isPending || pickMismatch} onClick={prepare}>
            {action.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <PackageCheck aria-hidden />}
            {canApprove ? 'Siapkan & keluarkan' : request.status.value === 'prepared' ? 'Siapkan ulang' : 'Siapkan'}
          </Button>
        )}
        {(request.status.value === 'prepared' || request.status.value === 'issued') && (
          <Button variant="outline" onClick={() => printSlip(request)}>
            <Printer aria-hidden />
            Cetak bukti keluar
          </Button>
        )}
        {canApprove && request.status.value === 'prepared' && (
          <Button
            disabled={action.isPending}
            onClick={() =>
              action.mutate(
                { id: request.id, action: 'approve' },
                { onSuccess: () => toast.success(`${request.number} keluar ke ${request.sales.name}`) },
              )
            }
          >
            <Check aria-hidden />
            Setujui barang keluar
          </Button>
        )}
        {canPrepare && (request.status.value === 'submitted' || request.status.value === 'prepared') && (
          <ConfirmDialog
            open={rejectOpen}
            onOpenChange={(open) => {
              setRejectOpen(open)
              if (!open) action.reset()
            }}
            trigger={<Button variant="danger-outline">Tolak</Button>}
            title={`Tolak permintaan ${request.number}?`}
            description={`${request.sales.name} akan melihat catatan Anda. Tidak ada barang yang keluar.`}
            confirmLabel="Tolak permintaan"
            pending={action.isPending}
            error={action.error?.message}
            onConfirm={() =>
              action.mutate(
                { id: request.id, action: 'reject', body: { note: rejectNote } },
                {
                  onSuccess: () => {
                    setRejectOpen(false)
                    toast.success(`${request.number} ditolak`)
                  },
                },
              )
            }
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={`reject-${request.id}`} className="text-base">
                Alasan (wajib)
              </Label>
              <Textarea
                id={`reject-${request.id}`}
                rows={2}
                value={rejectNote}
                maxLength={255}
                placeholder="Misalnya: stok kosong sampai Kamis"
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </ConfirmDialog>
        )}
        {canPrepare && request.can_revert && <RevertStatusButton request={request} />}
      </div>
      <HistoryPanel type="stock_request" id={request.id} />
    </li>
  )
}

const BACK: Record<string, { label: string; impact: (r: StockRequest) => string }> = {
  issued: {
    label: 'Kembalikan ke Disiapkan',
    impact: (r) =>
      `Barang ditarik lagi dari bawaan ${r.sales.name} ke gudang, lalu jumlahnya bisa diubah dan disetujui ulang. Hanya bisa bila barangnya masih dibawa.`,
  },
  prepared: { label: 'Kembalikan ke Diajukan', impact: () => 'Batch yang sudah disiapkan dilepas lagi.' },
  rejected: { label: 'Buka lagi permintaan', impact: () => 'Permintaan kembali ke Diajukan dan bisa disiapkan.' },
}

/** KR-05 "Ubah status": one step back, with a reason. */
function RevertStatusButton({ request }: { request: StockRequest }) {
  const action = useStockRequestAction()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const back = BACK[request.status.value]
  if (!back) return null

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) action.reset()
      }}
      trigger={
        <Button variant="ghost" className="text-leaf-700">
          <Undo2 aria-hidden />
          Ubah status
        </Button>
      }
      title={`${back.label}: ${request.number}?`}
      description={back.impact(request)}
      confirmLabel={back.label}
      pending={action.isPending}
      error={action.error?.message}
      onConfirm={() =>
        action.mutate(
          { id: request.id, action: 'revert-status', body: { reason } },
          {
            onSuccess: (result) => {
              setOpen(false)
              toast.success(`${request.number} sekarang ${result.status.label}`)
            },
          },
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`revert-${request.id}`} className="text-base">
          Alasan (wajib)
        </Label>
        <Textarea
          id={`revert-${request.id}`}
          rows={2}
          value={reason}
          maxLength={255}
          placeholder="Misalnya: jumlah yang disiapkan salah"
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  )
}

/** Doc 11: which batches to take for one product; the nearest expiry is suggested. */
function PickList({
  itemId,
  batches,
  picks,
  issued,
  onChange,
}: {
  itemId: string
  batches: PickBatch[]
  picks: { batch_id: string; qty: number }[]
  issued: number
  onChange: (batchId: string, value: string) => void
}) {
  const taken = new Map(picks.map((p) => [p.batch_id, p.qty]))
  const sum = pickedTotal(picks)

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-2">
      <span className="text-sm font-medium">Ambil dari batch</span>
      {[...batches]
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
        .map((batch) => (
          <span key={batch.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {batch.batch_number} · {formatExpiry(new Date(batch.expiry_date))}{' '}
              <span className="text-muted-foreground">(stok {formatNumber(batch.qty)})</span>
            </span>
            <Input
              aria-label={`Ambil batch ${batch.batch_number}`}
              id={`pick-${itemId}-${batch.id}`}
              inputMode="numeric"
              className="h-9 w-16 text-right tabular-nums sm:h-9"
              value={String(taken.get(batch.id) ?? 0)}
              onChange={(e) => onChange(batch.id, e.target.value.replace(/\D/g, ''))}
            />
          </span>
        ))}
      {sum !== issued && (
        <span role="alert" className="text-sm text-danger-text">
          Jumlah per batch {sum}, harus sama dengan jumlah keluar ({issued}).
        </span>
      )}
    </div>
  )
}

/** Doc 11: a slip the sales takes along: product, batch, ED, quantity. Opens the print dialog. */
function printSlip(request: StockRequest) {
  const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
  const rows = request.items
    .flatMap((item) =>
      (item.allocations ?? []).map(
        (a) =>
          `<tr><td>${esc(item.product.name)}</td><td>${esc(a.batch_number ?? '')}</td><td>${
            a.expiry_date ? esc(formatExpiry(new Date(a.expiry_date))) : ''
          }</td><td class="n">${a.qty} ${esc(item.product.unit)}</td></tr>`,
      ),
    )
    .join('')
  const win = window.open('', '_blank', 'width=720,height=900')
  if (!win) {
    toast.error('Jendela cetak diblokir browser. Izinkan pop-up untuk SIGAP.')
    return
  }
  win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Bukti keluar ${esc(request.number)}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#1e293b}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#475569}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-size:14px}
th{background:#166534;color:#fff}.n{text-align:right}.sign{display:flex;justify-content:space-between;margin-top:48px}
.sign span{width:40%;border-top:1px solid #94a3b8;padding-top:4px;text-align:center;font-size:13px}</style></head><body>
<h1>Bukti barang keluar ${esc(request.number)}</h1>
<p>Untuk ${esc(request.sales.name)} · ${esc(formatTableDate(new Date(request.issued_at ?? request.prepared_at ?? request.created_at)))}</p>
<table><thead><tr><th>Produk</th><th>Batch</th><th>ED</th><th class="n">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
<p style="margin-top:12px">Susun di tas per ED. Saat mengisi rak, taruh ED lama di depan.</p>
<div class="sign"><span>Gudang</span><span>Sales</span></div>
<script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
}
