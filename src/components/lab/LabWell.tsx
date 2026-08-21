/**
 * LAB — the well, in literal context (SA-114 / F-158).
 *
 * Founder: demos "need to actually exist in the page as actual content on
 * page... I need to see the designs in literal context." This renders the
 * proposed post-seam continuation UNDER the real paper, as real
 * paper-sheet compartments carrying REAL content: yesterday's edition
 * rows, a real Vasari print, the real hymn and catechism banks. The
 * "endless" behavior prints the next sheet as you approach it.
 */
import Image from 'next/image'
import Link from 'next/link'
import VASARI from '@/data/gallery-vasari.json'
import { pickHymnForDay } from '@/data/hymn-bank'
import { pickCatechismForDay } from '@/data/catechism-bank'
import { pickVoiceForDay } from '@/data/voices-bank'
import { editionArchiveDates } from '@/lib/edition/archive'
import LabWellClient from './LabWellClient'

export default function LabWell() {
  const now = new Date()
  const archive = editionArchiveDates(now)
  const yesterday = archive[0]
  const older = archive[1]
  const print = (
    VASARI as { entries: { file: string; title: string; shown: string }[] }
  ).entries[14]
  const hymn = pickHymnForDay(new Date(now.getTime() - 86_400_000))
  const catechism = pickCatechismForDay(
    new Date(now.getTime() - 2 * 86_400_000),
  )
  const voice = pickVoiceForDay(new Date(now.getTime() - 86_400_000)) as {
    quote?: string
    author?: string
  } | null

  const sheets = [
    {
      n: 'SHEET TWO',
      title: 'From the Well',
      boxes: [
        {
          k: `VOICES · YESTERDAY`,
          body: voice?.quote ? `“${voice.quote}”` : '',
          foot: voice?.author ?? '',
        },
        {
          k: `FROM THE ARCHIVE · ${yesterday ?? ''}`,
          body: 'Yesterday’s paper, kept exactly as it printed.',
          href: yesterday ? `/daily-bread/archive/${yesterday}` : undefined,
          foot: 'Read it whole →',
        },
        {
          k: 'A PRINT',
          image: `/images/devotional-prints/${print.file}`,
          body: print.shown.slice(0, 140) + '…',
          foot: print.title,
        },
      ],
    },
    {
      n: 'SHEET THREE',
      title: 'The Long Shelf',
      boxes: [
        {
          k: `THE HYMNAL · ${hymn?.author ?? ''}, ${hymn?.year ?? ''}`,
          body: hymn ? hymn.verses[0].join('\n') : '',
          foot: hymn?.title ?? '',
        },
        {
          k: 'THE CATECHISM',
          body: catechism
            ? `${catechism.question} ${catechism.answer.slice(0, 160)}…`
            : '',
          foot: 'Heidelberg',
        },
        {
          k: `AN OLDER PAPER · ${older ?? ''}`,
          body: 'The well goes as deep as the archive.',
          href: older ? `/daily-bread/archive/${older}` : undefined,
          foot: 'Open it →',
        },
      ],
    },
  ]

  return (
    <div className="lab-well">
      <div className="lab-seam" aria-hidden="true">
        <b>The paper ends here. The well doesn&apos;t.</b>
      </div>
      {sheets.map((sheet, i) => (
        <LabWellClient key={sheet.n} index={i}>
          <div className="lab-sheethead">
            <p className="text-label lab-sheet-n">{sheet.n} · FROM THE WELL</p>
            <p className="lab-sheet-t">{sheet.title}</p>
          </div>
          <div className="paper-sheet lab-sheet">
            {sheet.boxes.map((b) => (
              <div key={b.k} className="paper-box lab-box" data-reveal>
                <div className="edition-section-bar">
                  <h2 className="edition-section-head">{b.k}</h2>
                </div>
                {b.image && (
                  <span className="lab-plate">
                    <Image
                      src={b.image}
                      alt={b.body}
                      width={800}
                      height={600}
                      className="lab-plate-img"
                    />
                  </span>
                )}
                {b.body && <p className="lab-box-body">{b.body}</p>}
                {b.href ? (
                  <Link href={b.href} className="edition-rail-more">
                    {b.foot}
                  </Link>
                ) : (
                  b.foot && <p className="edition-section-note">{b.foot}</p>
                )}
              </div>
            ))}
          </div>
        </LabWellClient>
      ))}
      <p className="lab-wellnote">
        — in the full build the well keeps printing: every archived paper, 175
        readings, 365 days, 145 prints —
      </p>
    </div>
  )
}
