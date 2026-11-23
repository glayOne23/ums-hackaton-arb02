import { NativeSelect } from '@/components/ui/native-select'
import { useSalesPeople } from '@/lib/api/sales-people'

/**
 * "Sales" filter: all sales, one sales, or (withNone) outlets that have no
 * sales yet. Value "" = all, "none" = without sales, otherwise the user id.
 */
export function SalesSelect({
  id,
  value,
  onChange,
  withNone = false,
  counts,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  withNone?: boolean
  /** Optional number after each name, e.g. outlets held: "Endri (135)" */
  counts?: { bySales: Record<number, number>; none?: number }
}) {
  const sales = useSalesPeople()

  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Semua sales</option>
      {withNone && (
        <option value="none">
          Belum ada sales{counts?.none !== undefined ? ` (${counts.none})` : ''}
        </option>
      )}
      {sales.data?.map((person) => (
        <option key={person.id} value={String(person.id)}>
          {person.name}
          {person.is_active ? '' : ' (nonaktif)'}
          {counts ? ` (${counts.bySales[person.id] ?? 0})` : ''}
        </option>
      ))}
    </NativeSelect>
  )
}
