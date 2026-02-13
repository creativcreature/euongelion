import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Illustration generation has been removed. Use approved static assets only.',
      code: 'ILLUSTRATION_GENERATION_REMOVED',
    },
    { status: 410 },
  )
}
