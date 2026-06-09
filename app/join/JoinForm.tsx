'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

const POSITIONS = [
  { value: 'photographer', label: 'Photographer' },
  { value: 'photo_editor', label: 'Photo Editor' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'video_editor', label: 'Video Editor' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'animator', label: 'Animator' },
]

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

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
      const res = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 16,
          padding: '48px 40px',
          textAlign: 'center',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'DM Sans', fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 }}>
          Application Submitted!
        </h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 15, color: '#666', lineHeight: 1.6 }}>
          Thank you for your interest in joining Obra Creative Media Productions.
          We'll review your application and get back to you.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row: Full Name + Email */}
      <div className="flex gap-4">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="obra-label">Full Name *</label>
          <input
            className="obra-input"
            type="text"
            placeholder="e.g. Juan dela Cruz"
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            required
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="obra-label">Email Address *</label>
          <input
            className="obra-input"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Row: Contact + Year Level */}
      <div className="flex gap-4">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="obra-label">Contact Number *</label>
          <input
            className="obra-input"
            type="text"
            placeholder="09XXXXXXXXX"
            value={form.contact_number}
            onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))}
            required
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="obra-label">Year Level *</label>
          <select
            className="obra-input"
            value={form.year_level}
            onChange={e => setForm(p => ({ ...p, year_level: e.target.value }))}
            required
          >
            <option value="">Select year level</option>
            {YEAR_LEVELS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Course & Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="obra-label">Course & Section *</label>
        <input
          className="obra-input"
          type="text"
          placeholder="e.g. BSIT 2-A"
          value={form.course_section}
          onChange={e => setForm(p => ({ ...p, course_section: e.target.value }))}
          required
        />
      </div>

      {/* Positions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="obra-label">Position(s) Applying For *</label>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map(pos => {
            const selected = form.positions.includes(pos.value)
            return (
              <button
                key={pos.value}
                type="button"
                onClick={() => togglePosition(pos.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: selected ? '1.5px solid #CC0000' : '1.5px solid rgba(0,0,0,0.15)',
                  background: selected ? '#CC0000' : '#fff',
                  color: selected ? '#fff' : '#444',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {pos.label}
              </button>
            )
          })}
        </div>
        {form.positions.length === 0 && (
          <p style={{ fontSize: 12, color: '#999', fontFamily: 'DM Sans' }}>Select at least one</p>
        )}
      </div>

      {/* Motivation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="obra-label">Why do you want to join Obra? *</label>
        <textarea
          className="obra-input"
          placeholder="Tell us about yourself, your passion for creative work, and why you want to be part of Obra..."
          value={form.motivation}
          onChange={e => setForm(p => ({ ...p, motivation: e.target.value }))}
          rows={5}
          required
          style={{ resize: 'vertical', minHeight: 120 }}
        />
        <p style={{ fontSize: 12, color: '#999', fontFamily: 'DM Sans' }}>
          {form.motivation.length} characters
        </p>
      </div>

      {/* Portfolio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="obra-label">Portfolio Link <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span></label>
        <input
          className="obra-input"
          type="url"
          placeholder="https://drive.google.com/... or behance.net/..."
          value={form.portfolio_url}
          onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))}
        />
        <p style={{ fontSize: 12, color: '#999', fontFamily: 'DM Sans' }}>
          Google Drive, Behance, or any public link to your work
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '12px 16px',
          color: '#dc2626',
          fontFamily: 'DM Sans',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ marginTop: 4, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}