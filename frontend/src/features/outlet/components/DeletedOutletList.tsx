import { useNavigate } from '@tanstack/react-router'
import { LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { formatTableDate } from '@/lib/format'
import { useRestoreOutlet } from '../api'
import type { Outlet } from '../types'

/**
 * Outlets in the trash (status filter "Terhapus"), each with "Pulihkan".
 * Stands in for the outlet part of W13 Tempat Sampah until that screen exists.
 */
export function DeletedOutletList({ outlets }: { outlets: Outlet[] }) {
  const restore = useRestoreOutlet()
  const navigate = useNavigate()

  return (
    <ul className="flex flex-col gap-3">
      {outlets.map((outlet) => {
        const restoring = restore.isPending && restore.variables === outlet.id

        return (
          <li
            key={outlet.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 sm:flex-nowrap"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{outlet.name}</span>
                <StatusChip variant="neutral" icon={Trash2}>
                  Terhapus
                </StatusChip>
              </span>
              <span className="text-muted-foreground">
                {outlet.code} · {outlet.outlet_type?.name} · {outlet.region?.name} · {outlet.district}
              </span>
              {outlet.deleted_at && (
                <span className="text-sm text-muted-foreground">
                  Dihapus {formatTableDate(new Date(outlet.deleted_at))}
                  {outlet.deleted_by && ` oleh ${outlet.deleted_by.name}`}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={restoring}
              onClick={() =>
                restore.mutate(outlet.id, {
                  onSuccess: () => {
                    toast.success(`Outlet ${outlet.name} dipulihkan`)
                    navigate({ to: '/office/outlets/$outletId', params: { outletId: outlet.id } })
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              {restoring ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
              Pulihkan
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
