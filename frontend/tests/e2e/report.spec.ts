import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// W1 summary, W7 reports, and PG-10 targets on the sample data. Desktop only: the phone shows the
// same data as cards. The target set here is put back to 0 at the end, for the other runs and demos.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

let office: Page
let manager: Page

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
  manager = await pageAs(browser, testInfo, 'pimpinan')
})

test.afterAll(async () => {
  await office?.close()
  await manager?.close()
})

async function setTarget(page: Page, revenue: string) {
  await page.getByRole('link', { name: 'Laporan' }).first().click()
  await page.getByRole('link', { name: /Performa sales/ }).click()
  await page.getByRole('button', { name: 'Atur target' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Target omzet Sales Satu (contoh)').fill(revenue)
  await sheet.getByRole('button', { name: 'Simpan target' }).click()
  await expect(sheet).toBeHidden()
}

test('the office sets a monthly target and the summary measures against it (PG-10, LP-01)', async () => {
  // A different amount each run, so the save always changes something
  await setTarget(office, `${2000 + (Date.now() % 900)}000`)
  await expect(office.getByText('1 target tersimpan.')).toBeVisible()

  await manager.reload()
  await expect(manager.getByRole('heading', { name: 'Ringkasan' })).toBeVisible()
  const performance = manager.getByRole('region', { name: 'Performa sales' })
  await expect(performance.getByText('Sales Satu (contoh)')).toBeVisible()
  await expect(performance.getByText(/· \d+%/).first()).toBeVisible()
  await expect(manager.getByRole('region', { name: 'Outlet paling aktif' }).getByRole('listitem').first()).toBeVisible()
  await expect(manager.getByRole('region', { name: 'Perlu tindakan' })).toBeVisible()
})

test('a summary number opens its report with the same filters (W7)', async () => {
  await manager.getByLabel('Sales', { exact: true }).selectOption({ label: 'Sales Satu (contoh)' })
  await expect(manager).toHaveURL(/sales_user_id=\d+/)
  await manager.getByRole('link', { name: /Belum dikunjungi/ }).click()

  await expect(manager.getByRole('heading', { name: 'Outlet belum dikunjungi' })).toBeVisible()
  await expect(manager).toHaveURL(/\/office\/reports\/unvisited-outlets\?.*sales_user_id=\d+/)
  await expect(manager.getByLabel('Sales', { exact: true })).toHaveValue(/\d+/)
})

test('a report downloads as Excel (LP-06)', async () => {
  await manager.getByRole('link', { name: 'Semua laporan' }).click()
  await manager.getByRole('link', { name: /Penjualan per produk/ }).click()
  await expect(manager.getByRole('columnheader', { name: 'Laku (L)' })).toBeVisible()
  await expect(manager.getByRole('cell', { name: 'Jumlah' })).toBeVisible()

  const download = manager.waitForEvent('download')
  await manager.getByRole('button', { name: 'Excel' }).click()
  expect((await download).suggestedFilename()).toMatch(/^SIGAP Penjualan per produk \(J R L\) \d{4}-\d{2}\.xlsx$/)
})

test('the target goes back to 0 for the other tests and demos', async () => {
  await setTarget(office, '0')
})
