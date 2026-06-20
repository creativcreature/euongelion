/**
 * Segment extraction for the Audio Edition.
 *
 * Turns the real devotional data — catalog `Module[]` / `Panel[]`, and
 * generated-plan `DayContent` — into ordered, plain-text {@link TtsSegment}s
 * the player reads aloud. We read ONLY text that already exists in the
 * devotional; nothing is fabricated or summarized.
 */

import type { TtsSegment } from '@/lib/audio/tts-adapter'
import type { Module, Panel } from '@/types'
import type { DayContent } from '@/types/soul-audit-plan'

/**
 * Reduce light markdown / inline HTML to clean spoken prose:
 * strip emphasis markers, list bullets, headings, links → link text,
 * collapse whitespace. This keeps the voice from reading "asterisk".
 */
function toSpeech(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/\{\{wn:[a-z0-9-]+\|([^}]*)\}\}/g, '$1') // inline WordNote → surface word
    .replace(/<[^>]+>/g, ' ') // any stray HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // bold/italic
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // code
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^>\s?/gm, '') // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '') // bullets
    .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
    .replace(/\s+/g, ' ')
    .trim()
}

function pushSegment(
  segments: TtsSegment[],
  label: string,
  text: string,
): void {
  const spoken = toSpeech(text)
  if (spoken.length === 0) return
  segments.push({ id: `seg-${segments.length}`, label, text: spoken })
}

// ── Catalog devotionals: Module[] ──────────────────────────────────

/** A friendly spoken label per module type. */
function moduleLabel(module: Module, index: number): string {
  if (module.heading) return module.heading
  const byType: Partial<Record<string, string>> = {
    scripture: 'Scripture',
    vocab: 'Word study',
    teaching: 'Teaching',
    insight: 'Insight',
    story: 'Story',
    reflection: 'Reflection',
    prayer: 'Prayer',
    takeaway: 'Takeaway',
    bridge: 'Bridge',
    pullquote: 'Pull quote',
  }
  return byType[module.type] ?? `Section ${index + 1}`
}

/** The text a module contributes, in reading order. */
function moduleText(module: Module): string {
  const parts: string[] = []
  if (module.passage) parts.push(module.passage)
  if (module.definition) parts.push(module.definition)
  if (module.usage) parts.push(module.usage)
  if (module.content) parts.push(module.content)
  if (module.keyInsight) parts.push(module.keyInsight)
  if (module.ancientTruth) parts.push(module.ancientTruth)
  if (module.modernApplication) parts.push(module.modernApplication)
  if (module.connectionPoint) parts.push(module.connectionPoint)
  if (module.prompt) parts.push(module.prompt)
  if (module.prayerText) parts.push(module.prayerText)
  if (module.breathPrayer) parts.push(module.breathPrayer)
  if (module.commitment) parts.push(module.commitment)
  if (module.explanation) parts.push(module.explanation)
  return parts.join('. ')
}

export function buildModuleSegments(
  title: string,
  modules: Module[],
): TtsSegment[] {
  const segments: TtsSegment[] = []
  pushSegment(segments, 'Title', title)
  modules.forEach((module, index) => {
    pushSegment(segments, moduleLabel(module, index), moduleText(module))
  })
  return segments
}

// ── Catalog devotionals: Panel[] (Wake-Up legacy format) ───────────

export function buildPanelSegments(
  title: string,
  panels: Panel[],
): TtsSegment[] {
  const segments: TtsSegment[] = []
  pushSegment(segments, 'Title', title)
  // Panel 0 is the cover; the rest carry the reading.
  panels.slice(1).forEach((panel, index) => {
    pushSegment(
      segments,
      panel.heading || `Section ${index + 1}`,
      panel.content,
    )
  })
  return segments
}

// ── Generated plan days: DayContent ────────────────────────────────

export function buildDayContentSegments(content: DayContent): TtsSegment[] {
  const segments: TtsSegment[] = []
  pushSegment(segments, 'Title', content.title)
  if (content.scriptureReference) {
    pushSegment(segments, 'Scripture reference', content.scriptureReference)
  }
  pushSegment(segments, 'Scripture', content.scriptureText)
  // The grounded weave puts the full reading in textB; legacy days use hookA.
  pushSegment(segments, 'The reading', content.textB || content.hookA)
  if (content.centerC) pushSegment(segments, 'Center', content.centerC)
  if (content.christConnectionBPrime) {
    pushSegment(segments, 'Christ connection', content.christConnectionBPrime)
  }
  if (content.returnAPrime)
    pushSegment(segments, 'Return', content.returnAPrime)
  if (content.hebrewGreekStudy) {
    const w = content.hebrewGreekStudy
    pushSegment(
      segments,
      'Word study',
      `${w.word}, ${w.transliteration}. ${w.meaning}`,
    )
  }
  if (content.reflectionQuestions.length > 0) {
    pushSegment(segments, 'Reflect', content.reflectionQuestions.join('. '))
  }
  pushSegment(segments, 'Prayer', content.prayer)
  return segments
}
