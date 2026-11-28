import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarCheck, ChevronDown, ChevronLeft, CircleAlert, LoaderCircle, PackagePlus, Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { NumberStepper } from '@/components/common/NumberStepper'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { formatCurrency, formatDiscountPercent, formatExpiry } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useSaveReceipt, useWorkPackage } from '../api'
import {
  billingSuggestion,
  computeLine,
  type LineInput,
  type LineResult,
  sumMoney,
  visitLines,
  type VisitLine,
} from '../calc'
import { expiryLabel, isNear, otherMonths, shelfRows } from '@/lib/expiry'
import type { ReceiptLine } from '../offline/db'
import { buildReceipt } from '../receipt'
import type { PackageOutlet, WorkPackage } from '../types'
import { OpenInvoices } from './OpenInvoices'
import { type Payment, PaymentSheet } from './PaymentSheet'

/**
 * M2 — Kunjungan titip jual, one screen (KS-02 … KS-06). "Sisa di rak" starts
 * equal to the consignment, so only what went down is touched. Sold, bill,
 * withdrawal, refill, and closing stock are worked out live. Saved on the
 * phone first: works without a signal.
 */
export function ConsignmentVisit({ outletId }: { outletId: string }) {
  const pkg = useWorkPackage()
  const outlet = pkg.data?.outlets.find((o) => o.id === outletId)

  if (pkg.isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (!pkg.data)
    return <ErrorState message={pkg.error?.message ?? 'Data belum terunduh.'} onRetry={() => pkg.refetch()} />
  if (!outlet) return <NotAssigned />

  return <VisitForm pkg={pkg.data} outlet={outlet} />
}

function VisitForm({ pkg, outlet }: { pkg: WorkPackage; outlet: PackageOutlet }) {
  const navigate = useNavigate()
  const userId = useSession((s) => s.user?.id ?? 0)
  const saveReceipt = useSaveReceipt()
  const [{ shelf, others }] = useState(() => visitLines(outlet, pkg))
  const [inputs, setInputs] = useState<Record<string, LineInput>>({})
  const [showOthers, setShowOthers] = useState(shelf.length === 0)
  const [sheetOpen, setSheetOpen] = useState(false)
  // "Tidak ada yang laku" through the sheet: saved with no inputs, the bill is only the old one
  const [quick, setQuick] = useState(false)
  const [savingQuick, setSavingQuick] = useState(false)

  const shelfResults = shelf.map((line) => computeLine(line, inputs[line.productId]))
  const otherResults = others.map((line) => computeLine(line, inputs[line.productId]))
  const sold = shelfResults.reduce((sum, r) => sum + r.sold, 0)
  const total = sumMoney(shelfResults.map((r) => r.total))
  const invalid = [...shelfResults, ...otherResults].some((r) => r.remainingTooHigh || r.refillTooHigh)
  const hint = billingHint(
    shelfResults.map((r) => r.sold),
    pkg,
  )

  const update = (productId: string, change: LineInput) =>
    setInputs((all) => ({ ...all, [productId]: { ...all[productId], ...change } }))

  const save = async (payment: Payment, useInputs = inputs) => {
    const lines = [...shelf, ...others]
    const results = lines.map((line) => computeLine(line, useInputs[line.productId]))
    const kept = lines
      .map((line, i) => ({ line, result: results[i] }))
      .filter(({ line, result }) => line.opening > 0 || result.refill > 0)

    const receipt = buildReceipt({
      userId,
      outlet,
      type: 'consignment_visit',
      items: kept.map(({ line, result }) => {
        const input = useInputs[line.productId] ?? {}
        // Doc 11: a counted line sends its months; "Tidak ada yang laku" (no inputs) counts nothing
        const counted = line.checkExpiry && useInputs !== emptyInputs
        return {
          product_id: line.productId,
          opening_qty: line.opening,
          remaining_qty: result.remaining,
          withdrawn_qty: result.withdrawn,
          refill_qty: result.refill,
          ...(counted ? { remaining_by_expiry: shelfRows(line.shelfExpiry ?? [], input.byExpiry) } : {}),
          ...(input.refillMonth && result.refill > 0 ? { refill_expiry_month: input.refillMonth } : {}),
        }
      }),
      lines: kept.map(({ line, result }): ReceiptLine => toReceiptLine(line, result)),
      paid: payment.amount,
      method: payment.method,
      photo: payment.photo,
      settings: pkg.settings,
      expiryCheck: outlet.expiry_check && useInputs !== emptyInputs ? { trigger: outlet.expiry_check.trigger } : null,
    })
    await saveReceipt(receipt)
    await navigate({ to: '/field/receipt/$clientUuid', params: { clientUuid: receipt.client_uuid }, replace: true })
  }

  const openSheet = (nothing: boolean) => {
    setQuick(nothing)
    setSheetOpen(true)
  }

  // KS-03: three taps from the outlet list (doc 05 §3). With an old bill
  // the sheet opens, so the sales records what the outlet pays now.
  const nothingSold = async () => {
    if (pkg.settings.form_photo_required || outlet.unpaid > 0) {
      openSheet(true)
      return
    }
    setSavingQuick(true)
    try {
      await save({ amount: 0, method: 'cash', photo: null }, emptyInputs)
    } finally {
      setSavingQuick(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 pb-40">
      <VisitHeader outlet={outlet} />

      <OpenInvoices outlet={outlet} onCollect={() => openSheet(true)} />

      {outlet.expiry_check && shelf.some((line) => line.checkExpiry) && (
        <p role="note" className="flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
          <CalendarCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Cek ED kunjungan ini</strong> ({outlet.expiry_check.label}). Hitung sisa di rak per ED untuk produk
            bertanda <strong>Cek ED</strong>; ubah hanya yang berbeda.
          </span>
        </p>
      )}

      {shelf.length > 0 ? (
        <>
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-lg"
            disabled={savingQuick}
            onClick={() => void nothingSold()}
          >
            {savingQuick && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Tidak ada yang laku
          </Button>
          <p className="text-muted-foreground">atau ubah sisa yang berkurang:</p>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {shelf.map((line, i) => (
              <ShelfLine
                key={line.productId}
                line={line}
                result={shelfResults[i]}
                input={inputs[line.productId] ?? {}}
                onChange={(change) => update(line.productId, change)}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-lg border border-border bg-card shadow-card p-4 text-lg">
          Belum ada titipan di outlet ini. Titipkan barang dari stok bawaan di bawah.
        </p>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="justify-start text-leaf-700"
            aria-expanded={showOthers}
            onClick={() => setShowOthers((v) => !v)}
          >
            <PackagePlus aria-hidden />
            Titipkan produk lain ({others.length})
            <ChevronDown className={showOthers ? 'rotate-180' : ''} aria-hidden />
          </Button>
          {showOthers && (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
              {others.map((line, i) => (
                <li key={line.productId} className="flex flex-col gap-2 p-3">
                  <p className="text-lg font-semibold">{line.name}</p>
                  <StepperRow label="Isi" hint={`bawa ${line.carried}`}>
                    <NumberStepper
                      id={`refill-${line.productId}`}
                      label={`Isi ${line.name}`}
                      value={otherResults[i].refill}
                      initial={0}
                      onChange={(n) => update(line.productId, { refill: n })}
                    />
                  </StepperRow>
                  {otherResults[i].refillTooHigh && <LineError>Stok bawaan hanya {line.carried}.</LineError>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-xl flex-col gap-2 border-t border-border bg-card p-3">
        <p className="flex justify-between text-lg" aria-live="polite">
          <span>Laku {sold}</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </p>
        <Button size="cta" disabled={invalid} onClick={() => openSheet(false)}>
          {invalid ? 'Perbaiki angka yang merah' : 'Lanjut'}
        </Button>
      </div>

      <PaymentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        total={quick ? 0 : total}
        previousUnpaid={outlet.unpaid}
        hint={!quick && sold > 0 ? hint : null}
        photoRequired={pkg.settings.form_photo_required}
        collecting={quick && outlet.unpaid > 0 ? 'visit' : undefined}
        onSave={(payment) => (quick ? save(payment, emptyInputs) : save(payment))}
      />
    </section>
  )
}

function ShelfLine({
  line,
  result,
  input,
  onChange,
}: {
  line: VisitLine
  result: LineResult
  input: LineInput
  onChange: (change: LineInput) => void
}) {
  const showWithdraw = line.nearExpiryQty > 0 || result.suggestedWithdrawal > 0 || result.withdrawn > 0
  const showRefill = result.sold > 0 || result.withdrawn > 0 || result.refill > 0 || input.refill !== undefined
  const carriedMonths = (line.carriedExpiry ?? []).filter((m) => m.qty > 0)

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-lg font-semibold">{line.name}</p>
        <span className="flex flex-wrap gap-1.5">
          {line.checkExpiry && (
            <StatusChip variant="info" icon={CalendarCheck}>
              Cek ED
            </StatusChip>
          )}
          {line.nearExpiryQty > 0 && line.nearestExpiry && (
            <StatusChip variant="danger" icon={CircleAlert}>
              {formatExpiry(new Date(line.nearestExpiry))}
            </StatusChip>
          )}
        </span>
      </div>

      {line.checkExpiry ? (
        <ExpiryCount
          line={line}
          result={result}
          counted={input.byExpiry}
          onChange={(byExpiry) => onChange({ byExpiry })}
        />
      ) : (
        <StepperRow label="Sisa di rak" hint={`dari ${line.opening}`}>
          <NumberStepper
            id={`remaining-${line.productId}`}
            label={`Sisa ${line.name}`}
            value={input.remaining ?? line.opening}
            initial={line.opening}
            onChange={(n) => onChange({ remaining: n })}
          />
        </StepperRow>
      )}
      {result.remainingTooHigh && <LineError>Sisa lebih dari titipan ({line.opening}). Hitung ulang?</LineError>}

      {result.sold > 0 && (
        <p className="text-lg">
          Laku <span className="font-semibold">{result.sold}</span>
          <span className="text-muted-foreground"> · {formatCurrency(result.total)}</span>
        </p>
      )}

      {showWithdraw && (
        <>
          <StepperRow label="Tarik" hint={line.nearExpiryQty > 0 ? 'dekat ED' : undefined}>
            <NumberStepper
              id={`withdraw-${line.productId}`}
              label={`Tarik ${line.name}`}
              value={result.withdrawn}
              initial={result.suggestedWithdrawal}
              onChange={(n) => onChange({ withdrawn: n })}
            />
          </StepperRow>
        </>
      )}

      {showRefill && (
        <StepperRow
          label="Isi"
          hint={`bawa ${line.carried}${result.refillMonth && result.refill > 0 ? ` · dari ${expiryLabel(result.refillMonth)}` : ''}`}
        >
          <NumberStepper
            id={`refill-${line.productId}`}
            label={`Isi ${line.name}`}
            value={result.refill}
            initial={result.suggestedRefill}
            onChange={(n) => onChange({ refill: n })}
          />
        </StepperRow>
      )}
      {/* Doc 11: when the bag holds more than one ED, the sales says which one went on the shelf */}
      {showRefill && result.refill > 0 && carriedMonths.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Isi diambil dari</span>
          <NativeSelect
            aria-label={`ED isi ulang ${line.name}`}
            value={result.refillMonth ?? ''}
            onChange={(e) => onChange({ refillMonth: e.target.value })}
          >
            {carriedMonths.map((m) => (
              <option key={m.month} value={m.month}>
                {expiryLabel(m.month)} (bawa {m.qty})
                {line.cutoffMonth && isNear(m.month, line.cutoffMonth) ? ' · dekat ED' : ''}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      {result.refillTooHigh && <LineError>Stok bawaan hanya {line.carried + result.withdrawn}.</LineError>}

      <p className="text-muted-foreground">Stok akhir {result.closing}</p>
    </li>
  )
}

/**
 * Doc 11: "Sisa di rak" counted per ED. Each month starts at what the ledger
 * expects, so only a different month is changed; an ED that is on the shelf
 * but not in the ledger is added from the months the sales carries.
 */
function ExpiryCount({
  line,
  result,
  counted,
  onChange,
}: {
  line: VisitLine
  result: LineResult
  counted: Record<string, number> | undefined
  onChange: (byExpiry: Record<string, number>) => void
}) {
  const rows = shelfRows(line.shelfExpiry ?? [], counted)
  const extra = otherMonths(line.shelfExpiry ?? [], line.carriedExpiry ?? [], counted)
  const current = () => Object.fromEntries(rows.map((r) => [r.month, r.qty]))

  return (
    <div className="flex flex-col gap-2 rounded-md border border-info/40 bg-info-soft/40 p-2">
      <p className="flex justify-between text-base">
        <span>Sisa di rak per ED</span>
        <span className="text-sm text-muted-foreground">
          {result.remaining} dari {line.opening}
        </span>
      </p>
      {rows.map((row) => (
        <StepperRow
          key={row.month}
          label={expiryLabel(row.month)}
          hint={line.cutoffMonth && isNear(row.month, line.cutoffMonth) ? 'dekat ED' : undefined}
        >
          <NumberStepper
            id={`remaining-${line.productId}-${row.month}`}
            label={`Sisa ${line.name} ${expiryLabel(row.month)}`}
            value={row.qty}
            initial={(line.shelfExpiry ?? []).find((m) => m.month === row.month)?.qty ?? 0}
            onChange={(n) => onChange({ ...current(), [row.month]: n })}
          />
        </StepperRow>
      ))}
      {extra.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">ED lain di rak:</span>
          {extra.map((month) => (
            <Button
              key={month}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange({ ...current(), [month]: 0 })}
            >
              <Plus aria-hidden />
              {expiryLabel(month)}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Label on the left, stepper on the right; at 360 px the stepper wraps under the label. */
function StepperRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      {/* Hint under the label keeps label + 184 px stepper on one line at 360 px */}
      <span className="flex flex-col text-base leading-tight">
        {label}
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </span>
      <div className="ml-auto">{children}</div>
    </div>
  )
}

function LineError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-danger-text">
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

export function VisitHeader({ outlet, extra }: { outlet: PackageOutlet; extra?: string }) {
  const discounts = [...new Set(Object.values(outlet.prices).map((p) => p.discount_percent))]
  const discount = discounts.length === 1 && discounts[0] > 0 ? formatDiscountPercent(discounts[0]) : null

  return (
    <header className="flex items-start gap-2">
      <Link
        to="/field"
        className="-ml-2 grid size-12 shrink-0 place-items-center rounded-md"
        aria-label="Kembali ke daftar outlet"
      >
        <ChevronLeft className="size-6" aria-hidden />
      </Link>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight wrap-break-word">{outlet.name}</h1>
        <p className="text-muted-foreground">
          {[outlet.outlet_type, discount && `potongan ${discount}`, extra].filter(Boolean).join(' · ')}
        </p>
      </div>
    </header>
  )
}

export function NotAssigned() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-lg">Outlet ini tidak ada di daftar Anda. Mungkin sudah dipindah ke sales lain.</p>
      <Button asChild variant="outline">
        <Link to="/field">Kembali ke daftar outlet</Link>
      </Button>
    </div>
  )
}

/** "Tidak ada yang laku": nothing changed and nothing counted per ED */
const emptyInputs: Record<string, LineInput> = {}

function billingHint(soldPerProduct: number[], pkg: WorkPackage) {
  const suggestion = billingSuggestion(soldPerProduct, pkg.settings)
  const comparison = `${suggestion.collectNow ? 'lebih dari' : 'tidak lebih dari'} ${suggestion.threshold}`
  return {
    collectNow: suggestion.collectNow,
    text: suggestion.collectNow
      ? `Laku ${suggestion.count} ${suggestion.unit} (${comparison}): sebaiknya ditagih sekarang`
      : `Laku ${suggestion.count} ${suggestion.unit} (${comparison}): boleh ditagih di kunjungan berikutnya`,
  }
}

function toReceiptLine(line: VisitLine, result: LineResult): ReceiptLine {
  return {
    productId: line.productId,
    name: line.name,
    sold: result.sold,
    withdrawn: result.withdrawn,
    refill: result.refill,
    closing: result.closing,
    price: line.price,
    total: result.total,
  }
}
