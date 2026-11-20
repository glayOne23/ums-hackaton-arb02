import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { OfficeBottomNav, OfficeSideNav } from '@/components/layout/OfficeNav'
import { requireArea } from '@/features/auth/guard'
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
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">SIGAP</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <div className="hidden text-right sm:block">
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{roles}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <OfficeSideNav />
        <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <OfficeBottomNav />
    </div>
  )
}
