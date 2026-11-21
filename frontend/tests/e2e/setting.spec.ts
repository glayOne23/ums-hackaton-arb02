import { expect, type Page, test } from '@playwright/test'
import { openOutletWithShelfStock, pageAs } from './support/accounts'

// SRS §7.6: the office changes the billing threshold and the next visit follows it,
// without a code change. Settings are shared by everyone, so this runs on one project
// only, and puts the value back at the end.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Settings are global: only the desktop project changes them')

let office: Page
let sales: Page

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
})

test.afterAll(async () => {
  await office?.close()
  await sales?.close()
})

async function setThreshold(value: string) {
  await office.goto('/office/settings')
  await office.getByLabel(/Sarankan tagih bila laku lebih dari/).fill(value)
  const save = office.getByRole('button', { name: /Simpan \(\d perubahan\)/ })
  if (await save.isVisible()) {
    await save.click()
    await expect(office.getByText(/pengaturan tersimpan/)).toBeVisible()
  }
}

test('the office raises the billing threshold and the sales sees the new rule (PG-01, SRS §7.6)', async ({
  browser,
}, testInfo) => {
  await setThreshold('3')

  // The phone downloads its work package (with the rules) when it opens
  sales = await pageAs(browser, testInfo, 'sales2')
  await openOutletWithShelfStock(sales)
  await sales.locator('button[aria-label^="Kurangi Sisa"]:enabled').first().click()
  await sales.getByRole('button', { name: 'Lanjut' }).click()
  await expect(sales.getByRole('dialog').getByText(/\(tidak lebih dari 3\)/)).toBeVisible()
  await sales.keyboard.press('Escape')

  await office.getByRole('button', { name: 'Riwayat perubahan' }).click()
  await expect(office.getByText('2 →').first()).toBeVisible()
})

test('values outside the limits are refused with a plain message', async () => {
  await office.goto('/office/settings')
  await office.getByLabel(/Outlet perlu dikunjungi setiap/).fill('0')
  await office.getByRole('button', { name: /Simpan \(1 perubahan\)/ }).click()
  await expect(office.getByText(/paling sedikit 1/)).toBeVisible()
})

test('a list entry is added and switched off, never deleted (PG-05)', async () => {
  await office.goto('/office/settings')
  const name = `Kab. Contoh E2E ${Date.now().toString().slice(-6)}`
  await office.getByLabel('Tambah wilayah (kabupaten/kota)').fill(name)
  await office.getByRole('button', { name: 'Tambah ke Wilayah (kabupaten/kota)' }).click()
  await expect(office.getByText(`${name} ditambahkan`)).toBeVisible()
  await office.getByRole('checkbox', { name: `${name} aktif` }).uncheck()
  await expect(office.getByRole('checkbox', { name: `${name} aktif` })).not.toBeChecked()
})

test('the threshold goes back to 2 for the other tests and demos', async () => {
  await setThreshold('2')
})
