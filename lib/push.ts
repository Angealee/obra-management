import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError, logInfo } from '@/lib/logger'

// Server-side Web Push sender. SERVER-ONLY (service-role + VAPID private key).
//
// Robustness measures baked in:
//   • Promise.allSettled — one dead device never blocks the rest.
//   • Dead-subscription pruning — push services answer 404/410 for expired or
//     revoked subscriptions; those rows are deleted on the spot, so the table
//     is self-cleaning and sends stay fast.
//   • TTL 1h — a phone that's offline for a day doesn't get stale pings.
//   • Category preferences respected per subscription row ('test' bypasses,
//     so the pipeline can always be proven end-to-end).

export type PushCategory =
  | 'announcements'
  | 'duties'
  | 'events'
  | 'workload'
  | 'applications'
  | 'test'

export type PushPayload = {
  title: string
  body: string
  /** In-app path the notification opens, e.g. /dashboard/duties/<id> */
  url: string
  /** Same tag collapses repeats of the same notification. */
  tag?: string
}

let configured = false
function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID env vars are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

/**
 * Send one payload to every subscribed device of the given profiles.
 * Best-effort: failures are logged, never thrown to the caller's flow.
 */
export async function sendPushToProfiles(
  profileIds: string[],
  category: PushCategory,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; pruned: number }> {
  const empty = { sent: 0, failed: 0, pruned: 0 }
  if (profileIds.length === 0) return empty

  try {
    ensureConfigured()
    const admin = createAdminClient()

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, categories')
      .in('profile_id', profileIds)

    if (error) {
      logError('push_subscriptions_fetch_failed', error, { category })
      return empty
    }

    const targets = (subs ?? []).filter(
      s => category === 'test' || (s.categories?.[category] ?? true) !== false,
    )
    if (targets.length === 0) return empty

    const body = JSON.stringify(payload)
    const results = await Promise.allSettled(
      targets.map(s =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60, urgency: 'normal' },
        ),
      ),
    )

    // Prune subscriptions the push service says are gone (404/410).
    const deadIds: string[] = []
    let sent = 0
    let failed = 0
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sent++
        return
      }
      failed++
      const statusCode = (r.reason as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) deadIds.push(targets[i].id)
    })
    if (deadIds.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', deadIds)
    }

    logInfo('push_sent', { category, sent, failed, pruned: deadIds.length })
    return { sent, failed, pruned: deadIds.length }
  } catch (err) {
    logError('push_send_failed', err, { category })
    return empty
  }
}
