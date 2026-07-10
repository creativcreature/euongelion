import { redirect } from 'next/navigation'

// RETIRED READER (Mobbin polish audit 2026-07-10, P0 #5).
//
// /daily-bread is the canonical plan reader: it correctly serves the current
// unlocked day, the Wed–Sun onboarding day-0, and the locked-cycle holding
// state — the dedicated reader that used to live here rendered none of those
// (empty timeline + perpetual lock message), which is why every active-plan
// entry point (header badge, homepage "Continue" CTA, resume link, select /
// current API responses) already routed to /daily-bread instead. See the
// matching note in src/app/api/soul-audit/current/route.ts.
//
// The route segment is kept solely so old deep links (bookmarked
// /soul-audit/plan/<token>?day=N URLs) keep working via a redirect.
export default function RetiredPlanReaderPage() {
  redirect('/daily-bread')
}
