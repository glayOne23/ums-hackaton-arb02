import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useNavItems } from '@/components/layout/nav-items'

/** "Lainnya" on phones: every menu item the user may open (UI guide §5). */
export const Route = createFileRoute('/office/menu')({
  component: MenuPage,
})

function MenuPage() {
  const items = useNavItems()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Menu</h1>
      <ul className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex h-14 items-center gap-3 px-4 text-lg">
              <Icon className="size-6 text-leaf-700" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
