import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SalesSelect } from '@/components/common/SalesSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useOutletTypes, useRegions } from '../api'
import { type OutletFilters, type OutletStatusFilter, SALE_MODES, type SaleModeValue } from '../types'

interface Props {
  filters: OutletFilters
  onChange: (next: OutletFilters) => void
}

/** Search + filters above the outlet table. Every change goes back to page 1. */
export function OutletFilterBar({ filters, onChange }: Props) {
  const canManage = usePermission('outlet.manage')
  // Sales only see their own outlets, so the sales filter is for the office
  const canViewAll = usePermission('outlet.view_all')
  const regions = useRegions()
  const outletTypes = useOutletTypes()
  const [search, setSearch] = useState(filters.search ?? '')

  // Follow changes made outside the box (e.g. "Hapus filter" or the back button)
  const [appliedSearch, setAppliedSearch] = useState(filters.search)
  if (filters.search !== appliedSearch) {
    setAppliedSearch(filters.search)
    setSearch(filters.search ?? '')
  }

  // Wait until typing pauses before asking the server
  useEffect(() => {
    if (search === (filters.search ?? '')) return
    const timer = setTimeout(() => onChange({ ...filters, search: search || undefined, page: undefined }), 300)
    return () => clearTimeout(timer)
  }, [search, filters, onChange])

  const set = (patch: Partial<OutletFilters>) => onChange({ ...filters, ...patch, page: undefined })

  // Phones: the four filters fold away behind one button so the list starts on the first screen
  const [showFilters, setShowFilters] = useState(false)
  const activeCount = [
    filters.region_id,
    filters.outlet_type_id,
    filters.sale_mode,
    filters.sales_user_id,
    filters.status,
  ].filter(Boolean).length

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3 xl:col-span-1">
        <Label htmlFor="outlet-search">Cari</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="outlet-search"
              type="search"
              className="pl-9"
              placeholder="Nama atau kode outlet"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="sm:hidden"
            aria-expanded={showFilters}
            aria-controls="outlet-filters"
            onClick={() => setShowFilters((open) => !open)}
          >
            <SlidersHorizontal aria-hidden />
            Filter{activeCount > 0 && ` (${activeCount})`}
          </Button>
        </div>
      </div>

      <div id="outlet-filters" className={cn(showFilters ? 'grid gap-3' : 'hidden', 'sm:contents')}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-region">Kabupaten/kota</Label>
          <NativeSelect
            id="filter-region"
            value={filters.region_id ?? ''}
            onChange={(event) => set({ region_id: event.target.value || undefined })}
          >
            <option value="">Semua</option>
            {regions.data?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-type">Jenis outlet</Label>
          <NativeSelect
            id="filter-type"
            value={filters.outlet_type_id ?? ''}
            onChange={(event) => set({ outlet_type_id: event.target.value || undefined })}
          >
            <option value="">Semua</option>
            {outletTypes.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-sale-mode">Cara jual</Label>
          <NativeSelect
            id="filter-sale-mode"
            value={filters.sale_mode ?? ''}
            onChange={(event) =>
              set({
                sale_mode: (event.target.value || undefined) as SaleModeValue | undefined,
              })
            }
          >
            <option value="">Semua</option>
            {SALE_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        {canViewAll && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-sales">Sales</Label>
            <SalesSelect
              id="filter-sales"
              withNone
              value={filters.sales_user_id ?? ''}
              onChange={(sales) => set({ sales_user_id: sales || undefined })}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <NativeSelect
            id="filter-status"
            value={filters.status ?? 'active'}
            onChange={(event) => {
              const status = event.target.value as OutletStatusFilter
              set({ status: status === 'active' ? undefined : status })
            }}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
            {canManage && <option value="deleted">Terhapus</option>}
          </NativeSelect>
        </div>
      </div>
    </div>
  )
}
