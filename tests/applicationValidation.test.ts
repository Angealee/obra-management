import { describe, it, expect } from 'vitest'
import { validateApplication, validatePortfolioUrl } from '../lib/applicationValidation'

// A body that passes every rule — each test perturbs one field.
const valid = () => ({
  consent: true,
  full_name: 'Juan Dela Cruz',
  email: 'Juan.DelaCruz@GMAIL.com',
  contact_number: '0917 123-4567',
  year_level: '2nd Year',
  course_section: 'BSIT 2-A',
  positions: ['photographer', 'animator'],
  motivation: 'I love creative media and want to contribute to Obra events.',
  portfolio_url: 'https://drive.google.com/xyz',
})

describe('validateApplication — consent gate (RA 10173)', () => {
  it('rejects when consent is missing', () => {
    const { consent, ...rest } = valid()
    expect(validateApplication(rest).error).toMatch(/Data Privacy Notice/)
  })

  it('rejects consent=false and truthy-but-not-true values', () => {
    expect(validateApplication({ ...valid(), consent: false }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), consent: 'true' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), consent: 1 }).error).toBeTruthy()
  })
})

describe('validateApplication — happy path', () => {
  it('accepts a valid body and normalizes fields', () => {
    const result = validateApplication(valid())
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data!.email).toBe('juan.delacruz@gmail.com') // lowercased
    expect(result.data!.contact_number).toBe('09171234567')     // spaces/dashes stripped
  })

  it('de-duplicates repeated positions', () => {
    const result = validateApplication({
      ...valid(),
      positions: ['photographer', 'photographer', 'animator'],
    })
    expect(result.data!.positions).toEqual(['photographer', 'animator'])
  })
})

describe('validateApplication — field rules', () => {
  it('rejects invalid names', () => {
    expect(validateApplication({ ...valid(), full_name: 'J' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), full_name: '12345' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), full_name: 'x'.repeat(121) }).error).toBeTruthy()
  })

  it('rejects invalid emails', () => {
    expect(validateApplication({ ...valid(), email: 'not-an-email' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), email: 'a@b' }).error).toBeTruthy()
  })

  it('accepts PH mobile formats and rejects others', () => {
    expect(validateApplication({ ...valid(), contact_number: '+639171234567' }).error).toBeUndefined()
    expect(validateApplication({ ...valid(), contact_number: '0281234567' }).error).toBeTruthy()  // landline
    expect(validateApplication({ ...valid(), contact_number: '0917123456' }).error).toBeTruthy()  // too short
    expect(validateApplication({ ...valid(), contact_number: '+63171234567' }).error).toBeTruthy() // +63 without 9
  })

  it('rejects unknown year levels', () => {
    expect(validateApplication({ ...valid(), year_level: '5th Year' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), year_level: '' }).error).toBeTruthy()
  })

  it('requires a real-looking course & section (letters + digits, 4–60 chars)', () => {
    expect(validateApplication({ ...valid(), course_section: 'IT' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), course_section: 'BSIT' }).error).toBeTruthy()   // no digit
    expect(validateApplication({ ...valid(), course_section: '2222' }).error).toBeTruthy()   // no letter
    expect(validateApplication({ ...valid(), course_section: 'BSIT 3-B' }).error).toBeUndefined()
  })

  it('requires at least one valid position and rejects unknown values', () => {
    expect(validateApplication({ ...valid(), positions: [] }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), positions: ['hacker'] }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), positions: 'photographer' }).error).toBeTruthy() // not an array
  })

  it('bounds motivation length (20–4000)', () => {
    expect(validateApplication({ ...valid(), motivation: 'too short' }).error).toBeTruthy()
    expect(validateApplication({ ...valid(), motivation: 'x'.repeat(4001) }).error).toBeTruthy()
  })
})

describe('portfolio URL security', () => {
  it('blocks non-http(s) schemes (javascript:, data:, ftp:)', () => {
    expect(validatePortfolioUrl('javascript:alert(1)')).toBe(false)
    expect(validatePortfolioUrl('data:text/html;base64,PGI+')).toBe(false)
    expect(validatePortfolioUrl('ftp://files.example.com/work')).toBe(false)
  })

  it('blocks protocol-less and malformed values', () => {
    expect(validatePortfolioUrl('drive.google.com/xyz')).toBe(false)
    expect(validatePortfolioUrl('https://')).toBe(false)
  })

  it('accepts normal http(s) links', () => {
    expect(validatePortfolioUrl('https://behance.net/juan')).toBe(true)
    expect(validatePortfolioUrl('http://example.com/portfolio')).toBe(true)
  })

  it('rejects portfolio links over 500 chars via validateApplication', () => {
    const long = 'https://example.com/' + 'a'.repeat(500)
    expect(validateApplication({ ...valid(), portfolio_url: long }).error).toBeTruthy()
  })
})
