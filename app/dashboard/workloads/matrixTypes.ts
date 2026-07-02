// Shared types for the workload matrix family (WorkLoadMatrix + its hooks and
// view components). Extracted unchanged from the original single-file matrix.

export type Mark = 'completed' | 'late' | 'did_not_duty' | null

export type Member = {
  id: string
  full_name: string
  system_role: string
  creative_head_role: string | null
  course_section: string | null
  profile_skills: { member_skills: { name: string } }[]
}

export type MatrixEvent = {
  id: string
  title: string
  event_date: string
  status: string
}

export type DutyCell = {
  id: string
  status: string
  duty_type: string
  reviewed_by: string | null
  title: string
}

export type MarkRecord = {
  id: string
  mark: string
} | null

export type Matrix = Record<string, Record<string, DutyCell[]>>
export type MarksMap = Record<string, MarkRecord>
export type PendingMap = Record<string, Mark>

export type MemberCounts = { total: number; reviewed: number; pendingCount: number }

export type SortOption = 'alpha' | 'alpha_desc' | 'most' | 'least'

export function getMemberSkills(member: Member): string[] {
  return (member.profile_skills?.map(ps => ps.member_skills?.name).filter(Boolean) as string[]) ?? []
}
