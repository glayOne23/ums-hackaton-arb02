import { devices, expect, type Page, test } from '@playwright/test'
import { signInAs } from './support/accounts'

// PW-02: "Pasang aplikasi". Browsers only offer installing on HTTPS with a running
// service worker, so the browser's offer (beforeinstallprompt) is simulated here;
// what is tested is SIGAP's side: the banner, the button, "Nanti saja", and iPhone steps.
test.skip(({ isMobile }) => !isMobile, 'Phone only: the banner is on the sales screen')

/** Fires a fake browser install offer; returns how the page saw prompt() being called. */
async function offerInstall(page: Page, outcome: 'accepted' | 'dismissed') {
  await page.evaluate((choice) => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    event.prompt = async () => {
      ;(window as unknown as { __prompted: boolean }).__prompted = true
    }
    event.userChoice = Promise.resolve({ outcome: choice })
    window.dispatchEvent(event)
  }, outcome)
}

test('the sales sees "Pasang SIGAP di HP" and installs with one tap', async ({ page }) => {
  await signInAs(page, 'sales1')
  await page.evaluate(() => localStorage.removeItem('sigap-install-snoozed-until'))
  await offerInstall(page, 'accepted')

  const banner = page.getByRole('region', { name: 'Pasang SIGAP di HP' })
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: 'Pasang aplikasi' }).click()

  await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true)
  await expect(page.getByText('SIGAP dipasang.')).toBeVisible()
  await expect(banner).toBeHidden()
})

test('"Nanti saja" hides the banner, also after reopening the app', async ({ page }) => {
  await signInAs(page, 'sales1')
  await page.evaluate(() => localStorage.removeItem('sigap-install-snoozed-until'))
  await offerInstall(page, 'dismissed')

  const banner = page.getByRole('region', { name: 'Pasang SIGAP di HP' })
  await banner.getByRole('button', { name: 'Nanti saja' }).click()
  await expect(banner).toBeHidden()

  await page.reload()
  await offerInstall(page, 'dismissed')
  await expect(page.getByRole('heading', { name: 'Pasang SIGAP di HP' })).toHaveCount(0)
  await page.evaluate(() => localStorage.removeItem('sigap-install-snoozed-until'))
})

test.describe('iPhone', () => {
  // Only the iPhone identity matters here (Safari offers no install event); the engine stays Chromium
  test.use({ userAgent: devices['iPhone 13'].userAgent, viewport: { width: 375, height: 780 } })

  test('Safari has no install offer: the button shows the Share steps', async ({ page }) => {
    await signInAs(page, 'sales2')
    await page.evaluate(() => localStorage.removeItem('sigap-install-snoozed-until'))
    await page.reload()

    await page
      .getByRole('region', { name: 'Pasang SIGAP di HP' })
      .getByRole('button', { name: 'Pasang aplikasi' })
      .click()
    const steps = page.getByRole('dialog', { name: 'Pasang SIGAP di iPhone' })
    await expect(steps.getByText('Tambahkan ke Layar Utama')).toBeVisible()
    await steps.getByRole('button', { name: 'Mengerti' }).click()
    await expect(steps).toBeHidden()
  })
})
