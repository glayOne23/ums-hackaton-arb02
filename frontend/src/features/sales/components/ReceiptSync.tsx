import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from '@/stores/session'
import { pruneSentReceipts } from '../offline/db'
import { flushReceipts } from '../offline/sync'

const RETRY_MS = 30_000

/** Sends waiting visits on start, when the signal returns, and every 30 s (KS-11). Renders nothing. */
export function ReceiptSync() {
  const queryClient = useQueryClient()
  const userId = useSession((s) => s.user?.id)

  useEffect(() => {
    if (!userId) return
    const flush = () => void flushReceipts(queryClient, userId)
    flush()
    void pruneSentReceipts()
    window.addEventListener('online', flush)
    const timer = window.setInterval(() => navigator.onLine && flush(), RETRY_MS)
    return () => {
      window.removeEventListener('online', flush)
      window.clearInterval(timer)
    }
  }, [queryClient, userId])

  return null
}
