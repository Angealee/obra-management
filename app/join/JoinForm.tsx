'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, ArrowLeft, ArrowRight, Pencil } from 'lucide-react'

const POSITIONS = [
  { value: 'photographer',    label: 'Photographer' },
  { value: 'photo_editor',    label: 'Photo Editor' },
  { value: 'videographer',    label: 'Videographer' },
  { value: 'video_editor',    label: 'Video Editor' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'animator',        label: 'Animator' },
]

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  POSITIONS.map(p => [p.value, p.label])
)

const STEPS = ['Personal Info', 'Positions', 'About You', 'Review']

const STEP_FIELDS: Record<number, string[]> = {
  1: ['full_name', 'email', 'contact_number', 'year_level', 'course_section'],
  3: ['motivation', 'portfolio_url'],
}

const DRAFT_KEY = 'obra-join-draft'

const INITIAL_FORM = {
  full_name: '',
  email: '',
  contact_number: '',
  year_level: '',
  course_section: '',
  positions: [] as string[],
  motivation: '',
  portfolio_url: '',
}

type FormState = typeof INITIAL_FORM

function validateField(name: string, value: string): string | null {
  switch (name) {
    case 'full_name': {
      const v = value.trim()
      if (!v) return 'Full name is required.'
      if (v.length < 2 || !/[A-Za-z]/.test(v)) return 'Please enter your full name.'
      return null
    }
    case 'email': {
      const v = value.trim()
      if (!v) return 'Email address is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.'
      return null
    }
    case 'contact_number': {
      const v = value.replace(/[\s-]/g, '')
      if (!v) return 'Contact number is required.'
      if (!/^(09\d{9}|\+639\d{9})$/.test(v)) return 'Enter a valid PH mobile number (e.g. 09171234567).'
      return null
    }
    case 'year_level':
      if (!value) return 'Please select your year level.'
      return null
    case 'course_section': {
      const v = value.trim()
      if (!v) return 'Course & section is required.'
      if (v.length < 4 || !/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) {
        return 'Enter your actual course & section (e.g. BSIT 2-A).'
      }
      return null
    }
    case 'motivation': {
      const v = value.trim()
      if (!v) return 'Please tell us why you want to join Obra.'
      if (v.length < 20) return 'Please provide a bit more detail (at least 20 characters).'
      return null
    }
    case 'portfolio_url': {
      const v = value.trim()
      if (!v) return 'Please provide a link to your portfolio or sample work.'
      if (!/\./.test(v)) return 'Enter a valid link (e.g. https://drive.google.com/...).'
      const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`
      try { new URL(withProtocol) } catch { return 'Enter a valid link (e.g. https://drive.google.com/...).' }
      return null
    }
    default:
      return null
  }
}

export default function JoinForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched]         = useState<Record<string, boolean>>({})
  const [draftRestored, setDraftRestored] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) { setStep(s); return }
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setSubmitted(true)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    const confettiColors = ['#CC0000', '#111111', '#ca8a04', '#16a34a', '#3b82f6']
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center step-content">
        <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${8 + (i * 7) % 84}%`,
                width: 6,
                height: 6,
                background: confettiColors[i % confettiColors.length],
                animationDelay: `${(i % 6) * 0.06}s`,
              }}
            />
          ))}
          <CheckCircle size={30} className="success-check text-green-600" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#111]">Application Submitted!</h3>
        <p className="max-w-xs text-sm leading-relaxed text-[#666]">
          Thank you for your interest in joining Obra Creative Media Productions.
          We'll review your application and get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── DRAFT RESTORED NOTICE ── */}
      {draftRestored && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[0.06] px-4 py-2.5" style={{ background: '#FAFAF9' }}>
          <span className="text-[12.5px]" style={{ color: '#666' }}>We restored your previous draft.</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDraftRestored(false)}
              style={{ fontSize: 11.5, fontWeight: 500, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Dismiss
            </button>
            <button type="button" onClick={startOver}
              style={{ fontSize: 11.5, fontWeight: 500, color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ── STEPPER ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Step {step} of {STEPS.length}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#CC0000' }}>
            {Math.round((step / STEPS.length) * 100)}%
          </span>
        </div>
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const num = i + 1
            const isDone   = num < step
            const isActive = num === step
            return (
              <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
                <div
                  className="step-dot"
                  data-active={isActive ? 'true' : undefined}
                  data-done={isDone ? 'true' : undefined}
                >
                  {isDone ? <CheckCircle size={14} /> : num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="step-line" data-done={isDone ? 'true' : undefined} />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex">
          {STEPS.map((label, i) => (
            <div
              key={label}
              style={{
                flex: i < STEPS.length - 1 ? 1 : 'initial',
                fontSize: 11,
                fontWeight: i + 1 === step ? 600 : 500,
                color: i + 1 === step ? '#111' : '#bbb',
                textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center',
                transition: 'color 0.2s ease',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── STEP 1: PERSONAL INFO ── */}
        {step === 1 && (
          <div key="step-1" className="step-content flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" required error={fieldError('full_name')}>
                <input className="obra-input" type="text" placeholder="e.g. Juan dela Cruz"
                  value={form.full_name} required
                  style={inputErrorStyle('full_name')}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  onBlur={e => handleBlur('full_name', e.target.value)} />
              </Field>
              <Field label="Email Address" required error={fieldError('email')}>
                <input className="obra-input" type="email" placeholder="your@email.com"
                  value={form.email} required
                  style={inputErrorStyle('email')}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  onBlur={e => handleBlur('email', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact Number" required error={fieldError('contact_number')}>
                <input className="obra-input" type="text" placeholder="09XXXXXXXXX"
                  value={form.contact_number} required
                  style={inputErrorStyle('contact_number')}
                  onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))}
                  onBlur={e => handleBlur('contact_number', e.target.value)} />
              </Field>
              <Field label="Year Level" required error={fieldError('year_level')}>
                <select className="obra-input" value={form.year_level} required
                  style={inputErrorStyle('year_level')}
                  onChange={e => setForm(p => ({ ...p, year_level: e.target.value }))}
                  onBlur={e => handleBlur('year_level', e.target.value)}>
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Course & Section" required error={fieldError('course_section')}>
              <input className="obra-input" type="text" placeholder="e.g. BSIT 2-A"
                value={form.course_section} required
                style={inputErrorStyle('course_section')}
                onChange={e => setForm(p => ({ ...p, course_section: e.target.value }))}
                onBlur={e => handleBlur('course_section', e.target.value)} />
              <p className="mt-1 text-[11.5px]" style={{ color: '#bbb' }}>
                Please provide your actual course & section — accurate information helps us
                verify your enrollment and process your application.
              </p>
            </Field>
          </div>
        )}

        {/* ── STEP 2: POSITIONS ── */}
        {step === 2 && (
          <div key="step-2" className="step-content flex flex-col gap-3">
            <label className="obra-label">
              Position(s) Applying For <span className="text-[#CC0000]">*</span>
            </label>
            <p className="text-[12.5px] text-[#999]" style={{ marginTop: -4 }}>
              You may select more than one role.
            </p>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((pos, i) => {
                const selected = form.positions.includes(pos.value)
                return (
                  <button key={pos.value} type="button" onClick={() => togglePosition(pos.value)}
                    className="position-chip"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    data-selected={selected ? 'true' : undefined}>
                    {pos.label}
                  </button>
                )
              })}
            </div>
            {form.positions.length === 0 && (
              <p className="text-[11.5px] text-[#aaa]">Select at least one position</p>
            )}
          </div>
        )}

        {/* ── STEP 3: ABOUT YOU ── */}
        {step === 3 && (
          <div key="step-3" className="step-content flex flex-col gap-5">
            <Field label="Why do you want to join Obra?" required error={fieldError('motivation')}>
              <textarea className="obra-input"
                placeholder="Tell us about yourself, your passion for creative work, and why you want to be part of Obra..."
                value={form.motivation} required rows={5}
                style={{ resize: 'vertical', minHeight: 120, ...inputErrorStyle('motivation') }}
                onChange={e => setForm(p => ({ ...p, motivation: e.target.value }))}
                onBlur={e => handleBlur('motivation', e.target.value)} />
              <p className="mt-1 text-[11.5px] text-[#bbb]">{form.motivation.length} characters</p>
            </Field>

            <Field label="Portfolio Link" required error={fieldError('portfolio_url')}>
              <input className="obra-input" type="url"
                placeholder="https://drive.google.com/... or behance.net/..."
                value={form.portfolio_url} required
                style={inputErrorStyle('portfolio_url')}
                onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))}
                onBlur={e => handleBlur('portfolio_url', e.target.value)} />
              <p className="mt-1 text-[11.5px] text-[#bbb]">
                Google Drive, Behance, or any public link to your work
              </p>
            </Field>
          </div>
        )}

        {/* ── STEP 4: REVIEW ── */}
        {step === 4 && (
          <div key="step-4" className="step-content flex flex-col gap-4">
            <p className="text-[13px] text-[#888]">
              Please review your application before submitting.
            </p>

            <ReviewSection title="Personal Info" onEdit={() => jumpTo(1)}>
              <ReviewRow label="Full Name" value={form.full_name} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Contact Number" value={form.contact_number} />
              <ReviewRow label="Year Level" value={form.year_level} />
              <ReviewRow label="Course & Section" value={form.course_section} />
            </ReviewSection>

            <ReviewSection title="Positions" onEdit={() => jumpTo(2)}>
              <ReviewRow
                label="Applying For"
                value={form.positions.map(p => POSITION_LABELS[p]).join(', ') || '—'}
              />
            </ReviewSection>

            <ReviewSection title="About You" onEdit={() => jumpTo(3)}>
              <ReviewRow label="Motivation" value={form.motivation || '—'} multiline />
              <ReviewRow label="Portfolio" value={form.portfolio_url || '—'} />
            </ReviewSection>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 step-content">
            {error}
          </div>
        )}

        {/* ── NAVIGATION ── */}
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack}
              className="btn-secondary justify-center py-3 text-[14px]"
              style={{ flex: '0 0 auto' }}>
              <ArrowLeft size={15} /> Back
            </button>
          )}

          {step < STEPS.length && (
            <button type="button" onClick={goNext}
              className="btn-primary flex-1 justify-center py-3 text-[14px]">
              Continue <ArrowRight size={15} />
            </button>
          )}

          {step === STEPS.length && (
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 justify-center py-3 text-[14px]"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Submitting…' : 'Submit Application →'}
            </button>
          )}
        </div>

        <p className="text-center text-[11.5px] text-[#ccc]">
          For internal use by CCS — Obra Creative Media Productions
        </p>
      </form>
    </div>
  )
}

function ReviewSection({ title, onEdit, children }: {
  title: string; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 10,
        padding: '14px 16px',
        background: '#FAFAF9',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
        <button type="button" onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11.5, fontWeight: 500, color: '#CC0000',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
          <Pencil size={11} /> Edit
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

function ReviewRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? '' : 'flex items-baseline justify-between gap-3'}>
      <span style={{ fontSize: 11.5, color: '#aaa', whiteSpace: 'nowrap' }}>{label}</span>
      <p style={{
        margin: multiline ? '2px 0 0' : 0,
        fontSize: 13, color: '#222', lineHeight: 1.5,
        textAlign: multiline ? 'left' : 'right',
        wordBreak: 'break-word',
      }}>
        {value}
      </p>
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="obra-label">
        {label} {required && <span className="text-[#CC0000]">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11.5px]" style={{ color: '#CC0000', marginTop: 2 }}>
          {error}
        </p>
      )}
    </div>
  )
}
