import { createFileRoute, Outlet } from '@tanstack/react-router'
import { IndikatorSinyal } from '@/components/layout/IndikatorSinyal'
import { TombolKeluar } from '@/components/layout/TombolKeluar'
import { wajibArea } from '@/features/akses/penjaga'
import { useSesi } from '@/stores/sesi'

/** Area lapangan: layar HP sales (M1–M6). Kode terpisah dari area kantor. */
export const Route = createFileRoute('/lapangan')({
  beforeLoad: () => wajibArea('lapangan'),
  component: TataLetakLapangan,
})

function TataLetakLapangan() {
  const nama = useSesi((s) => s.pengguna?.nama)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">Halo, {nama?.split(' ')[0]}</p>
          <IndikatorSinyal />
        </div>
        <TombolKeluar />
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
