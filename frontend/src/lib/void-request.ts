/** PG-12: a void that waits for approval, as the API sends it. */
export interface VoidPendingInfo {
  id: string
  reason: string
  requested_by: string
  requested_at: string
}

/** What a void endpoint answers: the voided document, or "waiting for approval" (HTTP 202). */
export interface VoidResult<T> {
  data?: T
  pending?: boolean
  message?: string
}

/** Toast text after asking to void: done now, or waiting for approval. */
export function voidToast(result: { pending?: boolean }, done: string): string {
  return result.pending ? 'Pembatalan diajukan. Menunggu persetujuan Pimpinan.' : done
}
