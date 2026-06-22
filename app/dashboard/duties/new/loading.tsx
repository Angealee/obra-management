import { SkeletonBackHeader, SkeletonFormCard, SkeletonButtonRow } from '@/components/Skeleton'

export default function NewDutyLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader />
      <SkeletonFormCard fields={5} />
      <SkeletonButtonRow />
    </div>
  )
}
