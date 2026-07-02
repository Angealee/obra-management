import type { ApplicationStatus } from '@/types/database'

// Shared constants for the applications split-view family
// (ApplicationsClient + its hooks and view components).

// Applications in one of these states have already been decided, so they no
// longer count as "needs my review".
export const TERMINAL_STATUSES = new Set<ApplicationStatus>(['approved', 'rejected', 'withdrawn'])

// localStorage key for the per-device filter/sort/review state.
export const FILTERS_KEY = 'obra-applications-filters'

export type ReviewFilter = 'all' | 'needs' | 'scored'

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  shortlisted: { bg: '#dbeafe', color: '#1e40af', label: 'Shortlisted' },
  interviewed: { bg: '#f3e8ff', color: '#6b21a8', label: 'Interviewed' },
  approved:    { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected:    { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  withdrawn:   { bg: '#f3f4f6', color: '#4b5563', label: 'Withdrawn' },
}

export const POSITION_LABELS: Record<string, string> = {
  photographer:     'Photographer',
  photo_editor:     'Photo Editor',
  videographer:     'Videographer',
  video_editor:     'Video Editor',
  graphic_designer: 'Graphic Designer',
  animator:         'Animator',
}

export const STATUS_OPTIONS = ['all', 'pending', 'shortlisted', 'interviewed', 'approved', 'rejected', 'withdrawn']
export const POSITION_OPTIONS = ['all', 'photographer', 'photo_editor', 'videographer', 'video_editor', 'graphic_designer', 'animator']
export const YEAR_OPTIONS = ['all', '1st Year', '2nd Year', '3rd Year', '4th Year']

export const SORT_OPTIONS = [
  { value: 'name',       label: 'Name (A–Z)' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'score_desc', label: 'Highest Score' },
  { value: 'score_asc',  label: 'Lowest Score' },
]

export const MIN_SCORE_OPTIONS = [
  { value: '0', label: 'Any Score' },
  { value: '8', label: '8+ Score' },
  { value: '6', label: '6+ Score' },
  { value: '4', label: '4+ Score' },
]
