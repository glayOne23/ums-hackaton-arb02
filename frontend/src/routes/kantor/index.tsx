import { createFileRoute } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { useSesi } from '@/stores/sesi'

// W1 Ringkasan — dikerjakan setelah data transaksi tersedia
export const Route = createFileRoute('/kantor/')({
  component: Ringkasan,
})

function Ringkasan() {
  const jumlahIzin = useSesi((s) => s.pengguna?.izin.length ?? 0)

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Ringkasan</h1>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
        <LayoutDashboard className="size-12 text-muted-foreground" aria-hidden />
        <p className="text-lg">Ringkasan akan tampil di sini.</p>
        <p className="text-sm text-muted-foreground">Akun Anda memiliki {jumlahIzin} izin.</p>
      </div>
    </section>
  )
}
