import { Skeleton, SkeletonStatRow, SkeletonTable } from '@/components/Skeleton'

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Greeting */}
      <div>
        <Skeleton w={260} h={26} r={7} />
        <Skeleton w={180} h={13} r={6} style={{ marginTop: 10 }} />
      </div>

      {/* Stat cards */}
      <SkeletonStatRow count={4} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SkeletonStatRow count={3} />
      </div>

      {/* A large content card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: 24 }}>
        <Skeleton w={120} h={11} r={5} />
        <div style={{ marginTop: 18 }}>
          <SkeletonTable rows={4} />
        </div>
      </div>
    </div>
  )
}
