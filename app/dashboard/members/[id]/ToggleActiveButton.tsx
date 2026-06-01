'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ToggleActiveButton({
  memberId,
  isActive,
  memberName,
}: {
  memberId: string
  isActive: boolean
  memberName: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: !isActive })
      .eq('id', memberId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      setShowConfirm(false)
      return
    }

    router.refresh()
    setShowConfirm(false)
    setLoading(false)
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={`px-6 py-2 rounded-lg text-sm transition ${
          isActive
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {isActive ? 'Set as Inactive' : 'Set as Active'}
      </button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-gray-700 font-medium">
        {isActive
          ? `Deactivate ${memberName}?`
          : `Reactivate ${memberName}?`}
      </p>
      <p className="text-xs text-gray-500">
        {isActive
          ? 'This member will no longer be able to log in.'
          : 'This member will be able to log in again.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}