import { redirect } from '@tanstack/react-router'
import { type Area, useSesi } from '@/stores/sesi'

/**
 * Dipakai di beforeLoad rute area. Belum masuk → /masuk.
 * Salah area → dipindah ke area miliknya (sales tidak membuka layar kantor, dan sebaliknya).
 */
export function wajibArea(area: Area) {
  const { pengguna } = useSesi.getState()
  if (!pengguna) throw redirect({ to: '/masuk' })
  if (pengguna.area !== area) throw redirect({ to: pengguna.area === 'lapangan' ? '/lapangan' : '/kantor' })
}
