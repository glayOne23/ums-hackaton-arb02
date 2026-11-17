import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { IndikatorSinyal } from '@/components/layout/IndikatorSinyal'
import { TombolKeluar } from '@/components/layout/TombolKeluar'
import { wajibArea } from '@/features/akses/penjaga'
import { useSesi } from '@/stores/sesi'

const NAMA_PERAN: Record<string, string> = {
  pimpinan: 'Pimpinan',
  admin_kantor: 'Admin Kantor',
  admin_gudang: 'Admin Gudang',
}

/** Area kantor: admin, gudang, pimpinan (W1–W13). Menu samping menyusul. */
export const Route = createFileRoute('/kantor')({
  beforeLoad: () => wajibArea('kantor'),
  component: TataLetakKantor,
})

function TataLetakKantor() {
  const pengguna = useSesi((s) => s.pengguna)
  const peran = pengguna?.peran.map((p) => NAMA_PERAN[p] ?? p).join(', ')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">SIGAP</span>
        </div>
        <div className="flex items-center gap-4">
          <IndikatorSinyal />
          <div className="hidden text-right sm:block">
            <p className="font-medium">{pengguna?.nama}</p>
            <p className="text-sm text-muted-foreground">{peran}</p>
          </div>
          <TombolKeluar />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
