import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendOtpEmail } from '@/lib/email'
import { assessEmail } from '@/lib/emailSecurity'
import { isRequestBlocked } from '@/lib/applicationBlocks'
import { generateOtpCode, hashOtpCode } from '@/lib/otp'

// Node runtime required (Nodemailer). This is the default for route handlers —
// do not switch to the edge runtime.

const OTP_TTL_MIN = 10
const ACTIVE_STATUSES = ['pending', 'shortlisted', 'interviewed', 'approved']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawEmail = String(body?.email ?? '')
    const honeypot = String(body?.website ?? '')

    // Honeypot — a real user never fills this hidden field. Pretend success
    // so bots can't tell they were caught; do nothing.
    if (honeypot) return NextResponse.json({ success: true })

    // Trust gate: disposable / non-allowlisted / invalid addresses are refused
    // BEFORE any code is sent. This is the layer the perpetrator's temp-mail
    // was slipping past (OTP alone only proves inbox access).
    const assessment = await assessEmail(rawEmail)
    if (!assessment.ok) {
      return NextResponse.json({ error: assessment.message ?? 'Enter a valid email address.' }, { status: 400 })
    }
    const { normalized: email, canonical, domain } = assessment

    const ip = getClientIp(req)

    // Manual block list — banned IP / email / domain. Stealth: behave like a
    // success and send nothing, so a blocked perpetrator keeps using the same
    // identifiers (which keeps building the forensic trail) instead of adapting.
    if (await isRequestBlocked({ ip, email, canonical, domain })) {
      return NextResponse.json({ success: true })
    }

    // Per-IP cap (blocks scripted floods from one source)…
    const ipLimit = await checkRateLimit(`otp_send_ip:${ip}`, 6, 15 * 60)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429 },
      )
    }
    // …and per-CANONICAL-email cap (so +tag / dot aliases of one inbox share the
    // same limit and can't be used to email-bomb or to farm many applications).
    const emailLimit = await checkRateLimit(`otp_send_email:${canonical}`, 3, 10 * 60)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many codes sent to this email. Please wait a few minutes.' },
        { status: 429 },
      )
    }

    const supabase = createAdminClient()

    // Don't even send a code if an application already exists for this inbox —
    // checked against BOTH the raw email and its canonical form.
    const { data: existing } = await supabase
      .from('member_applications')
      .select('id')
      .or(`email.eq.${email},canonical_email.eq.${canonical}`)
      .in('status', ACTIVE_STATUSES)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists. Please contact the Obra team if you need help.' },
        { status: 409 },
      )
    }

    const code = generateOtpCode()
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()

    // Invalidate any prior unconsumed codes for this email.
    await supabase
      .from('application_otps')
      .update({ consumed: true })
      .eq('email', email)
      .eq('consumed', false)

    const { error: insErr } = await supabase.from('application_otps').insert({
      email,
      code_hash: hashOtpCode(code),
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
