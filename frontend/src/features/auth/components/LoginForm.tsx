import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CloudOff, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useLogin } from '../api'
import { type LoginInput, loginSchema } from '../schemas'

interface Props {
  onSuccess: () => void
}

/** L1 — Sign in with phone number/username + password (AK-01). */
export function LoginForm({ onSuccess }: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const isOnline = useOnlineStatus()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  })

  const submit = handleSubmit((input) => login.mutate(input, { onSuccess }))
  const errorMessage =
    login.error instanceof ApiError ? login.error.message : login.error ? 'Terjadi kesalahan. Coba lagi.' : null

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {!isOnline && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
          <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          Tidak ada sinyal. Masuk membutuhkan sinyal; setelah masuk, aplikasi tetap bisa dipakai tanpa sinyal.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login" className="text-base">
          Nomor HP atau username
        </Label>
        <Input
          id="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="0812… atau username"
          aria-invalid={!!errors.login}
          aria-describedby={errors.login ? 'login-error' : undefined}
          {...register('login')}
        />
        {errors.login && (
          <p id="login-error" className="flex items-center gap-1.5 text-sm text-danger-text">
            <CircleAlert className="size-4" aria-hidden />
            {errors.login.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-base">
          Kata sandi
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="flex items-center gap-1.5 text-sm text-danger-text">
            <CircleAlert className="size-4" aria-hidden />
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="cta" disabled={login.isPending}>
        {login.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        Masuk
      </Button>
    </form>
  )
}
