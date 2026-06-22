import { Skeleton, SkeletonTable } from '@/components/Skeleton'

export default function AcademicYearsLoading() {
  return (
    <div>
      {/* Header: title + subtitle on the left, "Add" button on the right —
          mirrors the real page so the skeleton → content swap doesn't jump. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Skeleton w={220} h={26} r={7} />
          <Skeleton w={320} h={13} r={6} style={{ marginTop: 10 }} />
        </div>
        <Skeleton w={170} h={38} r={8} />
      </div>

      {/* Year rows (label · start · end · status · action) */}
      <SkeletonTable rows={5} />
    </div>
  )
}
