import { typographer } from '@/lib/typographer'

/**
 * Red-letter rendering — the words of Christ (F-095).
 *
 * Founder, 2026-08-15: "through out the site — Jesus direct words in Red.
 * ensure the highlight color is correct for such text."
 *
 * WHAT THIS FILE DOES AND DELIBERATELY DOES NOT DO. It renders spans that have
 * been ATTRIBUTED as Christ's direct speech. It does not attribute them.
 * Attribution is an editorial and theological judgement and is never inferred
 * here, because the obvious inference is wrong in the catalog we actually have:
 *
 *   Luke 10:33-37 (BSB), a real passage in `looking-at-the-sun-day-4`, contains
 *   three quoted spans. The first and third are Jesus. The second — "The one
 *   who showed him mercy" — is the expert in the law. A quotation-mark pass
 *   reddens all three and puts Christ's colour on another man's words.
 *
 * So spans arrive explicitly, from `module.redLetter`. Anything unmatched is
 * left black rather than guessed at. A missing red word is a typographic
 * omission; a wrongly-red word is a false attribution, and only one of those is
 * recoverable.
 */

/** Escape a literal for use inside a RegExp. */
function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Wrap each attributed span in `<span class="wj">`, leaving everything else to
 * the typographer.
 *
 * Matching is literal and case-sensitive: these spans are copied from the
 * passage itself, so a loose match would only ever widen the red beyond what
 * was attributed. A span that does not match is skipped in silence — the
 * passage still renders correctly, just without that colour.
 */
export function renderRedLetter(
  passage: string,
  spans?: readonly string[] | null,
  emphasis?: readonly string[] | null,
): React.ReactNode {
  const cleaned = (spans ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // Longest first, so a span that contains another does not get cut in half.
    .sort((a, b) => b.length - a.length)

  if (cleaned.length === 0) return typographer(passage)

  const pattern = new RegExp(`(${cleaned.map(escapeLiteral).join('|')})`, 'g')
  const parts = passage.split(pattern)

  return parts.map((part, i) => {
    if (!part) return null
    if (cleaned.includes(part)) {
      return (
        <span key={i} className="wj" data-words-of-christ="true">
          {withEmphasis(part, emphasis)}
        </span>
      )
    }
    return <span key={i}>{withEmphasis(part, emphasis)}</span>
  })
}

/**
 * Apply the module's editorial emphasis INSIDE whatever it is given.
 *
 * Red letter used to replace emphasis entirely, which meant a verse gaining
 * attribution silently lost its gold emphasis words. The two are different
 * things — attribution is who is speaking, emphasis is what the devotional is
 * pointing at — so both render, emphasis nested within the red.
 */
function withEmphasis(
  text: string,
  emphasis?: readonly string[] | null,
): React.ReactNode {
  const words = (emphasis ?? []).filter((w) => w.trim().length > 0)
  if (words.length === 0) return typographer(text)

  const pattern = new RegExp(
    `(${words.map(escapeLiteral).sort((a, b) => b.length - a.length).join('|')})`,
    'gi',
  )
  return text.split(pattern).map((part, i) => {
    if (!part) return null
    const isEmphasis = words.some((w) => w.toLowerCase() === part.toLowerCase())
    return isEmphasis ? (
      <em key={i} className="wj-emphasis">
        {typographer(part)}
      </em>
    ) : (
      <span key={i}>{typographer(part)}</span>
    )
  })
}

/** True when a module carries any attributed words of Christ. */
export function hasRedLetter(spans?: readonly string[] | null): boolean {
  return Boolean(spans && spans.some((s) => s.trim().length > 0))
}
