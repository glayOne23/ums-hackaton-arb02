import { describe, expect, it } from 'vitest'
import { deviceName } from '@/features/auth/api'
import { loginSchema } from '@/features/auth/schemas'

describe('login form', () => {
  it('rejects empty fields with plain-language messages', () => {
    const result = loginSchema.safeParse({ login: '   ', password: '' })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((issue) => issue.message)
    expect(messages).toContain('Isi nomor HP atau username.')
    expect(messages).toContain('Isi kata sandi.')
  })

  it('trims spaces around the phone number/username', () => {
    expect(loginSchema.parse({ login: ' sales1 ', password: 'x' }).login).toBe('sales1')
  })
})

describe('device name', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 13; SM-A145F) Mobile Safari/537.36', 'HP Android'],
    ['Mozilla/5.0 (Linux; Android 13; SM-X200) Safari/537.36', 'Tablet Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140', 'PC Windows'],
  ])('%s → %s', (userAgent, expected) => {
    expect(deviceName(userAgent)).toBe(expected)
  })
})
