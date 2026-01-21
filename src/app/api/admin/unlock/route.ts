import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  // Check password
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true })

    // Set cookie for 7 days
    response.cookies.set('euongelion_admin', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  }

  return NextResponse.json(
    { error: 'Invalid password' },
    { status: 401 }
  )
}
