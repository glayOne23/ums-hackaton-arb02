import { expect, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// UX-09: a tip the first time a screen opens, and "Bantuan" (WhatsApp admin, tips, display).
// UX-08: bigger text and high contrast, per device.
test('a screen tip shows once; Bantuan brings tips back and changes the display (UX-08, UX-09)', async ({
  browser,
}, testInfo) => {
  const sales = await pageAs(browser, testInfo, testInfo.project.name === 'phone' ? 'sales1' : 'sales2')
  await sales.evaluate(() => localStorage.setItem('sigap-preferences', JSON.stringify({ hintsOff: false })))
  await sales.reload()

  const tip = sales.getByRole('complementary', { name: 'Petunjuk: Outlet saya' })
  await expect(tip).toContainText('Ketuk outlet untuk mulai kunjungan')
  await tip.getByRole('button', { name: 'Mengerti' }).click()
  await expect(tip).toHaveCount(0)
  await sales.reload()
  await expect(sales.getByRole('heading', { name: /Halo/ }).or(sales.getByText(/Halo,/)).first()).toBeVisible()
  await expect(tip).toHaveCount(0)

  await sales.getByRole('navigation', { name: 'Menu utama' }).getByRole('button', { name: 'Bantuan' }).click()
  const sheet = sales.getByRole('dialog', { name: 'Bantuan' })
  await expect(
    sheet.getByRole('link', { name: 'WhatsApp admin' }).or(sheet.getByText('Nomor WhatsApp admin belum diisi')),
  ).toBeVisible()

  await sheet.getByRole('radio', { name: 'Besar', exact: true }).click()
  await expect(sales.locator('html')).toHaveAttribute('data-font-size', 'large')
  await sheet.getByLabel(/Kontras tinggi/).check()
  await expect(sales.locator('html')).toHaveAttribute('data-contrast', 'high')
  // Back to normal for the rest of this device's tests
  await sheet.getByRole('radio', { name: 'Normal', exact: true }).click()
  await sheet.getByLabel(/Kontras tinggi/).uncheck()
  await expect(sales.locator('html')).not.toHaveAttribute('data-font-size', /.+/)

  await sheet.getByRole('button', { name: 'Tampilkan lagi semua petunjuk' }).click()
  await expect(tip).toBeVisible()
  await sales.close()
})
