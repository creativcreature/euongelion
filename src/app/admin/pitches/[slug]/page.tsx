/**
 * One pitch, rendered — with the founder's response thread and verdict box
 * (SA-114 / F-158). The pitch body is session-authored HTML from the
 * private Storage bucket, rendered admin-only.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminShell from '@/components/AdminShell'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import PitchRespondClient from './PitchRespondClient'
import { readPitch, readResponses } from '@/lib/pitches'

export const dynamic = 'force-dynamic'

export default async function PitchPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await assertAdminOr404()
  const { slug } = await params
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) notFound()
  const pitch = await readPitch(slug)
  if (!pitch) notFound()
  const responses = await readResponses(slug)

  return (
    <AdminShell title={pitch.title} kicker="PITCH" activeHref="/admin/pitches">
      <p className="text-label vw-small text-muted mb-4">
        {pitch.session} · first pitched {pitch.createdAt.slice(0, 10)} · last
        updated {pitch.updatedAt.slice(0, 10)}
        {pitch.tags.length > 0 ? ` · ${pitch.tags.join(', ')}` : ''}
        {' · '}
        <Link href="/admin/pitches" className="link-highlight">
          all pitches
        </Link>
      </p>

      {/* Session-authored, admin-only content — rendered INLINE, never in
          an iframe (founder ruling 2026-08-20: no fake framing layers).
          Working features live as real /admin/lab routes in the real site;
          the pitch links to them. */}
      <article
        className="pitch-body"
        dangerouslySetInnerHTML={{ __html: pitch.html }}
      />

      <PitchRespondClient slug={slug} initialResponses={responses} />
    </AdminShell>
  )
}
