import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { monthLabel, monthOptions, shiftMonth } from '@/lib/month'

/**
 * Month filter (SRS 3.6): ‹ previous, a list of months, next ›.
 * Replaces <input type="month">, which Firefox and Safari on desktop show as
 * a plain text box: half-typed values were rejected and the month jumped back.
 */
export function MonthPicker({
  id,
  value,
  current,
  onChange,
}: {
  id: string
  /** "YYYY-MM" */
  value: string
  /** This month "YYYY-MM": the latest that can be chosen */
  current: string
  onChange: (month: string) => void
}) {
  const options = monthOptions(current, value)
  const oldest = options[options.length - 1]

  return (
    <div className="flex gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="h-12 shrink-0 sm:h-10"
        aria-label="Bulan sebelumnya"
        title="Bulan sebelumnya"
        disabled={value <= oldest}
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((month) => (
          <option key={month} value={month}>
            {monthLabel(month)}
          </option>
        ))}
      </NativeSelect>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="h-12 shrink-0 sm:h-10"
        aria-label="Bulan berikutnya"
        title="Bulan berikutnya"
        disabled={value >= current}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  )
}
