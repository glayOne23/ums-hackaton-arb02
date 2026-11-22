import { Link } from '@tanstack/react-router'
import { Check, Minus, Monitor, ShieldCheck, Smartphone } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { useRoles } from '../api'
import type { RoleItem } from '../types'

/** What each default role is for, in one plain sentence (SDD §7). Roles made by an admin get the fallback. */
const DUTIES: Record<string, string> = {
  manager:
    'Memantau penjualan, stok, dan tagihan lewat Ringkasan dan Laporan. Menyetujui potongan harga, hasil opname, dan koreksi nota.',
  office_admin:
    'Mengurus data outlet, produk, harga, tagihan, dan setoran sales. Mengelola pengguna, pengaturan, dan impor Excel.',
  warehouse_admin:
    'Mencatat barang masuk, retur, dan opname gudang. Menyiapkan dan menyetujui barang yang dibawa sales.',
  sales:
    'Bekerja dari HP: mengunjungi outlet, mencatat penjualan dan barang titipan, menagih pembayaran, dan meminta barang ke gudang.',
}
const CUSTOM_DUTY = 'Peran tambahan buatan admin. Aksesnya mengikuti centang di Peran & izin.'

/**
 * AK-02: one look at what every role is for and what it may open, read from the
 * live role settings, so the table always matches the ticks in Peran & izin.
 */
export function RoleGuide() {
  const roles = useRoles()

  return (
    <section aria-labelledby="role-guide-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="role-guide-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ShieldCheck className="size-6 text-leaf-700" aria-hidden />
            Peran dan hak akses
          </h2>
          <p className="text-muted-foreground">
            Tugas tiap peran dan menu yang boleh dibuka. Tabel ini mengikuti pengaturan terbaru.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/office/users/roles">Ubah izin peran</Link>
        </Button>
      </div>

      {roles.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : roles.isError ? (
        <ErrorState message={roles.error.message} onRetry={() => roles.refetch()} />
      ) : (
        <>
          <RoleDuties roles={roles.data.data} areas={roles.data.areas} />
          <AccessMatrix roles={roles.data.data} groups={roles.data.groups} />
        </>
      )}
    </section>
  )
}

function RoleDuties({ roles, areas }: { roles: RoleItem[]; areas: { value: string; label: string }[] }) {
  const areaLabel = (value: string) => areas.find((a) => a.value === value)?.label ?? value

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">Penjelasan tiap peran</caption>
        <thead className="bg-leaf-50 text-sm text-leaf-800">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Peran
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Tugas utama
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Layar
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Pengguna
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {roles.map((role) => (
            <tr key={role.id} className="align-top">
              <th scope="row" className="px-4 py-3 font-semibold whitespace-nowrap text-leaf-800">
                {role.label}
              </th>
              <td className="px-4 py-3">{DUTIES[role.name] ?? CUSTOM_DUTY}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-leaf-50 px-2 py-0.5 text-sm font-medium whitespace-nowrap text-leaf-800">
                  {role.area === 'field' ? (
                    <Smartphone className="size-4" aria-hidden />
                  ) : (
                    <Monitor className="size-4" aria-hidden />
                  )}
                  {areaLabel(role.area)}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(role.users_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Rows: every permission, grouped per menu. Columns: roles. A tick is icon + hidden word, never colour alone. */
function AccessMatrix({
  roles,
  groups,
}: {
  roles: RoleItem[]
  groups: { title: string; items: { name: string; label: string }[] }[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[720px] text-left">
        <caption className="sr-only">Hak akses tiap peran</caption>
        <thead className="text-sm text-leaf-800">
          <tr className="bg-leaf-50">
            <th scope="col" className="sticky left-0 z-[1] bg-leaf-50 px-4 py-3 font-semibold">
              Akses
            </th>
            {roles.map((role) => (
              <th key={role.id} scope="col" className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                {role.label}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title} className="divide-y divide-border border-t border-border">
            <tr>
              <th
                scope="colgroup"
                colSpan={roles.length + 1}
                className="bg-muted/60 px-4 py-2 text-sm font-bold text-leaf-800"
              >
                {group.title}
              </th>
            </tr>
            {group.items.map((permission) => (
              <tr key={permission.name} className="hover:bg-leaf-50/60">
                <th scope="row" className="sticky left-0 z-[1] bg-card px-4 py-2.5 font-normal">
                  {permission.label}
                </th>
                {roles.map((role) => (
                  <td key={role.id} className="px-3 py-2.5 text-center">
                    <Allowed yes={role.permissions.includes(permission.name)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function Allowed({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="inline-grid size-7 place-items-center rounded-full bg-leaf-600 text-white">
      <Check className="size-4" strokeWidth={3} aria-hidden />
      <span className="sr-only">Boleh</span>
    </span>
  ) : (
    <span className="inline-grid size-7 place-items-center text-earth-500">
      <Minus className="size-4" aria-hidden />
      <span className="sr-only">Tidak</span>
    </span>
  )
}
