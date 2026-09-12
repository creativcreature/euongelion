/**
 * LAB — the Audible-style listening player, in literal context.
 *
 * The founder's note on the first pass was that the design "doesnt looke like
 * rhe website". A picture can always drift from the site; a route cannot, so
 * this renders inside the real shell with the real tokens, playing a REAL
 * rendered track with its REAL chapter marks. Founder-only.
 *
 * Plan: docs/superpowers/plans/2026-09-10-audible-style-audio-player.md
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import LabAudioPlayer from '@/components/lab/LabAudioPlayer'
import { getNarrationTrack } from '@/lib/audio/tracks'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lab — the listening player | Euangelion',
  robots: { index: false },
}

/**
 * A real reading, chosen for being ordinary rather than convenient: ten
 * chapters, which is the catalog median and the exact count of 442 of the 571
 * rendered tracks, and a mix of four editorial headings against six module
 * labels — the split the tiering exists for.
 */
const SLUG = 'abiding-in-his-presence-day-1'

export default async function AudioPlayerLab() {
  await assertAdminOr404()

  const track = getNarrationTrack(SLUG)
  // NO SILENT FALLBACK: if the sample track ever stops existing, this page
  // should disappear rather than quietly render an empty player and invite a
  // verdict on a design nobody can operate.
  if (!track?.chapters?.length) notFound()

  return (
    <div className="mock-paper newspaper-reading">
      <div className="edition-archive-band">
        <p>
          LAB — the listening player, in the site&apos;s own type and colour.
          Everything works: it plays the real track. Resize to 375px for the
          phone case.
        </p>
      </div>
      <EuangelionShellHeader />
      <main id="main-content" className="lab-main">
        <h1 className="edition-archive-title">The listening player</h1>
        <p className="edition-archive-stand">
          Navigation by named section instead of one scrubber across a whole
          reading — and a drive mode that switches sections rather than stepping
          through them.
        </p>
        <div className="paper-sheet lab-sheet">
          <LabAudioPlayer
            title="From Visiting to Dwelling"
            context="Abiding in His Presence · Day 1"
            src={track.src}
            duration={track.duration}
            chapters={track.chapters}
          />
        </div>
      </main>
      <SiteBottom />
    </div>
  )
}
