/** Month values "YYYY-MM" for filters (reports, dashboard). Labels are Indonesian. */

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** How far back the month list goes; older months can still come from a shared link. */
const MONTHS_BACK = 36

/** "2026-11" ± n months → "2026-10" */
export function shiftMonth(month: string, by: number): string {
  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(year, monthIndex - 1 + by, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-11" → "November 2026" */
export function monthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return `${MONTHS[monthIndex - 1]} ${year}`
}

/** This month and the MONTHS_BACK before it, newest first, plus `month` if it lies outside. */
export function monthOptions(current: string, month: string): string[] {
  const options = Array.from({ length: MONTHS_BACK + 1 }, (_, i) => shiftMonth(current, -i))
  if (!options.includes(month)) options.push(month)
  return options.sort().reverse()
}
