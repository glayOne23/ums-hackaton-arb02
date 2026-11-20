import { createFileRoute } from '@tanstack/react-router'
import { FieldTodayView } from '@/features/inventory/components/FieldTodayView'

// M6 Hari ini — stok bawaan and requests to the warehouse
export const Route = createFileRoute('/field/today')({
  component: FieldTodayView,
})
