import { redirect } from 'next/navigation'

// force-dynamic so the server answers with a real 307 (a statically rendered
// redirect() gets baked into a slower meta-refresh page instead).
export const dynamic = 'force-dynamic'

// RETIRED PAGE (F-068, Mobbin polish audit 2026-07-10, P1 #12).
//
// /library is the single library home — the device-local commonplace book
// lives in its CLIPPINGS tab alongside bookmarks, highlights, notes, and the
// archive. Clippings data itself is untouched (it lives in IndexedDB on the
// device); this route segment survives only as a redirect so old links keep
// working.
export default function RetiredClippingsPage() {
  redirect('/library?tab=clippings')
}
