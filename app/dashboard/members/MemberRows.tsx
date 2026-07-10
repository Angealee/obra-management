'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { deriveMemberView, ROLE_LABEL, type Member } from './memberTableShared'

// Row variants for the members list (mobile stacked card + desktop table row)
// and the small pieces they share. Presentation-only.

// Member avatar — shows the uploaded profile picture when available, otherwise
// falls back to initials on the brand-dark (or muted, if archived) circle.
export function MemberAvatar({ name, src, size, archived }: {
  name: string; src: string | null; size: number; archived: boolean
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
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

function SkillChip({ name }: { name: string }) {
  return (
    <span style={{
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
      {name}
    </span>
  )
}

function StatusTag({ style }: { style: { bg: string; color: string; label: string } }) {
  return (
    <span style={{
      display: 'inline-block',
      flexShrink: 0,
      background: style.bg,
      color: style.color,
      fontSize: 12,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 99,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  )
}

export function MemberMobileCard({ member }: { member: Member }) {
  const { skills, statusStyle, isArchived, headSubrole, positionLabel } = deriveMemberView(member)

  return (
    <Link
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
            <StatusTag style={statusStyle} />
          </div>

          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            {ROLE_LABEL[member.system_role] ?? member.system_role}
            {headSubrole && ` · ${headSubrole}`}
            {positionLabel && ` · ${positionLabel}`}
            {member.year_level && ` · ${member.year_level}`}
          </p>

          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {skills.map(skill => <SkillChip key={skill} name={skill} />)}
            </div>
          )}
        </div>

        <ChevronRight size={16} style={{ color: '#ccc', flexShrink: 0 }} />
      </div>
    </Link>
  )
}

export function MemberDesktopRow({ member }: { member: Member }) {
  const { skills, statusStyle, isArchived, headSubrole, positionLabel } = deriveMemberView(member)

  return (
    <tr style={{ opacity: isArchived ? 0.5 : 1 }}>

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
              fontSize: 12,
              color: '#6b7280',
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
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b7280', margin: 0 }}>
            {headSubrole || positionLabel}
          </p>
        )}
      </td>

      {/* Year / Section */}
      <td>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555', margin: 0 }}>
          {member.year_level ?? '—'}
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b7280', margin: 0 }}>
          {member.course_section ?? '—'}
        </p>
      </td>

      {/* Skills */}
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {skills.length === 0 ? (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ccc' }}>—</span>
          ) : skills.map(skill => <SkillChip key={skill} name={skill} />)}
        </div>
      </td>

      {/* Status */}
      <td>
        <StatusTag style={statusStyle} />
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
}
