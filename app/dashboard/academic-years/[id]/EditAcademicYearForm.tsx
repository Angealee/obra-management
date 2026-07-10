'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AcademicYear } from '@/types/database'

export default function EditAcademicYearForm({ academicYear }: { academicYear: AcademicYear }) {
  const router = useRouter()
  const supabase = createClient()

  const [label, setLabel] = useState(academicYear.label)
  const [startDate, setStartDate] = useState(academicYear.start_date)
  const [endDate, setEndDate] = useState(academicYear.end_date)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  async function handleUpdate() {
    if (!label.trim()) {
      setError('Label is required.')
      return
    }
    if (!startDate || !endDate) {
      setError('Both dates are required.')
      return
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('academic_years')
      .update({
        label: label.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      .eq('id', academicYear.id)

    if (updateError) {
      if (updateError.message.includes('unique')) {
        setError('An academic year with this label already exists.')
      } else {
        setError(updateError.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="dash-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p className="section-label">Edit Details</p>
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            setError('')
            setSuccess(false)
            // Reset fields if closing
            if (isOpen) {
              setLabel(academicYear.label)
              setStartDate(academicYear.start_date)
              setEndDate(academicYear.end_date)
            }
          }}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '4px 12px' }}
        >
          {isOpen ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
        Correct the label or dates if they were entered incorrectly.
      </p>

      {isOpen && (
        <div className="panel-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          {success && <p style={{ color: '#16a34a', fontSize: '13px', margin: 0 }}>✓ Academic year updated successfully.</p>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
            <button onClick={handleUpdate} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setIsOpen(false)
                setLabel(academicYear.label)
                setStartDate(academicYear.start_date)
                setEndDate(academicYear.end_date)
                setError('')
                setSuccess(false)
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}