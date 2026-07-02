// Server-side validation for membership applications.
// The /join form validates on the client for UX, but the client can be
// bypassed — this module is the source of truth enforced in the API route.

export const VALID_POSITIONS = [
  'photographer',
  'photo_editor',
  'videographer',
  'video_editor',
  'graphic_designer',
  'animator',
] as const

export const VALID_YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Only real http(s) URLs — blocks javascript:, data:, mailto:, etc. */
export function validatePortfolioUrl(value: string): boolean {
  const s = value.trim()
  if (!/^https?:\/\//i.test(s)) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export type CleanApplication = {
  full_name: string
  email: string
  contact_number: string
  year_level: string
  course_section: string
  positions: string[]
  motivation: string
  portfolio_url: string
}

export type ValidationOutcome =
  | { error: string; data?: undefined }
  | { error?: undefined; data: CleanApplication }

export function validateApplication(body: any): ValidationOutcome {
  // Data Privacy Notice consent is required (RA 10173). The /join form gates
  // submission behind the consent modal; anyone bypassing the form and posting
  // directly must still assert consent explicitly.
  if (body?.consent !== true) {
    return { error: 'Please review and agree to the Data Privacy Notice first.' }
  }

  const full_name = String(body?.full_name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const contact_raw = String(body?.contact_number ?? '').trim()
  const year_level = String(body?.year_level ?? '').trim()
  const course_section = String(body?.course_section ?? '').trim()
  const motivation = String(body?.motivation ?? '').trim()
  const portfolio_url = String(body?.portfolio_url ?? '').trim()
  const positions: string[] = Array.isArray(body?.positions)
    ? body.positions.map((p: unknown) => String(p))
    : []

  if (full_name.length < 2 || !/[A-Za-z]/.test(full_name)) {
    return { error: 'Please enter a valid full name.' }
  }
  if (full_name.length > 120) {
    return { error: 'Full name is too long.' }
  }

  if (!validateEmail(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const contact = contact_raw.replace(/[\s-]/g, '')
  if (!/^(09\d{9}|\+639\d{9})$/.test(contact)) {
    return { error: 'Enter a valid PH mobile number (e.g. 09171234567).' }
  }

  if (!VALID_YEAR_LEVELS.includes(year_level as (typeof VALID_YEAR_LEVELS)[number])) {
    return { error: 'Please select a valid year level.' }
  }

  if (
    course_section.length < 4 ||
    !/[A-Za-z]/.test(course_section) ||
    !/[0-9]/.test(course_section) ||
    course_section.length > 60
  ) {
    return { error: 'Enter a valid course & section (e.g. BSIT 2-A).' }
  }

  if (positions.length === 0) {
    return { error: 'Please select at least one position.' }
  }
  const allowed = new Set<string>(VALID_POSITIONS)
  if (!positions.every((p: string) => allowed.has(p))) {
    return { error: 'Invalid position selected.' }
  }
  // de-dupe
  const uniquePositions: string[] = Array.from(new Set<string>(positions))

  if (motivation.length < 20) {
    return { error: 'Please provide a bit more detail in your motivation (at least 20 characters).' }
  }
  if (motivation.length > 4000) {
    return { error: 'Your motivation is too long.' }
  }

  if (!validatePortfolioUrl(portfolio_url)) {
    return { error: 'Enter a valid portfolio link starting with http:// or https://.' }
  }
  if (portfolio_url.length > 500) {
    return { error: 'Portfolio link is too long.' }
  }

  return {
    data: {
      full_name,
      email,
      contact_number: contact,
      year_level,
      course_section,
      positions: uniquePositions,
      motivation,
      portfolio_url,
    },
  }
}
