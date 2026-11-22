import { Link } from '@tanstack/react-router'
import { Ban, Check, CircleCheck, CircleX, Hourglass, type LucideIcon, Percent, Plus, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { FilterBar, PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatDiscountPercent, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useDiscountAction, useDiscounts } from '../api'
import type { Discount, DiscountStatusFilter, DiscountStatusValue } from '../types'

/** UI guide §2.4: fixed status → look mapping */
const STATUS_LOOK: Record<
  DiscountStatusValue,
  { variant: 'info' | 'success' | 'danger' | 'neutral'; icon: LucideIcon }
> = {
  pending: { variant: 'info', icon: Hourglass },
  active: { variant: 'success', icon: CircleCheck },
  rejected: { variant: 'danger', icon: CircleX },
  inactive: { variant: 'neutral', icon: Ban },
}

const FILTERS: { value: DiscountStatusFilter; label: string }[] = [
  { value: 'current', label: 'Berlaku & menunggu' },
  { value: 'pending', label: 'Menunggu persetujuan' },
  { value: 'active', label: 'Berlaku' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'inactive', label: 'Tidak berlaku' },
  { value: 'all', label: 'Semua' },
]

/**
 * PR-03 discounts. A change is a new discount (the old one stays as history);
 * the manager approves or rejects pending ones (BR-05).
 */
export function DiscountList({
  status,
  onStatusChange,
}: {
  status: DiscountStatusFilter
  onStatusChange: (status: DiscountStatusFilter) => void
}) {
  const canManage = usePermission('product.manage')
  const discounts = useDiscounts(status)
  const paged = usePagedItems(discounts.data)
  const pendingCount = discounts.data?.filter((d) => d.status.value === 'pending').length ?? 0

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <PageHeader
        icon={Percent}
        title="Potongan"
        description="Yang paling khusus berlaku: outlet + produk, outlet, jenis outlet + produk, produk, lalu jenis outlet."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/office/price-list">
                <ReceiptText aria-hidden />
                Daftar harga
              </Link>
            </Button>
            {canManage && (
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/office/discounts/new">
                  <Plus aria-hidden />
                  Tambah potongan
                </Link>
              </Button>
            )}
          </>
        }
      />

      <FilterBar>
        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="discount-status">Tampilkan</Label>
          <NativeSelect
            id="discount-status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as DiscountStatusFilter)}
          >
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </FilterBar>

      {pendingCount > 0 && status === 'current' && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
          <Hourglass className="size-5 shrink-0" aria-hidden />
          {pendingCount} potongan menunggu persetujuan Pimpinan.
        </p>
      )}

      {discounts.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat potongan">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : discounts.isError ? (
        <ErrorState message={discounts.error.message} onRetry={() => discounts.refetch()} />
      ) : discounts.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <Percent className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Tidak ada potongan di sini.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {paged.items.map((discount) => (
              <DiscountRow key={discount.id} discount={discount} />
            ))}
          </ul>
          <Pagination meta={paged.meta} onPageChange={paged.setPage} noun="potongan" />
        </>
      )}

      {canManage && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:hidden">
          <Button asChild size="cta">
            <Link to="/office/discounts/new">
              <Plus aria-hidden />
              Tambah potongan
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

function DiscountRow({ discount }: { discount: Discount }) {
  const canApprove = usePermission('discount.approve')
  const canManage = usePermission('product.manage')
  const action = useDiscountAction()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  const [note, setNote] = useState('')
  const look = STATUS_LOOK[discount.status.value]
  const isPending = discount.status.value === 'pending'
  const canStop = canManage && (isPending || discount.status.value === 'active')

  const run = (kind: 'approve' | 'reject' | 'deactivate', done: string, after?: () => void) =>
    action.mutate(
      { id: discount.id, action: kind, note: kind === 'reject' ? note : undefined },
      {
        onSuccess: () => {
          toast.success(done)
          after?.()
        },
        onError: (error) => {
          if (kind === 'approve') toast.error(error.message)
        },
      },
    )

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {formatDiscountPercent(discount.discount_percent)}
          </span>
          <span className="text-lg font-medium">{discount.scope_label}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusChip variant={look.variant} icon={look.icon}>
            {discount.status.label}
          </StatusChip>
          <span className="text-sm text-muted-foreground">
            mulai {formatTableDate(new Date(discount.valid_from))}
            {discount.created_by && ` · dibuat ${discount.created_by.name}`}
            {discount.decided_by && !isPending && ` · diputuskan ${discount.decided_by.name}`}
          </span>
        </span>
        {discount.decision_note && <span className="text-sm text-danger-text">Catatan: {discount.decision_note}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {canApprove && isPending && (
          <>
            <Button
              disabled={action.isPending}
              onClick={() => run('approve', `Potongan ${discount.scope_label} disetujui`)}
            >
              <Check aria-hidden />
              Setujui
            </Button>
            <ConfirmDialog
              open={rejectOpen}
              onOpenChange={(open) => {
                setRejectOpen(open)
                if (!open) action.reset()
              }}
              trigger={<Button variant="danger-outline">Tolak</Button>}
              title={`Tolak potongan ${formatDiscountPercent(discount.discount_percent)} untuk ${discount.scope_label}?`}
              description="Potongan ini tidak akan berlaku. Admin akan melihat catatan Anda."
              confirmLabel="Tolak potongan"
              pending={action.isPending}
              error={action.error?.message}
              onConfirm={() => run('reject', 'Potongan ditolak', () => setRejectOpen(false))}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor={`note-${discount.id}`} className="text-base">
                  Alasan penolakan (wajib)
                </Label>
                <Textarea
                  id={`note-${discount.id}`}
                  rows={2}
                  maxLength={255}
                  value={note}
                  placeholder="Misalnya: terlalu besar, maksimal 15%"
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </ConfirmDialog>
          </>
        )}
        {canStop && (
          <ConfirmDialog
            open={stopOpen}
            onOpenChange={(open) => {
              setStopOpen(open)
              if (!open) action.reset()
            }}
            trigger={<Button variant="outline">{isPending ? 'Batalkan' : 'Hentikan'}</Button>}
            title={isPending ? 'Batalkan pengajuan potongan ini?' : `Hentikan potongan ${discount.scope_label}?`}
            description={
              isPending
                ? 'Pengajuan tidak akan diproses lagi.'
                : 'Mulai sekarang harga kembali memakai potongan berikutnya yang berlaku, atau harga jual penuh. Transaksi yang sudah tercatat tidak berubah.'
            }
            confirmLabel={isPending ? 'Batalkan pengajuan' : 'Hentikan potongan'}
            pending={action.isPending}
            error={action.error?.message}
            onConfirm={() =>
              run('deactivate', isPending ? 'Pengajuan dibatalkan' : 'Potongan dihentikan', () => setStopOpen(false))
            }
          />
        )}
      </div>
    </li>
  )
}
