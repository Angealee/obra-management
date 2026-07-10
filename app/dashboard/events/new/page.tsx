'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { AcademicYear } from '@/types/database'
import BackLink from '@/components/BackLink'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load academic years and auto-select the active one
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })

      if (data) {
        setAcademicYears(data)
        const active = data.find(ay => ay.is_active)
        if (active) setAcademicYearId(active.id)
      }
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!title.trim()) return setError('Event title is required.')
    if (!eventDate) return setError('Event date is required.')
    if (!academicYearId) return setError('Please select an academic year.')

    setLoading(true)
    setError('')

    // Server route: dup-checks + inserts under this user's RLS AND pushes to
    // the year's roster in-process — delivery no longer depends on this
    // browser staying open.
    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          eventDate,
          eventTime,
          location: location.trim(),
          academicYearId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create event.'); setLoading(false); return }
    } catch {
      setError('Network error — event not created.')
      setLoading(false)
      return
    }

    router.push('/dashboard/events')
    router.refresh()
  }

  return (
    <div className="page-narrow" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <BackLink href="/dashboard/events">Back to Duties &amp; Events</BackLink>
        <h1 className="page-title">Add Event</h1>
        <p className="page-subtitle">Create a new event for Obra to cover.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Event Details */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-label">Event Details</p>

          <div>
            <label className="obra-label">
              Event Title <span style={{ color: '#CC0000' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="CCS Freshmen Orientation 2026"
              className="obra-input"
            />
          </div>

          <div>
            <label className="obra-label">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the event..."
              rows={3}
              className="obra-input"
              style={{ resize: 'none' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="obra-label">
                Date <span style={{ color: '#CC0000' }}>*</span>
              </label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="obra-input" />
            </div>
            <div>
              <label className="obra-label">Time</label>
              <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="obra-input" />
            </div>
          </div>

          <div>
            <label className="obra-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="MPH, 4th Floor, OLF Building"
              className="obra-input"
            />
          </div>
        </div>

        {/* Academic Year */}
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 12 }}>Academic Year</p>
          <label className="obra-label">
            Academic Year <span style={{ color: '#CC0000' }}>*</span>
          </label>
          <select
            value={academicYearId}
            onChange={e => setAcademicYearId(e.target.value)}
            className="obra-input"
          >
            <option value="">Select academic year</option>
            {academicYears.map(ay => (
              <option key={ay.id} value={ay.id}>
                {ay.label}{ay.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>
            The active academic year is pre-selected.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Create Event'}
          </button>
          <Link href="/dashboard/events" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
