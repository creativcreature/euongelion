import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase session refresh — and ONLY that. (F-083 root cause #2,
 * 2026-07-27.)
 *
 * WHY middleware.ts AND NOT proxy.ts (overrides the CLAUDE.md note):
 * Next 16's proxy.ts always runs on the Node.js runtime, and
 * @opennextjs/cloudflare hard-fails the build on Node middleware
 * ("Node.js middleware is not currently supported"). The legacy
 * middleware.ts filename still compiles as EDGE middleware, which is
 * the only flavor the Workers adapter supports.
 *
 * The original src/proxy.ts was deleted 2026-05-07 when its route
 * gating was retired — but it was also the ONLY place the Supabase
 * auth session could be refreshed with persistable cookies. Server
 * Components cannot write cookies, so once an access token expired
 * (~1 hour), every RSC render went auth-blind: /daily-bread stopped
 * seeing the signed-in user, ignored their active_series row, and
 * fell back to a stale Soul Audit plan or the empty state — the
 * "activation doesn't survive a reload" half of the Daily Bread bug.
 *
 * This restores the refresh with none of the old gating. The matcher
 * is scoped to the routes whose Server Components call getUser();
 * widen it if a new page starts reading auth server-side.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Validates the JWT and, when expired, rotates the refresh token —
  // persisting the new cookies on the response so the following RSC
  // render (and every later request) can see the session.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/today', '/library/:path*', '/onboarding', '/admin/:path*'],
}
