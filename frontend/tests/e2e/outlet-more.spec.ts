import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// OT-03 profile tabs, OT-07 stok standar (set and cleared again), OT-05 a proposal
// from the phone refused by the office (so the sample outlet lists stay as they are).
// Desktop project only: it changes shared data.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const PROPOSAL = `Toko Usulan E2E ${Date.now().toString().slice(-6)}`

let office: Page
let sales: Page

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
  sales = await pageAs(browser, testInfo, 'sales1')
})

test.afterAll(async () => {
  await office?.close()
  await sales?.close()
})

test('the outlet profile shows its shelf, visits, and invoices; stok standar is set and cleared (OT-03, OT-07)', async () => {
  await office.goto('/office/outlets')
  await office.getByLabel(/Cari/).first().fill('Apotek Delanggu Contoh')
  await office
    .getByRole('main')
    .getByRole('link', { name: /Apotek Delanggu Contoh/ })
    .first()
    .click()

  await expect(office.getByRole('tab', { name: /Stok titipan/ })).toHaveAttribute('aria-selected', 'true')
  const first = office.getByRole('tabpanel').getByRole('spinbutton', { name: 'Stok standar' }).first()
  await first.fill('9')
  await office.getByRole('button', { name: 'Simpan stok standar (1)' }).click()
  await expect(office.getByText('1 stok standar tersimpan')).toBeVisible()
  await first.fill('')
  await office.getByRole('button', { name: 'Simpan stok standar (1)' }).click()
  await expect(first).toHaveValue('')

  await office.getByRole('tab', { name: 'Riwayat kunjungan' }).click()
  await expect(
    office
      .getByRole('tabpanel')
      .getByText(/NT-\d{4}-\d{4}/)
      .first(),
  ).toBeVisible()
  await office.getByRole('tab', { name: /Tagihan/ }).click()
  await expect(office.getByRole('tabpanel')).toBeVisible()
})

test('a sales proposes an outlet from the phone; the office sees it with similar names and refuses it (OT-05)', async () => {
  await sales.getByRole('link', { name: 'Usulkan outlet baru' }).click()
  await sales.getByLabel('Nama outlet (wajib)').fill(PROPOSAL)
  await sales.getByLabel('Jenis outlet (wajib)').selectOption({ index: 1 })
  await sales.getByLabel('Kabupaten/kota (wajib)').selectOption({ index: 1 })
  await sales.getByLabel('Kecamatan (wajib)').fill('Gading')
  await sales.getByLabel('Catatan untuk admin').fill('Uji e2e')
  await sales.getByRole('button', { name: 'Kirim usulan' }).click()
  await expect(sales.getByText(`Usulan ${PROPOSAL} terkirim. Admin akan mengecek.`)).toBeVisible()

  await office.goto('/office/outlets')
  const card = office
    .getByRole('region', { name: /Usulan outlet dari sales/ })
    .getByRole('listitem')
    .filter({ hasText: PROPOSAL })
  await expect(card).toContainText('Catatan sales: Uji e2e')
  await card.getByRole('button', { name: 'Tolak' }).click()
  await office.getByLabel('Alasan untuk sales (wajib)').fill('Uji e2e: tidak dibuka')
  await office.getByRole('alertdialog').getByRole('button', { name: 'Tolak usulan' }).click()
  await expect(office.getByText('Usulan ditolak')).toBeVisible()

  await sales.goto('/field/propose')
  const mine = sales.getByRole('region', { name: 'Usulan saya' }).getByRole('listitem').filter({ hasText: PROPOSAL })
  await expect(mine).toContainText('Ditolak')
  await expect(mine).toContainText('Alasan: Uji e2e: tidak dibuka')
})
