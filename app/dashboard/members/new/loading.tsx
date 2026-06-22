import { SkeletonBackHeader, SkeletonFormCard, SkeletonButtonRow } from '@/components/Skeleton'

export default function NewMemberLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader />
      <SkeletonFormCard fields={4} />
      <SkeletonFormCard fields={3} />
      <SkeletonButtonRow />
    </div>
  )
}
