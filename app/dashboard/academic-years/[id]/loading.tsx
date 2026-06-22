import { SkeletonBackHeader, SkeletonDetailCard, SkeletonFormCard, SkeletonButtonRow } from '@/components/Skeleton'

export default function AcademicYearDetailLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader badge />
      {/* Year details */}
      <SkeletonDetailCard rows={4} />
      {/* Edit form */}
      <SkeletonFormCard fields={3} />
      <SkeletonButtonRow />
    </div>
  )
}
