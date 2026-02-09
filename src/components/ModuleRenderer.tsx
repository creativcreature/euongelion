import type { Module } from '@/types'
import ScriptureModule from './modules/ScriptureModule'
import VocabModule from './modules/VocabModule'
import TeachingModule from './modules/TeachingModule'
import InsightModule from './modules/InsightModule'
import StoryModule from './modules/StoryModule'
import ReflectionModule from './modules/ReflectionModule'
import PrayerModule from './modules/PrayerModule'
import TakeawayModule from './modules/TakeawayModule'
import BridgeModule from './modules/BridgeModule'
import ComprehensionModule from './modules/ComprehensionModule'
import ProfileModule from './modules/ProfileModule'
import ResourceModule from './modules/ResourceModule'

/**
 * Normalizes a module from either flat or nested Substack format.
 * Flat: { type: "vocab", word: "hevel" }
 * Nested: { type: "vocab", content: { word: "hevel" } }
 * Also handles: { type: "vocab", data: { word: "hevel" } }
 */
function normalizeModule(raw: Record<string, unknown>): Module {
  const { type, content, data, order, ...rest } = raw as Record<string, unknown>

  // If there's a nested content or data object, spread it into top level
  const nested =
    content && typeof content === 'object' && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null

  if (nested) {
    // Map known Substack field names to Module interface names
    const mapped: Record<string, unknown> = { type }

    // Scripture: text → passage
    if (nested.text && type === 'scripture') mapped.passage = nested.text
    else if (nested.text) mapped.content = nested.text
    if (nested.reference) mapped.reference = nested.reference
    if (nested.translation) mapped.translation = nested.translation

    // Vocab
    if (nested.word) mapped.word = nested.word
    if (nested.transliteration) mapped.transliteration = nested.transliteration
    if (nested.language) mapped.language = nested.language
    if (nested.definition) mapped.definition = nested.definition
    if (nested.meaning && !mapped.definition) mapped.definition = nested.meaning
    if (nested.rootMeaning || nested.root_meaning)
      mapped.usage = nested.rootMeaning || nested.root_meaning
    if (nested.usageNote || nested.usage_note)
      mapped.usage = nested.usageNote || nested.usage_note

    // Teaching/Story/Insight/Bridge
    if (nested.body) mapped.content = nested.body
    if (nested.title) mapped.heading = nested.title

    // Bridge special
    if (type === 'bridge') {
      const parts: string[] = []
      if (nested.ancientTruth || nested.ancient_truth)
        parts.push(String(nested.ancientTruth || nested.ancient_truth))
      if (nested.modernApplication || nested.modern_application)
        parts.push(
          String(nested.modernApplication || nested.modern_application),
        )
      if (parts.length > 0 && !mapped.content)
        mapped.content = parts.join('\n\n')
    }

    // Teaching fallback
    if (type === 'teaching' && !mapped.content) {
      if (nested.keyInsight || nested.key_insight)
        mapped.content = nested.keyInsight || nested.key_insight
    }

    // Reflection
    if (nested.prompt) mapped.prompt = nested.prompt
    if (nested.question && type === 'reflection')
      mapped.prompt = nested.question

    // Prayer
    if (nested.prayerText || nested.prayer_text)
      mapped.prayerText = nested.prayerText || nested.prayer_text
    if (type === 'prayer' && nested.body && !mapped.prayerText)
      mapped.prayerText = nested.body
    if (type === 'prayer' && nested.text && !mapped.prayerText)
      mapped.prayerText = nested.text
    if (nested.breathPrayer || nested.breath_prayer)
      mapped.breathPrayer = nested.breathPrayer || nested.breath_prayer

    // Comprehension
    if (nested.question && type === 'comprehension')
      mapped.question = nested.question
    if (nested.options) mapped.options = nested.options
    if (nested.answer !== undefined) mapped.answer = Number(nested.answer)
    if (nested.correctAnswer !== undefined)
      mapped.answer = Number(nested.correctAnswer)
    if (nested.correct_answer !== undefined)
      mapped.answer = Number(nested.correct_answer)
    if (nested.explanation) mapped.explanation = nested.explanation

    // Profile
    if (nested.name || nested.figureName || nested.figure_name)
      mapped.name = nested.name || nested.figureName || nested.figure_name
    if (nested.era || nested.timePeriod || nested.time_period)
      mapped.era = nested.era || nested.timePeriod || nested.time_period
    if (nested.bio) mapped.bio = nested.bio
    if (type === 'profile' && nested.body && !mapped.bio)
      mapped.bio = nested.body

    // Resource
    if (nested.resources) mapped.resources = nested.resources
    if (nested.items && !mapped.resources) mapped.resources = nested.items

    // Takeaway
    if (type === 'takeaway' && !mapped.content) {
      if (nested.keyPoint || nested.key_point)
        mapped.content = nested.keyPoint || nested.key_point
    }

    return mapped as unknown as Module
  }

  // Already flat format — just return with type preserved
  // Filter out 'order' which is Substack metadata
  void order
  return { type, ...rest } as unknown as Module
}

// Full-width module types get special layout treatment
const FULL_WIDTH_TYPES = new Set([
  'scripture',
  'vocab',
  'prayer',
  'comprehension',
])

export function isFullWidthModule(type: string): boolean {
  return FULL_WIDTH_TYPES.has(type)
}

export default function ModuleRenderer({
  module: raw,
}: {
  module: Module | Record<string, unknown>
}) {
  const normalized = normalizeModule(raw as Record<string, unknown>)

  switch (normalized.type) {
    case 'scripture':
      return <ScriptureModule module={normalized} />
    case 'vocab':
      return <VocabModule module={normalized} />
    case 'teaching':
      return <TeachingModule module={normalized} />
    case 'insight':
      return <InsightModule module={normalized} />
    case 'story':
      return <StoryModule module={normalized} />
    case 'reflection':
      return <ReflectionModule module={normalized} />
    case 'prayer':
      return <PrayerModule module={normalized} />
    case 'takeaway':
      return <TakeawayModule module={normalized} />
    case 'bridge':
      return <BridgeModule module={normalized} />
    case 'comprehension':
      return <ComprehensionModule module={normalized} />
    case 'profile':
      return <ProfileModule module={normalized} />
    case 'resource':
      return <ResourceModule module={normalized} />
    default:
      return null
  }
}
