'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistItem } from '@/types/database'

export default function ChecklistPanel({
  items,
  dutyStatus,
  canCheck,
}: {
  items: ChecklistItem[]
  dutyStatus: string
  canCheck: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState<string | null>(null)

  const done = items.filter(i => i.is_done).length
  const total = items.length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  async function toggleItem(itemId: string, currentValue: boolean) {
    if (!canCheck) return
    setUpdating(itemId)

    await supabase
      .from('duty_checklists')
      .update({ is_done: !currentValue })
      .eq('id', itemId)

    router.refresh()
    setUpdating(null)
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{done}/{total} done</span>
      </div>

      {/* Items */}
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => toggleItem(item.id, item.is_done)}
          className={`flex items-center gap-3 p-3 rounded-lg border transition ${
            canCheck
              ? 'cursor-pointer hover:bg-gray-50 border-gray-100'
              : 'cursor-default border-gray-50'
          } ${updating === item.id ? 'opacity-50' : ''}`}
        >
          {/* Checkbox */}
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
            item.is_done
              ? 'bg-gray-900 border-gray-900'
              : 'border-gray-300'
          }`}>
            {item.is_done && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          <span className={`text-sm transition ${
            item.is_done ? 'line-through text-gray-400' : 'text-gray-700'
          }`}>
            {item.item_text}
          </span>
        </div>
      ))}

      {!canCheck && dutyStatus !== 'reviewed' && (
        <p className="text-xs text-gray-400 mt-2">
          {dutyStatus === 'completed' || dutyStatus === 'reviewed'
            ? 'Checklist is locked after completion.'
            : 'Only the assigned member can check items.'}
        </p>
      )}
    </div>
  )
}