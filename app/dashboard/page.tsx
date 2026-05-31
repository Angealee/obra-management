import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Welcome, {profile.full_name}
      </h1>
      <p className="text-gray-500 text-sm mb-8 capitalize">
        Role: {profile.system_role.replace('_', ' ')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">Pending Duties</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">Completed Duties</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">Upcoming Events</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">—</p>
        </div>
      </div>

      <p className="text-gray-400 text-xs mt-8">
        Future dashboard data here.
      </p>
    </div>
  )
}