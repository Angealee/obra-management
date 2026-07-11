import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function EventsLoading() {
  return (
    <div>
      <SkeletonHeader />
      {/* Tab strip (Events | All Duties) */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: 20, paddingBottom: 8 }}>
        <Skeleton w={54} h={14} r={5} />
        <Skeleton w={72} h={14} r={5} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {['a', 'b'].map((g, i) => (
          <div key={g}>
            <Skeleton w={110} h={12} r={5} style={{ marginBottom: 12 }} />
            <SkeletonTable rows={i === 0 ? 3 : 4} />
          </div>
        ))}
      </div>
    </div>
  )
}
