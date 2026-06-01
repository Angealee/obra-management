import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile, MemberSkill } from '@/types/database'
import ToggleActiveButton from './ToggleActiveButton'

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viewer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!viewer || viewer.system_role === 'member') redirect('/dashboard')

  // Fetch member with their skills
  const { data: member } = await supabase
    .from('profiles')
    .select(`
      *,
      profile_skills (
        skill_id,
        member_skills ( id, name )
      )
    `)
    .eq('id', id)
    .single() as { data: any | null }

  if (!member) redirect('/dashboard/members')

  const roleLabels: Record<string, string> = {
    consultant: 'Consultant',
    creative_head: 'Creative Head',
    member: 'Member',
  }

  const creativeRoleLabels: Record<string, string> = {
    creative_producer: 'Creative Producer',
    creative_writer: 'Creative Writer',
    creative_director: 'Creative Director',
    none: '—',
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/members" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Members
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{member.full_name}</h1>
          {member.is_active ? (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">Inactive</span>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Profile</h2>
        {[
          ['Email', member.email],
          ['Student Number', member.student_number ?? '—'],
          ['Course & Section', member.course_section ?? '—'],
          ['Year Level', member.year_level ?? '—'],
          ['Contact Number', member.contact_number ?? '—'],
          ['System Role', roleLabels[member.system_role] ?? member.system_role],
          ['Creative Head Role', creativeRoleLabels[member.creative_head_role] ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Skills</h2>
        {member.profile_skills?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {member.profile_skills.map((ps: any) => (
              <span
                key={ps.skill_id}
                className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full"
              >
                {ps.member_skills?.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No skills assigned.</p>
        )}
      </div>

      {/* Actions */}
      {viewer.system_role === 'consultant' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Account Status</h2>
          <p className="text-gray-400 text-xs mb-4">
            Inactive members cannot log in but their records are preserved.
          </p>
          <ToggleActiveButton
            memberId={member.id}
            isActive={member.is_active}
            memberName={member.full_name}
          />
        </div>
      )}
    </div>
  )
}