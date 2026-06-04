export type SystemRole = 'consultant' | 'creative_head' | 'member'

export type CreativeHeadRole =
  | 'creative_producer'
  | 'creative_writer'
  | 'creative_director'
  | 'none'

export type Profile = {
  id: string
  full_name: string
  email: string
  system_role: SystemRole
  creative_head_role: CreativeHeadRole
  student_number: string | null
  course_section: string | null
  year_level: string | null
  contact_number: string | null
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

// Add these new types below

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
  | 'photography' | 'videography' | 'video_editing' | 'photo_editing'
  | 'graphic_design' | 'animation' | 'writing' | 'event_assistance' | 'other'

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