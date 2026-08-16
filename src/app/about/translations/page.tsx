import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'

export const metadata = {
  title: 'Translations | Euangelion',
  description:
    'Why Euangelion uses different Bible translations in different moments — and which translations live on this site.',
  alternates: { canonical: '/about/translations' },
}

type Translation = {
  abbreviation: string
  name: string
  status: 'Public domain' | 'CC0' | 'Licensed (legacy)' | 'Linked'
  bestFor: string
}

const TRANSLATIONS: Translation[] = [
  {
    abbreviation: 'BSB',
    name: 'Berean Standard Bible',
    status: 'CC0',
    bestFor: 'Default modern English. Clear, readable, contemporary register.',
  },
  {
    abbreviation: 'WEB',
    name: 'World English Bible',
    status: 'Public domain',
    bestFor: 'Modern English alternative; accessible, plain voice.',
  },
  {
    abbreviation: 'KJV',
    name: 'King James Version',
    status: 'Public domain',
    bestFor:
      'Poetic register. Used when a passage’s rhythm matters more than its plainness — Psalms, prophetic literature, Revelation.',
  },
  {
    abbreviation: 'ASV',
    name: 'American Standard Version',
    status: 'Public domain',
    bestFor:
      'Word-for-word literal. Useful when a Hebrew or Greek word study sits next to the verse.',
  },
  {
    abbreviation: 'YLT',
    name: 'Young’s Literal Translation',
    status: 'Public domain',
    bestFor:
      'Hyper-literal. Surfaces verb tenses and structural details lost in dynamic translations.',
  },
  {
    abbreviation: 'DARBY',
    name: 'Darby Bible',
    status: 'Public domain',
    bestFor: 'Precise translation choices, especially in Pauline arguments.',
  },
  {
    abbreviation: 'BBE',
    name: 'Bible in Basic English',
    status: 'Public domain',
    bestFor:
      'Lowest-literacy entry point. Useful for accessibility and English-as-additional-language readers.',
  },
  {
    abbreviation: 'NIV',
    name: 'New International Version',
    status: 'Licensed (legacy)',
    bestFor:
      'Present in some pre-2026 series imported from earlier sources. Being audited and migrated to public-domain renderings.',
  },
]

export default function TranslationsPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-4xl">
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: 'ABOUT', href: '/about' },
              { label: 'TRANSLATIONS' },
            ]}
          />

          <header className="mb-12">
            <p className="text-label vw-small mb-3 text-gold">
              ABOUT THE TRANSLATIONS
            </p>
            <h1 className="vw-heading-md">
              Different translations for different moments.
            </h1>
          </header>

          <section className="space-y-3 mb-14">
            <p className="vw-body">
              No single English Bible translation does everything well.
              Word-for-word translations preserve the structure of the original
              languages but can read stiffly. Thought-for-thought translations
              read smoothly but smooth over the texture of the Hebrew or Greek
              underneath. Older translations carry centuries of literary
              cadence; newer translations make compressed arguments
              comprehensible to a reader meeting them for the first time.
            </p>
            <p className="vw-body">
              Euangelion uses several translations on purpose. The choice for
              any given passage depends on what that passage is asked to do —
              carry the cadence of Hebrew poetry, surface the precision of a
              Pauline clause, sit alongside a Greek word study, or simply land
              clearly with a reader who is tired.
            </p>
            <p className="vw-body">
              Where the rendering matters, the verse is shown with a label.
              Translations like <em>John 15:4 — BSB</em> tell the reader which
              English voice they are hearing. There is no inline footnote
              explaining why. The translation choice is the choice; this page
              exists to explain the broader principle once.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="text-label vw-small mb-4 text-gold">
              Translations used on this site
            </h2>
            <div
              className="vw-small"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {TRANSLATIONS.map((t) => (
                <div
                  key={t.abbreviation}
                  className="grid gap-3 py-5 md:grid-cols-[6rem_minmax(12rem,1fr)_9rem_2fr]"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div
                    className="text-serif vw-body"
                    style={{ fontWeight: 600 }}
                  >
                    {t.abbreviation}
                  </div>
                  <div className="text-secondary">{t.name}</div>
                  <div
                    className="text-tertiary"
                    style={{
                      color:
                        t.status === 'Licensed (legacy)'
                          ? 'var(--color-burgundy)'
                          : 'var(--color-text-tertiary)',
                    }}
                  >
                    {t.status}
                  </div>
                  <div className="text-secondary type-prose">{t.bestFor}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14 space-y-3">
            <h2 className="text-label vw-small mb-3 text-gold">
              About the legacy NIV references
            </h2>
            <p className="vw-body">
              A subset of the devotionals on this site were imported from
              earlier sources that quoted the New International Version. Major
              modern translations including the NIV, ESV, NASB, and NRSV are
              copyrighted, and their license terms restrict how much of the text
              can appear in a public work — even one that does not charge for
              access.
            </p>
            <p className="vw-body">
              All new devotionals written from 2026 forward use only public
              domain or CC0 translations. The legacy NIV references are being
              audited; passages that exceed permitted use are being re-rendered
              into a public domain or CC0 translation chosen contextually.
              Citations remain in place. The audit document is published when
              complete.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-label vw-small mb-3 text-gold">
              When this page changes
            </h2>
            <p className="vw-body">
              If a translation is added or removed from the catalog, this page
              is updated. If a license arrangement is reached with the publisher
              of a major modern translation — through a free-tier API
              integration or a courtesy permission — that translation is added
              to the table with its license status disclosed. The intent is that
              a careful reader can always know exactly which English voices they
              are reading on this site, and on what terms.
            </p>
          </section>
        </div>
        <SiteBottom />
      </main>
    </div>
  )
}
