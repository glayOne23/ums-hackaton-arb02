import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { usePermission } from '@/stores/session'
import { useReportCatalog } from '../api'

/** W7 — Laporan: every report this user may open, grouped as in the wireframe. */
export function ReportMenu() {
  const catalog = useReportCatalog()
  const canSeePrices = usePermission('product.view')

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Laporan</h1>
        <p className="text-muted-foreground">
          Semua laporan bisa disaring per bulan, sales, kabupaten, dan jenis outlet, lalu diunduh ke Excel atau dicetak.
        </p>
      </header>

      {catalog.isPending ? (
        <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : catalog.isError ? (
        <ErrorState message={catalog.error.message} onRetry={() => catalog.refetch()} />
      ) : (
        <>
          {catalog.data.map((group) => (
            <MenuGroup
              key={group.key}
              title={group.title}
              items={group.items.map((item) => ({
                key: item.code,
                title: item.title,
                description: item.description,
                link: (children) => (
                  <Link to="/office/reports/$code" params={{ code: item.code }} className={LINK}>
                    {children}
                  </Link>
                ),
              }))}
            />
          ))}
          {canSeePrices && (
            <MenuGroup
              title="Harga"
              items={[
                {
                  key: 'price-list',
                  title: 'Daftar harga & potongan',
                  description: 'Harga jual dan potongan yang berlaku per jenis outlet, bisa dicetak.',
                  link: (children) => (
                    <Link to="/office/price-list" className={LINK}>
                      {children}
                    </Link>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
    </section>
  )
}

const LINK =
  'flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card shadow-card p-4 transition-shadow hover:border-leaf-600 hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'

function MenuGroup({
  title,
  items,
}: {
  title: string
  items: { key: string; title: string; description: string; link: (children: React.ReactNode) => React.ReactNode }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.key}>
            {item.link(
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-leaf-800">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </span>
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"
                  aria-hidden
                >
                  <ChevronRight className="size-5" />
                </span>
              </>,
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
