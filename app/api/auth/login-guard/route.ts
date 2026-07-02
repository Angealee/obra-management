import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, recordRateLimitHit, clearRateLimit } from '@/lib/rate-limit'
import { logActivity } from '@/lib/activityLog'

// Per-ACCOUNT failed-login throttle.
//
// Why per-account and not per-IP: students log in from the campus network, so
// many legitimate users share one public IP (NAT). An IP-based limit would lock
// out the whole campus the moment a few people mistype passwords. Keying on the
// login identifier instead means only the targeted account is ever slowed, and
// only by its OWN failed attempts.
//
// Three actions (all POST):
//   { identifier }                  → check: 429 if the account is locked out
//   { identifier, action:'fail' }   → record one failed attempt
//   { identifier, action:'success' }→ clear the account's failure counter
//
// This is defense-in-depth on the normal app path; Supabase Auth also applies
// its own global rate limits underneath.

const LIMIT = 8           // failed attempts ...
const WINDOW_SEC = 10 * 60 // ... per 10 minutes, per account

function bucketFor(identifier: string) {
  return `login_fail:${identifier.trim().toLowerCase()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifier = String(body?.identifier ?? '').trim()
    const action = String(body?.action ?? 'check')

    // No identifier → nothing to throttle; let sign-in proceed and fail generically.
    if (!identifier) return NextResponse.json({ allowed: true })

    const bucket = bucketFor(identifier)

    if (action === 'fail') {
      await recordRateLimitHit(bucket, WINDOW_SEC)
      // Audit failed attempts (consultant-visible). The identifier may be an
      // email or a username — stored as typed, per the agreed retention scope.
      await logActivity({
        actorId: null,
        action: 'login_failed',
        targetTable: 'auth',
        details: { identifier: identifier.toLowerCase() },
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'success') {
      await clearRateLimit(bucket)
      return NextResponse.json({ ok: true })
    }

    // Default: check.
    if (await isRateLimited(bucket, LIMIT, WINDOW_SEC)) {
      return NextResponse.json(
        { error: 'Too many failed attempts for this account. Please wait a few minutes and try again.' },
        { status: 429 },
      )
    }
    return NextResponse.json({ allowed: true })
  } catch (err) {
    console.error('login-guard error:', err)
    // Fail open — never block a legitimate login because of an infra hiccup.
    return NextResponse.json({ allowed: true })
  }
}
