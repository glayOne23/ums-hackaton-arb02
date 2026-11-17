import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CloudOff, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GalatApi } from '@/lib/api/client'
import { useSinyal } from '@/lib/useSinyal'
import { useMasuk } from '../api'
import { type DataMasuk, skemaMasuk } from '../schemas'

interface Props {
  onBerhasil: () => void
}

/** L1 — Masuk dengan nomor HP/username + kata sandi (AK-01). */
export function FormMasuk({ onBerhasil }: Props) {
  const [lihatSandi, setLihatSandi] = useState(false)
  const adaSinyal = useSinyal()
  const masuk = useMasuk()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DataMasuk>({
    resolver: zodResolver(skemaMasuk),
    mode: 'onTouched',
  })

  const kirim = handleSubmit((data) => masuk.mutate(data, { onSuccess: onBerhasil }))
  const galat = masuk.error instanceof GalatApi ? masuk.error.message : masuk.error ? 'Terjadi kesalahan. Coba lagi.' : null

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
      {!adaSinyal && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
          <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          Tidak ada sinyal. Masuk membutuhkan sinyal; setelah masuk, aplikasi tetap bisa dipakai tanpa sinyal.
        </p>
      )}

      {galat && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {galat}
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
          aria-describedby={errors.login ? 'login-galat' : undefined}
          {...register('login')}
        />
        {errors.login && (
          <p id="login-galat" className="flex items-center gap-1.5 text-sm text-danger-text">
            <CircleAlert className="size-4" aria-hidden />
            {errors.login.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kata-sandi" className="text-base">
          Kata sandi
        </Label>
        <div className="relative">
          <Input
            id="kata-sandi"
            type={lihatSandi ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={!!errors.kataSandi}
            aria-describedby={errors.kataSandi ? 'sandi-galat' : undefined}
            {...register('kataSandi')}
          />
          <button
            type="button"
            onClick={() => setLihatSandi((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
            aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {lihatSandi ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {errors.kataSandi && (
          <p id="sandi-galat" className="flex items-center gap-1.5 text-sm text-danger-text">
            <CircleAlert className="size-4" aria-hidden />
            {errors.kataSandi.message}
          </p>
        )}
      </div>

      <Button type="submit" size="utama" disabled={masuk.isPending}>
        {masuk.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        Masuk
      </Button>
    </form>
  )
}
