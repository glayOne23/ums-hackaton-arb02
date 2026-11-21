import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileSpreadsheet, LoaderCircle, Printer, Target } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber, formatTime } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { downloadReportExcel, useReport, useReportCatalog, useReportOptions } from '../api'
import type { ReportFilters } from '../types'
import { ReportFilterBar } from './ReportFilterBar'
import { ReportTable } from './ReportTable'
import { TargetSheet } from './TargetSheet'

/** W7 — one report: filters, the table, Excel, and print/PDF (SRS 3.6). */
export function ReportView({
  code,
  filters,
  onFiltersChange,
}: {
  code: string
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
}) {
  const report = useReport(code, filters)
  const catalog = useReportCatalog()
  const options = useReportOptions()
  const canSetTargets = usePermission('target.manage')
  const [downloading, setDownloading] = useState(false)
  const [targetsOpen, setTargetsOpen] = useState(false)

  const entry = catalog.data?.flatMap((g) => g.items).find((item) => item.code === code)
  const title = report.data?.title ?? entry?.title ?? 'Laporan'
  const shown = report.data?.filters ?? entry?.filters ?? []
  const byMonth = shown.includes('month')

  const download = async () => {
    setDownloading(true)
    try {
      const suffix = byMonth ? filters.month : new Date().toISOString().slice(0, 10)
      await downloadReportExcel(code, filters, `SIGAP ${title.replaceAll('/', ' ')} ${suffix}.xlsx`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Excel gagal dibuat. Coba lagi.')
    } finally {
      setDownloading(false)
    }
  }

  const asOf = report.data ? new Date(report.data.as_of) : null
  // On paper the filter bar is hidden, so the chosen filters are printed as a line
  const chosen = [
    filters.sales_user_id && options.data?.sales.find((s) => s.id === filters.sales_user_id)?.name,
    filters.region_id && options.data?.regions.find((r) => r.id === filters.region_id)?.name,
    filters.outlet_type_id && options.data?.outlet_types.find((t) => t.id === filters.outlet_type_id)?.name,
  ].filter(Boolean)

  return (
    <section className="flex flex-col gap-4">
      <div className="print:hidden">
        <Button variant="ghost" asChild className="-ml-3 text-leaf-700">
          <Link to="/office/reports">
            <ArrowLeft aria-hidden />
            Semua laporan
          </Link>
        </Button>
      </div>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {report.data && (
            <p className="text-muted-foreground print:text-foreground">
              {byMonth ? report.data.month_label : asOf && `Keadaan ${formatDate(asOf)} ${formatTime(asOf)}`}
              {' · '}
              {report.data.description}
            </p>
          )}
          {chosen.length > 0 && <p className="hidden print:block">Saringan: {chosen.join(' · ')}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
          {code === 'sales-performance' && canSetTargets && (
            <Button variant="outline" onClick={() => setTargetsOpen(true)}>
              <Target aria-hidden />
              Atur target
            </Button>
          )}
          <Button variant="outline" onClick={download} disabled={downloading || !report.data}>
            {downloading ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileSpreadsheet aria-hidden />}
            Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!report.data}>
            <Printer aria-hidden />
            Cetak / PDF
          </Button>
        </div>
      </header>

      <ReportFilterBar filters={filters} show={shown} onChange={onFiltersChange} />

      {report.isPending ? (
        <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : report.isError ? (
        <ErrorState message={report.error.message} onRetry={() => report.refetch()} />
      ) : report.data.rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Tidak ada data untuk pilihan ini.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground print:hidden" aria-live="polite">
            {formatNumber(report.data.rows.length)} baris
            {report.isFetching && ' · memperbarui…'}
          </p>
          <ReportTable report={report.data} />
        </>
      )}

      {code === 'sales-performance' && canSetTargets && (
        <TargetSheet month={filters.month} open={targetsOpen} onOpenChange={setTargetsOpen} />
      )}
    </section>
  )
}
