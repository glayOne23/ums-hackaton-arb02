import { useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useKeluar } from '@/features/akses/api'

export function TombolKeluar() {
  const navigate = useNavigate()
  const keluar = useKeluar()

  return (
    <Button
      variant="ghost"
      className="text-daun-700"
      disabled={keluar.isPending}
      onClick={() => keluar.mutate(undefined, { onSettled: () => navigate({ to: '/masuk', replace: true }) })}
    >
      <LogOut aria-hidden />
      Keluar
    </Button>
  )
}
