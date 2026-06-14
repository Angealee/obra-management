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
