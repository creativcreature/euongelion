import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return NextResponse.json(
      {
        authenticated: Boolean(user),
        user: user
          ? {
              id: user.id,
              email: user.email ?? null,
            }
          : null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Auth session lookup error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 },
    )
  }
}
