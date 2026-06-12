'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { MemberSkill, MemberRole } from '@/types/database'
import { MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'

type MemberData = {
  id: string
  full_name: string
  username: string | null
  email: string
  system_role: 'member' | 'creative_head'
  creative_head_role: string | null
  member_role: MemberRole
  student_number: string | null
  course_section: string | null
  year_level: string | null
  contact_number: string | null
  skillIds: string[]
}

export default function EditMemberForm({ member }: { member: MemberData }) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(member.full_name)
  const [username, setUsername] = useState(member.username ?? '')
  const [email, setEmail] = useState(member.email)
  const [password, setPassword] = useState('')
  const [systemRole, setSystemRole] = useState<'member' | 'creative_head'>(member.system_role)
  const [creativeHeadRole, setCreativeHeadRole] = useState(member.creative_head_role ?? 'none')
  const [memberRole, setMemberRole] = useState<MemberRole>(member.member_role ?? 'none')
  const [studentNumber, setStudentNumber] = useState(member.student_number ?? '')
  const [courseSection, setCourseSection] = useState(member.course_section ?? '')
  const [yearLevel, setYearLevel] = useState(member.year_level ?? '')
  const [contactNumber, setContactNumber] = useState(member.contact_number ?? '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(member.skillIds)

  const [skills, setSkills] = useState<MemberSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPassword, setSavedPassword] = useState<string | null>(null)

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
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    )
  }

  async function handleSubmit() {
    if (!fullName.trim()) return setError('Full name is required.')
    if (!email.trim()) return setError('Email is required.')
    if (password && password.length < 6) return setError('Password must be at least 6 characters.')
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      return setError('Username must be 3–20 characters: lowercase letters, numbers, underscores only.')
    }

    setLoading(true)
    setError('')

    const response = await fetch('/api/members/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        fullName: fullName.trim(),
        username: username.trim() || null,
        email: email.trim(),
        password: password || null,
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

    // If a password was set, surface it on a success screen so the consultant
    // can copy it and hand it to the member.
    if (password) {
      setSavedPassword(password)
      setLoading(false)
      router.refresh()
      return
    }

    router.push(`/dashboard/members/${member.id}`)
    router.refresh()
  }

  // ── Success screen after a password reset ──
  if (savedPassword) {
    return (
      <div className="max-w-2xl">
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>✓</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>Member updated</h2>
          </div>
          <p style={{ fontSize: 13.5, color: '#666', marginBottom: 18 }}>
            The new password is shown below. Copy it now and share it with{' '}
            <strong>{fullName}</strong> — for security it won&apos;t be shown again.
          </p>

          <div style={{ background: '#fafaf9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
            <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
              New Password
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, color: '#111', wordBreak: 'break-all' }}>
                {savedPassword}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(savedPassword)}
                className="btn-secondary"
                style={{ flexShrink: 0 }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { router.push(`/dashboard/members/${member.id}`); router.refresh() }}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href={`/dashboard/members/${member.id}`} style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#999' }} className="mb-2 inline-block">
          ← Back to Member
        </Link>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.04em', color: '#111', marginBottom: 4 }}>
          EDIT MEMBER
        </h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#666' }}>
          Update this member&apos;s information, role, and login credentials.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Basic Info */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Full Name *</label>
              <input className="obra-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Username</label>
              <input className="obra-input" type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="juandelacruz" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Student Number</label>
              <input className="obra-input" type="text" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} placeholder="2021-00123" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Course & Section</label>
              <input className="obra-input" type="text" value={courseSection} onChange={e => setCourseSection(e.target.value)} placeholder="BSIT 3-A" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Year Level</label>
              <select className="obra-input" value={yearLevel} onChange={e => setYearLevel(e.target.value)}>
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Contact Number</label>
              <input className="obra-input" type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="09XX XXX XXXX" maxLength={11} />
            </div>
          </div>
        </div>

        {/* Login Credentials */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Login Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Email *</label>
              <input className="obra-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@obra.com" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">Reset Password</label>
              <input className="obra-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
              <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#999' }}>
                Leave blank to keep the current password. Enter a new one to reset it (min. 6 characters).
              </p>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Role
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="obra-label">System Role *</label>
              <select className="obra-input" value={systemRole} onChange={e => setSystemRole(e.target.value as 'member' | 'creative_head')}>
                <option value="member">Member</option>
                <option value="creative_head">Creative Head</option>
              </select>
            </div>
            {systemRole === 'creative_head' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="obra-label">Creative Head Role</label>
                <select className="obra-input" value={creativeHeadRole} onChange={e => setCreativeHeadRole(e.target.value)}>
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
                <select className="obra-input" value={memberRole} onChange={e => setMemberRole(e.target.value as MemberRole)}>
                  <option value="none">Unassigned</option>
                  {MEMBER_ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#999' }}>
                  The member&apos;s primary position. Skills below are extra capabilities.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
          <h2 style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Skills
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#999', marginBottom: 14 }}>
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
            <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#999', marginTop: 10 }}>
              {selectedSkills.length} skill(s) selected
            </p>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontFamily: 'DM Sans', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/dashboard/members/${member.id}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
