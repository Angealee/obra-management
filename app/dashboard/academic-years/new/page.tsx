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
    <div className="max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/academic-years"
          className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block"
        >
          ← Back to Academic Years
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Add Academic Year</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a new academic year. You can activate it after creation.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="A.Y. 2026-2027"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <p className="text-gray-400 text-xs mt-1">
            Use the format: A.Y. 2026-2027
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Academic Year'}
          </button>
          <Link
            href="/dashboard/academic-years"
            className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}