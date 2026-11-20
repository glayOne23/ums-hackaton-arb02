import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test'

// Sample accounts from the seeders (fictional data). P5: a sales collects part of a
// bill in cash; the office records and voids a payment, then takes the cash (TG-01–03).
// Each project uses its own sales, so their remittances never mix.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'sigap123'

let sales: Page
let office: Page
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
  const phone = testInfo.project.name === 'phone'
  salesName = phone ? 'Sales Satu (contoh)' : 'Sales Dua (contoh)'
  sales = await signedInPage(browser, testInfo, phone ? 'sales1' : 'sales2', /\/field$/)
  office = await signedInPage(browser, testInfo, 'kantor', /\/office$/)
})

test.afterAll(async () => {
  await sales?.close()
  await office?.close()
})

test('a sales collects Rp 1.000 of the bill in cash (KS-08)', async () => {
  await sales.locator('a[href^="/field/visit/"]').first().click()
  const fewer = sales.locator('button[aria-label^="Kurangi Sisa"]:enabled').first()
  await expect(fewer).toBeVisible()
  await fewer.click()
  await sales.getByRole('button', { name: 'Lanjut' }).click()

  const sheet = sales.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Sebagian…' }).click()
  await sheet.getByLabel('Uang yang dibayar').fill('1000')
  await sheet.getByRole('button', { name: /Simpan, dibayar/ }).click()
  await expect(sales.getByText('Terkirim')).toBeVisible()
})

test('the office sees unpaid invoices, records a payment, and voids it (TG-01, TG-02, KR-06)', async () => {
  await office.goto('/office/billing')
  await expect(office.getByRole('button', { name: 'Cetak daftar' })).toBeVisible()
  await office.getByRole('main').locator('a[href^="/office/billing/invoices/"]').first().click()

  await office.getByLabel('Jumlah (wajib)').fill('1000')
  await office.getByRole('radio', { name: 'Transfer' }).click()
  await office.getByRole('button', { name: 'Simpan pembayaran' }).click()
  await expect(office.getByText('Pembayaran Rp 1.000 tercatat')).toBeVisible()

  // Both projects may open the same invoice: take a payment of ours that can still be voided
  const row = office
    .getByRole('listitem')
    .filter({ hasText: 'Transfer' })
    .filter({ hasText: 'Admin Kantor' })
    .filter({ has: office.getByRole('button', { name: 'Batalkan' }) })
    .first()
  await row.getByRole('button', { name: 'Batalkan' }).click()
  await office.getByLabel('Alasan pembatalan (wajib)').fill('Uji e2e: dicatat dua kali')
  await office.getByRole('button', { name: 'Batalkan pembayaran' }).click()
  await expect(office.getByText('Pembayaran dibatalkan')).toBeVisible()
})

test('the office takes the cash the sales collected in one tap (TG-03)', async () => {
  await office.goto('/office/billing/remittances')
  const card = office
    .getByRole('listitem')
    .filter({ hasText: salesName })
    .filter({ has: office.getByRole('button', { name: 'Uang diterima' }) })
  await card.getByRole('button', { name: 'Uang diterima' }).click()
  await expect(office.getByText(new RegExp(`Setoran ${salesName.replace(/[()]/g, '\\$&')} .* diterima`))).toBeVisible()
})
