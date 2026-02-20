import {
  clampScriptureSnippet,
  scriptureLeadPartsFromFramework,
} from '@/lib/scripture-reference'
import { getCuratedDayCandidates } from '@/lib/soul-audit/curation-engine'

export interface DayScriptureLead {
  reference: string
  snippet: string
}

export type DayScriptureByDayNumber = Record<number, DayScriptureLead>

const DEFAULT_SCRIPTURE_REFERENCE = 'Scripture'

export function buildSeriesDayScriptureMap(params: {
  seriesSlug: string
  framework: string
  dayNumbers: number[]
}): DayScriptureByDayNumber {
  const frameworkLead = scriptureLeadPartsFromFramework(params.framework)
  const frameworkFallback: DayScriptureLead = {
    reference: frameworkLead.reference || DEFAULT_SCRIPTURE_REFERENCE,
    snippet: frameworkLead.snippet,
  }

  const curatedByDay = new Map<number, DayScriptureLead>()
  const candidates = getCuratedDayCandidates().filter(
    (candidate) => candidate.seriesSlug === params.seriesSlug,
  )

  for (const candidate of candidates) {
    curatedByDay.set(candidate.dayNumber, {
      reference: candidate.scriptureReference || frameworkFallback.reference,
      snippet: clampScriptureSnippet(candidate.scriptureText),
    })
  }

  const dayScriptureByDayNumber: DayScriptureByDayNumber = {}
  for (const dayNumber of params.dayNumbers) {
    const curated = curatedByDay.get(dayNumber)
    if (curated) {
      dayScriptureByDayNumber[dayNumber] = curated
      continue
    }

    dayScriptureByDayNumber[dayNumber] = {
      reference: frameworkFallback.reference || DEFAULT_SCRIPTURE_REFERENCE,
      snippet: frameworkFallback.snippet || '',
    }
  }

  return dayScriptureByDayNumber
}
