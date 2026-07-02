'use client'

import { ArrowLeft, Mail } from 'lucide-react'
import type { JoinFormApi } from './useJoinForm'

// Email verification (OTP) screen — shown after the consent modal + code send.
export default function JoinVerify({ j }: { j: JoinFormApi }) {
  return (
    <div className="step-content flex flex-col">
      <button type="button" onClick={() => { j.setOtpSent(false); j.setOtpError(null) }}
        className="mb-5 inline-flex items-center gap-1.5 self-start"
        style={{ fontSize: 12.5, fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ArrowLeft size={14} /> Back to application
      </button>

      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#FFF1F1' }}>
        <Mail size={22} style={{ color: '#CC0000' }} />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '14px 0 8px' }}>
        Verify your email
      </h3>
      <p style={{ fontSize: 13.5, color: '#666', lineHeight: 1.6, margin: '0 0 22px' }}>
        We sent a 6-digit code to <strong style={{ color: '#111' }}>{j.form.email}</strong>.
        Enter it below to submit your application. The code expires in 10 minutes.
      </p>

      <form onSubmit={j.handleVerify} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="obra-label">Verification Code</label>
          <input
            className="obra-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={j.code}
            autoFocus
            onChange={e => j.setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ letterSpacing: '0.4em', fontSize: 20, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}
          />
          {j.otpError && (
            <p className="text-[11.5px]" style={{ color: '#CC0000', marginTop: 2 }}>{j.otpError}</p>
          )}
        </div>

        <button type="submit" disabled={j.verifying || j.code.length !== 6}
          className="btn-primary justify-center py-3 text-[14px]"
          style={{ opacity: j.verifying || j.code.length !== 6 ? 0.7 : 1 }}>
          {j.verifying ? 'Verifying…' : 'Verify & Submit'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span style={{ fontSize: 12.5, color: '#6b7280' }}>Didn&apos;t get the code? </span>
        <button type="button" onClick={j.handleResend} disabled={j.resendIn > 0}
          style={{ fontSize: 12.5, fontWeight: 600, color: j.resendIn > 0 ? '#bbb' : '#CC0000', background: 'none', border: 'none', cursor: j.resendIn > 0 ? 'default' : 'pointer', padding: 0 }}>
          {j.resendIn > 0 ? `Resend in ${j.resendIn}s` : 'Resend code'}
        </button>
      </div>

      <p className="mt-3 text-center" style={{ fontSize: 11.5, color: '#bbb', lineHeight: 1.5 }}>
        Wrong email? Tap &ldquo;Back to application&rdquo; to fix it, then resend.
      </p>

      <p className="mt-4 text-center" style={{ fontSize: 10.5, color: '#ccc', lineHeight: 1.5 }}>
        For security, we record basic technical details of this submission
        (such as IP address and device/browser info) to prevent abuse of this form.
      </p>
    </div>
  )
}
