import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { useAssignees, useAssignOutlet } from '../api'
import type { Outlet } from '../types'

interface Props {
  outlet: Outlet
  onDone: () => void
}

/**
 * OT-04: tick the sales who hold this outlet. Removing someone counts as a move
 * and needs a reason, which stays in the history.
 */
export function AssignmentEditor({ outlet, onDone }: Props) {
  const assignees = useAssignees()
  const assign = useAssignOutlet(outlet.id)
  const current = outlet.sales?.map((s) => s.id) ?? []
  const [selected, setSelected] = useState<number[]>(current)
  const [reason, setReason] = useState('')

  const removing = current.some((id) => !selected.includes(id))
  const fieldErrors = assign.error instanceof ApiError ? assign.error.fieldErrors : {}
  const reasonError = fieldErrors.reason?.[0]
  const salesError = fieldErrors.sales_user_ids?.[0]
  const otherError = assign.error && !reasonError && !salesError ? assign.error.message : null

  const toggle = (id: number) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    assign.mutate(
      { sales_user_ids: selected, reason },
      {
        onSuccess: () => {
          toast.success('Penugasan tersimpan')
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {otherError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {otherError}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Sales yang memegang outlet ini</legend>
        {assignees.isPending && <p className="text-muted-foreground">Memuat daftar sales…</p>}
        {assignees.data?.length === 0 && (
          <p className="text-muted-foreground">Belum ada pengguna dengan peran sales.</p>
        )}
        {assignees.data?.map((user) => (
          <label key={user.id} className="flex min-h-12 items-center gap-3 rounded-md border border-border px-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--primary)]"
              checked={selected.includes(user.id)}
              onChange={() => toggle(user.id)}
            />
            <span>
              {user.name} <span className="text-muted-foreground">({user.username})</span>
            </span>
          </label>
        ))}
        <FieldError id="sales-error" message={salesError} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="assignment-reason" className="text-base">
          Alasan{removing ? ' pindah (wajib)' : ''}
        </Label>
        <Input
          id="assignment-reason"
          value={reason}
          maxLength={255}
          placeholder={removing ? 'Misalnya: pembagian wilayah baru' : 'Boleh dikosongkan'}
          aria-invalid={!!reasonError}
          aria-describedby={reasonError ? 'reason-error' : undefined}
          onChange={(event) => setReason(event.target.value)}
        />
        <FieldError id="reason-error" message={reasonError} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" disabled={assign.isPending}>
          {assign.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          Simpan penugasan
        </Button>
      </div>
    </form>
  )
}
