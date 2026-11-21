import { Link } from '@tanstack/react-router'
import { ArrowLeft, CirclePause, MessageCircle, Pencil, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { formatTableDate } from '@/lib/format'
import { whatsappLink } from '@/lib/whatsapp'
import { usePermission } from '@/stores/session'
import { useOutlet } from '../api'
import type { Outlet } from '../types'
import { AssignmentEditor } from './AssignmentEditor'
import { DeleteOutletButton } from './DeleteOutletButton'
import { HistoryPanel } from '@/features/correction/components/HistoryPanel'
import { MergeDuplicateButton } from '@/features/correction/components/MergeDuplicateButton'

/**
 * W2 — outlet profile (OT-03). This first version shows the outlet data and
 * who holds it. Stock, visit history, and unpaid invoices are added when the
 * Inventory, Sales, and Billing modules exist.
 */
export function OutletProfile({ outletId }: { outletId: string }) {
  const outlet = useOutlet(outletId)

  if (outlet.isPending) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
  }

  if (outlet.isError) {
    const notFound = outlet.error instanceof ApiError && outlet.error.status === 404
    return (
      <ErrorState
        message={notFound ? 'Outlet tidak ditemukan, atau bukan outlet tugas Anda.' : outlet.error.message}
        onRetry={notFound ? undefined : () => outlet.refetch()}
      />
    )
  }

  return <ProfileContent outlet={outlet.data} />
}

function ProfileContent({ outlet }: { outlet: Outlet }) {
  const canManage = usePermission('outlet.manage')
  const [editingAssignment, setEditingAssignment] = useState(false)

  return (
    <article className="flex flex-col gap-6">
      <Link to="/office/outlets" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
        <ArrowLeft className="size-5" aria-hidden />
        Daftar outlet
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground tabular-nums">{outlet.code}</p>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
            {outlet.name}
            {!outlet.is_active && (
              <StatusChip variant="neutral" icon={CirclePause}>
                Nonaktif
              </StatusChip>
            )}
          </h1>
          <p className="text-muted-foreground">
            {outlet.outlet_type?.name} · {outlet.region?.name}, {outlet.district} · {outlet.sale_mode.label}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {outlet.whatsapp_number && (
            <Button variant="outline" asChild>
              <a href={whatsappLink(outlet.whatsapp_number)} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden />
                WA
              </a>
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" asChild>
                <Link to="/office/outlets/$outletId/edit" params={{ outletId: outlet.id }}>
                  <Pencil aria-hidden />
                  Ubah data
                </Link>
              </Button>
              <MergeDuplicateButton kind="outlet" kept={outlet} />
              <DeleteOutletButton outlet={outlet} />
            </>
          )}
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 sm:p-6">
        <Info label="Alamat" value={outlet.address} />
        <Info label="Nomor WA pemilik" value={outlet.whatsapp_number} />
        <Info
          label="Siklus kunjungan"
          value={outlet.visit_cycle_days ? `${outlet.visit_cycle_days} hari` : 'Ikut Pengaturan'}
        />
        <Info label="Sales penanggung jawab" value={outlet.sales?.map((s) => s.name).join(', ') || 'Belum ada'} />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Penugasan sales</h2>
          {canManage && !editingAssignment && (
            <Button variant="outline" onClick={() => setEditingAssignment(true)}>
              <UserRoundCog aria-hidden />
              Ubah penugasan
            </Button>
          )}
        </div>

        {editingAssignment ? (
          <AssignmentEditor outlet={outlet} onDone={() => setEditingAssignment(false)} />
        ) : outlet.assignments?.length ? (
          <ol className="flex flex-col">
            {outlet.assignments.map((assignment) => (
              <li key={assignment.id} className="flex flex-col gap-0.5 border-t border-earth-200 py-3 first:border-t-0">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {assignment.sales.name}
                  {assignment.is_active && <span className="text-sm text-success-text">· sekarang</span>}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatTableDate(new Date(assignment.start_date))} –{' '}
                  {assignment.end_date ? formatTableDate(new Date(assignment.end_date)) : 'sekarang'}
                  {assignment.reason && ` · ${assignment.reason}`}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">Outlet ini belum dipegang sales mana pun.</p>
        )}
      </section>

      <HistoryPanel type="outlet" id={outlet.id} />

      <p className="text-sm text-muted-foreground">
        Stok titipan, riwayat kunjungan, dan tagihan outlet akan tampil di sini setelah modul gudang, kunjungan, dan
        tagihan tersedia.
      </p>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span>{value || '—'}</span>
    </div>
  )
}
