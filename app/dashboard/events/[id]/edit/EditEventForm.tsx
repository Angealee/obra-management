'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EditEventForm({ event }: { event: any }) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(event.title ?? '')
  const [description, setDescription] = useState(event.description ?? '')
  const [eventDate, setEventDate] = useState(event.event_date ?? '')
  const [eventTime, setEventTime] = useState(event.event_time ? event.event_time.slice(0, 5) : '')
  const [location, setLocation] = useState(event.location ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) return setError('Event title is required.')
    if (!eventDate) return setError('Event date is required.')

    setLoading(true)
    setError('')

    // Guard against duplicate events: same title + date within the same year,
    // excluding this event itself.
    const { data: dup } = await supabase
      .from('events')
      .select('id')
      .eq('academic_year_id', event.academic_year_id)
      .eq('event_date', eventDate)
      .ilike('title', title.trim())
      .neq('id', event.id)
      .maybeSingle()
    if (dup) {
      setError('Another event with this title already exists on this date for this academic year.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location.trim() || null,
      })
      .eq('id', event.id)

    if (updateError) { setError(updateError.message); setLoading(false); return }

    router.push(`/dashboard/events/${event.id}`)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/dashboard/events/${event.id}`} style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
          ← Back to Event
        </Link>
        <h1 className="page-title">Edit Event</h1>
        <p className="page-subtitle">Update the details for this event.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/dashboard/events/${event.id}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
