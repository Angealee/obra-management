'use client'

import { useMemo, useState } from 'react'
import type { Profile } from '@/types/database'
import { MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'
import Avatar from '@/components/ui/Avatar'

// Grouped member multi-select (Creative Heads / Members) with per-member
// disable ("Already assigned") and a role filter (photographer, graphic
// designer, …). Shared by the standalone Assign Duty form
// (/dashboard/duties/new) and the inline AssignDutiesPanel on event detail.

export type MemberWithSkills = Profile & {
  profile_skills: { member_skills: { name: string } }[]
}

const ROLE_LABELS: Record<string, string> = {
  creative_head: 'Creative Head',
  member: 'Member',
}

const CREATIVE_LABELS: Record<string, string> = {
  creative_producer: 'Creative Producer',
  creative_writer: 'Creative Writer',
  creative_director: 'Creative Director',
  none: '',
}

function displayRole(member: MemberWithSkills): string {
  return member.system_role === 'creative_head' && member.creative_head_role !== 'none'
    ? CREATIVE_LABELS[member.creative_head_role ?? 'none']
    : ROLE_LABELS[member.system_role] ?? member.system_role
}

function MemberCard({
  member,
  selected,
  disabled,
  onSelect,
}: {
  member: MemberWithSkills
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const skills = member.profile_skills?.map(ps => ps.member_skills?.name).filter(Boolean) ?? []

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 10,
        border: `1.5px solid ${selected ? '#111' : 'rgba(0,0,0,0.08)'}`,
        background: disabled ? '#F7F7F5' : selected ? '#FAFAF9' : '#fff',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.13s ease, background 0.13s ease',
      }}
    >
      {/* Check circle */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? '#111' : 'rgba(0,0,0,0.2)'}`,
        background: selected ? '#111' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.13s ease, border-color 0.13s ease',
      }}>
        {selected && (
          <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
            <path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Avatar — real profile photo when available, initials otherwise */}
      <Avatar name={member.full_name} src={(member as any).avatar_url ?? null} size={34} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {member.full_name}
          </p>
          {disabled && (
            <span style={{
              fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#EDEDEB',
              padding: '1px 8px', borderRadius: 99, flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              Already assigned
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{displayRole(member)}</p>
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {skills.map(skill => (
              <span key={skill} style={{ fontSize: '12px', color: '#6b7280', background: '#F7F7F5', padding: '1px 8px', borderRadius: 99 }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MemberMultiSelect({
  members,
  selectedIds,
  disabledIds,
  onToggle,
}: {
  members: MemberWithSkills[]
  selectedIds: string[]
  disabledIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Only offer role chips for positions actually present among these members.
  const availableRoles = useMemo(() => {
    const present = new Set(members.map(m => (m as any).member_role).filter(Boolean))
    return MEMBER_ROLE_OPTIONS.filter(o => present.has(o.value))
  }, [members])

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return members
    return members.filter(m => (m as any).member_role === roleFilter)
  }, [members, roleFilter])

  const heads = filtered.filter(m => m.system_role === 'creative_head')
  const regular = filtered.filter(m => m.system_role === 'member')

  if (members.length === 0) {
    return <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>No active members found.</p>
  }

  const group = (label: string, list: MemberWithSkills[]) =>
    list.length > 0 && (
      <div>
        <p className="section-label" style={{ marginBottom: 8 }}>{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              selected={selectedIds.includes(member.id)}
              disabled={disabledIds.has(member.id)}
              onSelect={() => onToggle(member.id)}
            />
          ))}
        </div>
      </div>
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Role filter — assign by creative position */}
      {availableRoles.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <RoleChip label="All" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
            {availableRoles.map(r => (
              <RoleChip
                key={r.value}
                label={r.label}
                active={roleFilter === r.value}
                onClick={() => setRoleFilter(r.value)}
              />
            ))}
          </div>
          {roleFilter !== 'all' && (
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0' }}>
              Showing {filtered.length} of {members.length} members
            </p>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>No members with this role.</p>
      ) : (
        <>
          {group('Creative Heads', heads)}
          {group('Members', regular)}
        </>
      )}
    </div>
  )
}

function RoleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
        padding: '6px 13px',
        borderRadius: 999,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.13s ease, color 0.13s ease, border-color 0.13s ease',
        border: active ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
        background: active ? '#111' : '#fff',
        color: active ? '#fff' : '#555',
      }}
    >
      {label}
    </button>
  )
}
