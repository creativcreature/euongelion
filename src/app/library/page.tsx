import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
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

export default function LibraryPage() {
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
                <a href="/daily-bread" className="link-highlight">
                  Daily Bread
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
            <LibraryRailDeepLink />
          </div>
        </section>
        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
