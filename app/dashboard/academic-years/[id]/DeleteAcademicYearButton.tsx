'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAcademicYearButton({
  academicYearId,
  isActive,
  label,
}: {
  academicYearId: string
  isActive: boolean
  label: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleDelete() {
    setLoading(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', academicYearId)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      setShowConfirm(false)
      return
    }

    router.push('/dashboard/academic-years')
    router.refresh()
  }

  // Don't allow deleting the active academic year
  if (isActive) {
    return (
      <p className="text-xs text-gray-400">
        You cannot delete the active academic year. Set another one as active first.
      </p>
    )
  }

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-red-500 hover:text-red-700 text-sm underline transition"
        >
          Delete Academic Year
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-red-700 font-medium">
            Are you sure you want to delete <span className="font-bold">{label}</span>?
          </p>
          <p className="text-xs text-red-500">
            This cannot be undone. Any events or duties linked to this academic year may be affected.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}