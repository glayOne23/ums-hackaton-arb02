import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSesi } from '@/stores/sesi'

// "/" hanya mengarahkan: belum masuk → /masuk; sales → /lapangan; peran lain → /kantor
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { pengguna } = useSesi.getState()
    if (!pengguna) throw redirect({ to: '/masuk' })
    throw redirect({ to: pengguna.area === 'lapangan' ? '/lapangan' : '/kantor' })
  },
})
