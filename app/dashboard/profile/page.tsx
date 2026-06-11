import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import AvatarUpload from './AvatarUpload'
import ProfileForm from './ProfileForm'
import PasswordForm from './PasswordForm'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

  const roleLabel: Record<string, string> = {
    consultant:    'Consultant',
    creative_head: 'Creative Head',
    member:        'Member',
  }

  const creativeLabel: Record<string, string> = {
    creative_producer: 'Creative Producer',
    creative_writer:   'Creative Writer',
    creative_director: 'Creative Director',
  }

  const displayRole = profile.system_role === 'creative_head' && profile.creative_head_role && profile.creative_head_role !== 'none'
    ? creativeLabel[profile.creative_head_role]
    : roleLabel[profile.system_role]

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
          My Profile
        </h1>
        <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
          Manage your account information and security settings.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Identity card — read-only system info */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left" style={{ gap: '20px' }}>
            <AvatarUpload
              userId={profile.id}
              currentAvatarUrl={profile.avatar_url}
              fullName={profile.full_name}
            />
            <div className="min-w-0">
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#111', letterSpacing: '-0.2px' }}>
                {profile.full_name}
              </p>
              {profile.username && (
                <p style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>@{profile.username}</p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start items-center" style={{ gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '99px' }}>
                  {displayRole}
                </span>
                <span style={{ fontSize: '11px', color: '#bbb' }}>{profile.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable info */}
        <ProfileForm profile={profile} />

        {/* Password change */}
        <PasswordForm email={profile.email} />

        {/* Read-only system info */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '14px' }}>
            System Information
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              ['Email', profile.email],
              ['Student Number', profile.student_number ?? '—'],
              ['Course & Section', profile.course_section ?? '—'],
              ['Year Level', profile.year_level ?? '—'],
              ['Member Since', new Date(profile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center flex-wrap gap-x-3 last:border-0" style={{ padding: '11px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '13px', color: '#999' }}>{label}</span>
                <span style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '14px' }}>
            Contact your Consultant to update system information.
          </p>
        </div>

      </div>
    </div>
  )
}