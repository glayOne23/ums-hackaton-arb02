import { LoaderCircle, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api/client'
import { generatePassword, useRoles, useSaveUser } from '../api'
import type { UserInput, UserItem } from '../types'
import { Credentials } from './Credentials'

/** Add a user, or change one (name, number, roles, active). */
export function UserSheet({
  user,
  open,
  onOpenChange,
}: {
  /** null = add a new user */
  user: UserItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetTitle>{user ? `Ubah ${user.name}` : 'Tambah pengguna'}</SheetTitle>
        {/* Keyed so each opening starts from the user's saved data */}
        {open && <UserForm key={user?.id ?? 'new'} user={user} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function UserForm({ user, onDone }: { user: UserItem | null; onDone: () => void }) {
  const roles = useRoles()
  const save = useSaveUser()
  const [form, setForm] = useState<UserInput>(() => ({
    name: user?.name ?? '',
    username: user?.username ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    roles: user?.roles.map((r) => r.name) ?? [],
    is_active: user?.is_active ?? true,
    password: user ? undefined : generatePassword(),
  }))
  const [created, setCreated] = useState<UserItem | null>(null)
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const formError = save.error && Object.keys(errors).length === 0 ? save.error.message : null
  const set = <K extends keyof UserInput>(key: K, value: UserInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  if (created && form.password) {
    return (
      <>
        <SheetDescription>Akun {created.name} sudah bisa dipakai masuk.</SheetDescription>
        <Credentials
          name={created.name}
          username={created.username}
          phone={created.phone}
          password={form.password}
          onDone={onDone}
        />
      </>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = { ...form, email: form.email?.trim() || null }
    if (user) {
      save.mutate(
        { id: user.id, ...body },
        {
          onSuccess: () => {
            toast.success(`Data ${form.name} tersimpan.`)
            onDone()
          },
        },
      )
    } else {
      save.mutate(body, { onSuccess: (r) => setCreated(r.data) })
    }
  }

  const field = (
    key: 'name' | 'username' | 'phone' | 'email',
    label: string,
    props: React.ComponentProps<'input'> = {},
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`user-${key}`} className="text-base">
        {label}
      </Label>
      <Input
        id={`user-${key}`}
        value={form[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `user-${key}-error` : undefined}
        {...props}
      />
      <FieldError id={`user-${key}-error`} message={errors[key]?.[0]} />
    </div>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <SheetDescription>
        {user
          ? 'Perubahan peran berlaku saat aplikasi pengguna ini terhubung lagi.'
          : 'Pengguna masuk dengan nomor HP atau username, dan kata sandi di bawah.'}
      </SheetDescription>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Nama (wajib)', { autoComplete: 'off' })}
        {field('phone', 'Nomor HP (wajib)', { inputMode: 'tel', autoComplete: 'off', placeholder: '08…' })}
        {field('username', 'Username (wajib)', { autoComplete: 'off', autoCapitalize: 'none', spellCheck: false })}
        {field('email', 'Email', { type: 'email', autoComplete: 'off' })}
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.roles ? 'user-roles-error' : undefined}>
        <legend className="mb-1 text-base">Peran (wajib, boleh lebih dari satu)</legend>
        {roles.isPending ? (
          <div className="h-20 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {roles.data?.data.map((role) => (
              <label key={role.name} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-6 shrink-0 accent-primary"
                  checked={form.roles.includes(role.name)}
                  onChange={(e) =>
                    set(
                      'roles',
                      e.target.checked ? [...form.roles, role.name] : form.roles.filter((r) => r !== role.name),
                    )
                  }
                />
                <span>
                  {role.label}
                  {role.area === 'field' && <span className="text-muted-foreground"> · layar HP sales</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        <FieldError id="user-roles-error" message={errors.roles?.[0]} />
      </fieldset>

      {user ? (
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-6 shrink-0 accent-primary"
              checked={form.is_active}
              disabled={user.is_self}
              onChange={(e) => set('is_active', e.target.checked)}
            />
            <span>Aktif, boleh masuk</span>
          </label>
          <p className="text-sm text-muted-foreground">
            {user.is_self
              ? 'Akun sendiri tidak bisa dinonaktifkan.'
              : 'Pengguna nonaktif langsung keluar dari semua HP dan komputer. Datanya tetap tersimpan.'}
          </p>
          <FieldError id="user-is_active-error" message={errors.is_active?.[0]} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-password" className="text-base">
            Kata sandi awal (wajib)
          </Label>
          <div className="flex gap-2">
            <Input
              id="user-password"
              className="font-mono"
              value={form.password ?? ''}
              autoComplete="new-password"
              spellCheck={false}
              onChange={(e) => set('password', e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'user-password-error' : 'user-password-help'}
            />
            <Button type="button" variant="outline" onClick={() => set('password', generatePassword())}>
              <Shuffle aria-hidden />
              Buat acak
            </Button>
          </div>
          <p id="user-password-help" className="text-sm text-muted-foreground">
            Paling sedikit 8 karakter. Tampil sekali lagi setelah disimpan, untuk dikirim ke pengguna.
          </p>
          <FieldError id="user-password-error" message={errors.password?.[0]} />
        </div>
      )}

      {formError && (
        <p role="alert" className="text-danger-text">
          {formError}
        </p>
      )}
      <Button type="submit" size="cta" className="sm:h-10 sm:w-auto sm:self-end" disabled={save.isPending}>
        {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        {user ? 'Simpan perubahan' : 'Tambah pengguna'}
      </Button>
    </form>
  )
}
