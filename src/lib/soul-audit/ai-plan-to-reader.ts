import type { CustomPlanDay, DevotionalModule } from '@/types/soul-audit'

/**
 * aiPlanDayToReader
 *
 * Maps the flat fields on a composer-emitted CustomPlanDay
 * (scriptureText, reflection, prayer) into the rich DevotionalModule[]
 * shape the ModuleRenderer dispatch expects.
 *
 * Without this adapter, the AI plan reader (PlanDayContent.tsx,
 * DayContent.tsx) falls back to rendering three bare <p> tags. With it,
 * an AI-composed day renders through the same ModuleRenderer pipeline as
 * curated content.
 *
 * Scope: emits scripture, teaching, prayer modules. Intentionally does
 * NOT emit takeaway/reflection for nextStep/journalPrompt — those continue
 * to render in the existing bottom section so behavior matches the curated
 * reader, which also renders flat nextStep/journalPrompt at the bottom.
 * (Documented in docs/overnight-followups.md.)
 *
 * Module shape: ModuleRenderer.normalizeModule (src/components/ModuleRenderer.tsx)
 * spreads the `content` object onto the top-level module before dispatching,
 * so prop-shape fields (passage, reference, prayerText, etc.) live inside
 * `content` here.
 */

const PARAGRAPH_BREAK = /\n{2,}/

function trimText(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildScriptureModule(day: CustomPlanDay): DevotionalModule | null {
  const passage = trimText(day.scriptureText)
  if (!passage) return null
  return {
    type: 'scripture',
    heading: 'SCRIPTURE',
    content: {
      passage,
      reference: trimText(day.scriptureReference),
    },
  }
}

function buildTeachingModule(day: CustomPlanDay): DevotionalModule | null {
  const reflection = trimText(day.reflection)
  if (!reflection) return null
  // Re-join paragraph splits so TeachingModule's own paragraph parser
  // (`split('\n\n')`) preserves intended structure.
  const normalized = reflection.split(PARAGRAPH_BREAK).join('\n\n')
  return {
    type: 'teaching',
    heading: 'REFLECTION',
    content: { content: normalized },
  }
}

function buildPrayerModule(day: CustomPlanDay): DevotionalModule | null {
  const prayer = trimText(day.prayer)
  if (!prayer) return null
  return {
    type: 'prayer',
    heading: 'PRAYER',
    content: { prayerText: prayer },
  }
}

export function aiPlanDayToReader(day: CustomPlanDay): DevotionalModule[] {
  const modules: DevotionalModule[] = []
  const scripture = buildScriptureModule(day)
  if (scripture) modules.push(scripture)
  const teaching = buildTeachingModule(day)
  if (teaching) modules.push(teaching)
  const prayer = buildPrayerModule(day)
  if (prayer) modules.push(prayer)
  return modules
}

/**
 * resolveDayModules
 *
 * Returns the modules array to render for a given CustomPlanDay.
 * Prefers natively-emitted modules (curated content path). Falls back
 * to the AI plan adapter when the composer left modules empty.
 */
export function resolveDayModules(day: CustomPlanDay): DevotionalModule[] {
  if (day.modules && day.modules.length > 0) return day.modules
  return aiPlanDayToReader(day)
}
