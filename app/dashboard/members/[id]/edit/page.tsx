import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import EditMemberForm from './EditMemberForm'

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only consultants may edit members.
  const { data: viewer } = await supabase
    .from('profiles').select('system_role').eq('id', user.id).single() as { data: Profile | null }
  if (!viewer || viewer.system_role !== 'consultant') redirect('/dashboard')

  const { data: member } = await supabase
    .from('profiles')
    .select(`*, profile_skills ( skill_id )`)
    .eq('id', id)
    .single() as { data: any | null }

  if (!member) redirect('/dashboard/members')

  // Consultant accounts are not editable through this flow.
  if (member.system_role === 'consultant') redirect(`/dashboard/members/${id}`)

  const skillIds: string[] = (member.profile_skills ?? [])
    .map((ps: any) => ps.skill_id)
    .filter(Boolean)

  return (
    <EditMemberForm
      member={{
        id: member.id,
        full_name: member.full_name,
        username: member.username,
        email: member.email,
        system_role: member.system_role,
        creative_head_role: member.creative_head_role,
        member_role: member.member_role ?? 'none',
        student_number: member.student_number,
        course_section: member.course_section,
        year_level: member.year_level,
        contact_number: member.contact_number,
        skillIds,
      }}
    />
  )
}
