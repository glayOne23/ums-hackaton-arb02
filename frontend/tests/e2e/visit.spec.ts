import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test'

// Sample accounts and outlets from the seeders (fictional data). SRS §7.4–7.5:
// a visit with something sold, then "Tidak ada yang laku" without a signal.
// Each project uses its own sales, so phone and desktop never visit the same outlet.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'sigap123'

let sales: Page
let office: Page

async function signedInPage(browser: Browser, testInfo: TestInfo, login: string, area: RegExp): Promise<Page> {
  const { baseURL, viewport, locale, isMobile, hasTouch, userAgent, deviceScaleFactor } = testInfo.project.use
  const context = await browser.newContext({
    baseURL,
    viewport,
    locale,
    isMobile,
    hasTouch,
    userAgent,
    deviceScaleFactor,
  })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Nomor HP atau username').fill(login)
  await page.getByLabel('Kata sandi', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).toHaveURL(area)
  return page
}

test.beforeAll(async ({ browser }, testInfo) => {
  sales = await signedInPage(browser, testInfo, testInfo.project.name === 'phone' ? 'sales1' : 'sales2', /\/field$/)
  office = await signedInPage(browser, testInfo, 'pimpinan', /\/office$/)
})

test.afterAll(async () => {
  await sales?.context().close()
  await office?.context().close()
})

/** Open the first consignment outlet (not visited today ones come first; a second visit the same day is fine). */
async function openConsignmentOutlet(page: Page) {
  await page.getByRole('link', { name: 'Outlet', exact: true }).click()
  const outlet = page.locator('a[href^="/field/visit/"]').first()
  await outlet.click()
  await expect(page).toHaveURL(/\/field\/visit\//)
}

test('a sales counts the shelf, gets paid, and sees the nota (KS-02, KS-04, KS-08)', async () => {
  await openConsignmentOutlet(sales)
  const fewer = sales.locator('button[aria-label^="Kurangi Sisa"]:enabled').first()
  if (await fewer.count()) await fewer.click()
  await sales.getByRole('button', { name: 'Lanjut' }).click()

  const sheet = sales.getByRole('dialog')
  await expect(sheet.getByText('Tagihan kunjungan ini')).toBeVisible()
  const payAll = sheet.getByRole('button', { name: 'Dibayar semua' })
  await ((await payAll.count()) ? payAll : sheet.getByRole('button', { name: 'Simpan kunjungan' })).click()

  await expect(sales).toHaveURL(/\/field\/receipt\//)
  await expect(sales.getByText('Terkirim')).toBeVisible()
  await expect(sales.getByText(/Nota NT-\d{4}-\d{4}/)).toBeVisible()
})

test('"Tidak ada yang laku" saves without a signal and sends later (KS-03, KS-11)', async () => {
  await openConsignmentOutlet(sales)
  await sales.context().setOffline(true)
  await sales.getByRole('button', { name: 'Tidak ada yang laku' }).click()

  await expect(sales).toHaveURL(/\/field\/receipt\//)
  await expect(sales.getByText('Tersimpan di HP, akan terkirim saat ada sinyal')).toBeVisible()
  await sales.getByRole('link', { name: 'Ke outlet berikutnya' }).click()
  await expect(sales.getByText(/1 kunjungan tersimpan di HP/)).toBeVisible()

  await sales.context().setOffline(false)
  await sales.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(sales.getByText(/kunjungan tersimpan di HP/)).toHaveCount(0, { timeout: 15_000 })

  await sales.getByRole('link', { name: 'Hari ini', exact: true }).click()
  await expect(sales.getByRole('main').getByText('Terkirim').first()).toBeVisible()
})

test('the manager sees the visit with the shelf numbers', async () => {
  await office.goto('/office/visits')
  await office.getByRole('main').locator('a[href^="/office/visits/"]').first().click()
  await expect(office.getByText(/Nota NT-\d{4}-\d{4}/)).toBeVisible()
  await expect(office.getByText('Foto form bercap')).toBeVisible()
})
