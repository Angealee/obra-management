// Date-only helpers for humanized scheduling copy ("Today", "Tomorrow",
// "In 3 days", "2 days ago"). Pure and dependency-free — unit-tested in
// tests/relativeDate.test.ts.
//
// IMPORTANT: date-only strings (YYYY-MM-DD) must NOT go through `new Date(s)`
// directly — that parses as UTC midnight and can shift a day in local time.
// parseDateOnly builds a LOCAL date instead.

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Today's date in Asia/Manila as YYYY-MM-DD. Server code MUST use this (and
 * pass parseDateOnly(phTodayStr()) as `today` below) — Vercel runs in UTC, so
 * a bare `new Date()` flips to the wrong day for PH users every evening.
 */
export function phTodayStr(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
}

/** Whole days from `today` to `dateStr`: 0 = today, 1 = tomorrow, -1 = yesterday. */
export function daysFromToday(dateStr: string, today: Date = new Date()): number {
  const target = parseDateOnly(dateStr)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

/**
 * Short human label for a date-only string, or '' when it's far enough away
 * that the plain date reads better (±14 days).
 */
export function relativeDayLabel(dateStr: string, today: Date = new Date()): string {
  const diff = daysFromToday(dateStr, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff <= 14) return `In ${diff} days`
  if (diff < -1 && diff >= -14) return `${-diff} days ago`
  return ''
}
