import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CircleAlert, Hourglass, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useOutletOptions, useOutletTypeOptions, useProducts, useSaveDiscount } from '../api'
import { DISCOUNT_SCOPES, type DiscountFormInput, discountFormSchema } from '../schemas'
import type { Discount } from '../types'

interface Props {
  onSaved: (discount: Discount) => void
  onCancel: () => void
}

/** PR-03 add a discount. Fields shown follow the chosen scope. */
export function DiscountForm({ onSaved, onCancel }: Props) {
  const canApprove = usePermission('discount.approve')
  const save = useSaveDiscount()
  // Read the clock once, not on every render
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<DiscountFormInput>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      scope: 'type',
      outlet_type_id: '',
      product_id: '',
      outlet_id: '',
      discount_percent: '',
      valid_from: today,
    },
    mode: 'onTouched',
  })
  const scope = useWatch({ control, name: 'scope' })
  const needsType = scope === 'type' || scope === 'type_product'
  const needsProduct = scope.endsWith('product')
  const needsOutlet = scope.startsWith('outlet')

  const outletTypes = useOutletTypeOptions()
  const products = useProducts({ per_page: 500 })
  const outlets = useOutletOptions(needsOutlet)

  const submit = handleSubmit((input) =>
    save.mutate(input, {
      onSuccess: onSaved,
      onError: (error) => {
        if (!(error instanceof ApiError)) return
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in input) setError(field as keyof DiscountFormInput, { message: messages[0] })
        }
      },
    }),
  )

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const scopeError = fieldErrors.scope?.[0]
  const formError = save.error && Object.keys(fieldErrors).length === 0 ? save.error.message : scopeError

  const field = (id: keyof DiscountFormInput) => ({
    id,
    'aria-invalid': !!errors[id],
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[720px] flex-col gap-5 pb-24 sm:pb-0">
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {formError}
        </p>
      )}

      {!canApprove && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
          <Hourglass className="mt-0.5 size-5 shrink-0" aria-hidden />
          Potongan baru berlaku setelah disetujui Pimpinan.
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">Berlaku untuk (wajib)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DISCOUNT_SCOPES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-2 py-1 text-center font-medium sm:min-h-10',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                scope === option.value ? 'choice-on' : 'choice',
              )}
            >
              <input type="radio" value={option.value} className="sr-only" {...register('scope')} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {needsType && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="outlet_type_id" className="text-base">
            Jenis outlet (wajib)
          </Label>
          <NativeSelect {...field('outlet_type_id')} {...register('outlet_type_id')}>
            <option value="">Pilih jenis outlet</option>
            {outletTypes.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="outlet_type_id-error" message={errors.outlet_type_id?.message} />
        </div>
      )}

      {needsOutlet && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="outlet_id" className="text-base">
            Outlet (wajib)
          </Label>
          <NativeSelect {...field('outlet_id')} {...register('outlet_id')}>
            <option value="">{outlets.isPending ? 'Memuat outlet…' : 'Pilih outlet'}</option>
            {outlets.data?.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} · {outlet.district}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="outlet_id-error" message={errors.outlet_id?.message} />
        </div>
      )}

      {needsProduct && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="product_id" className="text-base">
            Produk (wajib)
          </Label>
          <NativeSelect {...field('product_id')} {...register('product_id')}>
            <option value="">Pilih produk</option>
            {products.data?.data.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </NativeSelect>
          <FieldError id="product_id-error" message={errors.product_id?.message} />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="discount_percent" className="text-base">
            Potongan (wajib)
          </Label>
          <div className="relative">
            <Input
              {...field('discount_percent')}
              inputMode="decimal"
              placeholder="16"
              className="pr-10 tabular-nums"
              {...register('discount_percent')}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
          <FieldError id="discount_percent-error" message={errors.discount_percent?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valid_from" className="text-base">
            Mulai berlaku (wajib)
          </Label>
          <Input {...field('valid_from')} type="date" {...register('valid_from')} />
          <FieldError id="valid_from-error" message={errors.valid_from?.message} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Untuk mengubah potongan yang sudah berlaku, tambahkan potongan baru dengan tanggal mulai yang lebih baru.
        Potongan lama tetap tercatat sebagai riwayat harga.
      </p>

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-3 border-t border-border bg-card p-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="cta" className="sm:h-10 sm:w-auto" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {canApprove ? 'Simpan potongan' : 'Ajukan potongan'}
        </Button>
      </div>
    </form>
  )
}
