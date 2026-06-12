'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MemberSkill } from '@/types/database'

export default function SkillsEditor({
  profileId,
  allSkills,
  initialSkillIds,
}: {
  profileId: string
  allSkills: MemberSkill[]
  initialSkillIds: string[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkillIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function toggleSkill(skillId: string) {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    )
    setSuccess(false)
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    setSuccess(false)

    const { error: deleteError } = await supabase
      .from('profile_skills')
      .delete()
      .eq('profile_id', profileId)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    if (selectedSkills.length > 0) {
      const rows = selectedSkills.map(skillId => ({ profile_id: profileId, skill_id: skillId }))
      const { error: insertError } = await supabase.from('profile_skills').insert(rows)
      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
      <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>
        Skills
      </p>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '14px' }}>
        Select the skills you bring to Obra. This is separate from your assigned creative role.
      </p>

      <div className="flex flex-wrap gap-2">
        {allSkills.map(skill => (
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
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {skill.name}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', marginTop: '14px' }}>
          <p style={{ fontSize: '13px', color: '#CC0000' }}>{error}</p>
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginTop: '14px' }}>
          <p style={{ fontSize: '13px', color: '#16a34a' }}>✓ Skills updated successfully.</p>
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          {loading ? 'Saving...' : 'Save Skills'}
        </button>
      </div>
    </div>
  )
}
