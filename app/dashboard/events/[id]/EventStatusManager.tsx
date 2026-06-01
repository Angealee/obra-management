'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EventStatus } from '@/types/database'

const steps: EventStatus[] = ['upcoming', 'ongoing', 'completed']

const nextStatus: Partial<Record<EventStatus, EventStatus>> = {
  upcoming: 'ongoing',
  ongoing:  'completed',
}

const prevStatus: Partial<Record<EventStatus, EventStatus>> = {
  ongoing:   'upcoming',
  completed: 'ongoing',
  cancelled: 'upcoming',
}

const nextLabel: Partial<Record<EventStatus, string>> = {
  upcoming: 'Mark as Ongoing',
  ongoing:  'Mark as Completed',
}

const prevLabel: Partial<Record<EventStatus, string>> = {
  ongoing:   'Revert to Upcoming',
  completed: 'Revert to Ongoing',
  cancelled: 'Revert to Upcoming',
}

const nextColor: Partial<Record<EventStatus, string>> = {
  upcoming: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  ongoing:  'bg-green-600 hover:bg-green-700 text-white',
}

export default function EventStatusManager({
  eventId,
  currentStatus,
}: {
  eventId: string
  currentStatus: EventStatus
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [showRevert, setShowRevert] = useState(false)

  async function updateStatus(newStatus: EventStatus) {
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
    setShowCancel(false)
    setShowRevert(false)
  }

  const stepIndex = steps.indexOf(currentStatus)

  return (
    <div className="space-y-4">

      {/* Progress stepper */}
      {currentStatus !== 'cancelled' && (
        <div className="flex items-center gap-0 mb-2">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? 'text-gray-800' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                  i < stepIndex   ? 'bg-gray-900 border-gray-900 text-white' :
                  i === stepIndex ? 'border-gray-900 text-gray-900' :
                                    'border-gray-200 text-gray-300'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className="text-xs capitalize hidden sm:block">{step}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < stepIndex ? 'bg-gray-900' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {currentStatus === 'cancelled' && (
        <p className="text-sm text-gray-400 italic">This event has been cancelled.</p>
      )}

      {/* Primary action buttons */}
      <div className="flex gap-3 flex-wrap">

        {/* Advance to next status */}
        {nextStatus[currentStatus] && (
          <button
            onClick={() => updateStatus(nextStatus[currentStatus]!)}
            disabled={loading}
            className={`px-5 py-2 rounded-lg text-sm transition disabled:opacity-50 ${nextColor[currentStatus]}`}
          >
            {loading ? 'Updating...' : nextLabel[currentStatus]}
          </button>
        )}

        {/* Cancel Event — upcoming or ongoing only */}
        {(currentStatus === 'upcoming' || currentStatus === 'ongoing') && (
          !showCancel ? (
            <button
              onClick={() => { setShowCancel(true); setShowRevert(false) }}
              className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500 transition"
            >
              Cancel Event
            </button>
          ) : (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
              <p className="text-sm text-red-700">Mark this event as cancelled?</p>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? '...' : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                No
              </button>
            </div>
          )
        )}

        {/* Revert to previous status — shown for ongoing, completed, cancelled */}
        {prevStatus[currentStatus] && (
          !showRevert ? (
            <button
              onClick={() => { setShowRevert(true); setShowCancel(false) }}
              className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition"
            >
              ↩ {prevLabel[currentStatus]}
            </button>
          ) : (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
              <p className="text-sm text-gray-700">
                Revert to <span className="font-medium capitalize">{prevStatus[currentStatus]}</span>?
              </p>
              <button
                onClick={() => updateStatus(prevStatus[currentStatus]!)}
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 transition disabled:opacity-50"
              >
                {loading ? '...' : 'Yes, Revert'}
              </button>
              <button
                onClick={() => setShowRevert(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                No
              </button>
            </div>
          )
        )}

      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}