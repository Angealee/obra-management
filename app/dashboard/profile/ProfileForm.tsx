'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName]       = useState(profile.full_name)
  const [username, setUsername]       = useState(profile.username ?? '')
  const [contactNumber, setContact]   = useState(profile.contact_number ?? '')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  async function handleSave() {
    if (!fullName.trim()) return setError('Full name is required.')

    // Username format validation
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      return setError('Username must be 3–20 characters: lowercase letters, numbers, underscores only.')
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name:      fullName.trim(),
        username:       username.trim() || null,
        contact_number: contactNumber.trim() || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      if (updateError.message.includes('unique') || updateError.code === '23505') {
        setError('That username is already taken. Try another one.')
      } else {
        setError(updateError.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '24px' }}>
      <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '18px' }}>
        Basic Information
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label className="obra-label">Full Name <span style={{ color: '#CC0000' }}>*</span></label>
          <input
            type="text"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setSuccess(false) }}
            className="obra-input"
          />
        </div>

        <div>
          <label className="obra-label">Username</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '13.5px', color: '#bbb', pointerEvents: 'none',
            }}>@</span>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase()); setSuccess(false) }}
              placeholder="yourname"
              className="obra-input"
              style={{ paddingLeft: '28px' }}
            />
          </div>
          <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '4px' }}>
            3–20 characters. Letters, numbers, underscores only.
          </p>
        </div>

        <div>
          <label className="obra-label">Contact Number</label>
          <input
            type="text"
            value={contactNumber}
            onChange={e => { setContact(e.target.value); setSuccess(false) }}
            placeholder="09XX XXX XXXX"
            className="obra-input"
          />
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#CC0000' }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#16a34a' }}>✓ Profile updated successfully.</p>
          </div>
        )}

        <div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}