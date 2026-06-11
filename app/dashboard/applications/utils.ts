import { createClient } from '@/lib/supabase/server'
import { ApplicationStatus, MemberApplication } from '@/types/database'

/** Saturated accent color per application status — used for status-aware UI accents. */
export const STATUS_ACCENTS: Record<ApplicationStatus, string> = {
  pending:     '#ca8a04',
  shortlisted: '#3b82f6',
  interviewed: '#7c3aed',
  approved:    '#16a34a',
  rejected:    '#CC0000',
  withdrawn:   '#999999',
}

/**
 * Attaches average portfolio score, score count, and duplicate flags
 * (shared by the list page and the detail page so both stay in sync).
 */
export async function enrichApplications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  applications: MemberApplication[]
): Promise<MemberApplication[]> {
  if (applications.length === 0) return []

  const ids = applications.map(a => a.id)

  const { data: scores } = await supabase
    .from('application_scores')
    .select('application_id, score')
    .in('application_id', ids)

  const scoreMap = new Map<string, number[]>()
  for (const row of (scores as any[]) || []) {
    const list = scoreMap.get(row.application_id) || []
    list.push(row.score)
    scoreMap.set(row.application_id, list)
  }

  // Duplicate detection — same email (case-insensitive) appearing more than once
  const emailCounts = new Map<string, number>()
  for (const a of applications) {
    const key = a.email.trim().toLowerCase()
    emailCounts.set(key, (emailCounts.get(key) || 0) + 1)
  }

  return applications.map(a => {
    const list = scoreMap.get(a.id)
    const avgScore = list && list.length
      ? list.reduce((sum, s) => sum + s, 0) / list.length
      : null
    return {
      ...a,
      avgScore,
      scoreCount: list?.length || 0,
      isDuplicate: (emailCounts.get(a.email.trim().toLowerCase()) || 0) > 1,
    }
  })
}

/** Builds "JD" style initials from a full name. */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic accent color for an avatar, based on the name. */
const AVATAR_COLORS = ['#CC0000', '#3b82f6', '#16a34a', '#ca8a04', '#7c3aed', '#db2777', '#0891b2']

export function getAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
