'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-gray-50 text-gray-400',
  normal: 'bg-gray-100 text-gray-500',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

export default function DutyDetailsForm({
  duty,
  isHead,
}: {
  duty: { id: string; description: string | null; priority: string; due_date: string | null }
  isHead: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(duty.description ?? '')
  const [priority, setPriority] = useState(duty.priority)
  const [dueDate, setDueDate] = useState(duty.due_date ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    const { error: updateError } = await supabase
      .from('duties')
      .update({
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      })
      .eq('id', duty.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setDescription(duty.description ?? '')
    setPriority(duty.priority)
    setDueDate(duty.due_date ?? '')
    setError('')
    setEditing(false)
  }

  // ── Read-only view (members, or heads not editing) ──
  if (!isHead || !editing) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duty Details</h2>
          {isHead && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-500 hover:text-gray-800 underline transition"
            >
              Edit
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {duty.description?.trim() ? duty.description : <span className="text-gray-300">No description</span>}
            </p>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50">
            <span className="text-sm text-gray-500">Priority</span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${PRIORITY_STYLE[duty.priority] ?? PRIORITY_STYLE.normal}`}>
              {duty.priority}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50">
            <span className="text-sm text-gray-500">Due Date</span>
            <span className="text-sm text-gray-800 font-medium">
              {duty.due_date
                ? new Date(duty.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Edit view (heads only) ──
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Edit Duty Details</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Additional instructions or context..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
