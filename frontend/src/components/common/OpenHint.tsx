import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "This opens": the end of every tappable card or row (UI guide §7.3).
 * Laptop/tablet show a short label ("Lihat nota") with a chevron; phones show the
 * chevron only. Decorative for screen readers: the link already has its name.
 */
export function OpenHint({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1 self-center font-semibold text-leaf-700', className)}
      aria-hidden
    >
      {label && <span className="hidden text-sm sm:inline">{label}</span>}
      <ChevronRight className="size-5" />
    </span>
  )
}
