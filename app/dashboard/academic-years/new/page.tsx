'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewAcademicYearPage() {
  const router = useRouter()
  const supabase = createClient()

  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    // Basic validation
    if (!label.trim()) {
      setError('Label is required. Example: A.Y. 2026-2027')
      return
    }
    if (!startDate || !endDate) {
      setError('Both start and end dates are required.')
      return
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date.')
      return
    }

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase
      .from('academic_years')
      .insert({
        label: label.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: false, // Always starts inactive — must be explicitly activated
      })

    if (insertError) {
      // Unique constraint error means label already exists
      if (insertError.message.includes('unique')) {
        setError('An academic year with this label already exists.')
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    // Success — go back to the list
    router.push('/dashboard/academic-years')
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/dashboard/academic-years"
          style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}
        >
          ← Back to Academic Years
        </Link>
        <h1 className="page-title">Add Academic Year</h1>
        <p className="page-subtitle">Create a new academic year. You can activate it after creation.</p>
      </div>

      {/* Form */}
      <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="obra-label">
            Label <span style={{ color: '#CC0000' }}>*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="A.Y. 2026-2027"
            className="obra-input"
          />
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>Use the format: A.Y. 2026-2027</p>
        </div>

        <div>
          <label className="obra-label">
            Start Date <span style={{ color: '#CC0000' }}>*</span>
          </label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="obra-input" />
        </div>

        <div>
          <label className="obra-label">
            End Date <span style={{ color: '#CC0000' }}>*</span>
          </label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="obra-input" />
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Academic Year'}
          </button>
          <Link href="/dashboard/academic-years" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}