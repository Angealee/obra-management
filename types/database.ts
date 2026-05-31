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