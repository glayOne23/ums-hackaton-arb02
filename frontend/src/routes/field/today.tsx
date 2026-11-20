import { createFileRoute } from '@tanstack/react-router'
import { FieldTodayView } from '@/features/inventory/components/FieldTodayView'
import { TodaySummary } from '@/features/sales/components/TodaySummary'

// M6 Hari ini — visits and money today, stok bawaan, requests to the warehouse
export const Route = createFileRoute('/field/today')({
  component: function TodayPage() {
    return (
      <div className="flex flex-col gap-6">
        <TodaySummary />
        <FieldTodayView />
      </div>
    )
  },
})
