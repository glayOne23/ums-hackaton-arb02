import { CircleAlert, Combine, LoaderCircle, Search } from 'lucide-react'
import { useDeferredValue, useId, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useOutlets } from '@/features/outlet/api'
import { useProducts } from '@/features/product/api'
import { useMerge, useMergePreview } from '../api'

type Kind = 'outlet' | 'product'

const WORDS = {
  outlet: { noun: 'outlet', search: 'Cari nama atau kode outlet dobel' },
  product: { noun: 'produk', search: 'Cari nama atau kode produk dobel' },
} as const

interface Props {
  kind: Kind
  /** The outlet or product on this page: it is the one that is kept */
  kept: { id: string; code: string; name: string }
}

/**
 * OT-06 / KR-08 "Gabung dobel": pick the duplicate, see what moves here, and
 * merge. The duplicate's history comes to this page; it cannot be undone, so
 * the sheet itself is the confirmation and states that plainly.
 */
export function MergeDuplicateButton({ kind, kept }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Combine aria-hidden />
        Gabung dobel
      </Button>
      <SheetContent>
        <SheetTitle>Gabungkan {WORDS[kind].noun} dobel ke sini</SheetTitle>
        <SheetDescription>
          {kept.name} ({kept.code}) dipertahankan. Semua riwayat {WORDS[kind].noun} dobel pindah ke sini.
        </SheetDescription>
        {open && <MergeForm kind={kind} kept={kept} onDone={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function MergeForm({ kind, kept, onDone }: Props & { onDone: () => void }) {
  const id = useId()
  const [search, setSearch] = useState('')
  const [fromId, setFromId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const query = useDeferredValue(search.trim())
  const preview = useMergePreview(kind, kept.id, fromId)
  const merge = useMerge(kind, kept.id)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-search`}>{kind === 'outlet' ? 'Outlet' : 'Produk'} dobel</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={`${id}-search`}
            type="search"
            className="pl-10"
            placeholder={WORDS[kind].search}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setFromId(null)
            }}
          />
        </div>
      </div>

      {query.length >= 2 &&
        fromId === null &&
        (kind === 'outlet' ? (
          <OutletOptions search={query} keptId={kept.id} onPick={setFromId} />
        ) : (
          <ProductOptions search={query} keptId={kept.id} onPick={setFromId} />
        ))}

      {fromId && (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-3" aria-live="polite">
          {preview.isPending ? (
            <p className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Menghitung apa yang pindah…
            </p>
          ) : preview.isError ? (
            <Problem text={preview.error.message} />
          ) : (
            <>
              <p className="font-semibold wrap-break-word">
                {preview.data.from.name} ({preview.data.from.code}) → {kept.name}
              </p>
              {preview.data.blocked ? (
                <Problem text={preview.data.blocked} />
              ) : (
                <>
                  <p>
                    {preview.data.moves.length > 0
                      ? `Pindah ke sini: ${preview.data.moves.join(', ')}.`
                      : `Belum ada riwayat di ${WORDS[kind].noun} dobel itu.`}
                  </p>
                  <ul className="list-disc pl-6">
                    {preview.data.notes.map((note) => (
                      <li key={note} className="wrap-break-word">
                        {note}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <Button variant="ghost" className="self-start text-leaf-700" onClick={() => setFromId(null)}>
            Pilih yang lain
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-reason`}>Alasan (boleh kosong)</Label>
        <Textarea
          id={`${id}-reason`}
          rows={2}
          placeholder="Misalnya: toko yang sama, nama ditulis beda"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {merge.error && <Problem text={merge.error.message} />}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button
          disabled={!fromId || !preview.data || preview.data.blocked !== null || merge.isPending}
          onClick={() =>
            fromId &&
            merge.mutate(
              { from_id: fromId, reason: reason.trim() || undefined },
              {
                onSuccess: () => {
                  toast.success(`${preview.data?.from.name} digabung ke ${kept.name}`)
                  onDone()
                },
              },
            )
          }
        >
          {merge.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Combine aria-hidden />}
          Gabungkan
        </Button>
      </div>
    </div>
  )
}

function Problem({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-danger-text">
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      {text}
    </p>
  )
}

interface Candidate {
  id: string
  code: string
  name: string
  detail: string | null
}

interface OptionsProps {
  search: string
  keptId: string
  onPick: (id: string) => void
}

function OutletOptions({ search, keptId, onPick }: OptionsProps) {
  const outlets = useOutlets({ search, status: 'all', per_page: 20 })
  return (
    <Options
      pending={outlets.isPending}
      onPick={onPick}
      items={(outlets.data?.data ?? [])
        .filter((o) => o.id !== keptId)
        .map((o) => ({
          id: o.id,
          code: o.code,
          name: o.name,
          detail: [o.district, o.region?.name].filter(Boolean).join(', ') || null,
        }))}
    />
  )
}

function ProductOptions({ search, keptId, onPick }: OptionsProps) {
  const products = useProducts({ search, status: 'all', per_page: 20 })
  return (
    <Options
      pending={products.isPending}
      onPick={onPick}
      items={(products.data?.data ?? [])
        .filter((p) => p.id !== keptId)
        .map((p) => ({ id: p.id, code: p.code, name: p.name, detail: p.unit }))}
    />
  )
}

function Options({ items, pending, onPick }: { items: Candidate[]; pending: boolean; onPick: (id: string) => void }) {
  if (pending) return <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />

  return (
    <ul
      aria-label="Pilihan data dobel"
      className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border"
    >
      {items.length === 0 ? (
        <li className="p-3 text-muted-foreground">Tidak ditemukan.</li>
      ) : (
        items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-accent"
              onClick={() => onPick(c.id)}
            >
              <span className="font-medium wrap-break-word">{c.name}</span>
              <span className="text-sm text-muted-foreground">
                {c.code}
                {c.detail && ` · ${c.detail}`}
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  )
}
