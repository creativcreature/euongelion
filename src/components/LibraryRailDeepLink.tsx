'use client'

import { Suspense, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DevotionalLibraryRail, {
  normalizeLibraryTab,
} from '@/components/DevotionalLibraryRail'

/**
 * URL-driven wrapper around {@link DevotionalLibraryRail}.
 *
 * F-030: the rail is the one unified retrieval surface (archive / bookmarks /
 * notes / highlights / chat history / today / trash). Mounting it through this
 * wrapper makes every section deep-linkable via `?tab=<key>` and keeps the URL
 * in sync as the reader moves between tabs, so a link to a specific section can
 * be shared, bookmarked, and restored on reload or browser back/forward.
 *
 * `useSearchParams` requires a Suspense boundary in the App Router; the export
 * provides one so this can be dropped into any server page.
 */
function LibraryRailWithSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = normalizeLibraryTab(searchParams.get('tab'))

  const handleTabChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'today') {
        // `today` is the default — keep the canonical URL clean.
        params.delete('tab')
      } else {
        params.set('tab', next)
      }
      const query = params.toString()
      // Shallow URL update (no scroll jump, full history entry so browser
      // back/forward walks tab history). The rail mirrors `initialTab` back
      // from the URL, so this stays consistent on navigation.
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return (
    <DevotionalLibraryRail initialTab={tab} onTabChange={handleTabChange} />
  )
}

export default function LibraryRailDeepLink() {
  return (
    <Suspense
      fallback={
        <p className="vw-small text-muted" role="status">
          Loading your library…
        </p>
      }
    >
      <LibraryRailWithSearchParams />
    </Suspense>
  )
}
