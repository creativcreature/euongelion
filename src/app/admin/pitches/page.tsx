/**
 * The pitch site (SA-114 / F-158) — every euangelion pitch from every
 * session, one archive, founder-respondable, organized. Founder: "the site
 * needs to be organized so that multiple agents can write to it
 * simultaneously, keeping all pitches whether present or archived in order
 * and organized." Concurrent-safety lives in src/lib/pitches.ts (one
 * object per pitch, list-derived index, no shared file to race).
 */
import Link from 'next/link'
import AdminShell from '@/components/AdminShell'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import { listPitches } from '@/lib/pitches'

export const metadata = {
  title: 'Pitches | Euangelion',
  description: 'Every pitch from every session, in one place.',
}

export const dynamic = 'force-dynamic'

const VERDICT_LABEL: Record<string, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  parked: 'PARKED',
}

export default async function PitchesPage() {
  await assertAdminOr404()
  const pitches = await listPitches()
  const awaiting = pitches.filter((p) => p.responseCount === 0)
  const discussed = pitches.filter(
    (p) => p.responseCount > 0 && !p.latestVerdict,
  )
  const archived = pitches.filter((p) => p.latestVerdict)

  const Card = ({ p }: { p: (typeof pitches)[number] }) => (
    <Link
      key={p.slug}
      href={`/admin/pitches/${p.slug}`}
      className="block border border-[var(--color-border)] p-4"
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vw-body font-semibold">{p.title}</span>
        <span className="text-label vw-small text-gold">
          {p.latestVerdict
            ? (VERDICT_LABEL[p.latestVerdict] ?? p.latestVerdict)
            : p.responseCount > 0
              ? 'DISCUSSED'
              : 'AWAITING YOU'}
        </span>
      </div>
      <p className="text-label vw-small text-muted">
        {p.updatedAt.slice(0, 10)} · {p.session}
        {p.tags.length > 0 ? ` · ${p.tags.join(', ')}` : ''}
        {p.responseCount > 0
          ? ` · ${p.responseCount} response${p.responseCount === 1 ? '' : 's'}`
          : ''}
      </p>
    </Link>
  )

  return (
    <AdminShell
      title="Pitches"
      kicker="THE BACK OFFICE"
      activeHref="/admin/pitches"
    >
      <p className="vw-body mb-6">
        Every pitch from every session lands here — read it, then rule on it at
        the bottom of its page. Nothing lives in chat artifacts anymore.
      </p>
      {pitches.length === 0 && (
        <div className="border border-[var(--color-border)] p-4">
          <p className="text-label vw-small mb-2 text-gold">
            NOTHING PITCHED YET
          </p>
          <p className="vw-body">
            Sessions publish with{' '}
            <code>node scripts/pitches/publish-pitch.mjs</code>.
          </p>
        </div>
      )}
      {awaiting.length > 0 && (
        <section aria-label="Awaiting you" className="mb-8">
          <h2 className="text-label vw-small mb-3 text-gold">AWAITING YOU</h2>
          <div className="grid gap-3">
            {awaiting.map((p) => (
              <Card key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
      {discussed.length > 0 && (
        <section aria-label="In discussion" className="mb-8">
          <h2 className="text-label vw-small mb-3 text-gold">IN DISCUSSION</h2>
          <div className="grid gap-3">
            {discussed.map((p) => (
              <Card key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
      {archived.length > 0 && (
        <section aria-label="The archive">
          <h2 className="text-label vw-small mb-3 text-gold">
            THE ARCHIVE — RULED ON
          </h2>
          <div className="grid gap-3">
            {archived.map((p) => (
              <Card key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  )
}
