import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { CirclePause } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import { cn } from '@/lib/utils'
import type { Outlet } from '../types'

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
            className="font-medium text-foreground underline-offset-4 hover:text-leaf-700 hover:underline"
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
])

/** W3 outlet table for tablet and desktop. Phones use OutletCards instead. */
export function OutletTable({ outlets }: { outlets: Outlet[] }) {
  const table = useTable({ features, columns, data: outlets })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-muted">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(
                    'h-11 px-4 text-sm font-semibold text-muted-foreground',
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
            <tr key={row.id} className="border-t border-earth-200">
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
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 active:bg-accent"
          >
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
          </Link>
        </li>
      ))}
    </ul>
  )
}
