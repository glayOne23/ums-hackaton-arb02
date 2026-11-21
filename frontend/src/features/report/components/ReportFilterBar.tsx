import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useReportOptions } from '../api'
import type { FilterKey, ReportFilters } from '../types'

/** Month, sales, region, and outlet type, in one row above the report (SRS 3.6). */
export function ReportFilterBar({
  filters,
  show,
  onChange,
}: {
  filters: ReportFilters
  show: FilterKey[]
  onChange: (filters: ReportFilters) => void
}) {
  const options = useReportOptions()
  const set = (patch: Partial<ReportFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end print:hidden">
      {show.includes('month') && (
        <div className="col-span-2 flex flex-col gap-1.5 sm:w-44">
          <Label htmlFor="filter-month" className="text-base">
            Bulan
          </Label>
          <Input
            id="filter-month"
            type="month"
            value={filters.month}
            max="2099-12"
            onChange={(e) => e.target.value && set({ month: e.target.value })}
          />
        </div>
      )}
      {show.includes('sales') && (
        <div className="flex flex-col gap-1.5 sm:w-52">
          <Label htmlFor="filter-sales" className="text-base">
            Sales
          </Label>
          <NativeSelect
            id="filter-sales"
            value={filters.sales_user_id ?? ''}
            onChange={(e) => set({ sales_user_id: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Semua sales</option>
            {options.data?.sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_active ? '' : ' (nonaktif)'}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {show.includes('region') && (
        <div className="flex flex-col gap-1.5 sm:w-52">
          <Label htmlFor="filter-region" className="text-base">
            Kabupaten/kota
          </Label>
          <NativeSelect
            id="filter-region"
            value={filters.region_id ?? ''}
            onChange={(e) => set({ region_id: e.target.value || undefined })}
          >
            <option value="">Semua wilayah</option>
            {options.data?.regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {show.includes('outlet_type') && (
        <div className="flex flex-col gap-1.5 sm:w-52">
          <Label htmlFor="filter-type" className="text-base">
            Jenis outlet
          </Label>
          <NativeSelect
            id="filter-type"
            value={filters.outlet_type_id ?? ''}
            onChange={(e) => set({ outlet_type_id: e.target.value || undefined })}
          >
            <option value="">Semua jenis</option>
            {options.data?.outlet_types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  )
}
