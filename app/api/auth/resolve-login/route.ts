import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Resolves a login identifier (email OR username) to the email address
// Supabase Auth needs for signInWithPassword. Runs with the service-role
// client because the caller isn't authenticated yet, so RLS would otherwise
// block reading another user's profile row.
//
// Always returns 200 with { email }. If the identifier is unknown, it is
// echoed back unchanged — signInWithPassword will then fail with Supabase's
// generic "Invalid login credentials", so this endpoint never reveals
// whether a username/email exists.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body?.identifier ?? '').trim()
    if (!identifier) return NextResponse.json({ email: identifier })

    const ip = getClientIp(req)
    const limit = await checkRateLimit(`resolve_login_ip:${ip}`, 30, 5 * 60)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
    }

    if (identifier.includes('@')) {
      return NextResponse.json({ email: identifier.toLowerCase() })
    }

    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier.toLowerCase())
      .maybeSingle()

    return NextResponse.json({ email: profile?.email ?? identifier })
  } catch (err) {
    console.error('Resolve-login error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
