import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { BIBLE_TRANSLATION_CODES, BIBLE_TRANSLATIONS } from '@/lib/bible'

export const metadata = {
  title: 'Credits & Translations',
  description:
    'Bible translations, attributions, and licensing notes for the texts used on Euangelion.',
}

export default function CreditsPage() {
  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-3xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'CREDITS' }]}
          />

          <h1 className="text-display vw-heading-lg mb-8">
            Credits &amp; Translations
          </h1>

          <p className="vw-body mb-6 leading-relaxed text-secondary">
            Euangelion uses freely-distributable Bible translations — public
            domain or CC0-dedicated. None require a license fee. Below is the
            full attribution for every translation we ship.
          </p>

          <p className="vw-body mb-12 leading-relaxed text-secondary">
            You can choose your default translation in{' '}
            <Link
              href="/settings"
              className="underline decoration-dotted underline-offset-2"
            >
              Settings
            </Link>
            .
          </p>

          <h2 className="text-display vw-heading-md mb-6">
            Bible Translations
          </h2>

          <div className="space-y-10">
            {BIBLE_TRANSLATION_CODES.map((code) => {
              const meta = BIBLE_TRANSLATIONS[code]
              return (
                <section
                  key={code}
                  id={code.toLowerCase()}
                  className="border-l-2 pl-6"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-2 text-gold">
                    {meta.short} · {meta.licenseShort}
                  </p>
                  <h3 className="text-display vw-heading-sm mb-3">
                    {meta.name}{' '}
                    <span className="vw-small text-muted">({meta.year})</span>
                  </h3>
                  <p className="vw-body mb-3 leading-relaxed text-secondary">
                    {meta.description}
                  </p>
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 vw-small text-muted">
                    <dt>License</dt>
                    <dd className="text-secondary">{meta.license}</dd>
                    <dt>Source</dt>
                    <dd className="text-secondary">{meta.source}</dd>
                    <dt>Tone</dt>
                    <dd className="text-secondary">{meta.tone}</dd>
                  </dl>
                </section>
              )
            })}
          </div>

          <h2 className="text-display vw-heading-md mb-6 mt-16">
            Notes &amp; Caveats
          </h2>

          <div className="space-y-4 vw-body leading-relaxed text-secondary">
            <p>
              <strong className="text-[var(--color-text-primary)]">
                King James Version
              </strong>{' '}
              is in the public domain in the United States. In the United
              Kingdom it remains under perpetual Crown Copyright by Letters
              Patent. Euangelion is a US-hosted service; UK readers may freely
              consume the text here.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">
                Bible in Basic English
              </strong>{' '}
              was originally published by Cambridge University Press in 1949 (NT
              1941). Its US copyright was never renewed, placing it in the
              public domain in the United States. The UK copyright term has also
              now expired.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">
                Darby Translation
              </strong>{' '}
              ships from ebible.org&rsquo;s plain distribution of John Nelson
              Darby&rsquo;s 1890 text, not from later edited editions that carry
              their own typesetting rights.
            </p>
            <p>
              All seven translations are stored as static JSON in{' '}
              <code className="vw-small bg-surface-raised px-2 py-0.5 text-[var(--color-text-primary)]">
                public/bibles/
              </code>{' '}
              and looked up at devotional-generation time. The 175 hand-curated
              devotionals on the site keep their originally-authored Scripture
              text as published.
            </p>
          </div>

          <h2 className="text-display vw-heading-md mb-6 mt-16">
            Other Credits
          </h2>

          <div className="space-y-4 vw-body leading-relaxed text-secondary">
            <p>
              Devotional-print artwork is generated from public-domain source
              imagery. See individual artwork captions for attribution where
              applicable.
            </p>
            <p>
              Original languages: Hebrew text is rendered with the SBL Hebrew
              font from the Society of Biblical Literature. Greek glyphs use
              system Unicode.
            </p>
          </div>
        </div>
        <SiteBottom />
      </main>
    </div>
  )
}
