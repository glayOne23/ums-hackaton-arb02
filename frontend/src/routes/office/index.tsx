import { createFileRoute } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { useSession } from '@/stores/session'

// W1 Dashboard — built once transaction data is available
export const Route = createFileRoute('/office/')({
  component: Dashboard,
})

function Dashboard() {
  const permissionCount = useSession((s) => s.user?.permissions.length ?? 0)

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Ringkasan</h1>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
        <LayoutDashboard className="size-12 text-muted-foreground" aria-hidden />
        <p className="text-lg">Ringkasan akan tampil di sini.</p>
        <p className="text-sm text-muted-foreground">Akun Anda memiliki {permissionCount} izin.</p>
      </div>
    </section>
  )
}
