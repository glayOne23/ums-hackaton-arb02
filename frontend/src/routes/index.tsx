import { createFileRoute } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'

// Halaman sementara untuk memastikan fondasi (router, Tailwind, token) berjalan.
// Diganti layar masuk (L1) saat modul Akses dikerjakan.
export const Route = createFileRoute('/')({
  component: Beranda,
})

function Beranda() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">SIGAP</h1>
      </div>
      <p className="text-muted-foreground">Fondasi aplikasi siap. Layar pertama menyusul.</p>
      <p className="rounded-md bg-success-soft px-4 py-3 text-success-text">
        Token desain dan Tailwind aktif.
      </p>
    </main>
  )
}
