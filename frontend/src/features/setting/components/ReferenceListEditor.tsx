import { Check, LoaderCircle, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useReferenceList, useSaveReference } from '../api'
import type { ReferenceItem } from '../types'

/**
 * PG-05: one list (outlet types, regions, product categories). Entries are
 * switched off, never deleted, because outlets and products point to them.
 */
export function ReferenceListEditor({
  path,
  title,
  placeholder,
}: {
  path: string
  title: string
  placeholder: string
}) {
  const list = useReferenceList(path)
  const save = useSaveReference(path)
  const [name, setName] = useState('')
  const inputId = `add-${path.slice(1)}`

  const add = () =>
    save.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} ditambahkan`)
          setName('')
        },
      },
    )

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) add()
        }}
      >
        <Input
          id={inputId}
          aria-label={`Tambah ${title.toLowerCase()}`}
          placeholder={placeholder}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!name.trim() || save.isPending}
          aria-label={`Tambah ke ${title}`}
        >
          {save.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Tambah
        </Button>
      </form>
      {save.error && (
        <p role="alert" className="text-danger-text">
          {save.error.message}
        </p>
      )}

      {list.isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <ul className="flex max-h-80 flex-col divide-y divide-earth-200 overflow-y-auto">
          {/* Switched-off entries last */}
          {[...list.data]
            .sort((a, b) => Number(b.is_active) - Number(a.is_active))
            .map((item) => (
              <ReferenceRow key={item.id} item={item} path={path} />
            ))}
        </ul>
      )}
    </div>
  )
}

function ReferenceRow({ item, path }: { item: ReferenceItem; path: string }) {
  const save = useSaveReference(path)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  // The new state shows at once; it is let go once the server answered and the list refreshed
  const [override, setOverride] = useState<boolean | null>(null)
  const active = override ?? item.is_active

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      {editing ? (
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate({ id: item.id, name: name.trim() }, { onSuccess: () => setEditing(false) })
          }}
        >
          <Input
            aria-label={`Nama baru ${item.name}`}
            value={name}
            maxLength={100}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" size="icon-lg" disabled={!name.trim() || save.isPending} aria-label="Simpan nama">
            <Check aria-hidden />
          </Button>
        </form>
      ) : (
        <>
          <span className={cn('min-w-0 flex-1', !active && 'text-muted-foreground line-through')}>{item.name}</span>
          <Button variant="ghost" size="icon-lg" aria-label={`Ubah nama ${item.name}`} onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
          </Button>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={active}
              onChange={(e) => {
                setOverride(e.target.checked)
                save.mutate({ id: item.id, is_active: e.target.checked }, { onSettled: () => setOverride(null) })
              }}
              aria-label={`${item.name} aktif`}
            />
            Aktif
          </label>
        </>
      )}
      {save.error && (
        <p role="alert" className="basis-full text-sm text-danger-text">
          {save.error.message}
        </p>
      )}
    </li>
  )
}
