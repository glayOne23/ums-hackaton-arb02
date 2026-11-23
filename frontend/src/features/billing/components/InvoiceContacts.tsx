import { Link } from '@tanstack/react-router'
import { MessageCircle, Store, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { whatsappMessageLink } from '@/lib/whatsapp'
import { usePermission } from '@/stores/session'
import { outletReminderText, salesReminderText } from '../reminders'
import type { Invoice } from '../types'

/**
 * TG-04: who owes and who collects, side by side, each with a WhatsApp reminder.
 * The button opens WhatsApp with the message typed; the user checks it and taps Send.
 */
export function InvoiceContacts({ invoice, open }: { invoice: Invoice; open: boolean }) {
  const canSeeOutlet = usePermission('outlet.view')
  const outlet = invoice.outlet
  const sales = invoice.sales

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {outlet && (
        <SectionCard title="Outlet">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
              <Store className="size-5" aria-hidden />
            </span>
            <dl className="grid min-w-0 flex-1 gap-1.5">
              <Fact label="Nama">
                {canSeeOutlet ? (
                  <Link
                    to="/office/outlets/$outletId"
                    params={{ outletId: outlet.id }}
                    className="font-semibold text-leaf-800 underline decoration-leaf-600/40 underline-offset-4"
                  >
                    {outlet.name}
                  </Link>
                ) : (
                  <span className="font-semibold">{outlet.name}</span>
                )}{' '}
                <span className="text-muted-foreground">({outlet.code})</span>
              </Fact>
              <Fact label="Jenis · cara jual">
                {[outlet.outlet_type, outlet.sale_mode].filter(Boolean).join(' · ')}
              </Fact>
              <Fact label="Alamat">
                {[outlet.address, outlet.district, outlet.region].filter(Boolean).join(', ') || '—'}
              </Fact>
              <Fact label="WhatsApp">{outlet.whatsapp_number ?? 'Belum diisi'}</Fact>
            </dl>
          </div>
          {open &&
            (outlet.whatsapp_number ? (
              <Button asChild variant="outline" className="self-start">
                <a
                  href={whatsappMessageLink(outlet.whatsapp_number, outletReminderText(invoice))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden />
                  Ingatkan outlet lewat WhatsApp
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nomor WhatsApp outlet belum diisi. Tambahkan di data outlet untuk mengirim pengingat.
              </p>
            ))}
        </SectionCard>
      )}

      <SectionCard title="Sales">
        {sales ? (
          <>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
                <UserRound className="size-5" aria-hidden />
              </span>
              <dl className="grid min-w-0 flex-1 gap-1.5">
                <Fact label="Nama">
                  <span className="font-semibold">{sales.name}</span>
                </Fact>
                <Fact label="Nomor HP">{sales.phone ?? 'Belum diisi'}</Fact>
              </dl>
            </div>
            {open &&
              (sales.phone ? (
                <Button asChild variant="outline" className="self-start">
                  <a
                    href={whatsappMessageLink(sales.phone, salesReminderText(invoice))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle aria-hidden />
                    Ingatkan sales lewat WhatsApp
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nomor HP sales belum diisi. Tambahkan di menu Pengguna untuk mengirim pengingat.
                </p>
              ))}
          </>
        ) : (
          <p className="text-muted-foreground">Tagihan ini tidak terhubung ke sales.</p>
        )}
      </SectionCard>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word">{children}</dd>
    </div>
  )
}
