import { LoaderCircle, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api/client'
import { generatePassword, useResetPassword } from '../api'
import type { UserItem } from '../types'
import { Credentials } from './Credentials'

/** AK-02: give a user who forgot their password a new one. */
export function PasswordSheet({
  user,
  onOpenChange,
}: {
  user: UserItem | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={user !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Ganti kata sandi</SheetTitle>
        {user && <PasswordForm key={user.id} user={user} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function PasswordForm({ user, onDone }: { user: UserItem; onDone: () => void }) {
  const reset = useResetPassword()
  const [password, setPassword] = useState(generatePassword)
  const error = reset.error instanceof ApiError ? reset.error.fieldErrors.password?.[0] : undefined

  if (reset.isSuccess) {
    return (
      <>
        <SheetDescription>Kata sandi {user.name} sudah diganti.</SheetDescription>
        <Credentials name={user.name} username={user.username} phone={user.phone} password={password} onDone={onDone} />
      </>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        reset.mutate({ id: user.id, password })
      }}
    >
      <SheetDescription>
        Untuk {user.name}. {user.is_self ? 'Perangkat lain' : 'Semua perangkatnya'} langsung keluar dan harus masuk
        dengan kata sandi baru, jadi HP yang hilang tidak bisa dipakai lagi.
      </SheetDescription>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password" className="text-base">
          Kata sandi baru (wajib)
        </Label>
        <div className="flex gap-2">
          <Input
            id="new-password"
            className="font-mono"
            value={password}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'new-password-error' : undefined}
          />
          <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
            <Shuffle aria-hidden />
            Buat acak
          </Button>
        </div>
        <FieldError
          id="new-password-error"
          message={error ?? (reset.error && !error ? reset.error.message : undefined)}
        />
      </div>
      <Button type="submit" size="cta" className="sm:h-10 sm:w-auto sm:self-end" disabled={reset.isPending}>
        {reset.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        Ganti kata sandi
      </Button>
    </form>
  )
}
