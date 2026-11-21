import { CircleCheck, CircleMinus, KeyRound, Pencil, Plus, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { type UserFilters, useRoles, useUsers } from '../api'
import type { UserItem } from '../types'
import { AccessHistory } from './AccessHistory'
import { AccessTabs } from './AccessTabs'
import { PasswordSheet } from './PasswordSheet'
import { UserSheet } from './UserSheet'

const STATUSES = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
] as const

/** Kelola pengguna: who may sign in, with which roles (PG-08, AK-02). */
export function UserList() {
  const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', status: 'all' })
  const deferred = useDeferredValue(filters)
  const users = useUsers(deferred)
  const roles = useRoles()
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [resetting, setResetting] = useState<UserItem | null>(null)

  const openForm = (user: UserItem | null) => {
    setEditing(user)
    setFormOpen(true)
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pengguna</h1>
          <p className="text-muted-foreground">Siapa saja yang boleh masuk ke SIGAP, dan perannya.</p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus aria-hidden />
          Tambah pengguna
        </Button>
      </header>
      <AccessTabs />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Cari nama, username, atau nomor HP"
            placeholder="Cari nama, username, nomor HP"
            className="pl-10"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="lg:w-56">
          <NativeSelect
            aria-label="Peran"
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="">Semua peran</option>
            {roles.data?.data.map((role) => (
              <option key={role.name} value={role.name}>
                {role.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div role="radiogroup" aria-label="Status" className="flex gap-2">
          {STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              role="radio"
              aria-checked={filters.status === status.value}
              onClick={() => setFilters((f) => ({ ...f, status: status.value }))}
              className={cn(
                'h-11 rounded-md border px-4 sm:h-10',
                filters.status === status.value ? 'border-primary bg-accent font-semibold' : 'border-border bg-card',
              )}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {users.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : users.isError ? (
        <ErrorState message={users.error.message} onRetry={() => users.refetch()} />
      ) : users.data.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          Tidak ada pengguna yang cocok.
        </p>
      ) : (
        <ul
          className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card"
          aria-label="Daftar pengguna"
        >
          {users.data.map((user) => (
            <li
              key={user.id}
              className={cn(
                'grid gap-2 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)_auto] lg:items-center',
                !user.is_active && 'bg-muted/50',
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold break-words">
                  {user.name}
                  {user.is_self && <span className="font-normal text-muted-foreground"> (Anda)</span>}
                </p>
                <p className="text-muted-foreground break-words">
                  {user.username} · {user.phone}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <span key={role.name} className="rounded-sm bg-accent px-2 py-0.5 text-sm font-medium">
                    {role.label}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {user.is_active ? (
                  <StatusChip variant="success" icon={CircleCheck} className="self-start">
                    Aktif
                  </StatusChip>
                ) : (
                  <StatusChip variant="neutral" icon={CircleMinus} className="self-start">
                    Nonaktif
                  </StatusChip>
                )}
                <span className="text-sm text-muted-foreground">
                  {user.last_login_at
                    ? `Terakhir masuk ${formatDate(new Date(user.last_login_at))} ${formatTime(new Date(user.last_login_at))}`
                    : 'Belum pernah masuk'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openForm(user)} aria-label={`Ubah ${user.name}`}>
                  <Pencil aria-hidden />
                  Ubah
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResetting(user)}
                  aria-label={`Ganti kata sandi ${user.name}`}
                >
                  <KeyRound aria-hidden />
                  Kata sandi
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AccessHistory />
      <UserSheet user={editing} open={formOpen} onOpenChange={setFormOpen} />
      <PasswordSheet user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
    </section>
  )
}
