'use client'

import { useRouter } from 'next/navigation'
import FilterPopover from '@/components/ui/FilterPopover'

type Option = { value: string; label: string }

const selectStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// Filter controls for the activity feed, in a floating popover (no layout
// shift). Filtering happens server-side: each change navigates with a new
// query string (join('&') per project convention) and resets to page 1.
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

  const activeCount =
    (current.module ? 1 : 0) + (current.action ? 1 : 0) + (current.actor ? 1 : 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 14 }}>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => apply({ module: '', action: '', actor: '' })}
          style={{
            fontSize: '12px', color: '#6b7280', background: 'transparent',
            border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '4px 2px',
          }}
        >
          Clear filters
        </button>
      )}
      <FilterPopover activeCount={activeCount} panelWidth={280}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>Module</span>
            <select
              style={selectStyle}
              value={current.module}
              onChange={e => apply({ ...current, module: e.target.value })}
            >
              <option value="">All modules</option>
              {modules.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>Action</span>
            <select
              style={selectStyle}
              value={current.action}
              onChange={e => apply({ ...current, action: e.target.value })}
            >
              <option value="">All actions</option>
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>Person</span>
            <select
              style={selectStyle}
              value={current.actor}
              onChange={e => apply({ ...current, actor: e.target.value })}
            >
              <option value="">Everyone</option>
              {actors.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
        </div>
      </FilterPopover>
    </div>
  )
}
