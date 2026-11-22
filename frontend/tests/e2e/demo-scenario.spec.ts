import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, devices, expect, type Page, test } from '@playwright/test'
import { type Account, signInAs } from './support/accounts'

/**
 * Demo Day rehearsal: the 7 acceptance steps of SRS §7, in order, on the demo data.
 * Script: docs/demo/NASKAH_DEMO.md. Run on a FRESH demo database only:
 *
 *   php artisan migrate:fresh --seed --seeder=DemoSeeder
 *   npm run test:demo
 *
 * The sales uses a phone (360 px), everyone else a laptop (1280 px), as on stage.
 * Fictional data; "Sales Satu" stands for the sales in the SRS story.
 */
test.describe.configure({ mode: 'serial' })

const DEMO_DIR = join(import.meta.dirname, '..', '..', '..', 'docs', 'demo')
const PRODUCT = 'Madu Pahit Contoh 470 g'
const OUTLET_SOLD = 'Apotek Sari Sehat Contoh'
const OUTLET_NONE = 'Toko Herbal Barokah Contoh'
const OUTLET_RULE = 'Apotek Pandawa Contoh'
const SALES_NAME = 'Sales Satu (contoh)'
// A 1×1 JPEG stands in for the photo of the stamped visit form
const PHOTO = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
)

let office: Page
let warehouse: Page
let manager: Page
let sales: Page

async function open(browser: Browser, account: Account, device: 'phone' | 'laptop'): Promise<Page> {
  const context = await browser.newContext(
    device === 'phone'
      ? { ...devices['Pixel 5'], viewport: { width: 360, height: 780 }, locale: 'id-ID' }
      : { viewport: { width: 1280, height: 800 }, locale: 'id-ID' },
  )
  const page = await context.newPage()
  await signInAs(page, account)
  return page
}

async function openOutlet(name: string) {
  await sales.getByRole('link', { name: 'Outlet', exact: true }).click()
  await sales.getByLabel('Cari outlet').fill(name)
  await sales.locator('a[href^="/field/visit/"]').filter({ hasText: name }).first().click()
  await expect(sales.getByRole('button', { name: 'Lanjut' })).toBeVisible()
}

async function setThreshold(value: string) {
  await office.goto('/office/settings')
  await office.getByLabel(/Sarankan tagih bila laku lebih dari/).fill(value)
  const save = office.getByRole('button', { name: /Simpan \(\d perubahan\)/ })
  if (await save.isVisible()) {
    await save.click()
    await expect(office.getByText(/pengaturan tersimpan/)).toBeVisible()
  }
}

test.beforeAll(async ({ browser }) => {
  office = await open(browser, 'kantor', 'laptop')
  warehouse = await open(browser, 'gudang', 'laptop')
  manager = await open(browser, 'pimpinan', 'laptop')
  sales = await open(browser, 'sales1', 'phone')
})

test.afterAll(async () => {
  for (const page of [office, warehouse, manager, sales]) await page?.context().close()
})

test('1. the office imports outlets and October consignment stock; 2 duplicates are found and joined', async () => {
  await office.getByRole('link', { name: 'Impor Excel' }).first().click()

  await office.getByRole('radio', { name: /Outlet/ }).click()
  await office.locator('input[type="file"]').setInputFiles(join(DEMO_DIR, '1-outlet-oktober.csv'))
  await expect(office.getByText('6 baris')).toBeVisible()
  await expect(office.getByText('4 siap')).toBeVisible()
  await expect(office.getByText('2 mirip')).toBeVisible()
  await office.getByRole('radio', { name: /Gabung ke Apotek Sari Sehat Contoh \(OT-\d+\)/ }).check()
  await office.getByRole('radio', { name: /Gabung ke Toko Herbal Barokah Contoh \(OT-\d+\)/ }).check()
  await office.getByRole('button', { name: 'Impor 6 baris' }).click()
  await expect(office.getByText('4 outlet diimpor, 2 digabung.')).toBeVisible()

  await office.getByRole('radio', { name: /Stok titipan/ }).click()
  await office.locator('input[type="file"]').setInputFiles(join(DEMO_DIR, '2-stok-titipan-oktober.csv'))
  await expect(office.getByText('8 siap')).toBeVisible()
  await office.getByRole('button', { name: 'Impor 8 baris' }).click()
  await expect(office.getByText(/8 .*diimpor/)).toBeVisible()
})

test('2. the warehouse records batch B-2611, ED 11/2028, 100 pcs', async () => {
  await warehouse.goto('/office/inventory/receipts/new')
  await warehouse.getByLabel('Produk (wajib)').selectOption({ label: `${PRODUCT} (MDP01)` })
  await warehouse.getByLabel('No. batch (wajib)').fill('B-2611')
  await warehouse.getByLabel('ED (wajib)').fill('2028-11-30')
  await warehouse.getByLabel('Jumlah (wajib)').fill('100')
  await warehouse.getByRole('button', { name: 'Simpan barang masuk' }).click()
  await expect(warehouse).toHaveURL(/\/office\/inventory\/receipts$/)
  await expect(warehouse.getByRole('main').getByText('B-2611').first()).toBeVisible()
})

