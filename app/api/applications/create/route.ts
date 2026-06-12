import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { validateApplication } from '@/lib/applicationValidation'
import { assessEmail } from '@/lib/emailSecurity'
import { isRequestBlocked } from '@/lib/applicationBlocks'
import { hashOtpCode } from '@/lib/otp'

// This endpoint is now the ONLY way to create a member application.
// Anonymous INSERT on member_applications is revoked at the DB level
// (see db/2026-security-hardening.sql), so we insert with the service-role
// client AFTER: honeypot → rate-limit → field validation → email trust gate →
// block list → OTP verification → duplicate re-check, and we record forensics.

const ACTIVE_STATUSES = ['pending', 'shortlisted', 'interviewed', 'approved']
const MAX_OTP_ATTEMPTS = 5

const str = (v: unknown, max: number) =>
  v == null ? undefined : String(v).slice(0, max)
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined)

// Pull only known fields out of the attacker-controlled client_meta blob, with
// hard caps, so nothing oversized or unexpected lands in the DB / admin UI.
function sanitizeClientMeta(cm: any) {
  if (!cm || typeof cm !== 'object') return {}
  return {
    ua: str(cm.ua, 600),
    lang: str(cm.lang, 40),
    langs: Array.isArray(cm.langs) ? cm.langs.slice(0, 10).map((x: unknown) => str(x, 40)) : undefined,
    platform: str(cm.platform, 80),
    tz: str(cm.tz, 80),
    screen:
      cm.screen && typeof cm.screen === 'object'
        ? { w: num(cm.screen.w), h: num(cm.screen.h), dpr: num(cm.screen.dpr) }
        : undefined,
    cores: num(cm.cores),
    mem: num(cm.mem),
  }
}

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

    // Email trust gate (defense in depth — also enforced at OTP-send).
    const assessment = await assessEmail(data.email)
    if (!assessment.ok) {
      return NextResponse.json({ error: assessment.message ?? 'Enter a valid email address.' }, { status: 400 })
    }
    const canonical = assessment.canonical
    const domain = assessment.domain

    // Block list (stealth): banned identifiers get a fake success, no insert.
    if (await isRequestBlocked({ ip, email: data.email, canonical, domain })) {
      return NextResponse.json({ success: true })
    }

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

    // Duplicate re-check on raw + canonical (covers the OTP-send→submit race and
    // alias variations of the same inbox).
    const { data: existing } = await supabase
      .from('member_applications')
      .select('id')
      .or(`email.eq.${data.email},canonical_email.eq.${canonical}`)
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

    // ── Forensics: who/where this submission came from ──
    const userAgent = req.headers.get('user-agent')
    const acceptLanguage = req.headers.get('accept-language')
    const clientMeta = sanitizeClientMeta(body?.client_meta)
    const deviceBasis = JSON.stringify({
      ua: userAgent, al: acceptLanguage, tz: clientMeta.tz, lang: clientMeta.lang,
      plat: clientMeta.platform, scr: clientMeta.screen, cores: clientMeta.cores, mem: clientMeta.mem,
    })
    const device_hash = crypto.createHash('sha256').update(deviceBasis).digest('hex').slice(0, 32)

    const submit_meta = {
      accept_language: str(acceptLanguage, 200) ?? null,
      device_hash,
      client: clientMeta,
    }

    const { error } = await supabase.from('member_applications').insert({
      ...data,
      academic_year_id: activeAY?.id ?? null,
      status: 'pending',
      submit_ip: ip,
      user_agent: str(userAgent, 1000) ?? null,
      canonical_email: canonical,
      submit_meta,
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
