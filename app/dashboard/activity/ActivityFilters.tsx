'use client'

import { useRouter } from 'next/navigation'

type Option = { value: string; label: string }

// Filter bar for the activity feed. Filtering happens server-side: each change
// navigates to /dashboard/activity with the new query string (built with
// join('&') per the project convention — no URLSearchParams) and resets to
// page 1, so pagination always reflects the filtered set.
export default function ActivityFilters({
  modules,
  actions,
  actors,
  current,
}: {
  modules: Option[]
  actions: Option[]
  actors: Option[]
  current: { module: string; action: string; actor: string }
}) {
  const router = useRouter()

  function apply(next: { module: string; action: string; actor: string }) {
    const parts: string[] = []
    if (next.module) parts.push('module=' + encodeURIComponent(next.module))
    if (next.action) parts.push('action=' + encodeURIComponent(next.action))
    if (next.actor) parts.push('actor=' + encodeURIComponent(next.actor))
    router.push('/dashboard/activity' + (parts.length > 0 ? '?' + parts.join('&') : ''))
  }

  const hasFilters = Boolean(current.module || current.action || current.actor)

  const selectStyle: React.CSSProperties = {
    fontSize: '12.5px',
    color: '#444',
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    maxWidth: '190px',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
      <select
        aria-label="Filter by module"
        value={current.module}
        onChange={e => apply({ ...current, module: e.target.value })}
        style={selectStyle}
      >
        <option value="">All modules</option>
        {modules.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <select
        aria-label="Filter by action"
        value={current.action}
        onChange={e => apply({ ...current, action: e.target.value })}
        style={selectStyle}
      >
        <option value="">All actions</option>
        {actions.map(a => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      <select
        aria-label="Filter by person"
        value={current.actor}
        onChange={e => apply({ ...current, actor: e.target.value })}
        style={selectStyle}
      >
        <option value="">Everyone</option>
        {actors.map(a => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => apply({ module: '', action: '', actor: '' })}
          style={{
            fontSize: '12px',
            color: '#6b7280',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '6px 4px',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
