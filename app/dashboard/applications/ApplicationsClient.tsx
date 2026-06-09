'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MemberApplication, ApplicationStatus } from '@/types/database'
import { Search } from 'lucide-react'

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  shortlisted: { bg: '#dbeafe', color: '#1e40af', label: 'Shortlisted' },
  interviewed: { bg: '#f3e8ff', color: '#6b21a8', label: 'Interviewed' },
  approved:    { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected:    { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  withdrawn:   { bg: '#f3f4f6', color: '#4b5563', label: 'Withdrawn' },
}

const POSITION_LABELS: Record<string, string> = {
  photographer:     'Photographer',
  photo_editor:     'Photo Editor',
  videographer:     'Videographer',
  video_editor:     'Video Editor',
  graphic_designer: 'Graphic Designer',
  animator:         'Animator',
}

const STATUS_OPTIONS = ['all', 'pending', 'shortlisted', 'interviewed', 'approved', 'rejected', 'withdrawn']
const POSITION_OPTIONS = ['all', 'photographer', 'photo_editor', 'videographer', 'video_editor', 'graphic_designer', 'animator']
const YEAR_OPTIONS = ['all', '1st Year', '2nd Year', '3rd Year', '4th Year']

type Props = {
  applications: MemberApplication[]
  selectedId: string | null
  children: React.ReactNode
}

export default function ApplicationsClient({ applications, selectedId, children }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [filterYear, setFilterYear] = useState('all')

  const filtered = useMemo(() => {
    return applications
      .filter(a => {
        const matchSearch =
          a.full_name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
        const matchStatus   = filterStatus   === 'all' || a.status === filterStatus
        const matchPosition = filterPosition === 'all' || a.positions.includes(filterPosition)
        const matchYear     = filterYear     === 'all' || a.year_level === filterYear
        return matchSearch && matchStatus && matchPosition && matchYear
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [applications, search, filterStatus, filterPosition, filterYear])

  const selectStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 140px)', overflow: 'hidden' }}>

      {/* LEFT — list panel */}
      <div style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>

        {/* Filter header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} style={{
              position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-50%)', color: '#bbb',
            }} />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 28,
                paddingRight: 10,
                paddingTop: 7,
                paddingBottom: 7,
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.10)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                color: '#111',
                background: '#F7F7F5',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dropdowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : STATUS_COLORS[s as ApplicationStatus]?.label ?? s}
                </option>
              ))}
            </select>
            <select style={selectStyle} value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
              {POSITION_OPTIONS.map(p => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Positions' : POSITION_LABELS[p]}
                </option>
              ))}
            </select>
            <select style={selectStyle} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>
                  {y === 'all' ? 'All Year Levels' : y}
                </option>
              ))}
            </select>
          </div>

          <p style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            color: '#bbb',
            marginTop: 8,
            letterSpacing: '0.05em',
          }}>
            {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''}
          </p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              color: '#bbb',
            }}>
              No applications found.
            </div>
          ) : (
            filtered.map(app => {
              const s = STATUS_COLORS[app.status]
              const isSelected = app.id === selectedId
              return (
                <button
                  key={app.id}
                  onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: isSelected ? '#fef2f2' : 'transparent',
                    borderLeft: isSelected
                      ? '2.5px solid #CC0000'
                      : '2.5px solid transparent',
                    cursor: 'pointer',
                    border: 'none',
                    display: 'block',
                  }}
                >
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#111',
                    margin: '0 0 2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {app.full_name}
                  </p>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 12,
                    color: '#999',
                    margin: '0 0 6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {app.year_level} · {app.course_section}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    background: s.bg,
                    color: s.color,
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {s.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}