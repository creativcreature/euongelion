'use client'

/**
 * Plan Reader Page
 *
 * Displays a devotional plan's daily content after the user selects an option.
 * This page is the reader half of the results page split:
 *
 *   /soul-audit/results   → Selection page (option cards, consent, crisis ack)
 *   /soul-audit/plan/[planToken] → Reader page (timeline, daily content, stickies)
 *
 * The planToken comes from the URL path parameter. The reader fetches plan days
 * from the API and renders them with a day-by-day timeline.
 *
 * Phase 6 of the One-Pass plan: this is the new route that receives the reader
 * half of the previously-monolithic results page. For now, it redirects to the
 * legacy results page with the planToken query param preserved. As the reader
 * components are extracted from results/page.tsx, they will be imported here.
 */

import { useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

export default function PlanReaderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const planToken = typeof params.planToken === 'string' ? params.planToken : ''
  const dayParam = searchParams.get('day') || '1'

  useEffect(() => {
    if (!planToken) {
      router.replace('/soul-audit/results')
      return
    }

    // Bridge: redirect to legacy results page with planToken as query param.
    // This ensures the reader works immediately while the full component
    // extraction is completed in a follow-up PR.
    router.replace(
      `/soul-audit/results?planToken=${encodeURIComponent(planToken)}&day=${dayParam}`,
    )
  }, [planToken, dayParam, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-body-secondary animate-pulse">
        Loading your devotional plan&hellip;
      </p>
    </div>
  )
}
