import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  console.log('Dashboard layout - user:', user?.id, 'error:', userError)

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('Dashboard layout - profile:', profile, 'error:', profileError)

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full">
          <h2 className="text-lg font-bold text-red-600 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 text-sm mb-4">
            Your account exists but has no profile record in the database.
          </p>
          <p className="text-gray-500 text-xs mb-4">
            User ID: <code className="bg-gray-100 px-1 rounded">{user.id}</code>
          </p>
          {profileError && (
            <p className="text-red-500 text-xs">
              Error: {profileError.message}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-4">
            Check the browser console and your Supabase profiles table.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">Obra</h1>
          <p className="text-gray-400 text-xs mt-1">Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a href="/dashboard" className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
            Dashboard
          </a>
          {(profile.system_role === 'consultant' || profile.system_role === 'creative_head') && (
            <>
              <a href="/dashboard/members" className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
                Members
              </a>
              <a href="/dashboard/events" className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
                Events
              </a>
            </>
          )}
          {profile.system_role === 'consultant' && (
            <a href="/dashboard/academic-years" className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
              Academic Years
            </a>
            
          )}
          
          <a href="/dashboard/duties" className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
            Obra Duties
          </a>

          <a href="/dashboard/workloads"
            className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            Obra Workloads
          </a>

          
        </nav>

          


        

        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-white font-medium">{profile.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{profile.system_role.replace('_', ' ')}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="mt-3 text-xs text-gray-400 hover:text-red-500 transition">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}