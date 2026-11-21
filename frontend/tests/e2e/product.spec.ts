import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// Sample accounts, categories, and outlet types from the seeders (fictional data).
// Adds one "Produk Uji E2E" product and one discount per run and project; the last
// test stops the discount and moves the product to the trash.
// Each account signs in once per project (the login limit counts every attempt),
// so the tests run in order and share their signed-in pages.
test.describe.configure({ mode: 'serial' })

const stamp = Date.now().toString().slice(-7)
const code = `UJI${stamp}`
const name = `Produk Uji E2E ${stamp}`
const alias = `ALIAS UJI ${stamp}`

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

test('office admin adds a product with another name and proposes a discount', async () => {
  await office.goto('/office/products/new')
  await office.getByLabel('Kode (wajib)').fill(code.toLowerCase())
  await office.getByLabel('Nama produk (wajib)').fill(name)
  await office.getByLabel('Kategori (wajib)').selectOption({ label: 'Madu' })
  await office.getByLabel('Nomor BPOM (wajib)').fill('TR-CONTOH-999')
  await office.getByLabel('Harga jual (wajib)').fill('60.000')
  await office.getByLabel('Satuan (wajib)').fill('botol')
  await office.getByLabel('Nama lain di Excel lama').fill(alias)
  await office.getByRole('button', { name: 'Simpan produk' }).click()

  await expect(office.getByRole('heading', { name })).toBeVisible()
  await expect(office.getByText(code, { exact: true })).toBeVisible()

  // Found by its other name (PR-02)
  await office.goto(`/office/products?search=${encodeURIComponent(alias)}`)
  await expect(office.getByText(name).filter({ visible: true })).toHaveCount(1)

  // Not an approver: the discount waits (BR-05)
  await office.goto('/office/discounts/new')
  await expect(office.getByText('Potongan baru berlaku setelah disetujui Pimpinan.')).toBeVisible()
  await office.getByText('Jenis outlet + produk', { exact: true }).click()
  await office.getByLabel('Jenis outlet (wajib)').selectOption({ label: 'Apotek' })
  await office.getByLabel('Produk (wajib)').selectOption({ label: `${name} (${code})` })
  await office.getByLabel('Potongan (wajib)').fill('12,5')
  await office.getByRole('button', { name: 'Ajukan potongan' }).click()

  await expect(office).toHaveURL(/\/office\/discounts$/)
  const row = office.getByRole('main').getByRole('listitem').filter({ hasText: name })
  await expect(row).toContainText('12,5%')
  await expect(row).toContainText('Menunggu persetujuan')
})

test('the manager approves it and the Apotek price list uses it', async () => {
  await manager.goto('/office/discounts')
  const row = manager.getByRole('main').getByRole('listitem').filter({ hasText: name })
  await row.getByRole('button', { name: 'Setujui' }).click()
  await expect(row).toContainText('Berlaku')

  await manager.goto('/office/price-list')
  await manager.getByLabel('Jenis outlet').selectOption({ label: 'Apotek' })
  const priceRow = manager.getByRole('row').filter({ hasText: name })
  await expect(priceRow).toContainText('12,5%')
  // Rp 60.000 − 12,5% = Rp 52.500
  await expect(priceRow).toContainText('52.500')
})

test('office admin stops the discount and moves the product to the trash', async () => {
  await office.goto('/office/discounts')
  const row = office.getByRole('main').getByRole('listitem').filter({ hasText: name })
  await row.getByRole('button', { name: 'Hentikan' }).click()
  await office.getByRole('alertdialog').getByRole('button', { name: 'Hentikan potongan' }).click()
  await expect(office.getByRole('main').getByRole('listitem').filter({ hasText: name })).toHaveCount(0)

  await office.goto(`/office/products?search=${code}`)
  await office.getByRole('link', { name }).filter({ visible: true }).click()
  await office.getByRole('button', { name: 'Hapus produk' }).click()
  await office.getByRole('alertdialog').getByRole('button', { name: 'Hapus produk' }).click()
  await expect(office).toHaveURL(/\/office\/products$/)
})
