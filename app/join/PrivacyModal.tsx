'use client'

import { useEffect } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { PRIVACY_CONTACT_EMAIL } from '@/lib/privacyPolicy'

// Data Privacy Notice shown as a blocking modal when the applicant clicks
// "Continue to Verification" on /join — BEFORE any personal data is sent to
// the server (the OTP request is the first transmission). Agreeing records
// consent; the API refuses submissions without it (lib/applicationValidation).

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>
        {title}
      </p>
      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

export default function PrivacyModal({
  open,
  onClose,
  onAgree,
}: {
  open: boolean
  onClose: () => void
  onAgree: () => void
}) {
  // Close on Escape + lock background scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF1F1', color: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={19} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 id="privacy-modal-title" style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>
              Data Privacy Notice
            </h3>
            <p style={{ fontSize: 11.5, color: '#999', margin: '2px 0 0' }}>
              Please read before submitting your application.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy notice"
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#999', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          <Section title="Who we are">
            <p style={{ margin: 0 }}>
              Obra Creative Media Productions is a student organization under the College of
              Computer Studies (CCS), Dominican College of Tarlac. This notice explains how we
              handle the personal data you provide through this application form, in line with
              the Data Privacy Act of 2012 (RA 10173).
            </p>
          </Section>

          <Section title="What we collect">
            <p style={{ margin: '0 0 6px' }}>
              The information you enter: your full name, email address, contact number, year
              level, course &amp; section, positions applied for, motivation, and portfolio link.
            </p>
            <p style={{ margin: 0 }}>
              We also automatically record basic technical details when you submit — your IP
              address, browser and device information, and a device signature. These are used
              solely to protect this public form from spam, impersonation, and duplicate
              submissions.
            </p>
          </Section>

          <Section title="Why we collect it">
            <p style={{ margin: 0 }}>
              To review and process your membership application, verify your enrollment, contact
              you about your application status, and keep this form safe from abuse. Nothing else.
            </p>
          </Section>

          <Section title="Who can see it">
            <p style={{ margin: 0 }}>
              Only authorized Obra officers (the consultant and creative heads) can view
              applications. Your data is never sold, and never shared outside the organization.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p style={{ margin: 0 }}>
              If your application is rejected or withdrawn, it is deleted within one (1) year
              after the decision. If you are accepted, your application details become part of
              your member record for as long as you are a member.
            </p>
          </Section>

          <Section title="Your rights">
            <p style={{ margin: 0 }}>
              You may request access to, correction of, or deletion of your personal data at any
              time by emailing{' '}
              <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} style={{ color: '#CC0000', textDecoration: 'underline' }}>
                {PRIVACY_CONTACT_EMAIL}
              </a>.
            </p>
          </Section>

          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, margin: 0, background: '#FAFAF9', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 8, padding: '10px 12px' }}>
            By clicking <strong style={{ color: '#555' }}>“I Agree &amp; Continue”</strong>, you confirm that you have read this
            notice and consent to the collection and processing of your personal data as
            described above. The date and version of your consent are recorded with your
            application.
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 22px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <button type="button" onClick={onClose} className="btn-secondary justify-center py-3 text-[13.5px]" style={{ flex: '0 0 auto' }}>
            Cancel
          </button>
          <button type="button" onClick={onAgree} className="btn-primary flex-1 justify-center py-3 text-[13.5px]">
            I Agree &amp; Continue
          </button>
        </div>
      </div>
    </div>
  )
}
