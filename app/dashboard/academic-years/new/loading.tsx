import { SkeletonBackHeader, SkeletonFormCard, SkeletonButtonRow } from '@/components/Skeleton'

export default function NewAcademicYearLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader />
      <SkeletonFormCard fields={3} />
      <SkeletonButtonRow />
    </div>
  )
}
