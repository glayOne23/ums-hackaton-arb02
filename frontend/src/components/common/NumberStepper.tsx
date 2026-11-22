import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  /** The starting value; a changed value is highlighted so the user sees what they touched */
  initial?: number
  min?: number
}

/** Tonal green − / +: clearly a button outdoors; grey only when it cannot go lower (disabled). */
const STEP_BUTTON =
  'grid size-12 shrink-0 place-items-center rounded-md border border-leaf-600 bg-leaf-50 text-leaf-800 shadow-xs ' +
  'active:bg-leaf-200 disabled:border-earth-300 disabled:bg-earth-100 disabled:text-earth-500 disabled:shadow-none'

/**
 * UI guide §7.2: − / + of 48 px either side of the number; typing opens the
 * numeric keypad; a changed value gets a light green background and a dot.
 */
export function NumberStepper({ id, label, value, onChange, initial, min = 0 }: Props) {
  const changed = initial !== undefined && value !== initial
  const set = (next: number) => {
    onChange(Math.max(min, next))
    navigator.vibrate?.(10)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Kurangi ${label}`}
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className={STEP_BUTTON}
      >
        <Minus className="size-6" strokeWidth={2.5} aria-hidden />
      </button>
      <span className="relative">
        <input
          id={id}
          aria-label={label}
          inputMode="numeric"
          value={value}
          onChange={(e) => set(Number(e.target.value.replace(/\D/g, '') || 0))}
          className={cn(
            'h-12 w-20 rounded-md border border-input bg-card text-center text-xl font-semibold tabular-nums outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            changed && 'border-primary bg-accent',
          )}
        />
        {changed && <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" aria-hidden />}
      </span>
      <button type="button" aria-label={`Tambah ${label}`} onClick={() => set(value + 1)} className={STEP_BUTTON}>
        <Plus className="size-6" strokeWidth={2.5} aria-hidden />
      </button>
      <span className="sr-only" aria-live="polite">
        {label} {value}
      </span>
    </div>
  )
}
