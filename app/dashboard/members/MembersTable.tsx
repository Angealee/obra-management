'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronRight } from 'lucide-react'
import { memberRoleLabel, MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'

const ROLE_LABEL: Record<string, string> = {
  creative_head: 'Creative Head',
  member:        'Member',
}

const ROLE_ORDER: Record<string, number> = {
  creative_head: 1,
  member:        2,
}

const HEAD_ROLE_LABEL: Record<string, string> = {
  creative_producer: 'Producer',
  creative_writer:   'Writer',
  creative_director: 'Director',
  none:              '',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#dcfce7', color: '#166534', label: 'Active' },
  inactive: { bg: '#f3f4f6', color: '#4b5563', label: 'Inactive' },
  archived: { bg: '#fee2e2', color: '#991b1b', label: 'Archived' },
}

const YEAR_OPTIONS = ['all', '1st Year', '2nd Year', '3rd Year', '4th Year']
const ROLE_OPTIONS = ['all', 'creative_head', 'member']
const STATUS_OPTIONS = ['all', 'active', 'inactive', 'archived']
const SKILL_OPTIONS = [
  'all',
  'Photographer', 'Photo Editor', 'Videographer',
  'Video Editor', 'Graphic Designer', 'Animator',
]

type Member = {
  id: string
  full_name: string
  email: string
  student_number: string | null
  course_section: string | null
  year_level: string | null
  system_role: string
  creative_head_role: string | null
  member_role: string | null
  is_active: boolean
  member_status: string
  created_at: string
  avatar_url: string | null
  profile_skills: { member_skills: { name: string } | null }[]
}

// Member avatar — shows the uploaded profile picture when available, otherwise
// falls back to initials on the brand-dark (or muted, if archived) circle.
function MemberAvatar({ name, src, size, archived }: {
  name: string; src: string | null; size: number; archived: boolean
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: archived ? 0.6 : 1 }}
      />
    )
  }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: archived ? '#e5e7eb' : '#111', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', fontSize: size >= 36 ? 13 : 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

type Props = {
  members: Member[]
  userRole: string
}

