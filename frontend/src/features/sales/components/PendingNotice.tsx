import { CloudOff, TriangleAlert } from 'lucide-react'
import { useReceipts } from '../api'

/**
 * "2 kunjungan menunggu sinyal" (doc 05 M1, UX-11). Refused visits are
 * shown apart, because only they need the sales to act (KR-12).
 */
export function PendingNotice() {
  const receipts = useReceipts() ?? []
  const queued = receipts.filter((r) => r.status === 'queued').length
  const failed = receipts.filter((r) => r.status === 'failed').length
  if (queued === 0 && failed === 0) return null

  return (
    <div className="flex flex-col gap-2" role="status">
      {queued > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-info-text">
          <CloudOff className="size-5 shrink-0" aria-hidden />
          {queued} kunjungan tersimpan di HP, akan terkirim saat ada sinyal
        </p>
      )}
      {failed > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-danger-text">
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          {failed} kunjungan gagal terkirim. Buka di "Hari ini" untuk kirim ulang.
        </p>
      )}
    </div>
  )
}
