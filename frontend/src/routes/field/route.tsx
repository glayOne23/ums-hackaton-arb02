import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { requireArea } from '@/features/auth/guard'
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
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">Halo, {name?.split(' ')[0]}</p>
          <ConnectionStatus />
        </div>
        <LogoutButton />
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
