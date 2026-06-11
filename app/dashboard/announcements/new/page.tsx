'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { AcademicYear } from '@/types/database'

export default function NewAnnouncementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'all' | 'creative_heads' | 'members'>('all')
  const [academicYearId, setAcademicYearId] = useState('')
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('academic_years').select('*').order('start_date', { ascending: false })
      if (data) {
        setAcademicYears(data)
        const active = data.find(ay => ay.is_active)
        if (active) setAcademicYearId(active.id)
      }
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!title.trim()) return setError('Title is required.')
    if (!content.trim()) return setError('Content is required.')

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    const { error: insertError } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        content: content.trim(),
        visibility,
        academic_year_id: academicYearId || null,
        posted_by: user.id,
      })

    if (insertError) { setError(insertError.message); setLoading(false); return }

    router.push('/dashboard/announcements')
    router.refresh()
  }

  const visibilityOptions = [
    { value: 'all',            label: 'Everyone',       desc: 'All members and heads can see this' },
    { value: 'creative_heads', label: 'Creative Heads', desc: 'Only Creative Heads and Consultant' },
    { value: 'members',        label: 'Members',        desc: 'Members, Heads, and Consultant' },
  ]

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px' }}>
        <Link href="/dashboard/announcements"
          style={{ fontSize: '13px', color: '#bbb', textDecoration: 'none', display: 'inline-block', marginBottom: '10px' }}
          className="hover:text-gray-600 transition-colors">
          ← Back to Announcements
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111' }}>
          Post Announcement
        </h1>
        <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
          Post a notice for your Obra members.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Content card */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>
            Content
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label className="obra-label">Title <span style={{ color: '#CC0000' }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Important Update for CCS Photo Coverage"
              className="obra-input"
            />
          </div>

          <div>
            <label className="obra-label">Content <span style={{ color: '#CC0000' }}>*</span></label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your announcement here..."
              rows={6}
              className="obra-input"
              style={{ resize: 'vertical', minHeight: '120px' }}
            />
          </div>
        </div>

        {/* Settings card */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>
            Settings
          </p>

          {/* Visibility */}
          <div style={{ marginBottom: '16px' }}>
            <label className="obra-label">Visibility</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {visibilityOptions.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${visibility === opt.value ? '#111' : 'rgba(0,0,0,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                    background: visibility === opt.value ? '#fafaf9' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value as any)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: `2px solid ${visibility === opt.value ? '#111' : '#ccc'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color 0.15s ease',
                  }}>
                    {visibility === opt.value && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111' }} />
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111', lineHeight: 1 }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="obra-label">Academic Year</label>
            <select
              value={academicYearId}
              onChange={e => setAcademicYearId(e.target.value)}
              className="obra-input"
            >
              <option value="">No specific year</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>
                  {ay.label}{ay.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px 16px' }}>
            <p style={{ fontSize: '13px', color: '#CC0000' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Posting...' : 'Post Announcement'}
          </button>
          <Link href="/dashboard/announcements" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}