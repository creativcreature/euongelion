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
 * Uses spread-and-rename: preserves ALL fields, only renames the few
 * where component expectations differ from source naming.
 */
function normalizeModule(raw: Record<string, unknown>): Module {
  const { type, content, data, order, ...rest } = raw

  // If there's a nested content or data object, spread it into top level
  const nested =
    content && typeof content === 'object' && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null

  void order
  const result: Record<string, unknown> = { type, ...rest }

  if (nested) {
    for (const [key, val] of Object.entries(nested)) {
      if (val !== undefined && val !== null) {
        result[key] = val
      }
    }
  }

  // --- Critical renames (component expects different field names) ---

  // Scripture: text -> passage
  if (type === 'scripture' && result.text && !result.passage) {
    result.passage = result.text
    delete result.text
  }

  // Vocab: meaning -> definition
  if (result.meaning && !result.definition) {
    result.definition = result.meaning
  }

  // Vocab: rootMeaning -> usage
  if (result.rootMeaning && !result.usage) {
    result.usage = result.rootMeaning
  }

  // Teaching/Story/Insight/Bridge: body -> content
  if (result.body && !result.content) {
    result.content = result.body
  }

  // Title -> heading (avoid collision with devotional-level title)
  if (result.title && type !== 'profile') {
    if (!result.heading) result.heading = result.title
    delete result.title
  }

  // Prayer: text -> prayerText
  if (type === 'prayer') {
    if (result.text && !result.prayerText) {
      result.prayerText = result.text
      delete result.text
    }
    if (result.type !== type) {
      result.prayerType = result.type
      result.type = type
    }
  }

  // Profile: title -> heading
  if (type === 'profile' && result.title && !result.heading) {
    result.heading = result.title
  }

  // Takeaway: commitment -> content (backward compat)
  if (type === 'takeaway' && result.commitment && !result.content) {
    result.content = result.commitment
  }

  return result as unknown as Module
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
