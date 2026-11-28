import { createFileRoute } from '@tanstack/react-router'
import { BagExpiryCheck } from '@/features/inventory/components/BagExpiryCheck'

/** Doc 11: count the bag per ED; ?request=… matches the goods of one warehouse request. */
export const Route = createFileRoute('/field/expiry-check')({
  validateSearch: (search: Record<string, unknown>): { request?: string } => ({
    request: typeof search.request === 'string' && search.request ? search.request : undefined,
  }),
  component: ExpiryCheckPage,
})

function ExpiryCheckPage() {
  const { request } = Route.useSearch()
  return <BagExpiryCheck requestId={request} />
}
