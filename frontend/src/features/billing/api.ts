import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Invoice, InvoiceList, Payment, PaymentMethodValue, PendingRemittance, Remittance } from './types'

const ROOT = ['billing'] as const

export const billingKeys = {
  openInvoices: [...ROOT, 'invoices', 'open'] as const,
  invoice: (id: string) => [...ROOT, 'invoice', id] as const,
  pending: [...ROOT, 'remittances', 'pending'] as const,
  remittances: [...ROOT, 'remittances', 'history'] as const,
}

/** Every money change refreshes all billing screens and the visit notas. */
function useInvalidateBilling() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ROOT }),
      queryClient.invalidateQueries({ queryKey: ['sales'] }),
    ])
}

/**
 * All unpaid invoices at once (TG-01): filtering by sales or outlet and the
 * printed collection list work on the full set. 1.000 outlets fit easily.
 */
export function useOpenInvoices() {
  return useQuery({
    queryKey: billingKeys.openInvoices,
    queryFn: ({ signal }) => api<InvoiceList>('/billing/invoices?status=open&per_page=500', { signal }),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: billingKeys.invoice(id),
    queryFn: ({ signal }) => api<{ data: Invoice }>(`/billing/invoices/${id}`, { signal }).then((r) => r.data),
  })
}

export interface PaymentInput {
  amount: number
  method: PaymentMethodValue
  paid_at?: string
  note?: string
}

export function useRecordPayment(invoiceId: string) {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: (input: PaymentInput) =>
      api<{ data: Payment }>(`/billing/invoices/${invoiceId}/payments`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}

export function useVoidPayment() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<{ data: Payment }>(`/billing/payments/${id}/void`, { method: 'POST', body: { reason } }),
    onSuccess: invalidate,
  })
}

export function usePendingRemittances(enabled = true) {
  return useQuery({
    queryKey: billingKeys.pending,
    queryFn: ({ signal }) =>
      api<{ data: PendingRemittance[] }>('/billing/remittances/pending', { signal }).then((r) => r.data),
    enabled,
  })
}

export function useRemittances() {
  return useQuery({
    queryKey: billingKeys.remittances,
    queryFn: ({ signal }) =>
      api<{ data: Remittance[] }>('/billing/remittances?per_page=50', { signal }).then((r) => r.data),
  })
}

export function useReceiveRemittance() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: (input: { sales_user_id: number; amount?: number; note?: string }) =>
      api<{ data: Remittance }>('/billing/remittances', { method: 'POST', body: input }).then((r) => r.data),
    // Not awaited: the card disappears once the list refreshes, and its own onSuccess (the toast) must run first
    onSuccess: () => void invalidate(),
  })
}
