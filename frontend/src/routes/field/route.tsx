import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { FieldNav } from '@/components/layout/FieldNav'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { requireArea } from '@/features/auth/guard'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { ReceiptSync } from '@/features/sales/components/ReceiptSync'
import { useSession } from '@/stores/session'

/** Field area: sales phone screens (M1–M6). Code-split from the office area. */
export const Route = createFileRoute('/field')({
  beforeLoad: () => requireArea('field'),
  component: FieldLayout,
})

function FieldLayout() {
  const name = useSession((s) => s.user?.name)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <ReceiptSync />
      <header className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">Halo, {name?.split(' ')[0]}</p>
          <ConnectionStatus />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
      <div className="print:hidden">
        <FieldNav />
      </div>
    </div>
  )
}
