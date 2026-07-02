'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import PrivacyModal from './PrivacyModal'
import JoinSuccess from './JoinSuccess'
import JoinVerify from './JoinVerify'
import { JoinStepper, StepPersonalInfo, StepPositions, StepAboutYou, StepReview } from './JoinSteps'
import { useJoinForm } from './useJoinForm'
import { STEPS } from './joinFormShared'

// Orchestrator for the public application form. All state and behavior —
// multi-step validation, localStorage draft, the privacy-consent gate, and
// the OTP verification flow — lives in useJoinForm; the screens and steps are
// presentation-only siblings in this folder.

export default function JoinForm() {
  const j = useJoinForm()

  if (j.submitted) return <JoinSuccess />

  // ── EMAIL VERIFICATION (OTP) ──
  if (j.otpSent) return <JoinVerify j={j} />

  return (
    <div>
      {/* ── DRAFT RESTORED NOTICE ── */}
      {j.draftRestored && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/6 px-4 py-2.5" style={{ background: '#FAFAF9' }}>
          <span className="text-[12.5px]" style={{ color: '#666' }}>We restored your previous draft.</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => j.setDraftRestored(false)}
              style={{ fontSize: 11.5, fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Dismiss
            </button>
            <button type="button" onClick={j.startOver}
              style={{ fontSize: 11.5, fontWeight: 500, color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Start Over
            </button>
          </div>
        </div>
      )}

      <JoinStepper step={j.step} />

      <form onSubmit={j.handleSendCode} className="flex flex-col gap-5">

        {/* ── HONEYPOT (anti-bot): hidden from humans, bots fill it ── */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={j.honeypot}
            onChange={e => j.setHoneypot(e.target.value)}
          />
        </div>

        {j.step === 1 && <StepPersonalInfo j={j} />}
        {j.step === 2 && <StepPositions j={j} />}
        {j.step === 3 && <StepAboutYou j={j} />}
        {j.step === 4 && <StepReview j={j} />}

        {j.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 step-content">
            {j.error}
          </div>
        )}

        {/* ── NAVIGATION ── */}
        <div className="flex items-center gap-3">
          {j.step > 1 && (
            <button type="button" onClick={j.goBack}
              className="btn-secondary justify-center py-3 text-[14px]"
              style={{ flex: '0 0 auto' }}>
              <ArrowLeft size={15} /> Back
            </button>
          )}

          {j.step < STEPS.length && (
            <button type="button" onClick={j.goNext}
              className="btn-primary flex-1 justify-center py-3 text-[14px]">
              Continue <ArrowRight size={15} />
            </button>
          )}

          {j.step === STEPS.length && (
            <button type="submit" disabled={j.loading}
              className="btn-primary flex-1 justify-center py-3 text-[14px]"
              style={{ opacity: j.loading ? 0.7 : 1 }}>
              {j.loading ? 'Sending code…' : 'Continue to Verification →'}
            </button>
          )}
        </div>

        {j.step === STEPS.length && (
          <p className="text-center text-[11.5px]" style={{ color: '#6b7280', marginTop: -6 }}>
            {j.consented
              ? 'You have agreed to our Data Privacy Notice.'
              : 'You will be asked to review our Data Privacy Notice before anything is sent.'}
          </p>
        )}

        <p className="text-center text-[11.5px] text-[#ccc]">
          For internal use by CCS — Obra Creative Media Productions
        </p>
      </form>

      <PrivacyModal
        open={j.showPrivacy}
        onClose={() => j.setShowPrivacy(false)}
        onAgree={() => {
          j.setConsented(true)
          j.setShowPrivacy(false)
          void j.sendCode()
        }}
      />
    </div>
  )
}
