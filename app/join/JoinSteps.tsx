'use client'

import { CheckCircle, Pencil } from 'lucide-react'
import { POSITIONS, POSITION_LABELS, STEPS, YEAR_LEVELS } from './joinFormShared'
import type { JoinFormApi } from './useJoinForm'

// The four form steps + the small field/review primitives they share.
// Presentation-only: every piece of state and behavior comes from useJoinForm.

export function JoinStepper({ step }: { step: number }) {
  return (
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
  )
}

export function Field({ label, required, error, children }: {
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

export function StepPersonalInfo({ j }: { j: JoinFormApi }) {
  return (
    <div key="step-1" className="step-content flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" required error={j.fieldError('full_name')}>
          <input className="obra-input" type="text" placeholder="e.g. Juan dela Cruz"
            value={j.form.full_name} required
            style={j.inputErrorStyle('full_name')}
            onChange={e => j.setForm(p => ({ ...p, full_name: e.target.value }))}
            onBlur={e => j.handleBlur('full_name', e.target.value)} />
        </Field>
        <Field label="Email Address" required error={j.fieldError('email')}>
          <input className="obra-input" type="email" placeholder="your@email.com"
            value={j.form.email} required
            style={j.inputErrorStyle('email')}
            onChange={e => j.setForm(p => ({ ...p, email: e.target.value }))}
            onBlur={e => j.handleBlur('email', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contact Number" required error={j.fieldError('contact_number')}>
          <input className="obra-input" type="text" placeholder="09XXXXXXXXX"
            value={j.form.contact_number} required
            style={j.inputErrorStyle('contact_number')}
            onChange={e => j.setForm(p => ({ ...p, contact_number: e.target.value }))}
            onBlur={e => j.handleBlur('contact_number', e.target.value)} />
        </Field>
        <Field label="Year Level" required error={j.fieldError('year_level')}>
          <select className="obra-input" value={j.form.year_level} required
            style={j.inputErrorStyle('year_level')}
            onChange={e => j.setForm(p => ({ ...p, year_level: e.target.value }))}
            onBlur={e => j.handleBlur('year_level', e.target.value)}>
            <option value="">Select year level</option>
            {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Course & Section" required error={j.fieldError('course_section')}>
        <input className="obra-input" type="text" placeholder="e.g. BSIT 2-A"
          value={j.form.course_section} required
          style={j.inputErrorStyle('course_section')}
          onChange={e => j.setForm(p => ({ ...p, course_section: e.target.value }))}
          onBlur={e => j.handleBlur('course_section', e.target.value)} />
        <p className="mt-1 text-[11.5px]" style={{ color: '#bbb' }}>
          Please provide your actual course & section — accurate information helps us
          verify your enrollment and process your application.
        </p>
      </Field>
    </div>
  )
}

export function StepPositions({ j }: { j: JoinFormApi }) {
  return (
    <div key="step-2" className="step-content flex flex-col gap-3">
      <label className="obra-label">
        Position(s) Applying For <span className="text-[#CC0000]">*</span>
      </label>
      <p className="text-[12.5px] text-[#999]" style={{ marginTop: -4 }}>
        You may select more than one role.
      </p>
      <div className="flex flex-wrap gap-2">
        {POSITIONS.map((pos, i) => {
          const selected = j.form.positions.includes(pos.value)
          return (
            <button key={pos.value} type="button" onClick={() => j.togglePosition(pos.value)}
              className="position-chip"
              style={{ animationDelay: `${i * 0.05}s` }}
              data-selected={selected ? 'true' : undefined}>
              {pos.label}
            </button>
          )
        })}
      </div>
      {j.form.positions.length === 0 && (
        <p className="text-[11.5px] text-[#aaa]">Select at least one position</p>
      )}
    </div>
  )
}

export function StepAboutYou({ j }: { j: JoinFormApi }) {
  return (
    <div key="step-3" className="step-content flex flex-col gap-5">
      <Field label="Why do you want to join Obra?" required error={j.fieldError('motivation')}>
        <textarea className="obra-input"
          placeholder="Tell us about yourself, your passion for creative work, and why you want to be part of Obra..."
          value={j.form.motivation} required rows={5}
          style={{ resize: 'vertical', minHeight: 120, ...j.inputErrorStyle('motivation') }}
          onChange={e => j.setForm(p => ({ ...p, motivation: e.target.value }))}
          onBlur={e => j.handleBlur('motivation', e.target.value)} />
        <p className="mt-1 text-[11.5px] text-[#bbb]">{j.form.motivation.length} characters</p>
      </Field>

      <Field label="Portfolio Link" required error={j.fieldError('portfolio_url')}>
        <input className="obra-input" type="url"
          placeholder="https://drive.google.com/... or behance.net/..."
          value={j.form.portfolio_url} required
          style={j.inputErrorStyle('portfolio_url')}
          onChange={e => j.setForm(p => ({ ...p, portfolio_url: e.target.value }))}
          onBlur={e => j.handleBlur('portfolio_url', e.target.value)} />
        <p className="mt-1 text-[11.5px] text-[#bbb]">
          Google Drive, Canva link, or any public link to your work
        </p>
      </Field>
    </div>
  )
}

export function StepReview({ j }: { j: JoinFormApi }) {
  return (
    <div key="step-4" className="step-content flex flex-col gap-4">
      <p className="text-[13px] text-[#888]">
        Please review your application before submitting.
      </p>

      <ReviewSection title="Personal Info" onEdit={() => j.jumpTo(1)}>
        <ReviewRow label="Full Name" value={j.form.full_name} />
        <ReviewRow label="Email" value={j.form.email} />
        <ReviewRow label="Contact Number" value={j.form.contact_number} />
        <ReviewRow label="Year Level" value={j.form.year_level} />
        <ReviewRow label="Course & Section" value={j.form.course_section} />
      </ReviewSection>

      <ReviewSection title="Positions" onEdit={() => j.jumpTo(2)}>
        <ReviewRow
          label="Applying For"
          value={j.form.positions.map(p => POSITION_LABELS[p]).join(', ') || '—'}
        />
      </ReviewSection>

      <ReviewSection title="About You" onEdit={() => j.jumpTo(3)}>
        <ReviewRow label="Motivation" value={j.form.motivation || '—'} multiline />
        <ReviewRow label="Portfolio" value={j.form.portfolio_url || '—'} />
      </ReviewSection>
    </div>
  )
}
