import { createFileRoute } from '@tanstack/react-router'
import { MyOutletList } from '@/features/outlet/components/MyOutletList'

// M1 Outlet saya — outlets assigned to this sales
export const Route = createFileRoute('/field/')({
  component: MyOutletList,
})
