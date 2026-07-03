import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function WorkloadReportLoading() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <Skeleton w={100} h={34} r={8} />
        <div style={{ flex: 1 }} />
        <Skeleton w={130} h={34} r={8} />
        <Skeleton w={150} h={34} r={8} />
      </div>
      <SkeletonHeader />
      <SkeletonTable rows={8} />
    </div>
  )
}
