import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logger'

// Server-only companion to the audit triggers (db/2026-activity-logs.sql).
//
// The triggers cover writes made by AUTHENTICATED users through RLS — which is
// most of the app, since many components mutate Supabase directly from the
// browser. API routes use the service-role key instead, where auth.uid() is
// null and the trigger deliberately skips; those routes record their actions
// here explicitly, with the verified caller as the actor.
//
// Best-effort by design: a failed log entry is reported through the logger but
// never fails the request that triggered it.

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'unarchived'
  | 'login_failed'

export async function logActivity(entry: {
  /** Verified caller's profile id — null only for unauthenticated events (failed logins). */
  actorId: string | null
  action: ActivityAction
  targetTable: string
  targetId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('activity_logs').insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId ?? null,
      details: entry.details ?? null,
    })
    if (error) {
      logError('activity_log_insert_failed', error, {
        action: entry.action,
        target_table: entry.targetTable,
      })
    }
  } catch (err) {
    logError('activity_log_insert_failed', err, {
      action: entry.action,
      target_table: entry.targetTable,
    })
  }
}

// Mirrors the trigger's redaction list for the fields this helper's callers
// diff in TypeScript (member update route). Values of these fields never land
// in the log — only a "changed" marker.
export const REDACTED_FIELDS = new Set([
  'email',
  'contact_number',
  'student_number',
  'password',
])

/**
 * Field-level old→new diff matching the shape the DB trigger produces, so the
 * activity feed renders API-route entries and trigger entries identically.
 * Redacted fields record `{ changed: true }` instead of values.
 */
export function buildDiff(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): Record<string, { old?: string; new?: string; changed?: boolean }> {
  const diff: Record<string, { old?: string; new?: string; changed?: boolean }> = {}
  for (const key of Object.keys(newValues)) {
    const before = oldValues[key] ?? null
    const after = newValues[key] ?? null
    if (String(before ?? '') === String(after ?? '')) continue
    diff[key] = REDACTED_FIELDS.has(key)
      ? { changed: true }
      : {
          old: String(before ?? '—').slice(0, 120),
          new: String(after ?? '—').slice(0, 120),
        }
  }
  return diff
}
