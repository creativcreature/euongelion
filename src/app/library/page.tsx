import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import LibraryView from './LibraryView'
import LibraryRailDeepLink from '@/components/LibraryRailDeepLink'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Library',
  description:
    'Saved, paused, and completed devotionals. Your active devotional lives on Daily Bread; everything else lives here.',
  alternates: { canonical: '/library' },
  openGraph: {
    title: 'Your Library | Euangelion',
    description:
      'Saved, paused, and completed devotionals. Return any time to re-read.',
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
              <h1 className="vw-heading-md">
                Saved, paused, and completed devotionals.
              </h1>
              <p className="vw-body text-secondary mt-2">
                The active devotional lives on{' '}
                <a href="/daily-bread" className="link-highlight">
                  Daily Bread
                </a>
                . Everything else lives here.
              </p>
            </header>
            <LibraryView />

            {/* F-030: the unified retrieval rail. Series lifecycle (active /
                saved / paused / completed) lives above; everything you can
                retrieve — bookmarks, highlights, notes, chat history, plan
                archive, trash — lives in this one deep-linkable, tabbed,
                keyboard- and mobile-accessible surface (`?tab=<section>`). */}
            <section
              className="mt-12 border-t pt-10"
              style={{ borderColor: 'var(--color-border)' }}
              aria-labelledby="library-retrieval-heading"
            >
              <header className="mb-6">
                <p className="text-label vw-small text-gold mb-2">
                  RETRIEVE ANYTHING
                </p>
                <h2 id="library-retrieval-heading" className="vw-heading-md">
                  Bookmarks, highlights, notes, and everything you have kept.
                </h2>
              </header>
              <LibraryRailDeepLink />
            </section>
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
