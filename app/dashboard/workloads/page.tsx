import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import WorkloadMatrix from './WorkLoadMatrix'

export default async function WorkloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>
}) {
  const { ay } = await searchParams
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

  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('*')
    .order('start_date', { ascending: false })

  const activeAY = academicYears?.find(a => a.is_active)
  const selectedAYId = ay ?? activeAY?.id ?? academicYears?.[0]?.id

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, status')
    .eq('academic_year_id', selectedAYId)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })

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

  const totalDuties    = duties?.length ?? 0
  const reviewedDuties = duties?.filter(d => d.status === 'reviewed').length ?? 0
  const pendingDuties  = duties?.filter(d => d.status === 'pending').length ?? 0

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Obra Workload</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track member assignments and identify workload distribution.
          </p>
        </div>

        {/* AY Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Academic Year:</span>
          {academicYears?.map(ay => (
            <Link
              key={ay.id}
              href={`/dashboard/workloads?ay=${ay.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                ay.id === selectedAYId
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {ay.label}
            </Link>
          ))}
        </div>
      </div>

      <WorkloadMatrix
        members={(members as any) ?? []}
        events={events ?? []}
        matrix={matrix}
        initialMarksMap={marksMap}
        canManage={canManage}
        totalDuties={totalDuties}
        reviewedDuties={reviewedDuties}
        pendingDuties={pendingDuties}
      />
    </div>
  )
}