import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// We use the anon key here intentionally — this is a public endpoint
// The RLS policy allows anon inserts on member_applications
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      full_name,
      email,
      contact_number,
      year_level,
      course_section,
      positions,
      motivation,
      portfolio_url,
    } = body

    // Basic server-side validation
    if (!full_name || !email || !contact_number || !year_level || !course_section || !motivation) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({ error: 'Please select at least one position.' }, { status: 400 })
    }

    // Get the currently active academic year to link the application
    const { data: activeAY } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_active', true)
      .single()

    const { error } = await supabase.from('member_applications').insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      contact_number: contact_number.trim(),
      year_level,
      course_section: course_section.trim(),
      positions,
      motivation: motivation.trim(),
      portfolio_url: portfolio_url?.trim() || null,
      academic_year_id: activeAY?.id || null,
      status: 'pending',
    })

    if (error) {
      console.error('Application insert error:', error)
      return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}