export default function MembersTable({ members, userRole }: Props) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterSkill, setFilterSkill] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    return members
      .filter(m => {
        // Hide archived by default unless toggle is on
        if (!showArchived && m.member_status === 'archived') return false

        const skills = m.profile_skills
          .map(ps => ps.member_skills?.name ?? '')
          .filter(Boolean)

        const matchSearch =
          m.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (m.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (m.student_number ?? '').toLowerCase().includes(search.toLowerCase())

        const matchRole     = filterRole     === 'all' || m.system_role === filterRole
        const matchPosition = filterPosition === 'all' || (m.member_role ?? 'none') === filterPosition
        const matchYear     = filterYear     === 'all' || m.year_level === filterYear
        const matchSkill    = filterSkill    === 'all' || skills.includes(filterSkill)
        const matchStatus   = filterStatus   === 'all' || m.member_status === filterStatus

        return matchSearch && matchRole && matchPosition && matchYear && matchSkill && matchStatus
      })
      .sort((a, b) => {
        // Primary: role order
        const roleA = ROLE_ORDER[a.system_role] ?? 99
        const roleB = ROLE_ORDER[b.system_role] ?? 99
        if (roleA !== roleB) return roleA - roleB
        // Secondary: alphabetical
        return a.full_name.localeCompare(b.full_name)
      })
  }, [members, search, filterRole, filterPosition, filterYear, filterSkill, filterStatus, showArchived])

  const selectStyle: React.CSSProperties = {
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

  const archivedCount = members.filter(m => m.member_status === 'archived').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Filter bar */}
      <div className="dash-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={13} style={{
              position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-50%)', color: '#bbb',
            }} />
            <input
              type="text"
              placeholder="Search name, email, student no..."
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

          <select style={selectStyle} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="creative_head">Creative Head</option>
            <option value="member">Member</option>
          </select>

          <select style={selectStyle} value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
            <option value="all">All Positions</option>
            {MEMBER_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value="none">Unassigned</option>
          </select>

          <select style={selectStyle} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y === 'all' ? 'All Year Levels' : y}</option>
            ))}
          </select>

          <select style={selectStyle} value={filterSkill} onChange={e => setFilterSkill(e.target.value)}>
            {SKILL_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Skills' : s}</option>
            ))}
          </select>

          <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : STATUS_STYLE[s]?.label ?? s}
              </option>
            ))}
          </select>

          {/* Show archived toggle */}
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(p => !p)}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.12)',
                background: showArchived ? '#111' : '#fff',
                color: showArchived ? '#fff' : '#555',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {showArchived ? '✓ Showing Archived' : `Show Archived (${archivedCount})`}
            </button>
          )}
        </div>

        <p style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          color: '#bbb',
          marginTop: 10,
          letterSpacing: '0.05em',
        }}>
          {filtered.length} MEMBER{filtered.length !== 1 ? 'S' : ''}
        </p>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: '#bbb',
          }}>
            No members match your filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(member => {
              const skills = member.profile_skills
                .map(ps => ps.member_skills?.name ?? '')
                .filter(Boolean)

              const statusStyle = STATUS_STYLE[member.member_status] ?? STATUS_STYLE.active
              const isArchived = member.member_status === 'archived'

              const headSubrole = member.system_role === 'creative_head' && member.creative_head_role
                ? HEAD_ROLE_LABEL[member.creative_head_role] ?? ''
                : ''

              const positionLabel = member.system_role === 'member' && member.member_role && member.member_role !== 'none'
                ? memberRoleLabel(member.member_role)
                : ''

              return (
                <Link
                  key={member.id}
                  href={`/dashboard/members/${member.id}`}
                  style={{
                    textDecoration: 'none',
                    display: 'block',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    opacity: isArchived ? 0.5 : 1,
                  }}
                >
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MemberAvatar name={member.full_name} src={member.avatar_url} size={36} archived={isArchived} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#111',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {member.full_name}
                        </p>
                        <span style={{
                          flexShrink: 0,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          {statusStyle.label}
                        </span>
                      </div>

                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#999', margin: '2px 0 0' }}>
                        {ROLE_LABEL[member.system_role] ?? member.system_role}
                        {headSubrole && ` · ${headSubrole}`}
                        {positionLabel && ` · ${positionLabel}`}
                        {member.year_level && ` · ${member.year_level}`}
                      </p>

                      {skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {skills.map(skill => (
                            <span key={skill} style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: 11,
                              fontWeight: 500,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: '#F7F7F5',
                              border: '1px solid rgba(0,0,0,0.08)',
                              color: '#555',
                              whiteSpace: 'nowrap',
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <ChevronRight size={16} style={{ color: '#ccc', flexShrink: 0 }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: '#bbb',
          }}>
            No members match your filters.
          </div>
        ) : (
          <table className="obra-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Year / Section</th>
                <th>Skills</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(member => {
                const skills = member.profile_skills
                  .map(ps => ps.member_skills?.name ?? '')
                  .filter(Boolean)

                const statusStyle = STATUS_STYLE[member.member_status] ?? STATUS_STYLE.active
                const isArchived = member.member_status === 'archived'

                const headSubrole = member.system_role === 'creative_head' && member.creative_head_role
                  ? HEAD_ROLE_LABEL[member.creative_head_role] ?? ''
                  : ''

                const positionLabel = member.system_role === 'member' && member.member_role && member.member_role !== 'none'
                  ? memberRoleLabel(member.member_role)
                  : ''

                return (
                  <tr key={member.id} style={{ opacity: isArchived ? 0.5 : 1 }}>

                    {/* Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MemberAvatar name={member.full_name} src={member.avatar_url} size={32} archived={isArchived} />
                        <div>
                          <p style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#111',
                            margin: 0,
                          }}>
                            {member.full_name}
                          </p>
                          <p style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: 11,
                            color: '#bbb',
                            margin: 0,
                          }}>
                            {member.student_number ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#333', margin: 0, fontWeight: 500 }}>
                        {ROLE_LABEL[member.system_role] ?? member.system_role}
                      </p>
                      {(headSubrole || positionLabel) && (
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#999', margin: 0 }}>
                          {headSubrole || positionLabel}
                        </p>
                      )}
                    </td>

                    {/* Year / Section */}
                    <td>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555', margin: 0 }}>
                        {member.year_level ?? '—'}
                      </p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#999', margin: 0 }}>
                        {member.course_section ?? '—'}
                      </p>
                    </td>

                    {/* Skills */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {skills.length === 0 ? (
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ccc' }}>—</span>
                        ) : skills.map(skill => (
                          <span key={skill} style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#F7F7F5',
                            border: '1px solid rgba(0,0,0,0.08)',
                            color: '#555',
                            whiteSpace: 'nowrap',
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{
                        display: 'inline-block',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontFamily: 'DM Mono, monospace',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* View link */}
                    <td>
                      <Link
                        href={`/dashboard/members/${member.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ccc',
                          textDecoration: 'none',
                        }}
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}