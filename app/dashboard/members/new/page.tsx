'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { MemberSkill } from '@/types/database'

export default function NewMemberPage() {
  const router = useRouter()
  const supabase = createClient()

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [systemRole, setSystemRole] = useState<'member' | 'creative_head'>('member')
  const [creativeHeadRole, setCreativeHeadRole] = useState('none')
  const [studentNumber, setStudentNumber] = useState('')
  const [courseSection, setCourseSection] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // UI state
  const [skills, setSkills] = useState<MemberSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load available skills on mount
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

    // Call our server API route to create the auth user safely
    const response = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        systemRole,
        creativeHeadRole: systemRole === 'creative_head' ? creativeHeadRole : 'none',
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
        <Link href="/dashboard/members" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Members
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Add Member</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new account for an Obra member.</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Number
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="2021-00123"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <input
                type="text"
                value={courseSection}
                onChange={(e) => setCourseSection(e.target.value)}
                placeholder="BSIT 3-A"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Level
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Login Credentials</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@obra.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <p className="text-gray-400 text-xs mt-1">
                Share this with the member. They can change it later.
              </p>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Role</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Role <span className="text-red-500">*</span>
            </label>
            <select
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value as 'member' | 'creative_head')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="member">Member</option>
              <option value="creative_head">Creative Head</option>
            </select>
          </div>

          {systemRole === 'creative_head' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Creative Head Role
              </label>
              <select
                value={creativeHeadRole}
                onChange={(e) => setCreativeHeadRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="none">Not specified</option>
                <option value="creative_producer">Creative Producer</option>
                <option value="creative_writer">Creative Writer</option>
                <option value="creative_director">Creative Director</option>
              </select>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Skills</h2>
            <p className="text-gray-400 text-xs mt-1">Select all skills this member has.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  selectedSkills.includes(skill.id)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>

          {selectedSkills.length > 0 && (
            <p className="text-xs text-gray-400">{selectedSkills.length} skill(s) selected</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Member Account'}
          </button>
          <Link
            href="/dashboard/members"
            className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}