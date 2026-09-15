/**
 * /admin/preview/daily-bread-v2 — a Daily Bread V2 edition in ANY lifecycle
 * (ready, published, withdrawn) rendered exactly as readers will see it, plus
 * its provenance: providers, fallbacks, module failures, comic level
 * (SA-142 / F-184). Founder-only: the /admin layout gates, and this page
 * asserts the allowlist again (everyone else gets 404). Never indexed.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import DailyBreadEdition from '@/components/daily-bread/DailyBreadEdition'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import { getDailyBreadRepository } from '@/lib/daily-bread/repository'
import { addDays, editorialDate, isValidDateSlug } from '@/lib/daily-bread/time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function DailyBreadV2Preview({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await assertAdminOr404()
  const { date: raw } = await searchParams
  const date = isValidDateSlug(raw) ? raw : addDays(editorialDate(new Date()), 1)
  const repo = getDailyBreadRepository()
  const [edition, neighbors] = await Promise.all([
    repo.getEdition(date, { includeUnpublished: true }),
    repo.getNeighbors(date),
  ])

  return (
    <div>
      <nav className="db2-preview-bar" aria-label="Preview dates">
        <Link href={`/admin/preview/daily-bread-v2?date=${addDays(date, -1)}`}>&larr; {addDays(date, -1)}</Link>
        <span>{date}</span>
        <Link href={`/admin/preview/daily-bread-v2?date=${addDays(date, 1)}`}>{addDays(date, 1)} &rarr;</Link>
      </nav>
      {edition ? (
        <>
          <DailyBreadEdition edition={edition} neighbors={neighbors} mode="preview" />
          <section className="db2-provenance" aria-label="How this edition was made">
            <h2>Provenance</h2>
            <dl>
              <dt>Run</dt>
              <dd>{edition.generation.runId}</dd>
              <dt>Primary provider</dt>
              <dd>{edition.generation.primaryProvider}</dd>
              <dt>Fallbacks used</dt>
              <dd>{edition.generation.fallbackProvidersUsed.join(', ') || 'none'}</dd>
              <dt>Frame written by</dt>
              <dd>
                {edition.generation.provider
                  ? `${edition.generation.provider}${edition.generation.model ? ` (${edition.generation.model})` : ''} · prompt v${edition.generation.promptVersion} · fallback level ${edition.generation.fallbackLevel} · ${edition.generation.generatedAt}`
                  : 'not recorded (built before 2026-09-14)'}
              </dd>
              <dt>Comic</dt>
              <dd>{edition.generation.comicLevel}</dd>
              <dt>Module failures</dt>
              <dd>
                {edition.generation.moduleFailures.length === 0
                  ? 'none'
                  : edition.generation.moduleFailures.map((f) => `${f.module}: ${f.error}`).join(' · ')}
              </dd>
              <dt>Asset fallbacks</dt>
              <dd>{edition.generation.assetFallbacks.join(' · ') || 'none'}</dd>
              <dt>Provider calls</dt>
              <dd>
                {edition.generation.usage
                  .map((u) => `${u.task}/${u.provider}: ${u.ok ? 'ok' : `failed (${u.error ?? 'unknown'})`}`)
                  .join(' · ')}
              </dd>
            </dl>
          </section>
        </>
      ) : (
        <p className="edition-broken-head" role="status">
          No V2 edition exists for {date} yet.
        </p>
      )}
    </div>
  )
}
