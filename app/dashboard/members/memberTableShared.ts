import { memberRoleLabel } from '@/lib/memberRole'

// Shared constants + per-member derivations for the members list family
// (MembersTable orchestrator, filter hook, and row components).

export const ROLE_LABEL: Record<string, string> = {
  creative_head: 'Creative Head',
  member:        'Member',
}

export const ROLE_ORDER: Record<string, number> = {
  creative_head: 1,
  member:        2,
}

export const HEAD_ROLE_LABEL: Record<string, string> = {
  creative_producer: 'Producer',
  creative_writer:   'Writer',
  creative_director: 'Director',
  none:              '',
}

export const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#dcfce7', color: '#166534', label: 'Active' },
  inactive: { bg: '#f3f4f6', color: '#4b5563', label: 'Inactive' },
  archived: { bg: '#fee2e2', color: '#991b1b', label: 'Archived' },
}

export const YEAR_OPTIONS = ['all', '1st Year', '2nd Year', '3rd Year', '4th Year']
export const STATUS_OPTIONS = ['all', 'active', 'inactive', 'archived']
export const SKILL_OPTIONS = [
  'all',
  'Photographer', 'Photo Editor', 'Videographer',
  'Video Editor', 'Graphic Designer', 'Animator',
]

export type Member = {
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

/** Everything both row variants (mobile card, desktop row) derive per member. */
export function deriveMemberView(member: Member) {
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

  return { skills, statusStyle, isArchived, headSubrole, positionLabel }
}
