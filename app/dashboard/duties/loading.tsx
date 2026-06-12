import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function DutiesLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {['a', 'b'].map((g, i) => (
          <div key={g}>
            <Skeleton w={140} h={11} r={5} style={{ marginBottom: 10 }} />
            <SkeletonTable rows={i === 0 ? 4 : 3} />
          </div>
        ))}
      </div>
    </div>
  )
}
