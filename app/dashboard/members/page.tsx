import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import MembersTable from './MembersTable'
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
        <div className="dash-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#999' }}>
            No academic year exists yet. Create one to start building a roster.
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="dash-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#999' }}>
            No members are active for <strong>{viewYear?.label}</strong> yet.
          </p>
          {canManage && (
            <p style={{ fontSize: 13, color: '#bbb', marginTop: 6 }}>
              Members added while this year is active will appear here.
            </p>
          )}
        </div>
      ) : (
        <MembersTable
          members={members}
          userRole={profile.system_role}
        />
      )}
    </div>
  )
}
