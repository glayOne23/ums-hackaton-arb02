import { FlaskConical, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { FieldError } from '@/components/common/FieldError'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useFeatureFlags, useSaveFeatureFlag } from '../api'
import type { FeatureFlag } from '../types'

const AUDIENCES: { value: FeatureFlag['audience']; label: string }[] = [
  { value: 'all', label: 'Semua pengguna' },
  { value: 'roles', label: 'Peran tertentu' },
  { value: 'none', label: 'Mati' },
]

/**
 * FP-07: try a new feature with some people first (one role, a few users),
 * then switch it on for everyone. Users see the change after their app
 * refreshes its account data (next sign-in or reconnect).
 */
export function FeatureFlagPanel() {
  const flags = useFeatureFlags()

  return (
    <SectionCard
      title={
        <>
          <FlaskConical className="size-5 text-slate-500" aria-hidden />
          Fitur bertahap
        </>
      }
    >
      <p className="text-muted-foreground">
        Coba fitur baru ke sebagian pengguna dulu, misalnya satu peran atau beberapa orang, sebelum dinyalakan untuk
        semua.
      </p>
      {flags.isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      ) : flags.isError ? (
        <ErrorState message={flags.error.message} onRetry={() => flags.refetch()} />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {flags.data.data.map((flag) => (
            <li key={flag.key} className="py-4 first:pt-0 last:pb-0">
              <FlagEditor flag={flag} roles={flags.data.roles} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function FlagEditor({ flag, roles }: { flag: FeatureFlag; roles: { name: string; label: string }[] }) {
  const save = useSaveFeatureFlag()
  const [audience, setAudience] = useState(flag.audience)
  const [chosen, setChosen] = useState<string[]>(flag.roles)
  const [users, setUsers] = useState(flag.users.join(', '))
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const userError = Object.entries(errors).find(([key]) => key.startsWith('users'))?.[1]?.[0]
  const id = `flag-${flag.key}`

  const changed =
    audience !== flag.audience ||
    chosen.slice().sort().join() !== flag.roles.slice().sort().join() ||
    users !== flag.users.join(', ')

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{flag.label}</p>
        <p className="text-sm text-muted-foreground">{flag.help}</p>
      </div>
      <div role="radiogroup" aria-label={`Siapa yang melihat ${flag.label}`} className="flex flex-wrap gap-2">
        {AUDIENCES.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={audience === a.value}
            onClick={() => setAudience(a.value)}
            className={cn('h-11 rounded-md border px-4 sm:h-10', audience === a.value ? 'choice-on' : 'choice')}
          >
            {a.label}
          </button>
        ))}
      </div>
      {audience === 'roles' && (
        <fieldset className="flex flex-wrap gap-x-5 gap-y-1">
          <legend className="sr-only">Peran</legend>
          {roles.map((role) => (
            <label key={role.name} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={chosen.includes(role.name)}
                onChange={(e) =>
                  setChosen((all) => (e.target.checked ? [...all, role.name] : all.filter((r) => r !== role.name)))
                }
              />
              {role.label}
            </label>
          ))}
          <FieldError id={`${id}-roles-error`} message={errors.roles?.[0]} />
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Label htmlFor={`${id}-users`}>Juga untuk pengguna ini (username, pisahkan koma)</Label>
        <Input
          id={`${id}-users`}
          placeholder="Misalnya: sales1, gudang"
          value={users}
          aria-invalid={!!userError}
          aria-describedby={userError ? `${id}-users-error` : undefined}
          onChange={(e) => setUsers(e.target.value)}
        />
        <FieldError id={`${id}-users-error`} message={userError} />
      </div>
      <Button
        variant="outline"
        className="self-start"
        disabled={!changed || save.isPending}
        onClick={() =>
          save.mutate(
            {
              key: flag.key,
              audience,
              roles: audience === 'roles' ? chosen : [],
              users: users
                .split(',')
                .map((u) => u.trim())
                .filter(Boolean),
            },
            { onSuccess: () => toast.success(`${flag.label}: tersimpan`) },
          )
        }
      >
        {save.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
        {changed ? 'Simpan' : 'Belum ada perubahan'}
      </Button>
    </div>
  )
}
