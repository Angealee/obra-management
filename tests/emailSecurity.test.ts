import { describe, it, expect } from 'vitest'
import { canonicalizeEmail, assessEmail } from '../lib/emailSecurity'

// assessEmail is async but in allowlist mode (the active policy) it never
// performs DNS lookups — every path here runs offline.

describe('canonicalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(canonicalizeEmail('  Juan@DCT.EDU.PH ').canonical).toBe('juan@dct.edu.ph')
  })

  it('strips +tags for all providers', () => {
    expect(canonicalizeEmail('juan+obra@outlook.com').canonical).toBe('juan@outlook.com')
    expect(canonicalizeEmail('juan+a+b@yahoo.com').canonical).toBe('juan@yahoo.com')
  })

  it('collapses Gmail dots and googlemail → gmail', () => {
    expect(canonicalizeEmail('Juan.Dela.Cruz+obra@googlemail.com').canonical).toBe('juandelacruz@gmail.com')
    expect(canonicalizeEmail('j.u.a.n@gmail.com').canonical).toBe('juan@gmail.com')
  })

  it('keeps dots for non-Gmail providers', () => {
    expect(canonicalizeEmail('juan.dela.cruz@outlook.com').canonical).toBe('juan.dela.cruz@outlook.com')
  })

  it('handles input without @ gracefully', () => {
    const r = canonicalizeEmail('not-an-email')
    expect(r.domain).toBe('')
    expect(r.canonical).toBe('not-an-email')
  })
})

describe('assessEmail (allowlist policy)', () => {
  it('rejects malformed addresses as invalid', async () => {
    const r = await assessEmail('nope')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid')
  })

  it('rejects disposable domains WITHOUT revealing the disposable check', async () => {
    const disposable = await assessEmail('troll@mailinator.com')
    const notAllowed = await assessEmail('someone@randomcorp.com')
    expect(disposable.ok).toBe(false)
    expect(disposable.reason).toBe('disposable')
    expect(notAllowed.reason).toBe('not_allowed')
    // Same user-facing message so attackers can't map the blocklist.
    expect(disposable.message).toBe(notAllowed.message)
  })

  it('rejects domains outside the allowlist', async () => {
    const r = await assessEmail('someone@protonmail.com')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not_allowed')
  })

  it('accepts the school domain and major providers', async () => {
    expect((await assessEmail('juan@dct.edu.ph')).ok).toBe(true)
    expect((await assessEmail('juan@gmail.com')).ok).toBe(true)
    expect((await assessEmail('juan@yahoo.com.ph')).ok).toBe(true)
  })

  it('returns the canonical form used for dedupe/rate-limit keys', async () => {
    const r = await assessEmail('Juan.Dela.Cruz+spam@googlemail.com')
    expect(r.ok).toBe(true)
    expect(r.canonical).toBe('juandelacruz@gmail.com')
    expect(r.domain).toBe('gmail.com')
  })
})
