import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // First verify the requester is a consultant or creative_head
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data: requester } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (!requester || requester.system_role === 'member') {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    // Parse request body
    const {
      fullName,
      email,
      password,
      systemRole,
      creativeHeadRole,
      studentNumber,
      courseSection,
      yearLevel,
      contactNumber,
      selectedSkills,
    } = await request.json()

    // Use admin client to create auth user
    const adminSupabase = createAdminClient()

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const newUserId = authData.user.id

    // Insert profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        email,
        system_role: systemRole,
        creative_head_role: creativeHeadRole,
        student_number: studentNumber,
        course_section: courseSection,
        year_level: yearLevel,
        contact_number: contactNumber,
        is_active: true,
      })

    if (profileError) {
      // If profile insert fails, delete the auth user to avoid orphaned accounts
      await adminSupabase.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Insert skills if any were selected
    if (selectedSkills && selectedSkills.length > 0) {
      const skillRows = selectedSkills.map((skillId: string) => ({
        profile_id: newUserId,
        skill_id: skillId,
      }))

      const { error: skillsError } = await adminSupabase
        .from('profile_skills')
        .insert(skillRows)

      if (skillsError) {
        console.error('Skills insert error:', skillsError.message)
        // Non-fatal — member is created, skills just didn't save
      }
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Create member error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}