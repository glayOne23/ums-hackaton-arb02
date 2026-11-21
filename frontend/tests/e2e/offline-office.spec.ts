import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// PW-07: the warehouse keeps seeing the last data without a signal, with the time it is from.
// PW-06: goods in recorded without a signal wait on the device and are sent once it is back.
// Moves inside the app only (no reload), like the sales offline test. Desktop project only.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const PRODUCT = 'Jahe Merah Instan Contoh'
const batch = `OFF${Date.now().toString().slice(-7)}`

let warehouse: Page

test.beforeAll(async ({ browser }, testInfo) => {
  warehouse = await pageAs(browser, testInfo, 'gudang')
})

test.afterAll(async () => {
  await warehouse?.context().setOffline(false)
  await warehouse?.close()
})

const tab = (name: string) => warehouse.getByRole('navigation', { name: 'Menu gudang' }).getByRole('link', { name })

async function goOffline(offline: boolean) {
  await warehouse.context().setOffline(offline)
  await warehouse.evaluate((off) => window.dispatchEvent(new Event(off ? 'offline' : 'online')), offline)
}

test('without a signal the last data stays, with the time it is from (PW-07)', async () => {
  // Open the screens once with a signal
  await warehouse.goto('/office/inventory')
  await expect(warehouse.getByRole('main').getByText(PRODUCT).first()).toBeVisible()
  await tab('Barang masuk').click()
  await expect(warehouse.getByRole('heading', { name: 'Barang masuk' })).toBeVisible()
  // The form too: in development its code loads on first open (the built app has it all on the device)
  await warehouse.locator('a[href="/office/inventory/receipts/new"]').filter({ visible: true }).first().click()
  await expect(warehouse.locator('option', { hasText: `${PRODUCT} (JHS01)` })).toHaveCount(1)
  await warehouse.getByRole('link', { name: 'Barang masuk' }).first().click()
  await expect(warehouse.getByRole('heading', { name: 'Barang masuk' })).toBeVisible()

  await goOffline(true)
  await tab('Stok').click()
  await expect(warehouse.getByText(/Tanpa sinyal\. Data yang tampil per .+ jam \d{2}\.\d{2}\./)).toBeVisible()
  await expect(warehouse.getByRole('main').getByText(PRODUCT).first()).toBeVisible()
})

test('goods in recorded without a signal wait on the device and are sent when it is back (PW-06)', async () => {
  await tab('Barang masuk').click()
  await warehouse.locator('a[href="/office/inventory/receipts/new"]').filter({ visible: true }).first().click()
  await warehouse.getByLabel('Produk (wajib)').selectOption({ label: `${PRODUCT} (JHS01)` })
  await warehouse.getByLabel('No. batch (wajib)').fill(batch)
  await warehouse.getByLabel('ED (wajib)').fill('2030-01-31')
  await warehouse.getByLabel('Jumlah (wajib)').fill('2')
  await warehouse.getByRole('button', { name: 'Simpan barang masuk' }).click()

  await expect(
    warehouse.getByText('Barang masuk tersimpan di perangkat. Terkirim otomatis saat ada sinyal.'),
  ).toBeVisible()
  await expect(warehouse.getByText(/1 data tersimpan di perangkat ini/)).toBeVisible()

  await goOffline(false)
  await expect(warehouse.getByText(/data tersimpan di perangkat ini/)).toHaveCount(0, { timeout: 15_000 })
  await expect(warehouse.getByRole('main').getByText(batch).first()).toBeVisible()

  // Leave the warehouse stock as it was
  const card = warehouse
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: batch })
    .filter({ has: warehouse.getByRole('button', { name: 'Batalkan' }) })
    .first()
  await card.getByRole('button', { name: 'Batalkan' }).click()
  await warehouse.getByLabel('Alasan (wajib)').fill('Uji e2e offline')
  await warehouse.getByRole('alertdialog').getByRole('button', { name: 'Batalkan barang masuk' }).click()
  await expect(card).toHaveCount(0)
})
