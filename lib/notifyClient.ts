// Client-side fire-and-forget notification trigger. Called AFTER a mutation
// succeeds; the API route re-fetches the record and builds the notification
// from database truth, so nothing here is trusted content — just "something
// happened to record X". A failed trigger never disturbs the user's flow.

export type NotifyType =
  | 'announcement'
  | 'duty_assigned'
  | 'event_created'
  | 'workload_marked'
  | 'test'

export function fireNotification(
  type: NotifyType,
  data: Record<string, unknown> = {},
): void {
  void fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...data }),
  }).catch(() => {
    /* best-effort — the mutation already succeeded */
  })
}
