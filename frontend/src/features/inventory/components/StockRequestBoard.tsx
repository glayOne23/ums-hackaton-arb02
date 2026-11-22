import { Check, ClipboardList, LoaderCircle, PackageCheck, Undo2, Truck } from 'lucide-react'
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
import { useStockRequestAction, useStockRequests } from '../api'
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
        description="Batch dengan ED terdekat dipilih otomatis saat disiapkan."
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

  // Prepared again after "Ubah status" (KR-05): the numbers may change before approving
  const editing = canPrepare && (request.status.value === 'submitted' || request.status.value === 'prepared')
  const fieldErrors = action.error instanceof ApiError ? action.error.fieldErrors : {}
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
          items: request.items.map((item) => ({ id: item.id, issued_qty: Number(issued[item.id] || 0) })),
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

      <table className="w-full text-left">
        <thead className="text-sm text-muted-foreground">
          <tr>
            <th scope="col" className="pb-1 font-semibold">
              Produk
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Diminta
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Keluar
            </th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((item, i) => (
            <tr key={item.id} className="border-t border-earth-200 align-top">
              <td className="py-2 pr-2">
                <span className="font-medium">{item.product.name}</span>
                {item.allocations && item.allocations.length > 0 && (
                  <span className="block text-sm text-muted-foreground">
                    {item.allocations
                      .map(
                        (a) =>
                          `${a.batch_number} (${a.expiry_date ? formatExpiry(new Date(a.expiry_date)) : ''}) ${a.qty}`,
                      )
                      .join(' · ')}
                  </span>
                )}
                <FieldError id={`issued-${item.id}-error`} message={fieldErrors[`items.${i}.issued_qty`]?.[0]} />
              </td>
              <td className="py-2 text-right tabular-nums">{formatNumber(item.requested_qty)}</td>
              <td className="py-2 text-right">
                {editing ? (
                  <Input
                    aria-label={`Jumlah keluar ${item.product.name}`}
                    inputMode="numeric"
                    className="ml-auto w-20 text-right tabular-nums"
                    value={issued[item.id]}
                    onChange={(e) => setIssued((all) => ({ ...all, [item.id]: e.target.value.replace(/\D/g, '') }))}
                  />
                ) : (
                  <span className="tabular-nums">{item.issued_qty === null ? '—' : formatNumber(item.issued_qty)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {generalError && <p className="text-sm text-danger-text">{generalError}</p>}

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
          <Button disabled={action.isPending} onClick={prepare}>
            {action.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <PackageCheck aria-hidden />}
            {canApprove ? 'Siapkan & keluarkan' : request.status.value === 'prepared' ? 'Siapkan ulang' : 'Siapkan'}
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
        {canPrepare && request.status.value !== 'submitted' && <RevertStatusButton request={request} />}
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
