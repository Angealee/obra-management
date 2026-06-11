import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendOtpEmail } from '@/lib/email'
import { validateEmail } from '@/lib/applicationValidation'

// Node runtime required (Nodemailer). This is the default for route handlers —
// do not switch to the edge runtime.

const OTP_TTL_MIN = 10
const ACTIVE_STATUSES = ['pending', 'shortlisted', 'interviewed', 'approved']

function hashCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code + (process.env.OTP_PEPPER ?? ''))
    .digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const honeypot = String(body?.website ?? '')

    // Honeypot — a real user never fills this hidden field. Pretend success
    // so bots can't tell they were caught; do nothing.
    if (honeypot) return NextResponse.json({ success: true })

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    const ip = getClientIp(req)

    // Per-IP cap (blocks scripted floods from one source)…
    const ipLimit = await checkRateLimit(`otp_send_ip:${ip}`, 6, 15 * 60)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429 },
      )
    }
    // …and per-email cap (stops someone email-bombing a victim's inbox).
    const emailLimit = await checkRateLimit(`otp_send_email:${email}`, 3, 10 * 60)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many codes sent to this email. Please wait a few minutes.' },
        { status: 429 },
      )
    }

    const supabase = createAdminClient()

    // Don't even send a code if an application already exists for this email.
    const { data: existing } = await supabase
      .from('member_applications')
      .select('id')
      .eq('email', email)
      .in('status', ACTIVE_STATUSES)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists. Please contact the Obra team if you need help.' },
        { status: 409 },
      )
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()

    // Invalidate any prior unconsumed codes for this email.
    await supabase
      .from('application_otps')
      .update({ consumed: true })
      .eq('email', email)
      .eq('consumed', false)

    const { error: insErr } = await supabase.from('application_otps').insert({
      email,
      code_hash: hashCode(code),
      expires_at,
    })
    if (insErr) {
      console.error('OTP insert error:', insErr)
      return NextResponse.json({ error: 'Could not start verification. Please try again.' }, { status: 500 })
    }

    try {
      await sendOtpEmail(email, code)
    } catch (e) {
      console.error('OTP email send error:', e)
      return NextResponse.json(
        { error: 'We could not send the verification email. Please double-check the address and try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('OTP route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
