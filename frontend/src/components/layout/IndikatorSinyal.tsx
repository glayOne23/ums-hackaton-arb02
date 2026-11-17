import { Cloud, CloudOff } from 'lucide-react'
import { useSinyal } from '@/lib/useSinyal'

/** Status koneksi di kepala layar (Pedoman UI §7.7). Tanpa kata "offline"/"sinkron". */
export function IndikatorSinyal() {
  const adaSinyal = useSinyal()

  return adaSinyal ? (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Cloud className="size-4" aria-hidden />
      Tersambung
    </span>
  ) : (
    <span role="status" className="flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-sm text-info-text">
      <CloudOff className="size-4" aria-hidden />
      Tersimpan di HP
    </span>
  )
}
