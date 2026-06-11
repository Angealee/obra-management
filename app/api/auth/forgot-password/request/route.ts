import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { generateOtpCode, hashOtpCode } from '@/lib/otp'
import { sendPasswordResetEmail } from '@/lib/email'

// Node runtime required (Nodemailer).

const OTP_TTL_MIN = 10

// Always the same response, whether or not the account exists/is active —
// prevents enumerating valid emails/usernames via this endpoint.
const GENERIC_MESSAGE = 'If an account with that email or username exists, a verification code has been sent.'
const genericResponse = () => NextResponse.json({ success: true, message: GENERIC_MESSAGE })

type ProfileRow = { id: string; email: string; is_active: boolean; member_status: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body?.identifier ?? '').trim()
    const honeypot = String(body?.website ?? '')

    // Honeypot — pretend success without doing anything.
    if (honeypot) return genericResponse()

    if (!identifier) {
      return NextResponse.json({ error: 'Enter your email or username.' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipLimit = await checkRateLimit(`pwreset_send_ip:${ip}`, 6, 15 * 60)
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const lookupColumn = identifier.includes('@') ? 'email' : 'username'
    const lookupValue = identifier.toLowerCase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, is_active, member_status')
      .eq(lookupColumn, lookupValue)
      .maybeSingle<ProfileRow>()

    // Unknown, inactive, or archived accounts — say nothing, do nothing.
    if (!profile || profile.is_active === false || profile.member_status === 'archived') {
      return genericResponse()
    }

    const emailLimit = await checkRateLimit(`pwreset_send_email:${profile.email}`, 3, 10 * 60)
    if (!emailLimit.allowed) {
      // Still generic — don't reveal that the account exists via rate-limit timing.
      return genericResponse()
    }

    const code = generateOtpCode()
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()

    await supabase
      .from('password_reset_otps')
      .update({ consumed: true })
      .eq('user_id', profile.id)
      .eq('consumed', false)

    const { error: insErr } = await supabase.from('password_reset_otps').insert({
      user_id: profile.id,
      email: profile.email,
      code_hash: hashOtpCode(code),
      expires_at,
    })
    if (insErr) {
      console.error('Password reset OTP insert error:', insErr)
      return genericResponse()
    }

    try {
      await sendPasswordResetEmail(profile.email, code)
    } catch (e) {
      console.error('Password reset email send error:', e)
    }

    return genericResponse()
  } catch (err) {
    console.error('Forgot-password request error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
