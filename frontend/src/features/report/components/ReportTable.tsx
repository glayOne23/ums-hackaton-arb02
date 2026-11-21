import { cn } from '@/lib/utils'
import { formatCell, isNumeric } from '../format'
import type { ReportResult } from '../types'

/**
 * A report as a table on tablets, laptops, and paper; as cards on phones
 * (UI guide §1.1). The outlet, product, or sales column names each card.
 */
export function ReportTable({ report }: { report: ReportResult }) {
  const { columns, rows, totals } = report
  const titleColumn =
    ['outlet', 'product', 'sales', 'who'].map((key) => columns.find((c) => c.key === key)).find(Boolean) ??
    columns.find((c) => c.type === 'text') ??
    columns[0]

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block print:block print:overflow-visible print:border-0">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{report.title}</caption>
          <thead className="bg-muted print:bg-transparent">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'border-b border-border px-3 py-2 text-sm font-semibold whitespace-nowrap print:border print:border-earth-900 print:px-1.5 print:py-1',
                    isNumeric(column.type) && 'text-right',
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="break-inside-avoid border-b border-earth-200 last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2 align-top print:border print:border-earth-900 print:px-1.5 print:py-1 print:text-sm',
                      isNumeric(column.type) && 'text-right whitespace-nowrap tabular-nums',
                      column.key === titleColumn.key && 'min-w-44 font-medium',
                      column.type === 'text' && column.key !== titleColumn.key && 'min-w-32',
                      row.slow === true && column.key === 'note' && 'font-semibold text-warning-text',
                    )}
                  >
                    {formatCell(row[column.key], column.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-muted font-semibold print:bg-transparent">
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-t border-border px-3 py-2 print:border print:border-earth-900 print:px-1.5 print:py-1',
                      isNumeric(column.type) && 'text-right whitespace-nowrap tabular-nums',
                    )}
                  >
                    {column.key in totals ? formatCell(totals[column.key], column.type) : i === 0 ? 'Jumlah' : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <ul className="flex flex-col gap-3 sm:hidden print:hidden" aria-label={report.title}>
        {rows.map((row, i) => (
          <li key={i} className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold break-words">{formatCell(row[titleColumn.key], titleColumn.type)}</p>
            <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              {columns
                .filter((c) => c.key !== titleColumn.key && c.key !== 'rank')
                .map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="text-muted-foreground">{column.label}</dt>
                    <dd
                      className={cn(
                        'text-right break-words tabular-nums',
                        row.slow === true && column.key === 'note' && 'font-semibold text-warning-text',
                      )}
                    >
                      {formatCell(row[column.key], column.type)}
                    </dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
        {totals && (
          <li className="rounded-lg border border-primary bg-accent p-4">
            <p className="font-semibold">Jumlah</p>
            <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              {columns
                .filter((c) => c.key in totals)
                .map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="text-muted-foreground">{column.label}</dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {formatCell(totals[column.key], column.type)}
                    </dd>
                  </div>
                ))}
            </dl>
          </li>
        )}
      </ul>
    </>
  )
}
