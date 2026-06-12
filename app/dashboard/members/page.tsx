import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import MembersTable from './MembersTable'
import EmptyState from '@/components/EmptyState'
import { CalendarRange, Users } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'

export default async function MembersPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const { viewYear, viewYearId } = await getAcademicYearContext()

  // Year-scoped roster: academic_year_members decides WHO is active for the
  // chosen year; the display fields (role / status / skills) come from the
  // profile, so existing Archive/Edit flows stay the source of truth.
  let members: any[] = []
  if (viewYearId) {
    const { data } = await supabase
      .from('academic_year_members')
      .select(`
        profiles!inner (
          id,
          full_name,
          email,
          student_number,
          course_section,
          year_level,
          system_role,
          creative_head_role,
          member_role,
          is_active,
          member_status,
          created_at,
          profile_skills (
            member_skills ( name )
          )
        )
      `)
      .eq('academic_year_id', viewYearId)
      .neq('profiles.system_role', 'consultant')

    members = (data as any[] ?? []).map(row => row.profiles)
  }

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">
            {viewYear
              ? <>Members active for <strong>{viewYear.label}</strong>.</>
              : 'All Creative Heads and Members of Obra.'}
          </p>
        </div>
        {canManage && (
          <a href="/dashboard/members/new" className="btn-primary">
            + Add Member
          </a>
        )}
      </div>

      {!viewYearId ? (
        <EmptyState
          icon={CalendarRange}
          title="No academic year to show members for"
          description="Create an academic year and set it active — then the roster for that year appears here."
          action={canManage ? { label: 'Go to Academic Years', href: '/dashboard/academic-years' } : undefined}
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`No one is active for ${viewYear?.label} yet`}
          description={
            canManage
              ? 'Add a member while this year is active, or mark an existing member active for this year from their profile.'
              : 'The roster for this academic year hasn’t been set up yet. Check back once members are added.'
          }
          action={canManage ? { label: '+ Add a member', href: '/dashboard/members/new' } : undefined}
        />
      ) : (
        <MembersTable
          members={members}
          userRole={profile.system_role}
        />
      )}
    </div>
  )
}
