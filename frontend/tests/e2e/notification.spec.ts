import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// PW-08: a sales asks the warehouse for goods; the warehouse sees it under the bell
// and opens the request list from there. Desktop only (shared accounts).
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

let sales: Page
let warehouse: Page

test.beforeAll(async ({ browser }, testInfo) => {
  sales = await pageAs(browser, testInfo, 'sales2')
  warehouse = await pageAs(browser, testInfo, 'gudang')
})

test.afterAll(async () => {
  await sales?.close()
  await warehouse?.close()
})

test('a new stock request reaches the warehouse bell and opens the requests (PW-08)', async () => {
  const number = await sales.evaluate(async () => {
    const token = JSON.parse(localStorage.getItem('sigap-session') ?? '{}').state?.token
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    // Not the product inventory.spec asks for with the same sales, so the two never pick each other's request
    const products = await (await fetch('/api/v1/products?per_page=50', { headers })).json()
    const product = products.data.find((p: { name: string }) => !p.name.startsWith('Jahe'))
    const response = await fetch('/api/v1/inventory/stock-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: [{ product_id: product.id, qty: 1 }], note: 'Uji e2e notifikasi' }),
    })
    return (await response.json()).data.number as string
  })

  await warehouse.reload()
  const bell = warehouse.getByRole('button', { name: /Notifikasi, \d+ belum dibaca/ })
  await expect(bell).toBeVisible()
  await bell.click()
  const item = warehouse
    .getByRole('list', { name: 'Daftar notifikasi' })
    .getByRole('button')
    .filter({ hasText: number })
  await expect(item).toContainText('Permintaan barang baru')
  await item.click()
  await expect(warehouse).toHaveURL(/\/office\/inventory\/requests/)

  // Number badges: on the menu item and on the tab of the place where the work waits
  await expect(
    warehouse
      .getByRole('navigation', { name: 'Menu utama' })
      .getByRole('link', { name: /^Gudang \(\d+ menunggu\)$/ })
      .first(),
  ).toBeVisible()
  await expect(
    warehouse
      .getByRole('navigation', { name: 'Menu gudang' })
      .getByRole('link', { name: /^Permintaan sales \(\d+ menunggu\)$/ }),
  ).toBeVisible()

  // Leave the request rejected and the bell read, for the other tests and demos
  await warehouse.getByRole('listitem').filter({ hasText: number }).getByRole('button', { name: 'Tolak' }).click()
  await warehouse.getByLabel('Alasan (wajib)').fill('Uji e2e notifikasi')
  await warehouse.getByRole('alertdialog').getByRole('button', { name: 'Tolak permintaan' }).click()
  // Refused: it leaves the list of open requests
  await expect(warehouse.getByRole('listitem').filter({ hasText: number })).toHaveCount(0)
  // Read them all; other specs may add new ones meanwhile, so the bell is not checked to be empty
  await warehouse.getByRole('button', { name: /Notifikasi/ }).click()
  const markAll = warehouse.getByRole('button', { name: 'Tandai semua sudah dibaca' })
  if (await markAll.isVisible()) await markAll.click()
  await warehouse.keyboard.press('Escape')
})
