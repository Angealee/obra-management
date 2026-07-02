// Shared data + pure helpers for the /join application form family
// (JoinForm orchestrator, useJoinForm hook, and the step components).
// Extracted unchanged from the original single-file JoinForm.

export const POSITIONS = [
  { value: 'photographer',    label: 'Photographer' },
  { value: 'photo_editor',    label: 'Photo Editor' },
  { value: 'videographer',    label: 'Videographer' },
  { value: 'video_editor',    label: 'Video Editor' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'animator',        label: 'Animator' },
]

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

export const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  POSITIONS.map(p => [p.value, p.label])
)

export const STEPS = ['Personal Info', 'Positions', 'About You', 'Review']

export const STEP_FIELDS: Record<number, string[]> = {
  1: ['full_name', 'email', 'contact_number', 'year_level', 'course_section'],
  3: ['motivation', 'portfolio_url'],
}

export const DRAFT_KEY = 'obra-join-draft'

export const INITIAL_FORM = {
  full_name: '',
  email: '',
  contact_number: '',
  year_level: '',
  course_section: '',
  positions: [] as string[],
  motivation: '',
  portfolio_url: '',
}

export type FormState = typeof INITIAL_FORM

// Best-effort device/environment signal sent with the final submission. Used
// server-side only, to detect and correlate abuse of the public form (e.g. one
// device farming many applications). Never blocks a real applicant by itself.
export function collectClientMeta() {
  try {
    const n = navigator as any
    return {
      ua: n.userAgent,
      lang: n.language,
      langs: Array.isArray(n.languages) ? n.languages.slice(0, 10) : undefined,
      platform: n.platform,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio },
      cores: n.hardwareConcurrency,
      mem: n.deviceMemory,
    }
  } catch {
    return {}
  }
}

export function validateField(name: string, value: string): string | null {
  switch (name) {
    case 'full_name': {
      const v = value.trim()
      if (!v) return 'Full name is required.'
      if (v.length < 2 || !/[A-Za-z]/.test(v)) return 'Please enter your full name.'
      return null
    }
    case 'email': {
      const v = value.trim()
      if (!v) return 'Email address is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.'
      return null
    }
    case 'contact_number': {
      const v = value.replace(/[\s-]/g, '')
      if (!v) return 'Contact number is required.'
      if (!/^(09\d{9}|\+639\d{9})$/.test(v)) return 'Enter a valid PH mobile number (e.g. 09171234567).'
      return null
    }
    case 'year_level':
      if (!value) return 'Please select your year level.'
      return null
    case 'course_section': {
      const v = value.trim()
      if (!v) return 'Course & section is required.'
      if (v.length < 4 || !/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) {
        return 'Enter your actual course & section (e.g. BSIT 2-A).'
      }
      return null
    }
    case 'motivation': {
      const v = value.trim()
      if (!v) return 'Please tell us why you want to join Obra.'
      if (v.length < 20) return 'Please provide a bit more detail (at least 20 characters).'
      return null
    }
    case 'portfolio_url': {
      const v = value.trim()
      if (!v) return 'Please provide a link to your portfolio or sample work.'
      if (!/\./.test(v)) return 'Enter a valid link (e.g. https://drive.google.com/...).'
      const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`
      try { new URL(withProtocol) } catch { return 'Enter a valid link (e.g. https://drive.google.com/...).' }
      return null
    }
    default:
      return null
  }
}
