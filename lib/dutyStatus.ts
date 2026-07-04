// Single source of truth for the "display status" of a duty.
//
// Under the merged review/outcome model, a head's review action is marking the
// outcome in workload_marks — which stamps duties.reviewed_by/reviewed_at but
// leaves duties.status at 'completed' (no schema/CHECK change). So raw status is
// no longer enough to tell "completed but unreviewed" from "reviewed". This
// helper derives the real display state from status + reviewed_by, and also
// handles legacy rows that were written with status='reviewed'.

export type DutyDisplayStatus = 'pending' | 'in_progress' | 'awaiting_review' | 'reviewed'

export function dutyDisplayStatus(duty: { status: string; reviewed_by?: string | null }): DutyDisplayStatus {
  if (duty.status === 'reviewed') return 'reviewed' // legacy rows
  if (duty.status === 'completed') return duty.reviewed_by ? 'reviewed' : 'awaiting_review'
  return duty.status as 'pending' | 'in_progress'
}

export const DUTY_DISPLAY_LABELS: Record<DutyDisplayStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  reviewed: 'Reviewed',
}

// [background, text] color pairs — matches the inline-style badge convention.
export const DUTY_DISPLAY_STYLE: Record<DutyDisplayStatus, [string, string]> = {
  pending: ['#f3f4f6', '#6b7280'],
  in_progress: ['#eff6ff', '#3b82f6'],
  awaiting_review: ['#fefce8', '#ca8a04'],
  reviewed: ['#f0fdf4', '#16a34a'],
}

// ── Due-date urgency ────────────────────────────────────────────────────────
// Turns a due date into scannable priority copy. Applies only to duties the
// member still has to act on (pending / in progress) — a submitted or
// reviewed duty being "overdue" would just be noise.

export type DutyUrgency = {
  level: 'overdue' | 'today' | 'soon'
  label: string
  color: string
  bg: string
}

export function dutyUrgency(
  duty: { status: string; due_date?: string | null },
  /** Whole-day difference due_date − today (see lib/relativeDate.daysFromToday). */
  daysUntilDue: number | null,
): DutyUrgency | null {
  if (daysUntilDue === null) return null
  if (duty.status !== 'pending' && duty.status !== 'in_progress') return null

  if (daysUntilDue < 0) {
    const n = -daysUntilDue
    return { level: 'overdue', label: `Overdue by ${n} day${n !== 1 ? 's' : ''}`, color: '#CC0000', bg: '#fef2f2' }
  }
  if (daysUntilDue === 0) {
    return { level: 'today', label: 'Due today', color: '#b45309', bg: '#fffbeb' }
  }
  if (daysUntilDue <= 3) {
    return {
      level: 'soon',
      label: daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`,
      color: '#374151',
      bg: '#f3f4f6',
    }
  }
  return null
}
