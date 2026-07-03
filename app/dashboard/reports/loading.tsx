import { Skeleton, SkeletonHeader } from '@/components/Skeleton'

export default function ReportsLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="fade-rise"
            style={{
              background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10,
              padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
              animationDelay: `${i * 50}ms`,
            }}
          >
            <Skeleton w={38} h={38} r={10} />
            <div style={{ flex: 1 }}>
              <Skeleton w={160} h={14} r={6} />
              <Skeleton w="70%" h={11} r={5} style={{ marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
