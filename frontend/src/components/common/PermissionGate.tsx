import { Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/stores/session'

/**
 * Shows children only with the permission; otherwise the "no access" state from
 * UI guide §7.8. The server still checks every request — this only spares the
 * user a screen full of errors. A list means any one of them is enough.
 */
export function PermissionGate({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const wanted = Array.isArray(permission) ? permission : [permission]
  const allowed = useSession((s) => wanted.some((p) => s.user?.permissions.includes(p) ?? false))

  if (allowed) return children

  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <Lock className="size-12 text-muted-foreground" aria-hidden />
      <p className="text-lg">Menu ini tidak tersedia untuk peran Anda.</p>
      <Button variant="outline" asChild>
        <Link to="/">Kembali</Link>
      </Button>
    </section>
  )
}
