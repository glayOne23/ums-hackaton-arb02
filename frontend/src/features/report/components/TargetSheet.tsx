import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import { useSalesTargets, useSaveSalesTargets } from '../api'
import type { SalesTargetRow } from '../types'

/** PG-10: monthly visit and revenue target per sales. */
export function TargetSheet({
  month,
  open,
  onOpenChange,
}: {
  month: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const targets = useSalesTargets(month, open)
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetTitle>Target {label}</SheetTitle>
        <SheetDescription>Isi 0 bila sales tidak diberi target. Persen target dihitung dari omzet.</SheetDescription>
        {targets.isPending ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        ) : targets.isError ? (
          <ErrorState message={targets.error.message} onRetry={() => targets.refetch()} />
        ) : (
          <TargetForm key={month} month={month} rows={targets.data} onDone={() => onOpenChange(false)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function TargetForm({ month, rows, onDone }: { month: string; rows: SalesTargetRow[]; onDone: () => void }) {
  const save = useSaveSalesTargets()
  const [draft, setDraft] = useState(rows)
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const set = (i: number, patch: Partial<SalesTargetRow>) =>
    setDraft((all) => all.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const digits = (value: string) => Number(value.replace(/\D/g, '') || 0)

  if (rows.length === 0) return <p className="text-muted-foreground">Belum ada sales aktif.</p>

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { month, targets: draft.map(({ name: _name, ...row }) => row) },
          {
            onSuccess: (r) => {
              toast.success(r.changed ? `${r.changed} target tersimpan.` : 'Tidak ada yang berubah.')
              onDone()
            },
          },
        )
      }}
    >
      <ul className="flex flex-col divide-y divide-earth-200">
        {draft.map((row, i) => (
          <li key={row.sales_user_id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_12rem] sm:items-end">
            <span className="font-medium">{row.name}</span>
            <label className="flex flex-col gap-1 text-sm">
              Kunjungan
              <Input
                inputMode="numeric"
                aria-label={`Target kunjungan ${row.name}`}
                value={row.visit_target ? String(row.visit_target) : ''}
                placeholder="0"
                onChange={(e) => set(i, { visit_target: digits(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Omzet (Rp)
              <Input
                inputMode="numeric"
                aria-label={`Target omzet ${row.name}`}
                value={row.revenue_target ? formatNumber(row.revenue_target) : ''}
                placeholder="0"
                onChange={(e) => set(i, { revenue_target: digits(e.target.value) })}
              />
            </label>
            {(errors[`targets.${i}.visit_target`] || errors[`targets.${i}.revenue_target`]) && (
              <p className="text-sm text-danger-text sm:col-span-3">
                {errors[`targets.${i}.visit_target`]?.[0] ?? errors[`targets.${i}.revenue_target`]?.[0]}
              </p>
            )}
          </li>
        ))}
      </ul>
      {save.error && Object.keys(errors).length === 0 && (
        <p role="alert" className="text-danger-text">
          {save.error.message}
        </p>
      )}
      <Button type="submit" size="cta" className="sm:h-10 sm:w-auto sm:self-end" disabled={save.isPending}>
        {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        Simpan target
      </Button>
    </form>
  )
}
