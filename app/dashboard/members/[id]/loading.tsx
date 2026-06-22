import { Skeleton, SkeletonDetailCard } from '@/components/Skeleton'

export default function MemberDetailLoading() {
  const card = {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 14,
  } as const

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Back */}
      <Skeleton w={120} h={13} r={5} style={{ marginBottom: 20 }} />

      {/* Header card: avatar + name + role badges, then a 4-up stat row */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Skeleton w={64} h={64} r={999} />
          <div style={{ flex: 1 }}>
            <Skeleton w={200} h={20} r={6} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Skeleton w={90} h={22} r={999} />
              <Skeleton w={110} h={22} r={999} />
            </div>
          </div>
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-4"
          style={{ gap: 1, background: 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden', marginTop: 20 }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: '#fafaf9', padding: '14px 16px', textAlign: 'center' }}>
              <Skeleton w={36} h={22} r={6} style={{ margin: '0 auto' }} />
              <Skeleton w={64} h={10} r={4} style={{ margin: '8px auto 0' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Profile info */}
      <SkeletonDetailCard rows={5} />

      {/* Event history */}
      <div style={card}>
        <Skeleton w={160} h={11} r={5} style={{ marginBottom: 16 }} />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ background: '#fafaf9', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Skeleton w={140} h={13} r={5} />
                <Skeleton w={90} h={11} r={4} style={{ marginTop: 6 }} />
              </div>
              <Skeleton w={70} h={22} r={999} />
            </div>
            <div style={{ padding: '12px 16px' }}>
              <Skeleton w="60%" h={12} r={5} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
