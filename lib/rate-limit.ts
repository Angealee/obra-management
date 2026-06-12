import { createAdminClient } from '@/lib/supabase/admin'

// Simple, self-contained rate limiter backed by the public.rate_limits table.
// Not perfectly atomic (count-then-insert), which is acceptable at this scale —
// it stops scripted floods without adding an external service.

export type RateLimitResult = { allowed: boolean; retryAfter: number }

/**
 * Returns { allowed } for a named bucket within a rolling window.
 * Records the hit when allowed, and opportunistically prunes old rows.
 *
 * @param bucket      unique key, e.g. `otp_send_ip:1.2.3.4`
 * @param limit       max hits permitted within the window
 * @param windowSec   window length in seconds
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - windowSec * 1000).toISOString()

  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .gte('created_at', since)

  // Fail-open on infrastructure errors so a transient DB hiccup never blocks
  // a legitimate applicant. The OTP gate is still the hard requirement.
  if (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true, retryAfter: 0 }
  }

  if ((count ?? 0) >= limit) {
    return { allowed: false, retryAfter: windowSec }
  }

  await supabase.from('rate_limits').insert({ bucket })

  // Prune older rows for this bucket so the table stays bounded.
  await supabase
    .from('rate_limits')
    .delete()
    .eq('bucket', bucket)
    .lt('created_at', since)

  return { allowed: true, retryAfter: 0 }
}

/**
 * Check whether a bucket is already at/over its limit WITHOUT recording a hit.
 * Use this for a pre-action gate where the hit is recorded separately (e.g. only
 * on a FAILED login attempt). Fails open on infrastructure errors.
 */
export async function isRateLimited(
  bucket: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - windowSec * 1000).toISOString()

  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .gte('created_at', since)

  if (error) {
    console.error('Rate limit check failed:', error)
    return false
  }
  return (count ?? 0) >= limit
}

/** Record a single hit for a bucket and prune rows older than the window. */
export async function recordRateLimitHit(bucket: string, windowSec: number): Promise<void> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - windowSec * 1000).toISOString()

  await supabase.from('rate_limits').insert({ bucket })
  await supabase.from('rate_limits').delete().eq('bucket', bucket).lt('created_at', since)
}

/** Clear all hits for a bucket (e.g. after a successful login). Best-effort. */
export async function clearRateLimit(bucket: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('rate_limits').delete().eq('bucket', bucket)
}

/** Best-effort client IP extraction behind Vercel / proxies. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
