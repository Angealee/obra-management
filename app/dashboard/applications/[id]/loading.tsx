import { Skeleton } from '@/components/Skeleton'

// Renders into the right-hand detail column; the list/filter shell stays put
// (it lives in applications/layout.tsx). Mirrors the stacked dash-cards of the
// real applicant detail: header, profile, evaluation, decision.
export default function ApplicationDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sticky header: avatar + name + status badge */}
      <div className="dash-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton w={44} h={44} r={999} />
          <div>
            <Skeleton w={180} h={18} r={6} />
            <Skeleton w={130} h={12} r={5} style={{ marginTop: 8 }} />
          </div>
        </div>
        <Skeleton w={84} h={22} r={6} />
      </div>

      {/* Profile card: info grid + positions + motivation */}
      <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton w={140} h={13} r={5} />
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '14px 24px', background: '#F7F7F5', borderRadius: 10, padding: '18px 20px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton w={70} h={10} r={4} />
              <Skeleton w="80%" h={13} r={5} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div>
          <Skeleton w={90} h={10} r={4} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton w={100} h={26} r={999} />
            <Skeleton w={120} h={26} r={999} />
          </div>
        </div>
        <div>
          <Skeleton w={140} h={10} r={4} style={{ marginBottom: 10 }} />
          <Skeleton w="100%" h={64} r={8} />
        </div>
      </div>

      {/* Evaluation card */}
      <div className="dash-card">
        <Skeleton w={150} h={13} r={5} style={{ marginBottom: 18 }} />
        <Skeleton w="100%" h={48} r={8} />
      </div>

      {/* Decision card */}
      <div className="dash-card">
        <Skeleton w={140} h={13} r={5} style={{ marginBottom: 18 }} />
        <Skeleton w="100%" h={80} r={8} />
      </div>
    </div>
  )
}
