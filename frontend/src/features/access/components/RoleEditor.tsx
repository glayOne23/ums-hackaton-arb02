import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useDeleteRole, useRoles, useSaveRole } from '../api'
import type { Area, RoleItem, RolesResponse } from '../types'
import { AccessHistory } from './AccessHistory'
import { AccessTabs } from './AccessTabs'

/**
 * W9 — Peran & izin (PG-08). Permissions are ticked per menu and action; a new
 * role (e.g. "Kepala Gudang") can start as a copy of another one.
 */
export function RoleEditor() {
  const roles = useRoles()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  if (roles.isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (roles.isError) return <ErrorState message={roles.error.message} onRetry={() => roles.refetch()} />

  const selected = roles.data.data.find((r) => r.id === selectedId) ?? roles.data.data[0]

  return (
    <section className="flex flex-col gap-4 pb-28 sm:pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Peran & izin</h1>
        <p className="text-muted-foreground">
          Centang apa saja yang boleh dilakukan tiap peran. Berlaku untuk semua pengguna peran itu saat aplikasinya
          terhubung.
        </p>
      </header>
      <AccessTabs />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5 sm:w-80">
          <Label htmlFor="role-select" className="text-base">
            Peran
          </Label>
          <NativeSelect
            id="role-select"
            value={selected?.id ?? ''}
            onChange={(e) => {
              setSelectedId(Number(e.target.value))
              setCreating(false)
            }}
          >
            {roles.data.data.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label} ({role.users_count} pengguna)
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button variant="outline" onClick={() => setCreating(true)} aria-expanded={creating}>
          <Plus aria-hidden />
          Peran baru
        </Button>
      </div>

      {creating && (
        <NewRoleForm
          data={roles.data}
          copyFrom={selected?.id ?? null}
          onCancel={() => setCreating(false)}
          onCreated={(role) => {
            setSelectedId(role.id)
            setCreating(false)
          }}
        />
      )}

      {selected && !creating && (
        <RoleForm
          key={`${selected.id}-${selected.permissions.join()}-${selected.label}-${selected.area}`}
          role={selected}
          data={roles.data}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      <AccessHistory />
    </section>
  )
}

function AreaPicker({ value, onChange, data }: { value: Area; onChange: (area: Area) => void; data: RolesResponse }) {
  return (
    <div role="radiogroup" aria-labelledby="role-area-label" className="flex flex-col gap-2">
      <span id="role-area-label" className="text-base">
        Layar setelah masuk
      </span>
      <div className="flex flex-wrap gap-2">
        {data.areas.map((area) => (
          <button
            key={area.value}
            type="button"
            role="radio"
            aria-checked={value === area.value}
            onClick={() => onChange(area.value)}
            className={cn(
              'h-11 rounded-md border px-4',
              value === area.value ? 'border-primary bg-accent font-semibold' : 'border-border bg-card',
            )}
          >
            {area.label}
          </button>
        ))}
      </div>
      {value === 'field' && (
        <p className="text-sm text-muted-foreground">
          Layar lapangan hanya berisi kunjungan, nota, tagihan, dan minta barang. Izin menu kantor tidak terpakai di
          sana.
        </p>
      )}
    </div>
  )
}

function NewRoleForm({
  data,
  copyFrom,
  onCancel,
  onCreated,
}: {
  data: RolesResponse
  copyFrom: number | null
  onCancel: () => void
  onCreated: (role: RoleItem) => void
}) {
  const save = useSaveRole()
  const [label, setLabel] = useState('')
  const [area, setArea] = useState<Area>('office')
  const [source, setSource] = useState<string>(copyFrom ? String(copyFrom) : '')
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-primary bg-card p-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { label, area, copy_from: source ? Number(source) : null, ...(source ? {} : { permissions: [] }) },
          {
            onSuccess: (r) => {
              toast.success(`Peran ${r.data.label} dibuat. Periksa centang izinnya.`)
              onCreated(r.data)
            },
          },
        )
      }}
    >
      <h2 className="text-lg font-semibold">Peran baru</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-role-label" className="text-base">
            Nama peran (wajib)
          </Label>
          <Input
            id="new-role-label"
            placeholder="Misalnya: Kepala Gudang"
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={Boolean(errors.label)}
            aria-describedby={errors.label ? 'new-role-label-error' : undefined}
          />
          <FieldError id="new-role-label-error" message={errors.label?.[0]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-role-source" className="text-base">
            Salin izin dari
          </Label>
          <NativeSelect id="new-role-source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Mulai kosong</option>
            {data.data.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <AreaPicker value={area} onChange={setArea} data={data} />
      {save.error && Object.keys(errors).length === 0 && (
        <p role="alert" className="text-danger-text">
          {save.error.message}
        </p>
      )}
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          Buat peran
        </Button>
      </div>
    </form>
  )
}

function RoleForm({ role, data, onDeleted }: { role: RoleItem; data: RolesResponse; onDeleted: () => void }) {
  const save = useSaveRole()
  const remove = useDeleteRole()
  const [label, setLabel] = useState(role.label)
  const [area, setArea] = useState<Area>(role.area)
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set(role.permissions))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}

  const original = new Set(role.permissions)
  const permissionChanges =
    [...permissions].filter((p) => !original.has(p)).length + role.permissions.filter((p) => !permissions.has(p)).length
  const changes = permissionChanges + (label.trim() !== role.label ? 1 : 0) + (area !== role.area ? 1 : 0)

  const toggle = (name: string, on: boolean) =>
    setPermissions((current) => {
      const next = new Set(current)
      if (on) next.add(name)
      else next.delete(name)
      return next
    })

  const submit = () =>
    save.mutate(
      { id: role.id, label: label.trim(), area, permissions: [...permissions] },
      { onSuccess: (r) => toast.success(`Peran ${r.data.label} tersimpan.`) },
    )

  const deleteError =
    remove.error instanceof ApiError ? (remove.error.fieldErrors.role?.[0] ?? remove.error.message) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card shadow-card p-4">
        <div className="flex flex-col gap-1.5 sm:max-w-md">
          <Label htmlFor="role-label" className="text-base">
            Nama peran
          </Label>
          <Input
            id="role-label"
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={Boolean(errors.label)}
            aria-describedby={errors.label ? 'role-label-error' : undefined}
          />
          <FieldError id="role-label-error" message={errors.label?.[0]} />
        </div>
        <AreaPicker value={area} onChange={setArea} data={data} />
        <p className="text-muted-foreground">
          {role.users_count === 0 ? 'Belum ada pengguna dengan peran ini.' : `Dipakai ${role.users_count} pengguna.`}{' '}
          {role.is_default && 'Peran bawaan: izinnya boleh diubah, perannya tidak bisa dihapus.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.groups.map((group) => {
          const ticked = group.items.filter((item) => permissions.has(item.name)).length
          return (
            <fieldset key={group.title} className="flex flex-col gap-1 rounded-lg border border-border bg-card shadow-card p-4">
              <legend className="px-1 text-lg font-semibold">
                {group.title}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  ({ticked}/{group.items.length})
                </span>
              </legend>
              {group.items.map((item) => {
                const changed = permissions.has(item.name) !== original.has(item.name)
                return (
                  <label key={item.name} className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-6 shrink-0 accent-primary"
                      checked={permissions.has(item.name)}
                      onChange={(e) => toggle(item.name, e.target.checked)}
                    />
                    <span>{item.label}</span>
                    {changed && (
                      <span className="inline-block size-2 shrink-0 rounded-full bg-primary" aria-label="diubah" />
                    )}
                  </label>
                )
              })}
            </fieldset>
          )
        })}
      </div>

      {save.error && (
        <p role="alert" className="text-danger-text">
          {errors.permissions?.[0] ??
            errors.area?.[0] ??
            (Object.keys(errors).length === 0 ? save.error.message : null)}
        </p>
      )}

      {!role.is_default && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="self-start text-danger-text">
              <Trash2 aria-hidden />
              Hapus peran ini
            </Button>
          }
          title={`Hapus peran ${role.label}?`}
          description="Peran hanya bisa dihapus bila tidak ada pengguna yang memakainya. Riwayat perubahannya tetap tersimpan."
          confirmLabel="Hapus peran"
          open={confirmDelete}
          onOpenChange={(open) => {
            setConfirmDelete(open)
            if (!open) remove.reset()
          }}
          pending={remove.isPending}
          error={deleteError}
          onConfirm={() =>
            remove.mutate(role.id, {
              onSuccess: () => {
                setConfirmDelete(false)
                toast.success(`Peran ${role.label} dihapus.`)
                onDeleted()
              },
            })
          }
        />
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:sticky sm:bottom-20 sm:self-start sm:rounded-lg sm:border sm:shadow-md lg:bottom-4">
        <Button size="cta" className="sm:h-10 sm:w-auto" disabled={changes === 0 || save.isPending} onClick={submit}>
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {changes === 0 ? 'Belum ada perubahan' : `Simpan (${changes} perubahan)`}
        </Button>
      </div>
    </div>
  )
}
