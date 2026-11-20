import { MessageCircle, Search, Store } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/ui/input'
import { whatsappLink } from '@/lib/whatsapp'
import { useOutlets } from '../api'

/** A sales holds ±150 outlets at most; load them all once and search on the phone. */
const ALL_MY_OUTLETS = 500

/**
 * M1 — Outlet saya (sales). Lists the outlets assigned to the signed-in sales.
 * Sorting by "longest since last visit" and opening the visit screen (M2) come
 * with the Sales module; until then the list is alphabetical.
 */
export function MyOutletList() {
  const outlets = useOutlets({ per_page: ALL_MY_OUTLETS })
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search.trim().toLowerCase())

  const shown = (outlets.data?.data ?? []).filter(
    (outlet) =>
      query === '' ||
      outlet.name.toLowerCase().includes(query) ||
      outlet.district.toLowerCase().includes(query) ||
      (outlet.region?.name.toLowerCase().includes(query) ?? false),
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Cari outlet"
          className="h-12 pl-10 text-base sm:h-12"
          placeholder="Cari outlet…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {outlets.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat outlet">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : outlets.isError ? (
        <ErrorState message={outlets.error.message} onRetry={() => outlets.refetch()} />
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Store className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">
            {query ? 'Tidak ada outlet dengan nama itu.' : 'Belum ada outlet yang ditugaskan. Hubungi admin kantor.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">{shown.length} outlet</p>
          <ul className="flex flex-col gap-3">
            {shown.map((outlet) => (
              <li key={outlet.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Wrap, never cut: the end of a name is often what tells two outlets apart */}
                  <span className="text-lg font-semibold wrap-break-word">{outlet.name}</span>
                  <span className="text-muted-foreground">
                    {outlet.region?.name} · {outlet.district}
                  </span>
                  <span className="text-muted-foreground">{outlet.sale_mode.label}</span>
                </div>
                {outlet.whatsapp_number && (
                  <a
                    href={whatsappLink(outlet.whatsapp_number)}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-12 shrink-0 place-items-center rounded-md border border-border text-leaf-700"
                    aria-label={`WhatsApp ${outlet.name}`}
                  >
                    <MessageCircle className="size-6" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
