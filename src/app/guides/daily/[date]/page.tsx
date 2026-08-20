/**
 * The day's How-to-Read articles, in full (SA-114 / F-158).
 *
 * Founder: "How to read should be something new every day, so new blog
 * articles need to be written for them as well." The daily composer writes
 * three fresh articles as guide rows; the paper's cards link here; this
 * route reads the same 7am-rule edition the paper does, so articles print
 * with their edition and never leak early.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { getLiveEdition } from '@/lib/edition/deadline'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>
}): Promise<Metadata> {
  const { date } = await params
  return {
    title: `How to read — ${date} | Euangelion`,
    description: `The Daily Bread's reading guides for ${date}, in full.`,
    alternates: { canonical: `/guides/daily/${date}` },
  }
}

export default async function DailyGuidesPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const edition = await getLiveEdition(date)
  const articles = (edition.guide ?? []).map((g) => g.payload)
  if (articles.length === 0) notFound()

  return (
    <div className="mock-paper newspaper-reading">
      <EuangelionShellHeader />
      <main id="main-content" className="edition-archive-main">
        <p className="text-label edition-dailyguide-kicker">
          HOW TO READ · {date}
        </p>
        <h1 className="edition-archive-title">The day&apos;s guides</h1>
        {articles.map((g, i) => (
          <article
            key={g.title}
            id={`g${i + 1}`}
            className="edition-dailyguide"
          >
            <p className="edition-guide-kicker">{g.kicker}</p>
            <h2 className="edition-dailyguide-head">{g.title}</h2>
            <p className="edition-dailyguide-stand">{g.standfirst}</p>
            {g.image && (
              <span className="edition-dailyguide-plate">
                <Image
                  src={g.image}
                  alt={g.alt}
                  width={1200}
                  height={800}
                  className="edition-dailyguide-img"
                />
              </span>
            )}
            {(g.body ?? []).map((para, n) => (
              <p key={n} className="edition-dailyguide-para">
                {para}
              </p>
            ))}
            <ol className="edition-guide-steps">
              {g.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="edition-guide-time">{g.minutes}</p>
          </article>
        ))}
        <p>
          <Link href="/daily-bread" className="edition-rail-more">
            Back to today&apos;s paper &rarr;
          </Link>
        </p>
      </main>
      <SiteBottom />
    </div>
  )
}
