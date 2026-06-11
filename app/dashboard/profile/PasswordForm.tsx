'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PasswordForm({ email }: { email: string }) {
  const supabase = createClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [success, setSuccess]                 = useState(false)
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)

  // Password strength
  function getStrength(p: string): { score: number; label: string; color: string } {
    let score = 0
    if (p.length >= 8)  score++
    if (p.length >= 12) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    if (score <= 1) return { score, label: 'Weak', color: '#CC0000' }
    if (score <= 3) return { score, label: 'Fair', color: '#ca8a04' }
    return { score, label: 'Strong', color: '#16a34a' }
  }

  const strength = newPassword ? getStrength(newPassword) : null

  async function handleChange() {
    setError('')
    setSuccess(false)

    if (!currentPassword) return setError('Current password is required.')
    if (!newPassword)      return setError('New password is required.')
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    if (currentPassword === newPassword) return setError('New password must be different from the current one.')

    setLoading(true)

    // Step 1: Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    // Step 2: Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Success — clear fields
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
      <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '18px' }}>
        Change Password
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Current password */}
        <div>
          <label className="obra-label">Current Password <span style={{ color: '#CC0000' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setError(''); setSuccess(false) }}
              placeholder="Enter your current password"
              className="obra-input"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '11.5px', padding: '4px' }}
            >
              {showCurrent ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', margin: '2px 0' }} />

        {/* New password */}
        <div>
          <label className="obra-label">New Password <span style={{ color: '#CC0000' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); setSuccess(false) }}
              placeholder="Min. 8 characters"
              className="obra-input"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '11.5px', padding: '4px' }}
            >
              {showNew ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Strength meter */}
          {strength && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    flex: 1, height: '3px', borderRadius: '99px',
                    background: i <= strength.score ? strength.color : '#f0f0ee',
                    transition: 'background 0.2s ease',
                  }} />
                ))}
              </div>
              <p style={{ fontSize: '11px', color: strength.color, fontWeight: 500 }}>
                {strength.label}
                {strength.score < 3 && <span style={{ color: '#bbb', fontWeight: 400 }}> — try adding numbers or symbols</span>}
              </p>
            </div>
          )}
        </div>

        {/* Confirm new password */}
        <div>
          <label className="obra-label">Confirm New Password <span style={{ color: '#CC0000' }}>*</span></label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(''); setSuccess(false) }}
            placeholder="Re-enter your new password"
            className="obra-input"
            style={{
              borderColor: confirmPassword && confirmPassword !== newPassword ? '#fca5a5' : undefined,
            }}
          />
          {confirmPassword && confirmPassword !== newPassword && (
            <p style={{ fontSize: '11.5px', color: '#CC0000', marginTop: '4px' }}>Passwords do not match.</p>
          )}
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#CC0000' }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#16a34a' }}>✓ Password changed successfully.</p>
          </div>
        )}

        <div>
          <button
            onClick={handleChange}
            disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
            className="btn-primary"
            style={{ opacity: (loading || !currentPassword || !newPassword || newPassword !== confirmPassword) ? 0.4 : 1 }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        <p style={{ fontSize: '11.5px', color: '#bbb' }}>
          For your security, you need to enter your current password before setting a new one.
        </p>
      </div>
    </div>
  )
}