'use client'

type Mark = 'completed' | 'late' | 'did_not_duty' | null

const markStyle: Record<string, string> = {
  completed:    'bg-green-500 text-white',
  late:         'bg-yellow-400 text-white',
  did_not_duty: 'bg-red-500 text-white',
}

const markIcon: Record<string, string> = {
  completed: '✓', late: '!', did_not_duty: '✗',
}

const dutyStyle: Record<string, string> = {
  pending:     'bg-gray-200 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-600',
  completed:   'bg-yellow-100 text-yellow-600',
  reviewed:    'bg-green-100 text-green-600',
}

const dutyIcon: Record<string, string> = {
  pending: 'P', in_progress: '…', completed: '✓', reviewed: '★',
}

const cycle: Mark[] = ['completed', 'late', 'did_not_duty', null]

export default function WorkloadCell({
  mark,
  dutyStatus,
  canEdit,
  onClick,
}: {
  mark: Mark
  dutyStatus: string | null
  canEdit: boolean
  onClick: () => void
}) {
  const base = 'w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-150'
  const interactive = canEdit
    ? 'cursor-pointer hover:scale-110 hover:shadow-sm active:scale-95'
    : 'cursor-default'

  if (mark) {
    return (
      <button onClick={canEdit ? onClick : undefined} className={`${base} ${markStyle[mark]} ${interactive} shadow-sm`}>
        {markIcon[mark]}
      </button>
    )
  }

  if (dutyStatus) {
    return (
      <button onClick={canEdit ? onClick : undefined} className={`${base} ${dutyStyle[dutyStatus] ?? 'bg-gray-100 text-gray-400'} ${interactive} border border-gray-200`}>
        {dutyIcon[dutyStatus] ?? '?'}
      </button>
    )
  }

  return (
    <button
      onClick={canEdit ? onClick : undefined}
      className={`${base} bg-gray-50 border border-gray-100 ${canEdit ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-100' : 'cursor-default'}`}
    />
  )
}