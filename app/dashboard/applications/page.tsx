import { Inbox } from 'lucide-react'

// Index route content. Auth + the list/filter shell live in layout.tsx; this
// only renders the right-hand placeholder shown before an applicant is opened.
export default function ApplicationsIndexPage() {
  return (
    <div
      className="dash-card"
      style={{
        height: '100%',
        minHeight: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 280 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#F2F2F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Inbox size={22} style={{ color: '#9a9a96' }} />
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#444', fontWeight: 600, margin: 0 }}>
          Select an applicant to review
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
          Choose someone from the list to see their profile, portfolio score, and decision history.
        </p>
      </div>
    </div>
  )
}
