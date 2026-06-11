import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import PageWrapper from '@/components/PageWrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', padding: '32px', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#CC0000', marginBottom: '8px' }}>Profile Not Found</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Your account exists but has no profile record.</p>
          <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>ID: {user.id}</p>
          {profileError && <p style={{ fontSize: '12px', color: '#CC0000', marginTop: '8px' }}>{profileError.message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ height: '100vh', overflow: 'hidden', background: '#F7F7F5' }}>
      <Sidebar profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <PageWrapper>{children}</PageWrapper>
      </main>
    </div>
  )
}