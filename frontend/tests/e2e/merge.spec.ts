import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// OT-06 / KR-08 as the sample office admin: two outlets for one shop (made
// through the API for speed), merged from the kept outlet's profile. Desktop only.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const stamp = Date.now().toString().slice(-6)
const KEPT = `Toko Gabung E2E ${stamp}`
const DOUBLE = `tk gabung e2e ${stamp}`

let office: Page
let keptId = ''

/** Call the API as the signed-in user of the page. */
async function call<T>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const token = JSON.parse(localStorage.getItem('sigap-session') ?? '{}').state?.token
      const response = await fetch(`/api/v1${path}`, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      })
      return response.json()
    },
    { method, path, body },
  )
}

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
  const regions = await call<{ data: { id: string }[] }>(office, 'GET', '/regions')
  const types = await call<{ data: { id: string }[] }>(office, 'GET', '/outlet-types')
  const base = { outlet_type_id: types.data[0].id, region_id: regions.data[0].id, district: 'Gading', sale_mode: 'consignment' }
  keptId = (await call<{ data: { id: string } }>(office, 'POST', '/outlets', { ...base, name: KEPT })).data.id
  await call(office, 'POST', '/outlets', { ...base, name: DOUBLE, address: 'Jl. Gabung 1' })
})

test.afterAll(async () => {
  await office?.close()
})

test('the duplicate is merged into the kept outlet, with what moves shown first (OT-06)', async () => {
  await office.goto(`/office/outlets/${keptId}`)
  await expect(office.getByRole('heading', { name: KEPT })).toBeVisible()
  await office.getByRole('button', { name: 'Gabung dobel' }).click()

  const sheet = office.getByRole('dialog')
  await sheet.getByLabel('Outlet dobel').fill(DOUBLE)
  await sheet.getByRole('button', { name: new RegExp(DOUBLE) }).click()
  await expect(sheet.getByText(`Alamat ${KEPT} yang kosong diisi dari ${DOUBLE}: Jl. Gabung 1.`)).toBeVisible()
  await expect(sheet.getByText(/dinonaktifkan dan tidak bisa dipulihkan/)).toBeVisible()

  await sheet.getByLabel('Alasan (boleh kosong)').fill('Toko yang sama (uji e2e)')
  await sheet.getByRole('button', { name: 'Gabungkan' }).click()
  await expect(office.getByText(`${DOUBLE} digabung ke ${KEPT}`)).toBeVisible()
  await expect(office.getByText('Jl. Gabung 1')).toBeVisible()

  await office.getByRole('button', { name: 'Riwayat perubahan' }).click()
  await expect(office.getByText(new RegExp(`Menggabungkan outlet dobel ${DOUBLE}`))).toBeVisible()
})

test('the merged duplicate is not offered again and is not in the trash', async () => {
  await office.getByRole('button', { name: 'Gabung dobel' }).click()
  const sheet = office.getByRole('dialog')
  await sheet.getByLabel('Outlet dobel').fill(DOUBLE)
  await expect(sheet.getByText('Tidak ditemukan.')).toBeVisible()
  await office.keyboard.press('Escape')

  await office.goto('/office/corrections?tab=sampah')
  await expect(office.getByText(/bisa dipulihkan selama/)).toBeVisible()
  await expect(office.getByText(DOUBLE)).toHaveCount(0)
})
