import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from './ApplicationsClient'

export default async function ApplicationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['consultant', 'creative_head'].includes(profile.system_role)) {
    redirect('/dashboard')
  }

  const { data: applications } = await supabase
    .from('member_applications')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 32,
          letterSpacing: '0.04em',
          color: '#111',
          marginBottom: 4,
        }}>
          MEMBERSHIP APPLICATIONS
        </h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#666' }}>
          Review and evaluate applicants for Obra Creative Media Productions.
        </p>
      </div>

      <ApplicationsClient
        applications={(applications as any[]) || []}
        selectedId={null}
      >
        {/* Empty state when no application is selected */}
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 12,
          minHeight: 400,
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 15, color: '#BBB', fontWeight: 500 }}>
              Select an applicant to view details
            </p>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#DDD', marginTop: 4 }}>
              Use the list on the left to browse applications
            </p>
          </div>
        </div>
      </ApplicationsClient>
    </div>
  )
}