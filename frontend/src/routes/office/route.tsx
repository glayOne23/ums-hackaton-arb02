import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { OfflineDataNotice, OutboxSync } from '@/components/offline/OfficeOffline'
import { OfficeBottomNav, OfficeSideNav } from '@/components/layout/OfficeNav'
import { requireArea } from '@/features/auth/guard'
import { ScreenHint } from '@/features/help/components/ScreenHint'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { useSession } from '@/stores/session'

/** Office area: admin, warehouse, manager (W1–W13). Menu items follow the user's permissions. */
export const Route = createFileRoute('/office')({
  beforeLoad: () => requireArea('office'),
  component: OfficeLayout,
})

function OfficeLayout() {
  const user = useSession((s) => s.user)
  // Labels come from the API; a session saved before role_labels existed shows names until /auth/me refreshes it
  const roles = (user?.role_labels ?? user?.roles)?.join(', ')

  return (
    <div className="flex min-h-dvh flex-col">
      <OutboxSync />
      {/* Brand band (UI guide §2.1): white on dark green, 7.1:1 */}
      <header
        data-surface="brand"
        className="sticky top-0 z-10 print:hidden flex items-center justify-between gap-4 px-4 py-3 shadow-raised sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-white text-leaf-700">
            <Leaf className="size-5" aria-hidden />
          </span>
          {/* Phones: the logo alone, so the bell and "Keluar" still fit in 360 px */}
          <span className="hidden text-lg font-bold tracking-wide min-[400px]:inline">SIGAP</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <ConnectionStatus />
          <div className="hidden text-right sm:block">
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{roles}</p>
          </div>
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <OfficeSideNav />
        <main className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <OfflineDataNotice />
          <ScreenHint />
          <Outlet />
        </main>
      </div>
      <OfficeBottomNav />
    </div>
  )
}
