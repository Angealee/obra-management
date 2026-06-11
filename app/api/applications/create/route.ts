import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { validateApplication } from '@/lib/applicationValidation'
import { hashOtpCode } from '@/lib/otp'

// This endpoint is now the ONLY way to create a member application.
// Anonymous INSERT on member_applications is revoked at the DB level
// (see db/2026-security-hardening.sql), so we insert with the service-role
// client AFTER: honeypot → rate-limit → field validation → OTP verification →
// duplicate re-check.

const ACTIVE_STATUSES = ['pending', 'shortlisted', 'interviewed', 'approved']
const MAX_OTP_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Honeypot — pretend success without inserting.
    if (String(body?.website ?? '')) {
      return NextResponse.json({ success: true })
    }

    const ip = getClientIp(req)
    const limit = await checkRateLimit(`submit_ip:${ip}`, 8, 15 * 60)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again in a few minutes.' },
        { status: 429 },
      )
    }

    // Authoritative server-side validation of every field.
    const result = validateApplication(body)
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error ?? 'Invalid submission.' }, { status: 400 })
    }
    const data = result.data

    const code = String(body?.code ?? '').trim()
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit verification code.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Newest unconsumed code for this email.
    const { data: otp } = await supabase
      .from('application_otps')
      .select('*')
      .eq('email', data.email)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json(
        { error: 'No active verification found. Please request a new code.' },
        { status: 400 },
      )
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Your code has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await supabase.from('application_otps').update({ consumed: true }).eq('id', otp.id)
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 },
      )
    }

    if (hashOtpCode(code) !== otp.code_hash) {
      await supabase
        .from('application_otps')
        .update({ attempts: otp.attempts + 1 })
        .eq('id', otp.id)
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Correct code — consume it so it can't be replayed.
    await supabase.from('application_otps').update({ consumed: true }).eq('id', otp.id)

    // Duplicate re-check (covers the race between OTP send and submit).
    const { data: existing } = await supabase
      .from('member_applications')
      .select('id')
      .eq('email', data.email)
      .in('status', ACTIVE_STATUSES)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists.' },
        { status: 409 },
      )
    }

    const { data: activeAY } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    const { error } = await supabase.from('member_applications').insert({
      ...data,
      academic_year_id: activeAY?.id ?? null,
      status: 'pending',
    })

    if (error) {
      console.error('Application insert error:', error)
      return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Create route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
