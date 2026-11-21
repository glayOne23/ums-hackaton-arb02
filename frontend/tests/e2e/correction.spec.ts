import { expect, type Page, test } from '@playwright/test'
import { openOutletWithShelfStock, pageAs } from './support/accounts'

// KR-01/02/03: a visit with one sold by mistake. On the phone the sales fixes it
// the same day; on desktop the office asks for a correction and the manager
// approves it (approve_correction is on by default). Each project uses its own
// sales, so the two never touch the same outlet.
test.describe.configure({ mode: 'serial' })

let sales: Page
let office: Page
let manager: Page
let transactionId = ''
let product = ''

test.beforeAll(async ({ browser }, testInfo) => {
  sales = await pageAs(browser, testInfo, testInfo.project.name === 'phone' ? 'sales1' : 'sales2')
  office = await pageAs(browser, testInfo, 'kantor')
  manager = await pageAs(browser, testInfo, 'pimpinan')
})

test.afterAll(async () => {
  await sales?.context().close()
  await office?.context().close()
  await manager?.context().close()
})

test('a visit with one sold, not paid yet', async () => {
  await openOutletWithShelfStock(sales, { fromEnd: true })
  const fewer = sales.locator('button[aria-label^="Kurangi Sisa"]:enabled').first()
  product = ((await fewer.getAttribute('aria-label')) ?? '').replace('Kurangi Sisa ', '')
  await fewer.click()
  await sales.getByRole('button', { name: 'Lanjut' }).click()

  const sheet = sales.getByRole('dialog')
  const later = sheet.getByRole('button', { name: 'Belum bayar' })
  await ((await later.count()) ? later : sheet.getByRole('button', { name: 'Simpan kunjungan' })).click()
  await expect(sales.getByText('Terkirim')).toBeVisible()

  const fix = sales.getByRole('link', { name: 'Perbaiki' })
  transactionId = ((await fix.getAttribute('href')) ?? '').split('/').pop() ?? ''
  expect(transactionId).not.toBe('')
})

/**
 * Put the shelf count back to what was there, so nothing was sold after all.
 * Read from the nota itself: another spec may visit with the same sales at the
 * same time, so the phone's numbers are not trusted here.
 */
async function undoTheSale(page: Page) {
  const row = page.getByRole('dialog').getByRole('group', { name: product })
  const opening = Number((await row.getByText(/Titipan saat kunjungan \d+/).textContent())?.match(/\d+$/)?.[0])
  const remaining = row.getByLabel('Sisa')
  const now = Number(await remaining.inputValue())
  await remaining.fill(String(now < opening ? opening : opening - 1))
  await expect(page.getByRole('dialog').getByText(new RegExp(`Laku ${product}: \\d+ → \\d+`))).toBeVisible()
}

test('the sales fixes their own nota the same day; the phone shows the new numbers (KR-01)', async () => {
  const testInfo = test.info()
  test.skip(testInfo.project.name !== 'phone', 'Phone: the sales fixes it')
  const before = await sales.getByText(/Nota NT-\d{4}-\d{4}/).textContent()

  await sales.getByRole('link', { name: 'Perbaiki' }).click()
  await expect(sales.getByRole('heading', { name: /Nota NT-/ })).toBeVisible()
  await sales.getByRole('button', { name: 'Perbaiki', exact: true }).click()
  await expect(sales.getByText(/masih bisa memperbaiki nota ini langsung/)).toBeVisible()
  await undoTheSale(sales)
  await sales.getByRole('button', { name: 'Simpan perbaikan' }).click()

  await expect(sales).toHaveURL(/\/field\/receipt\//)
  await expect(sales.getByText(/Nota NT-\d{4}-\d{4}/)).not.toHaveText(before ?? '')
  await expect(sales.getByRole('link', { name: 'Kirim ke WhatsApp' })).toBeVisible()
})

test('the office asks for a correction with a reason (KR-02)', async () => {
  const testInfo = test.info()
  test.skip(testInfo.project.name === 'phone', 'Desktop: office and manager')

  await office.goto(`/office/visits/${transactionId}`)
  await office.getByRole('button', { name: 'Ajukan koreksi' }).click()
  await expect(office.getByText(/perlu disetujui dulu/)).toBeVisible()
  await undoTheSale(office)
  await office.getByLabel('Alasan (wajib)').fill('Salah hitung sisa saat kunjungan (uji e2e)')
  await office.getByRole('dialog').getByRole('button', { name: 'Ajukan koreksi' }).click()

  await expect(office.getByText('Koreksi menunggu persetujuan')).toBeVisible()
  await expect(office.getByRole('button', { name: 'Ajukan koreksi' })).toHaveCount(0)
})

test('the manager approves it from the Koreksi menu; the old nota is kept, crossed out (KR-03)', async () => {
  const testInfo = test.info()
  test.skip(testInfo.project.name === 'phone', 'Desktop: office and manager')

  await manager.getByRole('link', { name: 'Koreksi' }).first().click()
  await expect(manager.getByRole('heading', { name: 'Koreksi & pemulihan' })).toBeVisible()
  const card = manager.getByRole('article').filter({ hasText: 'Salah hitung sisa saat kunjungan (uji e2e)' }).first()
  await card.getByRole('button', { name: 'Setujui' }).click()
  await expect(manager.getByText(/disetujui$/)).toBeVisible()

  await manager.goto(`/office/visits/${transactionId}`)
  await expect(manager.getByText('Nota ini sudah dikoreksi dan tidak dihitung lagi.')).toBeVisible()
  await manager.getByRole('link', { name: /Lihat nota pengganti/ }).click()
  await expect(manager.getByText(/Nota ini mengganti NT-/)).toBeVisible()

  await manager.getByRole('button', { name: 'Riwayat perubahan' }).click()
  await expect(manager.getByText('Mengajukan koreksi')).toBeVisible()
  await expect(manager.getByText('Menyetujui koreksi')).toBeVisible()
})

test('the office sees Perlu dicek and the trash', async () => {
  const testInfo = test.info()
  test.skip(testInfo.project.name === 'phone', 'Desktop: office')

  await office.getByRole('link', { name: 'Koreksi' }).first().click()
  await expect(office.getByRole('heading', { name: /Nota perlu dicek/ })).toBeVisible()
  await expect(office.getByRole('heading', { name: 'HP yang belum mengirim semua data' })).toBeVisible()
  await office.getByRole('link', { name: 'Tempat sampah' }).click()
  await expect(office.getByText(/bisa dipulihkan selama 30 hari/)).toBeVisible()
})
