import { CircleCheck, CircleMinus, KeyRound, Pencil, Plus, Search, UsersRound } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState, FilterBar, PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { RowActions, RowActionsHeader } from '@/components/common/RowActions'
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
import { RoleGuide } from './RoleGuide'
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
  const paged = usePagedItems(users.data)
  const roles = useRoles()
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [resetting, setResetting] = useState<UserItem | null>(null)

  const openForm = (user: UserItem | null) => {
    setEditing(user)
    setFormOpen(true)
  }

  return (
    <section className="flex flex-col gap-5 pb-8">
      <PageHeader
        icon={UsersRound}
        title="Pengguna"
        description="Siapa saja yang boleh masuk ke SIGAP, dan perannya."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden />
            Tambah pengguna
          </Button>
        }
      />
      <AccessTabs />

      <FilterBar>
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
            onChange={(e) => (setFilters((f) => ({ ...f, search: e.target.value })), paged.setPage(1))}
          />
        </div>
        <div className="lg:w-56">
          <NativeSelect
            aria-label="Peran"
            value={filters.role}
            onChange={(e) => (setFilters((f) => ({ ...f, role: e.target.value })), paged.setPage(1))}
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
              onClick={() => (setFilters((f) => ({ ...f, status: status.value })), paged.setPage(1))}
              className={cn(
                'h-11 rounded-md border px-4 sm:h-10',
                filters.status === status.value ? 'choice-on' : 'choice',
              )}
            >
              {status.label}
            </button>
          ))}
        </div>
      </FilterBar>

      {users.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : users.isError ? (
        <ErrorState message={users.error.message} onRetry={() => users.refetch()} />
      ) : users.data.length === 0 ? (
        <EmptyState icon={UsersRound} title="Tidak ada pengguna yang cocok.">
          Coba kata kunci lain, atau pilih Semua peran.
        </EmptyState>
      ) : (
        <>
          {/* Desktop: a table with an Aksi column (UI guide §7.4) */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card lg:block">
            <table className="w-full text-left" aria-label="Daftar pengguna">
              <thead className="bg-leaf-50 text-sm text-leaf-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Nama
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Peran
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Terakhir masuk
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <RowActionsHeader />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((user) => (
                  <tr key={user.id} className={cn('hover:bg-leaf-50', !user.is_active && 'bg-muted/50')}>
                    <td className="px-4 py-3">
                      <UserName user={user} />
                    </td>
                    <td className="px-4 py-3">
                      <RoleChips user={user} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveChip active={user.is_active} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <LastLogin at={user.last_login_at} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <UserActions user={user} onEdit={openForm} onReset={setResetting} />
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone and tablet: one card per user */}
          <ul className="flex flex-col gap-3 lg:hidden" aria-label="Daftar pengguna">
            {paged.items.map((user) => (
              <li
                key={user.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card',
                  !user.is_active && 'bg-muted/50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <UserName user={user} />
                  <ActiveChip active={user.is_active} />
                </div>
                <RoleChips user={user} />
                <p className="text-sm text-muted-foreground">
                  <LastLogin at={user.last_login_at} />
                </p>
                <div className="flex flex-wrap gap-2">
                  <UserActions user={user} onEdit={openForm} onReset={setResetting} />
                </div>
              </li>
            ))}
          </ul>
          <Pagination meta={paged.meta} onPageChange={paged.setPage} noun="pengguna" />
        </>
      )}

      <RoleGuide />
      <AccessHistory />
      <UserSheet user={editing} open={formOpen} onOpenChange={setFormOpen} />
      <PasswordSheet user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
    </section>
  )
}

function UserName({ user }: { user: UserItem }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold wrap-break-word">
        {user.name}
        {user.is_self && <span className="font-normal text-muted-foreground"> (Anda)</span>}
      </p>
      <p className="text-sm text-muted-foreground wrap-break-word">
        {user.username} · {user.phone}
      </p>
    </div>
  )
}

function RoleChips({ user }: { user: UserItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.roles.map((role) => (
        <span
          key={role.name}
          className="rounded-sm bg-leaf-50 px-2 py-0.5 text-sm font-medium text-leaf-800 ring-1 ring-leaf-200"
        >
          {role.label}
        </span>
      ))}
    </div>
  )
}

function ActiveChip({ active }: { active: boolean }) {
  return active ? (
    <StatusChip variant="success" icon={CircleCheck} className="self-start">
      Aktif
    </StatusChip>
  ) : (
    <StatusChip variant="neutral" icon={CircleMinus} className="self-start">
      Nonaktif
    </StatusChip>
  )
}

function LastLogin({ at }: { at: string | null }) {
  return at ? (
    <>
      Terakhir masuk {formatDate(new Date(at))} {formatTime(new Date(at))}
    </>
  ) : (
    <>Belum pernah masuk</>
  )
}

function UserActions({
  user,
  onEdit,
  onReset,
}: {
  user: UserItem
  onEdit: (user: UserItem) => void
  onReset: (user: UserItem) => void
}) {
  return (
    <>
      <Button variant="outline" size="row" onClick={() => onEdit(user)} aria-label={`Ubah ${user.name}`}>
        <Pencil aria-hidden />
        Ubah
      </Button>
      <Button variant="secondary" size="row" onClick={() => onReset(user)} aria-label={`Ganti kata sandi ${user.name}`}>
        <KeyRound aria-hidden />
        Kata sandi
      </Button>
    </>
  )
}
