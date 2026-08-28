/**
 * LAB — one future, on a real surface.
 *
 * `?s=paper` renders today's ACTUAL edition through the real EditionPage.
 * `?s=devotional` renders a real reading through the real reader.
 * `?slug=` overrides which reading, so a treatment can be checked against a
 * plate-heavy day and a text-only day rather than one flattering example.
 *
 * Nothing is mocked. A treatment that only survives on invented content is
 * not a treatment, it is a poster — and the founder's standing rule for
 * interactive proposals (2026-08-20) is that they exist as real content in
 * the real page.
 */
import { notFound } from 'next/navigation'
import EditionPage from '@/components/edition/EditionPage'
import DevotionalPageClient from '@/app/devotional/[slug]/DevotionalPageClient'
import FutureLens from '@/components/lab/FutureLens'
import { fetchTodayDevotional } from '@/lib/today-devotional'
import { getConcept, type SurfaceId } from '@/lib/lab/futures'

export const dynamic = 'force-dynamic'

/** A reading with real artwork, so the plate treatments have something to
 *  work on. Overridable with ?slug= for a text-only comparison. */
const DEFAULT_SLUG = 'abiding-in-his-presence-day-1'

export default async function FuturePage({
  params,
  searchParams,
}: {
  params: Promise<{ concept: string }>
  searchParams: Promise<{ s?: string; slug?: string }>
}) {
  const { concept: id } = await params
  const sp = await searchParams
  const concept = getConcept(id)
  if (!concept) notFound()

  const surface: SurfaceId = sp.s === 'devotional' ? 'devotional' : 'paper'
  const slug = sp.slug || DEFAULT_SLUG

  let body: React.ReactNode
  if (surface === 'paper') {
    body = <EditionPage date={new Date()} />
  } else {
    const initialDevotional = await fetchTodayDevotional(slug)
    body = (
      <DevotionalPageClient slug={slug} initialDevotional={initialDevotional} />
    )
  }

  return (
    <FutureLens concept={concept.id} surface={surface}>
      {body}
    </FutureLens>
  )
}
