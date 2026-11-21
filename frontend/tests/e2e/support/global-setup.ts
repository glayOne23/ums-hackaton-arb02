import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type FullConfig, request } from '@playwright/test'
import { ACCOUNTS, PASSWORD, sessionFile } from './accounts'

/**
 * Signs every sample account in once per run, through the API, and keeps the
 * session for the specs. The login limit (6 attempts per minute per account)
 * would otherwise stop the run once a few specs use the same account.
 * The login screen itself is tested in login.spec.ts.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL
  const api = await request.newContext({ baseURL })

  for (const account of ACCOUNTS) {
    const response = await api.post('/api/v1/auth/login', {
      data: { login: account, password: PASSWORD, device_name: 'e2e' },
      headers: { Accept: 'application/json' },
    })
    if (!response.ok()) {
      throw new Error(`Sign-in of ${account} failed (${response.status()}). Is the backend running with sample data?`)
    }
    const { token, user } = await response.json()
    const file = sessionFile(account)
    mkdirSync(dirname(file), { recursive: true })
    // Same shape as the zustand "sigap-session" store in localStorage
    writeFileSync(file, JSON.stringify({ state: { token, user }, version: 0 }))
  }

  await api.dispose()
}
