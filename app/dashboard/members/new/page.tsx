'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { MemberSkill, MemberRole } from '@/types/database'
import { MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'

// Separated into its own component because useSearchParams()
// must be wrapped in a Suspense boundary in Next.js App Router
function NewMemberForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Pre-fill from URL params (set when coming from an approved application)
  const [fullName, setFullName] = useState(searchParams.get('full_name') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [systemRole, setSystemRole] = useState<'member' | 'creative_head'>('member')
  const [creativeHeadRole, setCreativeHeadRole] = useState('none')
  const [memberRole, setMemberRole] = useState<MemberRole>('none')
  const [studentNumber, setStudentNumber] = useState('')
  const [courseSection, setCourseSection] = useState(searchParams.get('course_section') || '')
  const [yearLevel, setYearLevel] = useState(searchParams.get('year_level') || '')
  const [contactNumber, setContactNumber] = useState(searchParams.get('contact_number') || '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // UI state
  const [skills, setSkills] = useState<MemberSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Show a notice banner if form was prefilled from an application
  const prefilled = !!searchParams.get('full_name')

  useEffect(() => {
    async function loadSkills() {
      const { data } = await supabase
        .from('member_skills')
        .select('*')
        .order('name', { ascending: true })
      if (data) setSkills(data)
    }
    loadSkills()
  }, [])

  function toggleSkill(skillId: string) {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    )
  }

  async function handleSubmit() {
    if (!fullName.trim()) return setError('Full name is required.')
    if (!email.trim()) return setError('Email is required.')
    if (!password.trim() || password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)
    setError('')

    const response = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        systemRole,
        creativeHeadRole: systemRole === 'creative_head' ? creativeHeadRole : 'none',
        memberRole: systemRole === 'member' ? memberRole : 'none',
        studentNumber: studentNumber.trim() || null,
        courseSection: courseSection.trim() || null,
        yearLevel: yearLevel.trim() || null,
        contactNumber: contactNumber.trim() || null,
        selectedSkills,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.push('/dashboard/members')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/members" style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#6b7280' }} className="mb-2 inline-block">
          ← Back to Members
        </Link>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.04em', color: '#111', marginBottom: 4 }}>
          ADD MEMBER
        </h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#666' }}>
          Create a new account for an Obra member.
        </p>
      </div>

      {/* Prefill notice banner */}
      {prefilled && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          fontFamily: 'DM Sans',
          fontSize: 13,
          color: '#166534',
        }}>
          ✓ Form prefilled from approved application. Please review all fields and set a password before creating the account.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Basic Info */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Full Name *</label>
              <input
                className="obra-input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Student Number</label>
              <input
                className="obra-input"
                type="text"
                value={studentNumber}
                onChange={e => setStudentNumber(e.target.value)}
                placeholder="2021-00123"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Course & Section</label>
              <input
                className="obra-input"
                type="text"
                value={courseSection}
                onChange={e => setCourseSection(e.target.value)}
                placeholder="BSIT 3-A"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Year Level</label>
              <select
                className="obra-input"
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
              >
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Contact Number</label>
              <input
                className="obra-input"
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="09XX XXX XXXX"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Login Credentials */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Login Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Email *</label>
              <input
                className="obra-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@obra.com"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Temporary Password *</label>
              <input
                className="obra-input"
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
              <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#6b7280' }}>
                Share this with the member. They can change it later.
              </p>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Role
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">System Role *</label>
              <select
                className="obra-input"
                value={systemRole}
                onChange={e => setSystemRole(e.target.value as 'member' | 'creative_head')}
              >
                <option value="member">Member</option>
                <option value="creative_head">Creative Head</option>
              </select>
            </div>
            {systemRole === 'creative_head' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="obra-label">Creative Head Role</label>
                <select
                  className="obra-input"
                  value={creativeHeadRole}
                  onChange={e => setCreativeHeadRole(e.target.value)}
                >
                  <option value="none">Not specified</option>
                  <option value="creative_producer">Creative Producer</option>
                  <option value="creative_writer">Creative Writer</option>
                  <option value="creative_director">Creative Director</option>
                </select>
              </div>
            )}
            {systemRole === 'member' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="obra-label">Creative Role</label>
                <select
                  className="obra-input"
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value as MemberRole)}
                >
                  <option value="none">Unassigned</option>
                  {MEMBER_ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#6b7280' }}>
                  The member&apos;s primary position. Skills below are extra capabilities.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Skills
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            Select all skills this member has.
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: selectedSkills.includes(skill.id) ? '1.5px solid #111' : '1.5px solid rgba(0,0,0,0.15)',
                  background: selectedSkills.includes(skill.id) ? '#111' : '#fff',
                  color: selectedSkills.includes(skill.id) ? '#fff' : '#444',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {skill.name}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#6b7280', marginTop: 10 }}>
              {selectedSkills.length} skill(s) selected
            </p>
          )}
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#dc2626',
            fontFamily: 'DM Sans',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating Account...' : 'Create Member Account'}
          </button>
          <Link
            href="/dashboard/members"
            className="btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

// Suspense wrapper — required by Next.js when using useSearchParams()
// Without this, the build will fail with a "missing Suspense boundary" error
export default function NewMemberPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#6b7280', padding: 40 }}>
        Loading...
      </div>
    }>
      <NewMemberForm />
    </Suspense>
  )
}