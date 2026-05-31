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
    <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-gray-700">Edit Details</h2>
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
          className="text-xs text-gray-400 hover:text-gray-600 underline transition"
        >
          {isOpen ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <p className="text-gray-400 text-xs mb-4">
        Correct the label or dates if they were entered incorrectly.
      </p>

      {!isOpen ? (
        <p className="text-xs text-gray-400 italic">Click "Edit" to modify this academic year.</p>
      ) : (
        <div className="space-y-4">
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

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">✓ Academic year updated successfully.</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
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
              className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}