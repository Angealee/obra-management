'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'

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

export default function JoinForm() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact_number: '',
    year_level: '',
    course_section: '',
    positions: [] as string[],
    motivation: '',
    portfolio_url: '',
  })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Sidebar / preview state
  const [hasDirty, setHasDirty]         = useState(false)   // has the user started typing?
  const [previewOpen, setPreviewOpen]   = useState(false)   // desktop floating panel
  const [sheetOpen, setSheetOpen]       = useState(false)   // mobile bottom sheet
  const formRef = useRef<HTMLDivElement>(null)

  // Mark dirty on any field change
  useEffect(() => {
    const hasContent =
      form.full_name || form.email || form.motivation || form.positions.length > 0
    if (hasContent && !hasDirty) {
      setHasDirty(true)
    }
  }, [form, hasDirty])

  function togglePosition(value: string) {
    setForm(prev => ({
      ...prev,
      positions: prev.positions.includes(value)
        ? prev.positions.filter(p => p !== value)
        : [...prev.positions, value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.positions.length === 0) {
      setError('Please select at least one position you are applying for.')
      return
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
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={30} className="text-green-600" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#111]">Application Submitted!</h3>
        <p className="max-w-xs text-sm leading-relaxed text-[#666]">
          Thank you for your interest in joining Obra Creative Media Productions.
          We'll review your application and get back to you soon.
        </p>
      </div>
    )
  }

  const previewName      = form.full_name   || '—'
  const previewEmail     = form.email       || '—'
  const previewYear      = form.year_level  || '—'
  const previewSection   = form.course_section || '—'
  const previewPositions = form.positions.length
    ? form.positions.map(p => POSITION_LABELS[p]).join(', ')
    : '—'
  const previewMotivation = form.motivation
    ? form.motivation.slice(0, 120) + (form.motivation.length > 120 ? '…' : '')
    : '—'

  return (
    // Outer wrapper — position relative so floating panel can anchor to it
    <div ref={formRef} style={{ position: 'relative' }}>

      {/* ── DESKTOP: floating preview panel ── */}
      {hasDirty && (
        <>
          {/* Toggle tab — sticks to the left edge of the form card */}
          <button
            type="button"
            aria-label={previewOpen ? 'Close preview' : 'Open preview'}
            onClick={() => setPreviewOpen(v => !v)}
            style={{
              position: 'absolute',
              left: previewOpen ? -256 : -36,
              top: 32,
              width: 36,
              height: 72,
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '8px 0 0 8px',
              cursor: 'pointer',
              display: 'none',   // shown via CSS below
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 10,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              transition: 'left 0.25s ease',
              zIndex: 20,
            }}
            className="obra-preview-tab"
          >
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10 }}>
              {previewOpen ? 'Close' : 'Preview'}
            </span>
          </button>

          {/* Floating panel */}
          <div
            role="complementary"
            aria-label="Application preview"
            style={{
              position: 'absolute',
              right: 'calc(100% + 0px)',
              top: 0,
              width: 240,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              padding: '16px',
              display: 'none',  // shown via CSS
              flexDirection: 'column',
              gap: 12,
              fontSize: 12,
              zIndex: 20,
              pointerEvents: previewOpen ? 'all' : 'none',
              opacity: previewOpen ? 1 : 0,
              transform: previewOpen ? 'translateX(0)' : 'translateX(12px)',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
            }}
            className="obra-preview-panel"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999' }}>
                Preview
              </span>
              <span style={{
                background: '#CC0000', color: '#fff',
                fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
              }}>
                Draft
              </span>
            </div>

            <PreviewRow label="Name"      value={previewName} />
            <PreviewRow label="Email"     value={previewEmail} />
            <PreviewRow label="Year"      value={previewYear} />
            <PreviewRow label="Section"   value={previewSection} />
            <PreviewRow label="Roles"     value={previewPositions} />

            {form.motivation && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Motivation
                </span>
                <p style={{ margin: '4px 0 0', color: '#444', lineHeight: 1.5, fontSize: 11 }}>
                  {previewMotivation}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MOBILE: bottom sheet preview ── */}
      {hasDirty && (
        <div
          className="obra-bottom-sheet"
          style={{
            position: 'fixed',
            bottom: sheetOpen ? 0 : -180,
            left: 0, right: 0,
            height: 180,
            background: '#fff',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
            zIndex: 50,
            transition: 'bottom 0.3s ease',
            padding: '12px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* drag handle */}
          <button
            type="button"
            onClick={() => setSheetOpen(v => !v)}
            aria-label={sheetOpen ? 'Collapse preview' : 'Expand preview'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 0 4px',
            }}
          >
            <div style={{ width: 36, height: 3, borderRadius: 9999, background: '#ddd' }} />
          </button>

          <div style={{ display: 'flex', gap: 16, overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your Application
              </span>
              <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {previewName}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#777' }}>{previewYear} · {previewSection}</p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Roles</span>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewPositions}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {previewMotivation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS to show desktop-only elements ── */}
      <style>{`
        @media (min-width: 1024px) {
          .obra-preview-tab  { display: flex !important; }
          .obra-preview-panel { display: flex !important; }
          .obra-bottom-sheet { display: none !important; }
        }
        @media (max-width: 1023px) {
          .obra-preview-tab   { display: none !important; }
          .obra-preview-panel { display: none !important; }
        }
      `}</style>

      {/* ── THE FORM ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Full Name + Email */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <input className="obra-input" type="text" placeholder="e.g. Juan dela Cruz"
              value={form.full_name} required
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </Field>
          <Field label="Email Address" required>
            <input className="obra-input" type="email" placeholder="your@email.com"
              value={form.email} required
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </Field>
        </div>

        {/* Contact + Year Level */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact Number" required>
            <input className="obra-input" type="text" placeholder="09XXXXXXXXX"
              value={form.contact_number} required
              onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))} />
          </Field>
          <Field label="Year Level" required>
            <select className="obra-input" value={form.year_level} required
              onChange={e => setForm(p => ({ ...p, year_level: e.target.value }))}>
              <option value="">Select year level</option>
              {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>

        {/* Course & Section */}
        <Field label="Course & Section" required>
          <input className="obra-input" type="text" placeholder="e.g. BSIT 2-A"
            value={form.course_section} required
            onChange={e => setForm(p => ({ ...p, course_section: e.target.value }))} />
        </Field>

        <div className="border-t border-black/[0.06]" />

        {/* Positions */}
        <div className="flex flex-col gap-3">
          <label className="obra-label">
            Position(s) Applying For <span className="text-[#CC0000]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(pos => {
              const selected = form.positions.includes(pos.value)
              return (
                <button key={pos.value} type="button" onClick={() => togglePosition(pos.value)}
                  className="position-chip"
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

        <div className="border-t border-black/[0.06]" />

        {/* Motivation */}
        <Field label="Why do you want to join Obra?" required>
          <textarea className="obra-input"
            placeholder="Tell us about yourself, your passion for creative work, and why you want to be part of Obra..."
            value={form.motivation} required rows={5}
            style={{ resize: 'vertical', minHeight: 120 }}
            onChange={e => setForm(p => ({ ...p, motivation: e.target.value }))} />
          <p className="mt-1 text-[11.5px] text-[#bbb]">{form.motivation.length} characters</p>
        </Field>

        {/* Portfolio */}
        <Field label="Portfolio Link">
          <input className="obra-input" type="url"
            placeholder="https://drive.google.com/... or behance.net/..."
            value={form.portfolio_url}
            onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} />
          <p className="mt-1 text-[11.5px] text-[#bbb]">
            Google Drive, Behance, or any public link to your work
          </p>
        </Field>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-primary mt-1 w-full justify-center py-3 text-[14px]"
          style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Submitting…' : 'Submit Application →'}
        </button>

        <p className="text-center text-[11.5px] text-[#ccc]">
          For internal use by CCS — Obra Creative Media Productions
        </p>
      </form>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <p style={{ margin: '2px 0 0', color: '#222', fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {value}
      </p>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="obra-label">
        {label} {required && <span className="text-[#CC0000]">*</span>}
      </label>
      {children}
    </div>
  )
}