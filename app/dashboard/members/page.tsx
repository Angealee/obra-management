import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    consultant: 'bg-purple-100 text-purple-700',
    creative_head: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
  }
  const labels: Record<string, string> = {
    consultant: 'Consultant',
    creative_head: 'Creative Head',
    member: 'Member',
  }
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${styles[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[role] ?? role}
    </span>
  )
}

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  // Only consultant and creative_head can access
  if (profile.system_role === 'member') redirect('/dashboard')

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true }) as { data: Profile[] | null }

  const activeMembers = members?.filter(m => m.is_active) ?? []
  const inactiveMembers = members?.filter(m => !m.is_active) ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Members</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeMembers.length} active · {inactiveMembers.length} inactive
          </p>
        </div>
        {(profile.system_role === 'consultant' || profile.system_role === 'creative_head') && (
          <Link
            href="/dashboard/members/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            + Add Member
          </Link>
        )}
      </div>

      {/* Active Members */}
      {activeMembers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No members yet.</p>
          <Link
            href="/dashboard/members/new"
            className="mt-4 inline-block text-sm text-gray-600 underline"
          >
            Add your first member
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-4 text-gray-500 font-medium">Email</th>
                <th className="text-left px-6 py-4 text-gray-500 font-medium">Role</th>
                <th className="text-left px-6 py-4 text-gray-500 font-medium">Course</th>
                <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
                <th className="text-left px-6 py-4 text-gray-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{m.full_name}</td>
                  <td className="px-6 py-4 text-gray-500">{m.email}</td>
                  <td className="px-6 py-4"><RoleBadge role={m.system_role} /></td>
                  <td className="px-6 py-4 text-gray-500">{m.course_section ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/members/${m.id}`}
                      className="text-gray-500 hover:text-gray-900 underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Inactive Members</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-60">
            <table className="w-full text-sm">
              <tbody>
                {inactiveMembers.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-600">{m.full_name}</td>
                    <td className="px-6 py-4 text-gray-400">{m.email}</td>
                    <td className="px-6 py-4"><RoleBadge role={m.system_role} /></td>
                    <td className="px-6 py-4 text-gray-400">{m.course_section ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-400 text-xs font-medium px-3 py-1 rounded-full">
                        Inactive
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/members/${m.id}`}
                        className="text-gray-400 hover:text-gray-700 underline text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}