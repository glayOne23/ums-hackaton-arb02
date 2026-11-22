import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// PG-09 logo on the nota, PR-01 product photo, PG-14 status rules. All three change
// shared data, so they run on the desktop project only and put things back at the end.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Shared settings and products: desktop project only')

// 8×8 green PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGMQa7DFihiGlgQAkzQ0wSkPBnoAAAAASUVORK5CYII=',
  'base64',
)
const image = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG })

let office: Page
let warehouse: Page

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
  warehouse = await pageAs(browser, testInfo, 'gudang')
})

test.afterAll(async () => {
  await office?.close()
  await warehouse?.close()
})

async function save(page: Page) {
  await page.getByRole('button', { name: /Simpan \(\d perubahan\)/ }).click()
  await expect(page.getByText(/pengaturan tersimpan/)).toBeVisible()
}

test('the office sets a nota logo, and removes it again (PG-09)', async () => {
  await office.goto('/office/settings')
  // The file input sits behind the "Pilih logo" button
  await office.locator('input[type="file"][accept*="image/png"]').setInputFiles(image('logo.png'))
  await expect(office.getByRole('img', { name: 'Logo di nota' })).toBeVisible()
  await save(office)

  await office.reload()
  await expect(office.getByRole('img', { name: 'Logo di nota' })).toBeVisible()
  await office.getByRole('button', { name: 'Hapus logo' }).click()
  await save(office)
  await expect(office.getByRole('img', { name: 'Belum ada logo' })).toBeVisible()
})

test('the office adds a product photo and removes it (PR-01)', async () => {
  await office.goto('/office/products')
  await office
    .getByRole('link', { name: /^Detail / })
    .first()
    .click()
  const card = office.getByRole('region', { name: 'Foto produk' })
  await expect(card.getByText('Belum ada foto')).toBeVisible()

  await card.locator('input[type="file"]').setInputFiles(image('produk.png'))
  await expect(office.getByText('Foto produk tersimpan')).toBeVisible()
  await expect(card.getByRole('img', { name: /^Foto / })).toBeVisible()

  await card.getByRole('button', { name: 'Hapus foto' }).click()
  await expect(office.getByText('Foto produk dihapus')).toBeVisible()
  await expect(card.getByText('Belum ada foto')).toBeVisible()
})

test('turning off "mundur" hides Ubah status on stock requests (PG-14)', async () => {
  await office.goto('/office/settings')
  await office.getByRole('radio', { name: 'Tidak boleh mundur' }).click()
  await save(office)

  await warehouse.goto('/office/inventory/requests')
  await warehouse.getByLabel('Tampilkan').selectOption({ label: 'Semua' })
  await expect(warehouse.getByRole('button', { name: 'Ubah status' })).toHaveCount(0)

  // Back to the default for the other tests and the demo
  await office.getByRole('radio', { name: 'Boleh mundur satu tahap' }).click()
  await save(office)
  await warehouse.reload()
  await warehouse.getByLabel('Tampilkan').selectOption({ label: 'Semua' })
  await expect(warehouse.getByRole('button', { name: 'Ubah status' }).first()).toBeVisible()
})
