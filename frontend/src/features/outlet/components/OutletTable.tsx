import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { ChevronRight, CirclePause, Eye, Pencil } from 'lucide-react'
import { ROW_ACTION, RowActionLabel, RowActions, RowActionsHeader } from '@/components/common/RowActions'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import type { Outlet } from '../types'
import { DeleteOutletButton } from './DeleteOutletButton'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Outlet>()

/** Columns hidden below 1024 px (tablet shows the important ones only, UI guide §5) */
const DESKTOP_ONLY = new Set(['code', 'outlet_type', 'sales'])

const columns = helper.columns([
  helper.accessor('code', {
    header: 'Kode',
    cell: (info) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor('name', {
    header: 'Nama outlet',
    cell: (info) => {
      const outlet = info.row.original
      return (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to="/office/outlets/$outletId"
            params={{ outletId: outlet.id }}
            className="font-semibold text-leaf-800 underline decoration-leaf-600/40 underline-offset-4 hover:decoration-leaf-700"
          >
            {outlet.name}
          </Link>
          {!outlet.is_active && (
            <StatusChip variant="neutral" icon={CirclePause}>
              Nonaktif
            </StatusChip>
          )}
        </span>
      )
    },
  }),
  helper.accessor((row) => row.outlet_type?.name ?? '', {
    id: 'outlet_type',
    header: 'Jenis',
  }),
  helper.accessor((row) => `${row.region?.name ?? ''} · ${row.district}`, {
    id: 'location',
    header: 'Kab/Kota · Kecamatan',
  }),
  helper.accessor((row) => row.sale_mode.label, {
    id: 'sale_mode',
    header: 'Cara jual',
  }),
  helper.accessor((row) => row.sales?.map((s) => s.name).join(', ') ?? '', {
    id: 'sales',
    header: 'Sales',
    cell: (info) => info.getValue() || <span className="text-muted-foreground">Belum ada</span>,
  }),
  helper.display({
    id: 'actions',
    header: () => <RowActionsHeader />,
    cell: (info) => <OutletRowActions outlet={info.row.original} />,
  }),
])

/** Row actions seen at a glance (doc 05, UX-10): the same pages and dialog as on the profile. */
function OutletRowActions({ outlet }: { outlet: Outlet }) {
  const canManage = usePermission('outlet.manage')

  return (
    <RowActions>
      <Button asChild variant="secondary" size="row" className={ROW_ACTION}>
        <Link
          to="/office/outlets/$outletId"
          params={{ outletId: outlet.id }}
          aria-label={`Detail ${outlet.name}`}
          title="Detail"
        >
          <Eye aria-hidden />
          <RowActionLabel>Detail</RowActionLabel>
        </Link>
      </Button>
      {canManage && (
        <>
          <Button asChild variant="outline" size="row" className={ROW_ACTION}>
            <Link
              to="/office/outlets/$outletId/edit"
              params={{ outletId: outlet.id }}
              aria-label={`Ubah ${outlet.name}`}
              title="Ubah"
            >
              <Pencil aria-hidden />
              <RowActionLabel>Ubah</RowActionLabel>
            </Link>
          </Button>
          <DeleteOutletButton outlet={outlet} compact />
        </>
      )}
    </RowActions>
  )
}

/** W3 outlet table for tablet and desktop. Phones use OutletCards instead. */
export function OutletTable({ outlets }: { outlets: Outlet[] }) {
  const table = useTable({ features, columns, data: outlets })

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-table-head text-table-head-foreground print:bg-transparent print:text-foreground">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(
                    'h-11 px-4 text-sm font-semibold',
                    DESKTOP_ONLY.has(header.column.id) && 'hidden lg:table-cell',
                  )}
                >
                  <table.FlexRender header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border transition-colors hover:bg-row-hover">
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn('h-12 px-4 py-2', DESKTOP_ONLY.has(cell.column.id) && 'hidden lg:table-cell')}
                >
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Phone layout: the table becomes tappable cards (UI guide §7.3–7.4). */
export function OutletCards({ outlets }: { outlets: Outlet[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {outlets.map((outlet) => (
        <li key={outlet.id}>
          <Link
            to="/office/outlets/$outletId"
            params={{ outletId: outlet.id }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card active:bg-accent"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold">{outlet.name}</span>
                {!outlet.is_active && (
                  <StatusChip variant="neutral" icon={CirclePause}>
                    Nonaktif
                  </StatusChip>
                )}
              </span>
              <span className="text-muted-foreground">
                {outlet.outlet_type?.name} · {outlet.region?.name} · {outlet.district}
              </span>
              <span className="text-muted-foreground">
                {outlet.sale_mode.label} ·{' '}
                {outlet.sales?.length ? outlet.sales.map((s) => s.name).join(', ') : 'Belum ada sales'}
              </span>
            </span>
            {/* "This opens": every tappable card ends with a chevron (UI guide §7.3) */}
            <ChevronRight className="size-6 shrink-0 text-leaf-700" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}
