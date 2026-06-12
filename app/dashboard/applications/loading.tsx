import { Skeleton, SkeletonHeader } from '@/components/Skeleton'

export default function ApplicationsLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* List panel */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="fade-rise"
              style={{ padding: '14px 16px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', animationDelay: `${i * 50}ms` }}
            >
              <Skeleton w={`${55 + ((i * 7) % 25)}%`} h={13} r={6} />
              <Skeleton w="40%" h={11} r={5} style={{ marginTop: 7 }} />
            </div>
          ))}
        </div>
        {/* Detail panel */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: 24, minHeight: 400 }}>
          <Skeleton w={200} h={20} r={6} />
          <Skeleton w={140} h={12} r={5} style={{ marginTop: 10 }} />
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} w={`${70 + ((i * 6) % 25)}%`} h={13} r={6} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
