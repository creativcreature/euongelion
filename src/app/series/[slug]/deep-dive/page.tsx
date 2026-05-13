import fs from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

async function loadDeepDive(slug: string): Promise<string | null> {
  const filePath = path.join(
    process.cwd(),
    'content',
    'series-deep-dives',
    `${slug}.md`,
  )
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const series = SERIES_DATA[slug]
  if (!series) return { title: 'Deep Dive Not Found' }

  return {
    title: `Deep Dive: ${series.title} | Euangelion`,
    description: `Long-form deep dive on ${series.title}. ${series.question}`,
    alternates: { canonical: `/series/${slug}/deep-dive` },
    openGraph: {
      title: `Deep Dive — ${series.title}`,
      description: series.question,
      type: 'article',
      url: `https://euangelion.app/series/${slug}/deep-dive`,
    },
  }
}

export function generateStaticParams() {
  return ALL_SERIES_ORDER.map((slug) => ({ slug }))
}

export default async function DeepDivePage({ params }: Props) {
  const { slug } = await params
  const series = SERIES_DATA[slug]
  if (!series) notFound()

  const markdown = await loadDeepDive(slug)
  if (!markdown) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader />
          <div className="shell-content-pad mx-auto max-w-3xl">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: 'SERIES', href: '/series' },
                { label: series.title.toUpperCase(), href: `/series/${slug}` },
                { label: 'DEEP DIVE' },
              ]}
            />
            <header className="mb-10">
              <p className="text-label vw-small mb-3 text-gold">DEEP DIVE</p>
              <h1 className="vw-heading-md">
                No deep dive yet for {series.title}.
              </h1>
              <p className="vw-body mt-4 text-secondary">
                A long-form companion piece for this series is in preparation.
                In the meantime, walk through the daily readings.
              </p>
              <Link
                href={`/series/${slug}`}
                className="cta-major text-label vw-small mt-6 inline-block px-5 py-2"
              >
                BROWSE THE SERIES
              </Link>
            </header>
          </div>
          <SiteFooter />
        </main>
      </div>
    )
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <article className="shell-content-pad mx-auto max-w-3xl">
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: 'SERIES', href: '/series' },
              { label: series.title.toUpperCase(), href: `/series/${slug}` },
              { label: 'DEEP DIVE' },
            ]}
          />

          <header className="mb-12">
            <p className="text-label vw-small mb-3 text-gold">DEEP DIVE</p>
            <h1 className="vw-heading-md">{series.title}</h1>
            <p className="vw-body mt-4 text-secondary type-prose">
              {series.question}
            </p>
          </header>

          <div className="deep-dive-prose type-prose">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="text-display vw-heading-md mt-16 mb-6">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h2 className="text-display vw-heading-sm mt-14 mb-5">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-display vw-body-lg mt-10 mb-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="vw-body leading-relaxed text-secondary mb-6">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ fontStyle: 'italic' }}>{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-8 pl-6"
                    style={{
                      borderLeft: '2px solid var(--color-gold)',
                      fontStyle: 'italic',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="link-highlight"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={
                      href?.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="my-6 ml-6 space-y-2 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-6 ml-6 space-y-2 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="vw-body leading-relaxed text-secondary">
                    {children}
                  </li>
                ),
                hr: () => (
                  <hr
                    className="my-12"
                    style={{
                      border: 'none',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  />
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>

          <aside className="mt-20 mb-12 text-center">
            <Link
              href={`/series/${slug}`}
              className="cta-major text-label vw-small inline-block px-5 py-2"
            >
              ← BACK TO {series.title.toUpperCase()}
            </Link>
          </aside>
        </article>
        <SiteFooter />
      </main>
    </div>
  )
}
