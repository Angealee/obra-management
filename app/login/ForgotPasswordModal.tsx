'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react'

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [identifier, setIdentifier] = useState('')
  const [code, setCode]           = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [honeypot, setHoneypot]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [resendIn, setResendIn]   = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => setResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  async function sendCode() {
    if (!identifier.trim()) { setError('Enter your email or username.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), website: honeypot }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return }
      setStep(2)
      setResendIn(60)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0) return
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), website: honeypot }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not resend the code.'); return }
      setResendIn(60)
    } catch {
      setError('Network error. Please try again.')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code we emailed you.'); return }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code, newPassword, website: honeypot }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not reset your password.'); return }
      setStep(3)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Enter Code'}
            {step === 3 && 'Done'}
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* honeypot */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="fp-website">Website</label>
          <input id="fp-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
        </div>

        {/* ── STEP 1: identifier ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#FFF1F1' }}>
              <Mail size={20} style={{ color: '#CC0000' }} />
            </div>
            <p style={{ fontSize: 13.5, color: '#666', lineHeight: 1.6 }}>
              Enter your email or username and we&apos;ll send a 6-digit verification code to reset your password.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="obra-label">Email or Username</label>
              <input
                className="obra-input"
                type="text"
                placeholder="you@email.com or username"
                value={identifier}
                autoFocus
                onChange={e => setIdentifier(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendCode()}
              />
            </div>
            {error && <p style={{ fontSize: 11.5, color: '#CC0000' }}>{error}</p>}
            <button type="button" onClick={sendCode} disabled={loading}
              className="btn-primary justify-center py-3 text-[14px]"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </div>
        )}

        {/* ── STEP 2: code + new password ── */}
        {step === 2 && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#FFF1F1' }}>
              <KeyRound size={20} style={{ color: '#CC0000' }} />
            </div>
            <p style={{ fontSize: 13.5, color: '#666', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: '#111' }}>{identifier.trim()}</strong>, a code was
              sent to its email. Enter it below along with your new password.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="obra-label">Verification Code</label>
              <input
                className="obra-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                autoFocus
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ letterSpacing: '0.4em', fontSize: 18, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="obra-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="obra-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="obra-label">Confirm New Password</label>
              <input
                className="obra-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? '#fca5a5' : undefined }}
              />
            </div>

            {error && <p style={{ fontSize: 11.5, color: '#CC0000' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="btn-primary justify-center py-3 text-[14px]"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>

            <div className="text-center">
              <span style={{ fontSize: 12.5, color: '#999' }}>Didn&apos;t get the code? </span>
              <button type="button" onClick={handleResend} disabled={resendIn > 0}
                style={{ fontSize: 12.5, fontWeight: 600, color: resendIn > 0 ? '#bbb' : '#CC0000', background: 'none', border: 'none', cursor: resendIn > 0 ? 'default' : 'pointer', padding: 0 }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: success ── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Password updated</p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              You can now sign in with your new password.
            </p>
            <button type="button" onClick={onClose} className="btn-primary justify-center py-3 text-[14px]" style={{ width: '100%' }}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
