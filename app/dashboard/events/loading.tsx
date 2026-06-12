import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function EventsLoading() {
  return (
    <div>
      <SkeletonHeader />
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
