import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logActivity, buildDiff } from '@/lib/activityLog'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the requester is a consultant
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: requester } = await serverSupabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (!requester || requester.system_role !== 'consultant') {
      return NextResponse.json({ error: 'Only consultants can edit members.' }, { status: 403 })
    }

    // 2. Parse body
    const {
      memberId,
      fullName,
      username,
      email,
      password,
      systemRole,
      creativeHeadRole,
      memberRole,
      studentNumber,
      courseSection,
      yearLevel,
      contactNumber,
      selectedSkills,
    } = await req.json()

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId.' }, { status: 400 })
    }
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    if (systemRole !== 'member' && systemRole !== 'creative_head') {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–20 characters: lowercase letters, numbers, underscores only.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 3. Guard: only members / creative_heads may be edited through this route.
    //    Editing consultant accounts is blocked to avoid lockout / privilege games.
    //    The extra fields feed the activity-log diff after a successful update.
    const { data: target } = await admin
      .from('profiles')
      .select('system_role, full_name, username, email, creative_head_role, member_role, student_number, course_section, year_level, contact_number')
      .eq('id', memberId)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }
    if (target.system_role === 'consultant') {
      return NextResponse.json({ error: 'Consultant accounts cannot be edited here.' }, { status: 403 })
    }

    // 4. Update auth user (email always; password only if provided)
    const authPayload: { email: string; password?: string } = { email: email.trim() }
    if (password) authPayload.password = password

    const { error: authError } = await admin.auth.admin.updateUserById(memberId, authPayload)
    if (authError) {
      const msg = /registered|already/i.test(authError.message)
        ? 'That email is already in use by another account.'
        : authError.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // 5. Update profile row
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: username?.trim() || null,
        email: email.trim(),
        system_role: systemRole,
        creative_head_role: systemRole === 'creative_head' ? (creativeHeadRole || 'none') : 'none',
        member_role: systemRole === 'member' ? (memberRole || 'none') : 'none',
        student_number: studentNumber?.trim() || null,
        course_section: courseSection?.trim() || null,
        year_level: yearLevel?.trim() || null,
        contact_number: contactNumber?.trim() || null,
      })
      .eq('id', memberId)

    if (profileError) {
      const msg = /unique|23505/i.test(profileError.message)
        ? 'That username is already taken. Try another one.'
        : profileError.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // 6. Replace skills (delete all, re-insert selected)
    await admin.from('profile_skills').delete().eq('profile_id', memberId)

    if (Array.isArray(selectedSkills) && selectedSkills.length > 0) {
      const rows = selectedSkills.map((skillId: string) => ({
        profile_id: memberId,
        skill_id: skillId,
      }))
      const { error: skillsError } = await admin.from('profile_skills').insert(rows)
      if (skillsError) {
        console.error('Skills update error:', skillsError.message)
        // Non-fatal — profile saved, skills just didn't update fully
      }
    }

    // Service-role write — the audit trigger skips it, so log here with the
    // same field-level diff shape the trigger produces (sensitive fields and
    // the password record only a "changed" marker, never values).
    const diff = buildDiff(target, {
      full_name: fullName.trim(),
      username: username?.trim() || null,
      email: email.trim(),
      system_role: systemRole,
      creative_head_role: systemRole === 'creative_head' ? (creativeHeadRole || 'none') : 'none',
      member_role: systemRole === 'member' ? (memberRole || 'none') : 'none',
      student_number: studentNumber?.trim() || null,
      course_section: courseSection?.trim() || null,
      year_level: yearLevel?.trim() || null,
      contact_number: contactNumber?.trim() || null,
    })
    if (password) diff.password = { changed: true }
    if (Object.keys(diff).length > 0) {
      await logActivity({
        actorId: user.id,
        action: 'updated',
        targetTable: 'profiles',
        targetId: memberId,
        details: { target_label: fullName.trim(), diff },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update member error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
