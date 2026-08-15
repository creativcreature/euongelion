import { resolveRedLetter, withRedLetter } from '@/lib/red-letter-resolve'
import type { DevotionalModule } from '@/types/soul-audit'
import type { DayContent } from '@/types/soul-audit-plan'

/**
 * onboardingDayContentToModules
 *
 * Derives the editorial module layout for the Soul Audit onboarding day
 * (day 0) from its already-persisted, fully grounded {@link DayContent}.
 *
 * The onboarding day is built by `buildOnboardingDay` (curated-builder.ts) and
 * stored as a DayContent by `onboardingDayToContent` (select/route.ts):
 *   - scriptureReference / scriptureText  → the verbatim anchor verse
 *   - textB                               → the "Before You Begin" orientation
 *                                           prose, a markdown body whose section
 *                                           breaks are standalone `**subhead**`
 *                                           paragraphs
 *   - reflectionQuestions                 → the journal prompt lines
 *   - prayer                              → the closing prayer
 *
 * This adapter re-shapes ONLY that existing content into the same module
 * pipeline the catalog reader uses (ScriptureModule drop caps, TeachingModule
 * editorial typography, ReflectionModule, PrayerModule). It invents nothing:
 * every field maps verbatim from the DayContent. No art/image module is emitted
 * (image generation is unavailable and the source carries no grounded artwork).
 *
 * Module shape: this returns the same nested-`content` {@link DevotionalModule}
 * shape that `aiPlanDayToReader` emits. `ModuleRenderer.normalizeModule`
 * (src/components/ModuleRenderer.tsx) RESERVES the top-level `content` key for a
 * nested object — it destructures `content` out and spreads its fields onto the
 * module — so prop-shape fields (passage, prayerText, prompt, …) must live
 * INSIDE `content`, never flat.
 */

function trim(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** A standalone paragraph that is entirely a bold subhead, e.g. `**Sit…**`. */
const SUBHEAD_PARAGRAPH = /^\*\*(.+?)\*\*$/

/** Inline markdown emphasis that the plain (drop-cap) path would render raw. */
const HAS_INLINE_MARKDOWN = /(\*\*|__|[*_][^*_]|\[[^\]]+\]\()/

interface ProseSection {
  heading?: string
  body: string
}

/**
 * Split the orientation body into sections on its standalone `**subhead**`
 * paragraphs. The text before the first subhead is the lead section (no
 * heading); each subhead opens a new titled section carrying the prose that
 * follows it. Paragraph structure inside a section is preserved (`\n\n`).
 */
function splitIntoSections(body: string): ProseSection[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const sections: ProseSection[] = []
  let current: ProseSection | null = null

  for (const paragraph of paragraphs) {
    const subheadMatch = paragraph.match(SUBHEAD_PARAGRAPH)
    if (subheadMatch) {
      if (current && current.body.trim().length > 0) sections.push(current)
      current = { heading: subheadMatch[1].trim(), body: '' }
      continue
    }
    if (!current) {
      current = { body: paragraph }
    } else {
      current.body = current.body
        ? `${current.body}\n\n${paragraph}`
        : paragraph
    }
  }
  if (current && current.body.trim().length > 0) sections.push(current)

  return sections
}

export function onboardingDayContentToModules(
  content: DayContent,
): DevotionalModule[] {
  const modules: DevotionalModule[] = []

  // 1. Scripture — the verbatim anchor verse, with the editorial treatment
  //    from ScriptureModule (variant chosen by passage length).
  const passage = trim(content.scriptureText)
  const reference = trim(content.scriptureReference)
  if (passage || reference) {
    modules.push({
      type: 'scripture',
      heading: 'SCRIPTURE',
      content: { passage, reference },
      // SA-051: Christ's words are attributed as the module is built, so
      // generated readings carry red letter without an authoring step.
      ...(resolveRedLetter(reference, passage).length > 0
        ? { redLetter: resolveRedLetter(reference, passage) }
        : {}),
    })
  }

  // 2. Teaching — the "Before You Begin" orientation, split on its existing
  //    `**subhead**` markers so the editorial rhythm (drop cap on the lead,
  //    display headings on each section) applies exactly like the catalog.
  const body = trim(content.textB)
  if (body) {
    const sections = splitIntoSections(body)
    sections.forEach((section) => {
      const useMarkdown = HAS_INLINE_MARKDOWN.test(section.body)
      // The page chrome already renders the day title ("Before You Begin") as the
      // H1, so the lead section carries NO heading — its drop-cap prose flows
      // directly under the title, magazine-style. Later sections use their own
      // `**subhead**`. Only the lead omits markdown so the drop cap renders
      // (TeachingModule shows the drop cap only on the plain path).
      const heading = section.heading ?? ''
      modules.push({
        type: 'teaching',
        heading,
        content: { content: section.body, markdown: useMarkdown },
      })
    })
  }

  // 3. Reflection — the journal prompt(s), first as the headline prompt and any
  //    remaining lines as the supporting question list.
  const questions = (content.reflectionQuestions ?? [])
    .map((q) => trim(q))
    .filter((q) => q.length > 0)
  if (questions.length > 0) {
    modules.push({
      type: 'reflection',
      heading: 'REFLECT',
      content: {
        invitationType: 'a place to start',
        prompt: questions[0],
        additionalQuestions: questions.slice(1),
      },
    })
  }

  // 4. Prayer — the closing prayer, centered serif treatment.
  const prayer = trim(content.prayer)
  if (prayer) {
    modules.push({
      type: 'prayer',
      heading: 'PRAYER',
      content: { prayerText: prayer },
    })
  }

  return modules
}
