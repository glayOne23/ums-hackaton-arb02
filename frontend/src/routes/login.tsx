import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { areaHome, useSession } from '@/stores/session'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const { user } = useSession.getState()
    if (user) throw redirect({ to: areaHome(user.area) })
  },
  component: LoginPage,
})

const ADMIN_WHATSAPP_NUMBER = '' // filled from Settings (PG-09) once the Setting module exists

function LoginPage() {
  const navigate = useNavigate()

  const afterLogin = () => {
    const area = useSession.getState().user?.area ?? 'field'
    navigate({ to: areaHome(area), replace: true })
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

      <LoginForm onSuccess={afterLogin} />

      <p className="text-center text-sm text-muted-foreground">
        Lupa kata sandi?{' '}
        {ADMIN_WHATSAPP_NUMBER ? (
          <a
            className="font-medium text-leaf-700 underline-offset-4 hover:underline"
            href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}`}
          >
            Hubungi admin kantor
          </a>
        ) : (
          'Hubungi admin kantor.'
        )}
      </p>
    </main>
  )
}
