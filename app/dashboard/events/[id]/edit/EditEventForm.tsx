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
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${event.id}`} className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Edit Event</h1>
        <p className="text-gray-500 text-sm mt-1">Update the details for this event.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Event Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="CCS Freshmen Orientation 2026"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the event..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="MPH, 4th Floor, OLF Building"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
