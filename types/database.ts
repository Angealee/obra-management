export type SystemRole = 'consultant' | 'creative_head' | 'member'

export type CreativeHeadRole =
  | 'creative_producer'
  | 'creative_writer'
  | 'creative_director'
  | 'none'

// A member's single primary creative position. Distinct from member_skills
// (which lists secondary capabilities). Only meaningful for system_role = 'member'.
export type MemberRole =
  | 'photographer'
  | 'videographer'
  | 'video_editor'
  | 'photo_editor'
  | 'graphic_designer'
  | 'animator'
  | 'none'

export type Profile = {
  id: string
  full_name: string
  email: string
  username: string | null
  avatar_url: string | null
  system_role: SystemRole
  creative_head_role: CreativeHeadRole
  member_role: MemberRole
  student_number: string | null
  course_section: string | null
  year_level: string | null
  contact_number: string | null
  birthday: string | null
  portfolio_url: string | null
  is_active: boolean
  created_at: string
}

export type AcademicYear = {
  id: string
  label: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

// One row per (academic year × member). Records which members are "active for"
// a given year, plus their creative position + status that year. system_role is
// NOT here — it stays global on the profile. See db/2026-academic-year-members.sql.
export type AcademicYearMember = {
  id: string
  academic_year_id: string
  profile_id: string
  member_role: MemberRole
  status: 'active' | 'inactive' | 'archived'
  created_at: string
}

// One audit-trail entry. Written by the DB trigger (authenticated writes) or
// lib/activityLog.ts (service-role API routes). Consultant-only via RLS.
export type ActivityLog = {
  id: string
  actor_id: string | null
  action: string
  target_table: string
  target_id: string | null
  details: {
    target_label?: string
    identifier?: string
    mark?: string
    purged?: number
    diff?: Record<string, { old?: string; new?: string; changed?: boolean }>
  } | null
  created_at: string
}

export type MemberSkill = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type ProfileSkill = {
  id: string
  profile_id: string
  skill_id: string
  created_at: string
}

export type ProfileWithSkills = Profile & {
  profile_skills: {
    skill_id: string
    member_skills: MemberSkill
  }[]
}


export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

export type ObraEvent = {
  id: string
  academic_year_id: string | null
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  location: string | null
  status: EventStatus
  created_by: string | null
  created_at: string
}

export type ObraEventWithDetails = ObraEvent & {
  academic_years: { label: string } | null
  profiles: { full_name: string } | null
}

export type DutyType =
  | 'photographer' | 'photo_editor' | 'videographer' | 'video_editor'
  | 'graphic_designer' | 'animator' | 'other'

export type DutyPriority = 'low' | 'normal' | 'high' | 'urgent'

export type DutyStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed'

export type Duty = {
  id: string
  event_id: string | null
  assigned_to: string | null
  assigned_by: string | null
  title: string
  description: string | null
  duty_type: DutyType
  priority: DutyPriority
  status: DutyStatus
  due_date: string | null
  completed_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  remarks: string | null
  created_at: string
}

export type DutyWithDetails = Duty & {
  events: { title: string; event_date: string } | null
  assignee: { full_name: string } | null
  assigner: { full_name: string } | null
  reviewer: { full_name: string } | null
  duty_checklists: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  duty_id: string
  item_text: string
  is_done: boolean
  created_at: string
}

export type AnnouncementVisibility = 'all' | 'creative_heads' | 'members'

export type Announcement = {
  id: string
  academic_year_id: string | null
  title: string
  content: string
  posted_by: string | null
  visibility: AnnouncementVisibility
  created_at: string
}

export type AnnouncementWithPoster = Announcement & {
  academic_years: { label: string } | null
  poster: { full_name: string } | null
}

export type ApplicationStatus =
  | 'pending'
  | 'shortlisted'
  | 'interviewed'
  | 'approved'
  | 'rejected'
  | 'withdrawn'

export type MemberApplication = {
  id: string
  full_name: string
  email: string
  contact_number: string
  year_level: string
  course_section: string
  positions: string[]
  motivation: string
  portfolio_url: string | null
  status: ApplicationStatus
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  academic_year_id: string | null
  created_at: string
  // forensic fields (captured server-side at submission)
  submit_ip?: string | null
  user_agent?: string | null
  submit_meta?: Record<string, any> | null
  canonical_email?: string | null
  // joined fields
  reviewer?: { full_name: string } | null
  academic_year?: { label: string } | null
  // computed fields (added in app code, not from Supabase directly)
  avgScore?: number | null
  scoreCount?: number
  isDuplicate?: boolean
  /** True when the currently-signed-in reviewer has scored this application. */
  scoredByMe?: boolean
}

export type ApplicationScore = {
  id: string
  application_id: string
  scored_by: string
  score: number
  created_at: string
  updated_at: string
  // joined fields
  scorer?: { full_name: string } | null
}