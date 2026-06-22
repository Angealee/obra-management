import { SkeletonBackHeader, SkeletonFormCard, SkeletonButtonRow } from '@/components/Skeleton'

export default function NewEventLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader />
      <SkeletonFormCard fields={4} />
      <SkeletonFormCard fields={1} />
      <SkeletonButtonRow />
    </div>
  )
}
