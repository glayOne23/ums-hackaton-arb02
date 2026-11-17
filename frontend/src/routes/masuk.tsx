import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { FormMasuk } from '@/features/akses/components/FormMasuk'
import { useSesi } from '@/stores/sesi'

export const Route = createFileRoute('/masuk')({
  beforeLoad: () => {
    const { pengguna } = useSesi.getState()
    if (pengguna) throw redirect({ to: pengguna.area === 'lapangan' ? '/lapangan' : '/kantor' })
  },
  component: HalamanMasuk,
})

const NOMOR_ADMIN_WA = '' // diisi dari Pengaturan (PG-09) saat modul Pengaturan dibuat

function HalamanMasuk() {
  const navigate = useNavigate()

  const setelahMasuk = () => {
    const area = useSesi.getState().pengguna?.area
    navigate({ to: area === 'lapangan' ? '/lapangan' : '/kantor', replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="size-8" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">SIGAP</h1>
          <p className="text-muted-foreground">CV Arba&apos;in Jaya Mandiri</p>
        </div>
      </header>

      <FormMasuk onBerhasil={setelahMasuk} />

      <p className="text-center text-sm text-muted-foreground">
        Lupa kata sandi?{' '}
        {NOMOR_ADMIN_WA ? (
          <a className="font-medium text-daun-700 underline-offset-4 hover:underline" href={`https://wa.me/${NOMOR_ADMIN_WA}`}>
            Hubungi admin kantor
          </a>
        ) : (
          'Hubungi admin kantor.'
        )}
      </p>
    </main>
  )
}
