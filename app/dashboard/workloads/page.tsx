import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import WorkloadMatrix from './WorkLoadMatrix'
import { getAcademicYearContext } from '@/lib/academicYear'

export default async function WorkloadsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')
  if (profile.system_role === 'member') redirect('/dashboard')

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // Year comes from the system-wide picker (cookie), defaulting to the active year.
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const selectedAYId = viewYearId

  const { data: events } = selectedAYId
    ? await supabase
        .from('events')
        .select('id, title, event_date, status')
        .eq('academic_year_id', selectedAYId)
        .neq('status', 'cancelled')
        .order('event_date', { ascending: true })
    : { data: [] as { id: string; title: string; event_date: string; status: string }[] }

  const { data: members } = await supabase
    .from('profiles')
    .select(`
      id, full_name, system_role, creative_head_role,
      course_section, is_active,
      profile_skills ( member_skills ( name ) )
    `)
    .neq('system_role', 'consultant')
    .eq('is_active', true)
    .order('full_name')

  const eventIds = events?.map(e => e.id) ?? []

  const { data: duties } = eventIds.length > 0
    ? await supabase
        .from('duties')
        .select('id, event_id, assigned_to, duty_type, status, title')
        .in('event_id', eventIds)
    : { data: [] }

  const { data: marks } = eventIds.length > 0
    ? await supabase
        .from('workload_marks')
        .select('*')
        .in('event_id', eventIds)
    : { data: [] }

  // Build matrix
  type DutyCell = { id: string; status: string; duty_type: string; title: string }
  const matrix: Record<string, Record<string, DutyCell[]>> = {}
  for (const member of members ?? []) {
    matrix[member.id] = {}
    for (const event of events ?? []) {
      matrix[member.id][event.id] = []
    }
  }
  for (const duty of duties ?? []) {
    if (duty.assigned_to && matrix[duty.assigned_to]?.[duty.event_id]) {
      matrix[duty.assigned_to][duty.event_id].push(duty)
    }
  }

  // Build marks map
  const marksMap: Record<string, { id: string; mark: string }> = {}
  for (const m of marks ?? []) {
    marksMap[`${m.member_id}_${m.event_id}`] = { id: m.id, mark: m.mark }
  }

  return (
    <div className="page-enter">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="page-title">Workload Matrix</h1>
          <p className="page-subtitle">
            Track member assignments and balance duties across events
            {viewYear ? ` · ${viewYear.label}` : ''}.
          </p>
        </div>
      </div>

      <WorkloadMatrix
        members={(members as any) ?? []}
        events={events ?? []}
        matrix={matrix}
        initialMarksMap={marksMap}
        canManage={canManage}
      />
    </div>
  )
}