import { describe, expect, it } from 'vitest'
import { outletReminderText, salesReminderText } from '@/features/billing/reminders'
import type { Invoice } from '@/features/billing/types'
import { monthLabel, monthOptions, shiftMonth } from '@/lib/month'
import { whatsappMessageLink } from '@/lib/whatsapp'

describe('month filter', () => {
  it('moves across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('labels months in Indonesian', () => {
    expect(monthLabel('2026-10')).toBe('Oktober 2026')
  })

  it('lists this month first and keeps an older month from a shared link', () => {
    const options = monthOptions('2026-11', '2020-03')
    expect(options[0]).toBe('2026-11')
    expect(options[1]).toBe('2026-10')
    expect(options.at(-1)).toBe('2020-03')
  })
})

const invoice: Invoice = {
  id: '01INV',
  number: 'TG-2611-0007',
  type: 'sales',
  transaction_id: null,
  outlet: {
    id: '01OUT',
    code: 'OT-001',
    name: 'Ap Sari Farma',
    address: null,
    district: 'Jebres',
    region: 'Surakarta',
    whatsapp_number: '081200000009',
    sale_mode: 'Titip jual',
    outlet_type: 'Apotek',
  },
  sales: { id: 4, name: 'Endri', phone: '081100000004' },
  invoice_date: '2026-10-01',
  due_date: '2026-10-31',
  amount: 150000,
  paid_amount: 50000,
  owed: 100000,
  age_days: 53,
  overdue: true,
  due_soon: false,
  status: { value: 'partial', label: 'Dibayar sebagian' },
}

describe('invoice reminders', () => {
  it('tells the outlet the invoice, what is left, and that it is overdue', () => {
    const text = outletReminderText(invoice)
    expect(text).toContain('Yth. Ap Sari Farma')
    expect(text).toContain('TG-2611-0007')
    expect(text.replace(/\s/g, ' ')).toContain('Rp 100.000')
    expect(text).toContain('31/10/2026 (sudah lewat)')
  })

  it('tells the sales which outlet to collect from and where', () => {
    expect(salesReminderText(invoice)).toContain('Outlet: Ap Sari Farma (Jebres, Surakarta)')
  })

  it('opens WhatsApp on the international number with the text typed', () => {
    expect(whatsappMessageLink('0812 0000 0009', 'Halo & terima kasih')).toBe(
      'https://wa.me/6281200000009?text=Halo%20%26%20terima%20kasih',
    )
  })
})
