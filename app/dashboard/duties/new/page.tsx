'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ObraEvent, Profile } from '@/types/database'

const dutyTypes = [
  { value: 'photography',    label: 'Photography' },
  { value: 'videography',    label: 'Videography' },
  { value: 'video_editing',  label: 'Video Editing' },
  { value: 'photo_editing',  label: 'Photo Editing' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'animation',      label: 'Animation' },
  { value: 'writing',        label: 'Writing' },
  { value: 'event_assistance', label: 'Event Assistance' },
  { value: 'other',          label: 'Other' },
]

export default function NewDutyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedEvent = searchParams.get('event') // from event detail page
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dutyType, setDutyType] = useState('photography')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [eventId, setEventId] = useState(preselectedEvent ?? '')
  const [assignedTo, setAssignedTo] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([''])

  const [events, setEvents] = useState<ObraEvent[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: evts }, { data: mems }] = await Promise.all([
        supabase.from('events').select('*').in('status', ['upcoming', 'ongoing']).order('event_date', { ascending: false }),
        supabase.from('profiles').select('*').eq('is_active', true).neq('system_role', 'consultant').order('full_name'),
      ])
      if (evts) setEvents(evts)
      if (mems) setMembers(mems)
    }
    load()
  }, [])

  function addChecklistItem() {
    setChecklistItems(prev => [...prev, ''])
  }

  function updateChecklistItem(index: number, value: string) {
    setChecklistItems(prev => prev.map((item, i) => i === index ? value : item))
  }

  function removeChecklistItem(index: number) {
    setChecklistItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!title.trim())    return setError('Duty title is required.')
    if (!eventId)         return setError('Please select an event.')
    if (!assignedTo)      return setError('Please select a member to assign this duty to.')

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    // Insert duty
    const { data: duty, error: dutyError } = await supabase
      .from('duties')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        duty_type: dutyType,
        priority,
        due_date: dueDate || null,
        event_id: eventId,
        assigned_to: assignedTo,
        assigned_by: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (dutyError) { setError(dutyError.message); setLoading(false); return }

    // Insert checklist items (filter out blank ones)
    const validItems = checklistItems.filter(item => item.trim())
    if (validItems.length > 0) {
      const { error: checklistError } = await supabase
        .from('duty_checklists')
        .insert(validItems.map(item => ({
          duty_id: duty.id,
          item_text: item.trim(),
          is_done: false,
        })))

      if (checklistError) console.error('Checklist error:', checklistError.message)
    }

    router.push(`/dashboard/duties/${duty.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/duties" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Duties
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Assign Duty</h1>
        <p className="text-gray-500 text-sm mt-1">Assign a task to an Obra member for a specific event.</p>
      </div>

      <div className="space-y-6">

        {/* Assignment */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assignment</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select event</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {new Date(ev.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} — {m.system_role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duty Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duty Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Vinculum Coverage"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional instructions or context..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duty Type</label>
              <select
                value={dutyType}
                onChange={e => setDutyType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {dutyTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Checklist</h2>
            <p className="text-gray-400 text-xs mt-1">Optional. Add step-by-step items the member needs to complete.</p>
          </div>

          {checklistItems.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => updateChecklistItem(index, e.target.value)}
                placeholder={`Step ${index + 1}`}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              {checklistItems.length > 1 && (
                <button
                  onClick={() => removeChecklistItem(index)}
                  className="px-3 py-2 text-gray-400 hover:text-red-500 transition text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addChecklistItem}
            className="text-sm text-gray-500 hover:text-gray-800 underline transition"
          >
            + Add item
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign Duty'}
          </button>
          <Link href="/dashboard/duties" className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}