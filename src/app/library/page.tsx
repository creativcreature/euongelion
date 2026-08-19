import { redirect } from 'next/navigation'
import ListeningSection from '@/components/audio/ListeningSection'
import { getUser } from '@/lib/auth'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import LibraryRailDeepLink from '@/components/LibraryRailDeepLink'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Library',
  description:
    'Series, bookmarks, highlights, notes, clippings, and your archive — everything you keep, in one library.',
  alternates: { canonical: '/library' },
  openGraph: {
    title: 'Your Library | Euangelion',
    description:
      'Series, bookmarks, highlights, notes, clippings, and your archive — everything you keep, in one library.',
    url: 'https://euangelion.app/library',
    type: 'website',
  },
}

export default async function LibraryPage() {
  /**
   * SA-062 — the Library is entirely account state (saved series, notes,
   * highlights, clips, journal entries), so it requires an account.
   *
   * Already `force-dynamic`, so the gate costs no caching. The redirect carries
   * the destination: the reader lands back in their library, not on a generic
   * page, which is what makes "locked, not hidden" honest rather than merely
   * polite.
   */
  const user = await getUser()
  if (!user) {
    redirect('/auth/sign-in?redirect=%2Flibrary')
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="library-page mx-auto max-w-6xl px-4">
            <header className="mb-6">
              <p className="text-label vw-small text-gold mb-2">YOUR LIBRARY</p>
              <h1 className="vw-heading-md">Everything you keep, one place.</h1>
              <p className="vw-body text-secondary mt-2">
                The active devotional lives on{' '}
                <a href="/today" className="link-highlight">
                  Today
                </a>
                . Series, bookmarks, highlights, notes, clippings, and your
                archive all live here.
              </p>
            </header>

            {/* F-068: the ONE library. The rail carries every section —
                series lifecycle, the active plan week, bookmarks, highlights,
                notes, chat history, device-local clippings, archive, trash —
                deep-linkable via `?tab=<section>`. The retired /saved and
                /clippings pages redirect into their tabs here. */}
            {/* SA-096: your listening lives in the library, per the founder's
                placement. What is queued and what is playing — not discovery
                of new listening, which is a different job. */}
            <ListeningSection />

            <LibraryRailDeepLink />
          </div>
        </section>
        <SiteBottom />
      </main>
    </div>
  )
}
