import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that are ALWAYS public (Wake Up Zine devotional site)
const PUBLIC_ROUTES = [
  '/',
  '/devotional',  // Allow access to all devotionals
  '/admin/unlock',  // Allow access to unlock page
  '/api/admin/unlock', // API for unlocking
]

// Routes hidden from public - EUONGELION features (visible to admin only)
const HIDDEN_ROUTES = [
  '/blog',
  '/courses',
  '/community',
  '/dashboard',
  '/shop',
  '/resources',
  '/archive',
  '/about',
  '/series',  // Old EUONGELION series pages
  '/search',
  '/bookmarks',
  '/wake-up',  // Old wake-up page (replaced by homepage)
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if user has admin cookie
  const isAdmin = request.cookies.get('euongelion_admin')?.value === 'true'

  // Check environment variable
  const fullSiteEnabled = process.env.FULL_SITE_ENABLED === 'true'

  // Allow all public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/devotionals') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if route is hidden
  const isHiddenRoute = HIDDEN_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // If hidden route:
  // - Show if admin cookie exists
  // - Show if FULL_SITE_ENABLED=true
  // - Otherwise 404
  if (isHiddenRoute && !isAdmin && !fullSiteEnabled) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // Allow everything else
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
