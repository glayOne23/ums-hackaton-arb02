import { createFileRoute } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { ManagerDashboard } from '@/features/report/components/ManagerDashboard'
import { toFilters, toSearch, validateReportSearch } from '@/features/report/search'
import { usePermission } from '@/stores/session'

// W1 — Ringkasan pimpinan (LP-01)
export const Route = createFileRoute('/office/')({
  validateSearch: validateReportSearch,
  component: Dashboard,
})

function Dashboard() {
  const allowed = usePermission('dashboard.view')
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Warehouse staff open the office area too, but work from their own menu
  if (!allowed) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card py-16 text-center">
        <LayoutDashboard className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Selamat bekerja</h1>
        <p className="text-muted-foreground">Pilih menu kerja Anda di samping atau di bawah layar.</p>
      </section>
    )
  }

  return (
    <ManagerDashboard
      filters={toFilters(search)}
      onFiltersChange={(filters) => navigate({ search: toSearch(filters), replace: true })}
    />
  )
}
