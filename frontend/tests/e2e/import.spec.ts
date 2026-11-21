import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// W10 as the sample office admin, with a CSV file (the import reads CSV as well as Excel).
// The imported outlet is undone at the end, so it only stays in the trash. Desktop only.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const stamp = Date.now().toString().slice(-6)
const OUTLET = `Toko Impor E2E ${stamp}`
const csv = [
  'Nama outlet,Jenis,Kabupaten/kota,Kecamatan,Cara jual,Sales',
  `${OUTLET},Toko herbal,Klaten,Gading,Titip jual,sales1`,
  // Same shop as the sample "Apotek Delanggu Contoh": held back as similar
  'AP Delanggu Contoh,Apotek,Kab. Klaten,Delanggu,Titip jual,',
  'Toko Tanpa Wilayah,Apotek,Kab. Antah,Gading,cicil,',
].join('\n')

let office: Page

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
})

test.afterAll(async () => {
  await office?.close()
})

test('the template downloads for the chosen kind of data', async () => {
  await office.getByRole('link', { name: 'Impor Excel' }).first().click()
  await expect(office.getByRole('heading', { name: 'Impor Excel' })).toBeVisible()
  await office.getByRole('radio', { name: /Produk/ }).click()

  const download = office.waitForEvent('download')
  await office.getByRole('button', { name: 'Unduh template produk' }).click()
  expect((await download).suggestedFilename()).toBe('Template impor Produk.xlsx')
})

test('a file is checked row by row before anything is saved (IE-01, OT-02)', async () => {
  await office.getByRole('radio', { name: /Outlet/ }).click()
  await office.locator('input[type="file"]').setInputFiles({
    name: 'outlet-oktober.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })

  await expect(office.getByText('3 baris')).toBeVisible()
  await expect(office.getByText('1 siap')).toBeVisible()
  // Problems are shown first
  await expect(office.getByText('Kabupaten/kota "Kab. Antah" belum ada')).toBeVisible()

  await office.getByRole('radio', { name: 'Mirip (1)' }).click()
  await expect(office.getByText(/Mirip Apotek Delanggu Contoh \(OT-\d+\) yang sudah ada/)).toBeVisible()
  await expect(office.getByRole('button', { name: 'Impor 1 baris' })).toBeEnabled()

  await office.getByRole('button', { name: 'Impor 1 baris' }).click()
  await expect(office.getByText('1 outlet diimpor, 2 baris dilewati.')).toBeVisible()
  await expect(office.getByRole('list', { name: 'Riwayat impor' }).getByRole('listitem').first()).toContainText(
    'Outlet · outlet-oktober.csv',
  )
})

test('the imported outlet is in the list, and the session can be undone (KR-14)', async () => {
  await office.getByRole('link', { name: 'Outlet' }).first().click()
  await office.getByLabel(/Cari/).first().fill(OUTLET)
  await expect(office.getByRole('main').getByText(OUTLET).first()).toBeVisible()

  await office.getByRole('link', { name: 'Impor Excel' }).first().click()
  const first = office.getByRole('list', { name: 'Riwayat impor' }).getByRole('listitem').first()
  await first.getByRole('button', { name: /Batalkan impor/ }).click()
  await office.getByRole('alertdialog').getByRole('button', { name: 'Batalkan impor' }).click()
  await expect(office.getByText('Impor dibatalkan.')).toBeVisible()
  await expect(first).toContainText('dibatalkan')
})
