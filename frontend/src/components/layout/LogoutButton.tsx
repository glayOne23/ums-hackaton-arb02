import { useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/api'
import { t } from '@/i18n'

export function LogoutButton() {
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <Button
      variant="ghost"
      className="text-link"
      disabled={logout.isPending}
      onClick={() => logout.mutate(undefined, { onSettled: () => navigate({ to: '/login', replace: true }) })}
    >
      <LogOut aria-hidden />
      {t('app.signOut')}
    </Button>
  )
}
