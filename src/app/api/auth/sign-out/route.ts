import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Sign-out error:', error)
    return NextResponse.json({ error: 'Unable to sign out.' }, { status: 500 })
  }
}
