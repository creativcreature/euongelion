/**
 * /account — permanent redirect to /settings
 *
 * The mobile tab bar's YOU tab already claims this path as its own
 * (`src/components/MobileTabBar.tsx` — `p.startsWith('/account')`), and
 * "account"-shaped links from email/social land here by habit. The
 * canonical account surface is /settings, so the path resolves instead
 * of 404ing.
 */
import { permanentRedirect } from 'next/navigation'

// force-dynamic so the server answers with a real 308 — a statically
// rendered redirect() gets baked into a slower meta-refresh page
// instead (the same reason /todays-edition, /saved and /clippings set it).
export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/settings',
  },
}

export default function AccountPage() {
  permanentRedirect('/settings')
}
