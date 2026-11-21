import { expect, type Page, test } from '@playwright/test'
import { openOutletWithShelfStock, pageAs } from './support/accounts'

// Sample accounts and outlets from the seeders (fictional data). SRS §7.4–7.5:
// a visit with something sold, then "Tidak ada yang laku" without a signal.
// Each project uses its own sales, so phone and desktop never visit the same outlet.
test.describe.configure({ mode: 'serial' })

let sales: Page
let office: Page

test.beforeAll(async ({ browser }, testInfo) => {
  sales = await pageAs(browser, testInfo, testInfo.project.name === 'phone' ? 'sales1' : 'sales2')
  office = await pageAs(browser, testInfo, 'pimpinan')
})

test.afterAll(async () => {
  await sales?.context().close()
  await office?.context().close()
})

test('a sales counts the shelf, gets paid, and sees the nota (KS-02, KS-04, KS-08)', async () => {
  await openOutletWithShelfStock(sales)
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
  await openOutletWithShelfStock(sales)
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
