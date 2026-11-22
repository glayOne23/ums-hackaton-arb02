import { Link } from '@tanstack/react-router'
import { Plus, Store } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/features/import/components/ExportButton'
import { formatNumber } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useOutlets } from '../api'
import type { OutletFilters } from '../types'
import { DeletedOutletList } from './DeletedOutletList'
import { OutletFilterBar } from './OutletFilterBar'
import { OutletCards, OutletTable } from './OutletTable'
import { ProposalReview } from './ProposalReview'

const PER_PAGE = 25

interface Props {
  filters: OutletFilters
  onFiltersChange: (next: OutletFilters) => void
}

/** W3 — outlet list for the office: search, filter, table (cards on phones), pages. */
export function OutletList({ filters, onFiltersChange }: Props) {
  const canManage = usePermission('outlet.manage')
  const outlets = useOutlets({ ...filters, per_page: PER_PAGE })
  const hasFilters = Boolean(
    filters.search || filters.region_id || filters.outlet_type_id || filters.sale_mode || filters.status,
  )
  const meta = outlets.data?.meta

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <PageHeader
        icon={Store}
        title="Outlet"
        description={meta && <>{formatNumber(meta.total)} outlet</>}
        actions={
          <>
            <ExportButton type="outlets" title="Outlet" />
            {canManage && (
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/office/outlets/new">
                  <Plus aria-hidden />
                  Tambah outlet
                </Link>
              </Button>
            )}
          </>
        }
      />

      <ProposalReview />

      <OutletFilterBar filters={filters} onChange={onFiltersChange} />

      {outlets.isPending ? (
        <ListSkeleton />
      ) : outlets.isError ? (
        <ErrorState message={outlets.error.message} onRetry={() => outlets.refetch()} />
      ) : outlets.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <Store className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">
            {filters.status === 'deleted' && !filters.search && !filters.region_id && !filters.outlet_type_id
              ? 'Tidak ada outlet terhapus.'
              : hasFilters
                ? 'Tidak ada outlet yang cocok dengan filter.'
                : 'Belum ada outlet.'}
          </p>
          {hasFilters ? (
            <Button variant="outline" onClick={() => onFiltersChange({})}>
              Hapus filter
            </Button>
          ) : (
            canManage && (
              <Button asChild>
                <Link to="/office/outlets/new">Tambah outlet</Link>
              </Button>
            )
          )}
        </div>
      ) : (
        <>
          {filters.status === 'deleted' ? (
            <DeletedOutletList outlets={outlets.data.data} />
          ) : (
            <>
              <div className="hidden sm:block">
                <OutletTable outlets={outlets.data.data} />
              </div>
              <div className="sm:hidden">
                <OutletCards outlets={outlets.data.data} />
              </div>
            </>
          )}
          {meta && (
            <Pagination meta={meta} onPageChange={(page) => onFiltersChange({ ...filters, page })} noun="outlet" />
          )}
        </>
      )}

      {/* Phones: the one primary action is pinned above the bottom menu (UI guide §5) */}
      {canManage && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:hidden">
          <Button asChild size="cta">
            <Link to="/office/outlets/new">
              <Plus aria-hidden />
              Tambah outlet
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat daftar outlet">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  )
}
