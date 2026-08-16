/**
 * /todays-edition — permanent redirect to /daily-bread
 *
 * This alias exists so older links (social, email, etc.) that use the
 * full-word form still land on the right page. The canonical URL is /daily-bread (SA-059 renamed the paper).
 */
import { permanentRedirect } from 'next/navigation'

// force-dynamic so the server answers with a real 308 — a statically rendered
// redirect() gets baked into a slower meta-refresh page instead (the same
// reason /saved and /clippings set it). This route was returning 200 with a
// 36KB HTML body.
export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/daily-bread',
  },
}

export default function TodaysEditionPage() {
  permanentRedirect('/daily-bread')
}
