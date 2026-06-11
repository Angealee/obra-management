import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MembersTable from './MembersTable'

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch all members with their skills
  const { data: members } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      student_number,
      course_section,
      year_level,
      system_role,
      creative_head_role,
      is_active,
      member_status,
      created_at,
      profile_skills (
        member_skills ( name )
      )
    `)
    .neq('system_role', 'consultant')
    .order('created_at', { ascending: false })

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">All active Creative Heads and Members of Obra.</p>
        </div>
        {(profile.system_role === 'consultant' || profile.system_role === 'creative_head') && (
          <a href="/dashboard/members/new" className="btn-primary">
            + Add Member
          </a>
        )}
      </div>

      <MembersTable
        members={(members as any[]) ?? []}
        userRole={profile.system_role}
      />
    </div>
  )
}