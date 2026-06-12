'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Ban, ShieldCheck, AlertTriangle } from 'lucide-react'

type Meta = {
  accept_language?: string | null
  device_hash?: string | null
  client?: {
    ua?: string
    lang?: string
    langs?: string[]
    platform?: string
    tz?: string
    screen?: { w?: number; h?: number; dpr?: number }
    cores?: number
    mem?: number
  }
} | null

type BlockType = 'ip' | 'email' | 'domain'

export default function ForensicsPanel({
  isConsultant,
  ip,
  userAgent,
  email,
  canonicalEmail,
  domain,
  meta,
  related,
  blocked,
}: {
  isConsultant: boolean
  ip: string | null
  userAgent: string | null
  email: string
  canonicalEmail: string | null
  domain: string | null
  meta: Meta
  related: { ip: number; email: number; device: number }
  blocked: { ip: boolean; email: boolean; domain: boolean }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<BlockType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const client = meta?.client ?? {}
  const deviceHash = meta?.device_hash ?? null
  const emailBlockValue = canonicalEmail ?? email
  const hasForensics = !!(ip || userAgent || deviceHash || meta?.accept_language)

  async function toggle(block_type: BlockType, value: string | null, currentlyBlocked: boolean) {
    if (!value) return
    if (block_type === 'ip' && !currentlyBlocked) {
      const ok = window.confirm(
        'Block this IP address?\n\nHeads up: people on the same network (e.g. campus Wi-Fi) often share one IP, ' +
          'so this can block legitimate applicants too. Prefer blocking the email or domain when possible.',
      )
      if (!ok) return
    }
    setBusy(block_type)
    setError(null)
    try {
      const res = await fetch('/api/applications/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentlyBlocked ? 'unblock' : 'block',
          block_type,
          value,
          reason: 'Flagged during application review',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Action failed.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const flags: string[] = []
  if (related.device > 0) flags.push(`${related.device} other application${related.device > 1 ? 's' : ''} from this device`)
  if (related.ip > 0) flags.push(`${related.ip} other application${related.ip > 1 ? 's' : ''} from this IP`)
  if (related.email > 0) flags.push(`${related.email} other application${related.email > 1 ? 's' : ''} from this inbox`)

  return (
    <div className="dash-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <ShieldAlert size={15} style={{ color: '#CC0000' }} />
        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
          Security &amp; Forensics
        </h3>
      </div>

      {/* Correlation flags — the "catch the perpetrator" signal */}
      {flags.length > 0 && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '10px 12px', marginBottom: 16,
          }}
        >
          {flags.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#92400e' }}>
              <AlertTriangle size={12} /> {f}
            </div>
          ))}
        </div>
      )}

      {!hasForensics ? (
        <p style={{ fontSize: 12.5, color: '#bbb', margin: 0 }}>
          No forensic data on this application (submitted before security tracking was enabled).
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '12px 24px' }}>
          <Row label="IP Address" value={ip} mono />
          <Row label="Device Fingerprint" value={deviceHash} mono />
          <Row label="Canonical Email" value={canonicalEmail} mono />
          <Row label="Timezone" value={client.tz ?? null} />
          <Row label="Platform" value={client.platform ?? null} />
          <Row label="Languages" value={(client.langs ?? (client.lang ? [client.lang] : []))?.join(', ') || null} />
          <Row
            label="Screen"
            value={client.screen?.w ? `${client.screen.w}×${client.screen.h} @${client.screen.dpr ?? 1}x` : null}
          />
          <Row label="CPU / Memory" value={[client.cores && `${client.cores} cores`, client.mem && `${client.mem} GB`].filter(Boolean).join(' · ') || null} />
          <div className="sm:col-span-2">
            <Row label="User Agent" value={userAgent} mono small />
          </div>
        </div>
      )}

      {/* Block controls — consultant only */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 18, paddingTop: 16 }}>
        {isConsultant ? (
          <>
            <p className="section-label" style={{ marginBottom: 10, color: '#555' }}>Block from /join</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <BlockButton label="email" value={emailBlockValue} blocked={blocked.email} busy={busy === 'email'}
                onClick={() => toggle('email', emailBlockValue, blocked.email)} />
              <BlockButton label="domain" value={domain} blocked={blocked.domain} busy={busy === 'domain'}
                onClick={() => toggle('domain', domain, blocked.domain)} />
              <BlockButton label="IP" value={ip} blocked={blocked.ip} busy={busy === 'ip'}
                onClick={() => toggle('ip', ip, blocked.ip)} />
            </div>
            <p style={{ fontSize: 11, color: '#bbb', marginTop: 10, lineHeight: 1.5 }}>
              Blocked identifiers are silently rejected at the /join form (no error shown to them).
              Prefer email/domain blocks — IP blocks can affect a whole shared network.
            </p>
            {error && <p style={{ fontSize: 11.5, color: '#CC0000', marginTop: 8 }}>{error}</p>}
          </>
        ) : (
          <p style={{ fontSize: 11.5, color: '#bbb', margin: 0 }}>
            Only a Consultant can block submissions.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono, small }: { label: string; value: string | null; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="section-label" style={{ marginBottom: 3 }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
          fontSize: small ? 11 : 12.5,
          color: value ? '#111' : '#ccc',
          fontWeight: 500,
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

function BlockButton({
  label, value, blocked, busy, onClick,
}: {
  label: string; value: string | null; blocked: boolean; busy: boolean; onClick: () => void
}) {
  const disabled = !value || busy
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={value ?? 'Not available'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
        padding: '6px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        border: blocked ? '1px solid #16a34a' : '1px solid rgba(204,0,0,0.25)',
        background: blocked ? '#f0fdf4' : 'transparent',
        color: blocked ? '#16a34a' : '#CC0000',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {blocked ? <ShieldCheck size={13} /> : <Ban size={13} />}
      {blocked ? `Unblock ${label}` : `Block ${label}`}
    </button>
  )
}
