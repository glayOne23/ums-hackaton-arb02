import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** UI guide §2.3–2.4: a status is always colour + icon + words, never colour alone. */
const VARIANTS = {
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  info: 'bg-info-soft text-info-text',
  neutral: 'bg-muted text-muted-foreground',
} as const

interface Props {
  variant: keyof typeof VARIANTS
  icon: LucideIcon
  children: ReactNode
  className?: string
}

export function StatusChip({ variant, icon: Icon, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-sm font-medium whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  )
}
