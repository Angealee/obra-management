import { Skeleton, SkeletonHeader } from '@/components/Skeleton'

export default function WorkloadsLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Matrix header row */}
        <div style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Skeleton w={160} h={12} r={5} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} w={90} h={12} r={5} />
          ))}
        </div>
        {/* Matrix body rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="fade-rise"
            style={{ display: 'flex', gap: 14, padding: '16px 20px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', animationDelay: `${i * 45}ms` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 160 }}>
              <Skeleton w={30} h={30} r={999} />
              <Skeleton w={90} h={12} r={5} />
            </div>
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} w={90} h={28} r={8} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
