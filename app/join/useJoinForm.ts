import { useEffect, useRef, useState } from 'react'
import { CONSENT_VERSION } from '@/lib/privacyPolicy'
import {
  DRAFT_KEY, INITIAL_FORM, STEPS, STEP_FIELDS,
  collectClientMeta, validateField, type FormState,
} from './joinFormShared'

// The full state machine of the /join form: multi-step fields + validation,
// localStorage draft, privacy-consent gate, OTP send/verify, submission.
// Extracted unchanged from JoinForm so the step components stay
// presentation-only.

export function useJoinForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched]         = useState<Record<string, boolean>>({})
  const [draftRestored, setDraftRestored] = useState(false)

  // Email verification (OTP). At final submit we send a code, then the
  // applicant enters it before the application is actually created.
  const [otpSent, setOtpSent]     = useState(false)
  const [code, setCode]           = useState('')
  const [otpError, setOtpError]   = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resendIn, setResendIn]   = useState(0)
  const [honeypot, setHoneypot]   = useState('')

  // Data Privacy Notice consent — collected in a modal before the OTP request
  // (the first time personal data leaves the browser). Required server-side.
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [consented, setConsented]     = useState(false)

  const isFirstRender = useRef(true)
  const skipSaveRef   = useRef(true)

  // Restore a saved draft on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.form) {
          setForm(prev => ({ ...prev, ...parsed.form }))
          setDraftRestored(true)
        }
        if (typeof parsed?.step === 'number' && parsed.step >= 1 && parsed.step <= STEPS.length) {
          setStep(parsed.step)
        }
      }
    } catch {}
  }, [])

  // Persist draft on every change (skip the very first run, before restore happens)
  useEffect(() => {
    if (skipSaveRef.current) { skipSaveRef.current = false; return }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }))
    } catch {}
  }, [form, step])

  // Scroll the form panel back to the top whenever the step changes
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    document.getElementById('join-scroll-panel')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Resend cooldown countdown
  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => setResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  function togglePosition(value: string) {
    setForm(prev => ({
      ...prev,
      positions: prev.positions.includes(value)
        ? prev.positions.filter(p => p !== value)
        : [...prev.positions, value],
    }))
  }

  function handleBlur(name: keyof FormState, value: string) {
    setTouched(prev => ({ ...prev, [name]: true }))
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) || '' }))
  }

  function fieldError(name: string) {
    return touched[name] ? fieldErrors[name] || undefined : undefined
  }

  function inputErrorStyle(name: string) {
    return fieldError(name) ? { borderColor: '#CC0000' } : undefined
  }

  function validateStep(target: number): boolean {
    const fields = STEP_FIELDS[target]

    if (fields) {
      const newErrors: Record<string, string> = {}
      const newTouched: Record<string, boolean> = {}
      fields.forEach(f => {
        const err = validateField(f, form[f as keyof FormState] as string)
        newTouched[f] = true
        if (err) newErrors[f] = err
      })
      setTouched(prev => ({ ...prev, ...newTouched }))
      setFieldErrors(prev => ({ ...prev, ...newErrors }))
      if (Object.keys(newErrors).length > 0) {
        setError('Please fix the highlighted fields before continuing.')
        return false
      }
    }

    if (target === 2 && form.positions.length === 0) {
      setError('Please select at least one position you are applying for.')
      return false
    }

    setError(null)
    return true
  }

  function goNext() {
    if (!validateStep(step)) return
    setStep(s => Math.min(s + 1, STEPS.length))
  }

  function goBack() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
  }

  function jumpTo(target: number) {
    setError(null)
    setStep(target)
  }

  function startOver() {
    setForm(INITIAL_FORM)
    setStep(1)
    setFieldErrors({})
    setTouched({})
    setError(null)
    setDraftRestored(false)
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  // Step 4 "Submit": validate everything, collect privacy consent, then send
  // a verification code.
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()

    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) { setStep(s); return }
    }
    if (form.positions.length === 0) {
      setStep(2); setError('Please select at least one position.'); return
    }

    // Consent gate — the OTP request below is the first time personal data
    // (the email) reaches the server, so the notice must come before it.
    if (!consented) {
      setShowPrivacy(true)
      return
    }

    await sendCode()
  }

  async function sendCode() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/applications/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, website: honeypot }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not send the verification code.'); return }
      setOtpSent(true)
      setCode('')
      setOtpError(null)
      setResendIn(60)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Verify the entered code and create the application.
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setOtpError('Enter the 6-digit code we emailed you.'); return }

    setVerifying(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          code,
          website: honeypot,
          client_meta: collectClientMeta(),
          consent: true, // gated by the privacy modal before the OTP was sent
          consent_version: CONSENT_VERSION,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error || 'Verification failed. Please try again.'); return }
      setSubmitted(true)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // Resend a fresh code (respects the cooldown).
  async function handleResend() {
    if (resendIn > 0) return
    setOtpError(null)
    try {
      const res = await fetch('/api/applications/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, website: honeypot }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error || 'Could not resend the code.'); return }
      setResendIn(60)
    } catch {
      setOtpError('Network error. Please try again.')
    }
  }

  return {
    // fields + steps
    form, setForm, step, togglePosition,
    handleBlur, fieldError, inputErrorStyle,
    goNext, goBack, jumpTo, startOver,
    error, loading, submitted,
    draftRestored, setDraftRestored,
    // OTP
    otpSent, setOtpSent, code, setCode, otpError, setOtpError,
    verifying, resendIn, honeypot, setHoneypot,
    handleSendCode, sendCode, handleVerify, handleResend,
    // privacy consent
    showPrivacy, setShowPrivacy, consented, setConsented,
  }
}

export type JoinFormApi = ReturnType<typeof useJoinForm>
