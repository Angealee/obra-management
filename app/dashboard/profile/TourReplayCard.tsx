'use client'

import { Compass, Play } from 'lucide-react'

// Profile card to replay the guided tour on demand. Fires the same window event
// GuidedTour listens for; replaying never touches the visit-count / completed
// flags, so it works no matter how many times it's used.
export default function TourReplayCard() {
  function replay() {
    window.dispatchEvent(new CustomEvent('obra:tour-start'))
  }

  return (
    <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(204,0,0,0.10)', color: '#CC0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Compass size={19} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="card-title">System walkthrough</p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 2 }}>
              New here or need a refresher? Replay the guided tour of the system.
            </p>
          </div>
        </div>
        <button type="button" onClick={replay} className="btn-secondary" style={{ flexShrink: 0 }}>
          <Play size={14} /> Replay tour
        </button>
      </div>
    </div>
  )
}
