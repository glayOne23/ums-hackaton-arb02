import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ReportView } from '@/features/report/components/ReportView'
import { toFilters, toSearch, validateReportSearch } from '@/features/report/search'

// W7 — one report, filters kept in the URL
export const Route = createFileRoute('/office/reports/$code')({
  validateSearch: validateReportSearch,
  component: ReportPage,
})

function ReportPage() {
  const { code } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="report.view">
      <ReportView
        code={code}
        filters={toFilters(search)}
        onFiltersChange={(filters) => navigate({ search: toSearch(filters), replace: true })}
      />
    </PermissionGate>
  )
}
