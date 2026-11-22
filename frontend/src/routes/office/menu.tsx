import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useNavGroups } from '@/components/layout/nav-items'
import { HelpButton } from '@/features/help/components/HelpSheet'

/** "Lainnya" on phones: every menu item the user may open, in the side-menu sections (UI guide §5). */
export const Route = createFileRoute('/office/menu')({
  component: MenuPage,
})

const ROW = 'flex h-14 items-center gap-3 px-4 text-lg'
const ICON_TILE = 'grid size-9 shrink-0 place-items-center rounded-md bg-leaf-50 text-leaf-700'

function MenuPage() {
  const groups = useNavGroups()

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`menu-${group.key}`} className="flex flex-col gap-2">
          <h2 id={`menu-${group.key}`} className="px-1 font-semibold text-slate-600">
            {group.label}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {group.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className={ROW}>
                  <span className={ICON_TILE}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">{label}</span>
                  <ChevronRight className="size-5 text-leaf-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <HelpButton className={`${ROW} w-full font-medium`} iconWrapClassName={`${ICON_TILE} [&_svg]:size-5`} />
      </div>
    </section>
  )
}
