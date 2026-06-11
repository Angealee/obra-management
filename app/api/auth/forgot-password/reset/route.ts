import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { hashOtpCode } from '@/lib/otp'

const MAX_OTP_ATTEMPTS = 5
const GENERIC_INVALID = 'Invalid or expired code. Please request a new one.'

type ProfileRow = { id: string; email: string; is_active: boolean; member_status: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body?.identifier ?? '').trim()
    const code = String(body?.code ?? '').trim()
    const newPassword = String(body?.newPassword ?? '')
    const honeypot = String(body?.website ?? '')

    if (honeypot) return NextResponse.json({ success: true })

    if (!identifier || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipLimit = await checkRateLimit(`pwreset_verify_ip:${ip}`, 10, 15 * 60)
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const lookupColumn = identifier.includes('@') ? 'email' : 'username'
    const lookupValue = identifier.toLowerCase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, is_active, member_status')
      .eq(lookupColumn, lookupValue)
      .maybeSingle<ProfileRow>()

    if (!profile || profile.is_active === false || profile.member_status === 'archived') {
      return NextResponse.json({ error: GENERIC_INVALID }, { status: 400 })
    }

    const { data: otp } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('user_id', profile.id)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json({ error: GENERIC_INVALID }, { status: 400 })
    }
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: GENERIC_INVALID }, { status: 400 })
    }
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await supabase.from('password_reset_otps').update({ consumed: true }).eq('id', otp.id)
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 })
    }
    if (hashOtpCode(code) !== otp.code_hash) {
      await supabase
        .from('password_reset_otps')
        .update({ attempts: otp.attempts + 1 })
        .eq('id', otp.id)
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Correct code — consume it so it can't be replayed.
    await supabase.from('password_reset_otps').update({ consumed: true }).eq('id', otp.id)

    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    })
    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot-password reset error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
