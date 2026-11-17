import { createFileRoute } from '@tanstack/react-router'
import { Store } from 'lucide-react'

// M1 Outlet saya — dikerjakan setelah modul Outlet & paket kerja tersedia
export const Route = createFileRoute('/lapangan/')({
  component: () => (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <Store className="size-12 text-muted-foreground" aria-hidden />
      <p className="text-lg">Daftar outlet Anda akan tampil di sini.</p>
    </section>
  ),
})
