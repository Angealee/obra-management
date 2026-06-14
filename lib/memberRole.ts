import type { MemberRole } from '@/types/database'

// Single source of truth for a member's creative position label + options.
// Values are snake_case (match duties.duty_type); labels are human-readable.

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  photographer:    'Photographer',
  videographer:    'Videographer',
  video_editor:    'Video Editor',
  photo_editor:    'Photo Editor',
  graphic_designer:'Graphic Designer',
  animator:        'Animator',
  none:            'Unassigned',
}

// Selectable positions (excludes 'none', which is the "Unassigned" default).
export const MEMBER_ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'photographer',     label: 'Photographer' },
  { value: 'videographer',     label: 'Videographer' },
  { value: 'video_editor',     label: 'Video Editor' },
  { value: 'photo_editor',     label: 'Photo Editor' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'animator',         label: 'Animator' },
]

export function memberRoleLabel(role: string | null | undefined): string {
  if (!role) return MEMBER_ROLE_LABELS.none
  return MEMBER_ROLE_LABELS[role as MemberRole] ?? MEMBER_ROLE_LABELS.none
}

// Duty-facing label for a duties.duty_type value. Same labels as member roles,
// except 'other' (which has no MemberRole equivalent) reads as "General Duty".
export function dutyTypeLabel(dutyType: string | null | undefined): string {
  if (dutyType === 'other') return 'General Duty'
  return memberRoleLabel(dutyType)
}
