'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetActiveButton({
  academicYearId,
  isActive,
}: {
  academicYearId: string
  isActive: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSetActive() {
    setLoading(true)
    setError('')

    const { error: deactivateError } = await supabase
      .from('academic_years')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateError) {
      setError(deactivateError.message)
      setLoading(false)
      return
    }

    const { error: activateError } = await supabase
      .from('academic_years')
      .update({ is_active: true })
      .eq('id', academicYearId)

    if (activateError) {
      setError(activateError.message)
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard/academic-years')
  }

  async function handleSetInactive() {
    setLoading(true)
    setError('')

    const { error: inactivateError } = await supabase
      .from('academic_years')
      .update({ is_active: false })
      .eq('id', academicYearId)

    if (inactivateError) {
      setError(inactivateError.message)
      setLoading(false)
      setShowConfirm(false)
      return
    }

    router.refresh()
    router.push('/dashboard/academic-years')
  }

  // Currently INACTIVE → show Set as Active
  if (!isActive) {
    return (
      <div>
        <button
          onClick={handleSetActive}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Activating...' : 'Set as Active Academic Year'}
        </button>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    )
  }

  // Currently ACTIVE → show Set as Inactive with confirm
  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-yellow-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-yellow-600 transition"
        >
          Set as Inactive
        </button>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-yellow-800 font-medium">
            Are you sure you want to deactivate this academic year?
          </p>
          <p className="text-xs text-yellow-600">
            No academic year will be active until you set another one. New events
            and duties won't have an academic year context until then.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSetInactive}
              disabled={loading}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50"
            >
              {loading ? 'Deactivating...' : 'Yes, Set Inactive'}
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