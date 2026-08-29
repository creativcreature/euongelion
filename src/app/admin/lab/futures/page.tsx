/**
 * THE PROOF — nine moves you can actually use.
 *
 * Founder, 2026-08-28: "you just talking about visuals doesnt do anything…
 * I need to literally use the thing to tell if its good or not." So nothing
 * on this page is a description, a mockup, or a screenshot. Every panel is
 * the working feature, running, with its controls exposed, and a verdict box
 * underneath that writes to the real pitch archive.
 *
 * This REPLACES the seven CSS films that were rejected on 2026-08-27. Those
 * were treatments laid over the page; these are the features themselves.
 */
import Link from 'next/link'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import { readResponses } from '@/lib/pitches'
import MoveCard from '@/components/lab/MoveCard'
import LivingPlate from '@/components/lab/demos/LivingPlate'
import DiagramPlate from '@/components/lab/demos/DiagramPlate'
import RadiantGeometry from '@/components/lab/demos/RadiantGeometry'
import GhostWordmark from '@/components/lab/demos/GhostWordmark'
import LeaderIndex from '@/components/lab/demos/LeaderIndex'
import EditionReadout from '@/components/lab/demos/EditionReadout'
import PanelDesk from '@/components/lab/demos/PanelDesk'
import WordUnfold from '@/components/lab/demos/WordUnfold'
import CrossPile from '@/components/lab/demos/CrossPile'
import { MOVES } from '@/lib/lab/moves'

export const dynamic = 'force-dynamic'

const DEMOS: Record<string, React.ReactNode> = {
  'move-living-plate': <LivingPlate />,
  'move-diagram-plate': <DiagramPlate />,
  'move-radiant-geometry': <RadiantGeometry />,
  'move-ghost-wordmark': <GhostWordmark />,
  'move-leader-index': <LeaderIndex />,
  'move-edition-readout': <EditionReadout />,
  'move-panel-desk': <PanelDesk />,
  'move-word-unfold': <WordUnfold />,
  'move-cross-pile': <CrossPile />,
}

/**
 * The page asserts the allowlist ITSELF. A layout gate alone is not enough
 * and this was proved in production on 2026-08-28: with the gate only in the
 * layout, an anonymous GET returned the lab chrome and all the concept copy,
 * because React streams layout and page concurrently.
 */
export default async function ProofPage() {
  await assertAdminOr404()

  const threads = await Promise.all(
    MOVES.map(async (m) => {
      try {
        return await readResponses(m.slug)
      } catch {
        // A missing thread is normal — nothing has been ruled on yet.
        return []
      }
    }),
  )

  return (
    <div className="lab-root">
      <div className="lab-bar">
        <Link href="/admin">← admin</Link>
        <Link href="/admin/pitches">pitch archive</Link>
        <span className="lab-bar-note">
          THE PROOF · nine working moves · your verdicts save to the archive
        </span>
      </div>

      <header className="lab-hero">
        <h1>Nine moves you can actually use</h1>
        <p className="lab-lede">
          Everything below is running code, not a picture of an idea. Drag the
          sliders, shove the pile, tap the Greek. If a move is not obviously
          better with your hands on it, kill it — that is what the buttons are
          for, and a verdict here lands in the same archive as every pitch.
        </p>
        <p className="lab-lede lab-lede-2">
          <strong>What changed since the last round.</strong> The eight-move
          pitch missed that the Nous imagery is <em>animated</em> — its hero is
          a looping video of a dithered figure, not a still. Move 01 is that
          discovery built properly, and it also fixes the moiré that wrecked the
          earlier dither pass: this engine averages the plate into coarse cells
          before drawing dots, so there is no source grid left to beat against.
          Compare it to the source and you can see it working.
        </p>
        <nav className="lab-jump">
          {MOVES.map((m, i) => (
            <a key={m.slug} href={`#m${i + 1}`}>
              <span>[{i + 1}]</span> {m.short}
            </a>
          ))}
        </nav>
      </header>

      <main className="lab-moves">
        {MOVES.map((m, i) => (
          <MoveCard
            key={m.slug}
            n={i + 1}
            title={m.title}
            slug={m.slug}
            what={m.what}
            look={m.look}
            effort={m.effort}
            risk={m.risk}
            initialResponses={threads[i]}
          >
            {DEMOS[m.slug]}
          </MoveCard>
        ))}
      </main>

      <footer className="lab-foot">
        <p>
          Verdicts are stored against the pitch archive and are visible at{' '}
          <Link href="/admin/pitches">/admin/pitches</Link>. Nothing here is
          live on the site — this page is admin-only and every move is opt-in
          until you approve it.
        </p>
      </footer>
    </div>
  )
}