test('3. the sales asks for 24 pcs; the warehouse prepares and approves; the sales carries them', async () => {
  await sales.getByRole('link', { name: 'Hari ini', exact: true }).click()
  await sales.getByRole('link', { name: 'Minta barang ke gudang' }).click()
  await sales.getByLabel('Cari produk').fill('Madu Pahit')
  const plus = sales.getByRole('button', { name: `Tambah Minta ${PRODUCT}` })
  for (let n = 0; n < 24; n++) await plus.click()
  await sales.getByRole('button', { name: 'Kirim permintaan (1 produk)' }).click()
  await expect(sales.getByText('Menunggu disiapkan').first()).toBeVisible()

  await warehouse.goto('/office/inventory/requests')
  await warehouse
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: SALES_NAME })
    .filter({ hasText: 'Menunggu disiapkan' })
    .first()
    .getByRole('button', { name: 'Siapkan & keluarkan' })
    .click()
  await expect(warehouse.getByText(`keluar ke ${SALES_NAME}`)).toBeVisible()

  await sales.reload()
  await expect(sales.getByText('Sudah keluar').first()).toBeVisible()
})

test('4. without a signal: shelf 4 → 1, sold 3 after the 16% discount, refill, photo, saved', async () => {
  // Fresh work package: the goods just issued are now carried
  await sales.goto('/field')
  // As on an installed phone: the service worker holds every screen before the signal goes
  await sales.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => sales.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await openOutlet(OUTLET_SOLD)
  await sales.context().setOffline(true)

  const fewer = sales.getByRole('button', { name: `Kurangi Sisa ${PRODUCT}` })
  for (let n = 0; n < 3; n++) await fewer.click()
  // Rp 75.000 − 16% = Rp 63.000 × 3
  await expect(sales.getByText(/Laku\s*3\s*·\s*Rp\s189\.000/)).toBeVisible()
  // The refill suggestion is already filled in: the shelf goes back to 4
  await expect(sales.getByLabel(`Isi ${PRODUCT}`, { exact: true })).toHaveValue('3')

  await sales.getByRole('button', { name: 'Lanjut' }).click()
  const sheet = sales.getByRole('dialog')
  await expect(sheet.getByText('Laku 3 pcs (lebih dari 2): sebaiknya ditagih sekarang')).toBeVisible()
  await sheet.locator('input[type="file"]').setInputFiles({ name: 'form.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await expect(sheet.getByText(/Foto siap/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Dibayar semua' }).click()

  await expect(sales.getByText('Tersimpan di HP, akan terkirim saat ada sinyal')).toBeVisible()
})

test('5. next outlet, nothing sold: "Tidak ada yang laku" and saved in 15 seconds or less', async () => {
  const start = Date.now()
  await openOutlet(OUTLET_NONE)
  await sales.getByRole('button', { name: 'Tidak ada yang laku' }).click()
  await expect(sales).toHaveURL(/\/field\/receipt\//)
  // The app's share of UX-01; a person adds a few seconds of tapping on stage
  expect(Date.now() - start).toBeLessThan(15_000)

  // Signal back: both visits are sent, never twice
  await sales.context().setOffline(false)
  await sales.evaluate(() => window.dispatchEvent(new Event('online')))
  await sales.getByRole('link', { name: 'Ke outlet berikutnya' }).click()
  await expect(sales.getByText(/kunjungan tersimpan di HP/)).toHaveCount(0, { timeout: 20_000 })
})

test('6. the office changes the billing threshold to more than 3; the next visit follows it', async () => {
  await setThreshold('3')

  // The phone reads the rules from its work package when the app opens
  await sales.reload()
  await openOutlet(OUTLET_RULE)
  const fewer = sales.getByRole('button', { name: `Kurangi Sisa ${PRODUCT}` })
  for (let n = 0; n < 3; n++) await fewer.click()
  await sales.getByRole('button', { name: 'Lanjut' }).click()
  const sheet = sales.getByRole('dialog')
  await expect(sheet.getByText(/Laku 3 pcs \(tidak lebih dari 3\)/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Belum bayar' }).click()
  await expect(sales.getByText('Terkirim')).toBeVisible()
})

test("7. the manager's summary shows the sales' revenue, the most active outlet, and the product's sell-through", async () => {
  await manager.goto('/office')
  await expect(manager.getByRole('heading', { name: 'Ringkasan' })).toBeVisible()
  await expect(manager.getByRole('region', { name: 'Performa sales' }).getByText(SALES_NAME)).toBeVisible()
  await expect(manager.getByRole('region', { name: 'Outlet paling aktif' }).getByText(OUTLET_SOLD)).toBeVisible()
  await expect(manager.getByRole('region', { name: 'Perputaran stok' }).getByText(PRODUCT)).toBeVisible()
})

test('afterwards: the threshold goes back to 2', async () => {
  await setThreshold('2')
})

// Keep the demo files and this spec in step
test('the demo files list the outlets this spec visits', () => {
  const outlets = readFileSync(join(DEMO_DIR, '1-outlet-oktober.csv'), 'utf8')
  for (const name of ['AP Sari Sehat Contoh', 'TK Herbal Barokah Contoh', OUTLET_RULE]) {
    expect(outlets).toContain(name)
  }
})
