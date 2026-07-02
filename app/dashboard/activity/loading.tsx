import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function ActivityLoading() {
  return (
    <div>
      <SkeletonHeader />
      {/* Filter bar placeholders */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Skeleton w={130} h={32} r={8} />
        <Skeleton w={120} h={32} r={8} />
        <Skeleton w={140} h={32} r={8} />
      </div>
      <SkeletonTable rows={8} withAvatar />
    </div>
  )
}
