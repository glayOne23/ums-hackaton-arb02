import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test'

// Sample accounts and products from the seeders (fictional data). P1 → P2 → P6 → P7 in order,
// sharing one signed-in page per account (the login limit counts every attempt).
// The test batch "E2E…" is counted back to 0 at the end; requested goods are returned.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'sigap123'
const PRODUCT = 'Jahe Merah Instan Contoh'
const batch = `E2E${Date.now().toString().slice(-7)}`

let warehouse: Page
let sales: Page
// Each project (phone, desktop) runs in parallel, so each uses its own sales: their requests never mix
let salesName = ''

async function signedInPage(browser: Browser, testInfo: TestInfo, login: string, area: RegExp): Promise<Page> {
  const { baseURL, viewport, locale, isMobile, hasTouch, userAgent, deviceScaleFactor } = testInfo.project.use
  const page = await browser.newPage({ baseURL, viewport, locale, isMobile, hasTouch, userAgent, deviceScaleFactor })
  await page.goto('/login')
  await page.getByLabel('Nomor HP atau username').fill(login)
  await page.getByLabel('Kata sandi', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).toHaveURL(area)
  return page
}

test.beforeAll(async ({ browser }, testInfo) => {
  warehouse = await signedInPage(browser, testInfo, 'gudang', /\/office$/)
  const phone = testInfo.project.name === 'phone'
  salesName = phone ? 'Sales Satu (contoh)' : 'Sales Dua (contoh)'
  sales = await signedInPage(browser, testInfo, phone ? 'sales1' : 'sales2', /\/field$/)
})

test.afterAll(async () => {
  await warehouse?.close()
  await sales?.close()
})

test('the warehouse records goods in with batch and expiry (P1)', async () => {
  await warehouse.goto('/office/inventory/receipts/new')
  await warehouse.getByLabel('Produk (wajib)').selectOption({ label: `${PRODUCT} (JHS01)` })
  await warehouse.getByLabel('No. batch (wajib)').fill(batch)
  await warehouse.getByLabel('ED (wajib)').fill('2030-01-31')
  await warehouse.getByLabel('Jumlah (wajib)').fill('5')
  await warehouse.getByRole('button', { name: 'Simpan barang masuk' }).click()

  await expect(warehouse).toHaveURL(/\/office\/inventory\/receipts$/)
  await expect(warehouse.getByRole('main').getByText(batch).first()).toBeVisible()
})

test('a sales asks for goods from the phone, numbers only (P2)', async () => {
  await sales.getByRole('link', { name: 'Hari ini', exact: true }).click()
  await sales.getByRole('link', { name: 'Minta barang ke gudang' }).click()
  await sales.getByLabel('Cari produk').fill('Jahe')
  const plus = sales.getByRole('button', { name: `Tambah Minta ${PRODUCT}` })
  await plus.click()
  await plus.click()
  await plus.click()
  await sales.getByRole('button', { name: 'Kirim permintaan (1 produk)' }).click()

  await expect(sales).toHaveURL(/\/field\/today$/)
  await expect(sales.getByText('Menunggu disiapkan').first()).toBeVisible()
})

test('the warehouse prepares and issues it in one click (GD-02, GD-03)', async () => {
  await warehouse.goto('/office/inventory/requests')
  const card = warehouse
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: salesName })
    .filter({ hasText: 'Menunggu disiapkan' })
    .filter({ hasText: PRODUCT })
    .first()
  await card.getByRole('button', { name: 'Siapkan & keluarkan' }).click()
  await expect(warehouse.getByText(`keluar ke ${salesName}`)).toBeVisible()
})

test('the sales sees the goods they carry, without batches (GD-04)', async () => {
  await sales.reload()
  await expect(sales.getByText('Sudah keluar').first()).toBeVisible()
  await expect(sales.getByRole('main').getByText(PRODUCT).first()).toBeVisible()
  await expect(sales.getByText(batch)).toHaveCount(0)
})

test('the warehouse takes the goods back as good stock (P6)', async () => {
  await warehouse.goto('/office/inventory/returns/new')
  await warehouse.getByLabel('Sales (wajib)').selectOption({ label: salesName })
  // The option label includes what the sales carries ("… (dibawa 15)"), so pick it by its value
  const option = warehouse.locator('option', { hasText: `${PRODUCT} (dibawa` })
  await expect(option).toHaveCount(1)
  await warehouse.getByLabel('Produk (wajib)').selectOption((await option.getAttribute('value')) ?? '')
  await warehouse.getByLabel('Jumlah (wajib)').fill('3')
  await warehouse.getByRole('button', { name: 'Simpan retur' }).click()
  await expect(warehouse).toHaveURL(/\/office\/inventory\/returns$/)
})

test('a stock count books only the difference, with a reason (P7)', async () => {
  await warehouse.goto('/office/inventory/count')
  await warehouse.getByLabel('Cari produk atau batch').fill(batch)
  await warehouse.getByLabel(new RegExp(`^Fisik ${PRODUCT} ${batch}$`)).fill('0')
  await warehouse.getByLabel('Alasan selisih (wajib)').fill('Uji e2e: batch dikosongkan')
  await warehouse.getByRole('button', { name: 'Simpan opname (1 selisih)' }).click()
  await expect(warehouse.getByText(/tersimpan, stok disesuaikan/)).toBeVisible()
})
