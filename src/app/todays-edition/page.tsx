/**
 * /todays-edition — permanent redirect to /today
 *
 * This alias exists so older links (social, email, etc.) that use the
 * full-word form still land on the right page. The canonical URL is /today.
 */
import { permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/today',
  },
}

export default function TodaysEditionPage() {
  permanentRedirect('/today')
}
