import { SERIES_DATA } from '@/data/series'
import type {
  CustomPlanDay,
  DevotionalDayEndnote,
  DevotionalModule,
} from '@/types/soul-audit'
import {
  findCandidateBySeed,
  getCuratedDayCandidates,
  rankCandidatesForInput,
  type CurationSeed,
  type CuratedDayCandidate,
} from './curation-engine'
import { retrieveReferenceHits, type ReferenceHit } from './reference-volumes'
import type { OnboardingVariant } from './schedule'

const CHIASTIC_POSITIONS: Array<
  'A' | 'B' | 'C' | "B'" | "A'" | 'Sabbath' | 'Review'
> = ['A', 'B', 'C', "B'", "A'", 'Sabbath', 'Review']

export class MissingCuratedModuleError extends Error {
  constructor(slug: string, day: number, moduleType: string) {
    super(
      `Missing curated core module "${moduleType}" for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingCuratedModuleError'
  }
}

export class MissingReferenceGroundingError extends Error {
  constructor(slug: string, day: number) {
    super(
      `Missing required reference-volume grounding for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingReferenceGroundingError'
  }
}

function toLine(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : ''
}

function splitKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    ),
  ).slice(0, 5)
}

function focusPhrase(value: string): string {
  const tokens = splitKeywords(value)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0]
  if (tokens.length === 2) return `${tokens[0]} and ${tokens[1]}`
  return `${tokens[0]}, ${tokens[1]}, and ${tokens[2]}`
}

function ensureMinimumLength(value: string, minimum: number): string {
  if (value.length >= minimum) return value
  return `${value}\n\nStay with this text for two minutes before moving on. Ask what faithful obedience looks like before the day ends.\n\nWrite one line: "Today I will respond by ___."`
}

function clamp(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 3).trimEnd()}...`
}

function personalizedBridge(
  userResponse: string,
  day: CuratedDayCandidate,
): string {
  const snippet = userResponse.trim().slice(0, 280)
  const themes = focusPhrase(userResponse)
  const base = `Today in "${day.dayTitle}", take one concrete step with what you just read: ${day.takeawayText}`
  if (!snippet && !themes) return base
  if (!snippet) {
    return `${base}\n\nBring your current tension around ${themes} honestly before God today.`
  }
  return `${base}\n\nYou wrote: "${snippet}"\n\nThat is not background noise — it is the raw material God works with. Bring that exact tension honestly before him today through ${day.scriptureReference}.`
}

function expandedReflection(
  userResponse: string,
  day: CuratedDayCandidate,
  referenceHits: Array<{ source: string; excerpt: string }>,
): string {
  const bridge = personalizedBridge(userResponse, day)
  const themes = focusPhrase(userResponse)
  const scriptureAnchor = `Scripture anchor (${day.scriptureReference}): ${clamp(day.scriptureText, 520)}`
  const reflectionPromptLine = `Reflection prompt: ${day.reflectionPrompt}`
  const contextualNote =
    referenceHits.length > 0
      ? referenceHits
          .map(
            (hit, index) =>
              `Commentary witness ${index + 1} (${hit.source}): ${hit.excerpt}`,
          )
          .join('\n\n')
      : 'Stay with the text slowly. Let the Scripture name what you are carrying before you try to fix it.'
  const thematicLine = themes
    ? `What you shared points to ${themes}. Read for where this passage addresses that directly.`
    : 'Read for the phrase that most clearly speaks to your present season.'
  return ensureMinimumLength(
    `${scriptureAnchor}\n\n${day.teachingText}\n\n${reflectionPromptLine}\n\n${thematicLine}\n\n${bridge}\n\n${contextualNote}`,
    700,
  )
}

function personalizedPrayerLine(userResponse: string): string {
  const snippet = userResponse.trim().slice(0, 200)
  if (!snippet) {
    return 'Help me walk this faithfully, one step at a time.'
  }
  return `You know what I am carrying — "${snippet}". I do not need to explain it to you. Meet me in it and lead me in truth.`
}

function expandedPrayer(
  userResponse: string,
  day: CuratedDayCandidate,
): string {
  return ensureMinimumLength(
    [
      `Jesus, as I receive ${day.scriptureReference}, slow me down enough to listen and obey.`,
      day.prayerText,
      personalizedPrayerLine(userResponse),
      `Anchor this in me today through ${day.scriptureReference}, and give me courage to live what I read.`,
    ].join('\n\n'),
    280,
  )
}

function expandedNextStep(day: CuratedDayCandidate): string {
  const base = toLine(day.takeawayText)
  if (!base) return ''
  return `${base} Then choose one concrete action you can complete before the day ends, and set a specific hour to do it.`
}

function expandedJournalPrompt(
  day: CuratedDayCandidate,
  userResponse?: string,
): string {
  const base = toLine(day.reflectionPrompt)
  if (!base) return ''
  const themes = userResponse ? focusPhrase(userResponse) : ''
  const thematicLine = themes
    ? `\nHow does ${day.scriptureReference} speak to what you named about ${themes}?`
    : ''
  return `${base}${thematicLine}\nWhat resistance do you notice in yourself, and what would faithful obedience look like in one sentence?\nWhich exact phrase from Scripture will you carry into today?`
}

function buildModules(params: {
  candidate: CuratedDayCandidate
  userResponse: string
  referenceHits: ReferenceHit[]
}): DevotionalModule[] {
  const modules: DevotionalModule[] = []
  const { candidate, userResponse, referenceHits } = params

  // 1. Scripture module — always first
  modules.push({
    type: 'scripture',
    heading: candidate.scriptureReference,
    content: {
      reference: candidate.scriptureReference,
      text: candidate.scriptureText,
    },
  })

  // 2. Teaching module — core exposition
  if (candidate.teachingText) {
    modules.push({
      type: 'teaching',
      heading: 'Teaching',
      content: { body: candidate.teachingText },
    })
  }

  // 3. Bridge module — personalized connection to user's words
  const themes = focusPhrase(userResponse)
  if (themes) {
    modules.push({
      type: 'bridge',
      heading: 'Your Connection',
      content: {
        connectionPoint: `What you shared points to ${themes}. This passage speaks directly to that tension.`,
        modernApplication: personalizedBridge(userResponse, candidate),
      },
    })
  }

  // 4. Reflection module
  if (candidate.reflectionPrompt) {
    modules.push({
      type: 'reflection',
      heading: 'Reflection',
      content: { prompt: candidate.reflectionPrompt },
    })
  }

  // 5. Insight module — reference library grounding (when available)
  if (referenceHits.length > 0) {
    modules.push({
      type: 'insight',
      heading: 'Commentary Witness',
      content: {
        sources: referenceHits.map((hit) => ({
          source: hit.source,
          excerpt: hit.excerpt,
        })),
      },
    })
  }

  // 6. Prayer module
  if (candidate.prayerText) {
    modules.push({
      type: 'prayer',
      heading: 'Prayer',
      content: { text: expandedPrayer(userResponse, candidate) },
    })
  }

  // 7. Takeaway module
  if (candidate.takeawayText) {
    modules.push({
      type: 'takeaway',
      heading: 'Next Step',
      content: {
        commitment: expandedNextStep(candidate),
        action: candidate.takeawayText,
      },
    })
  }

  return modules
}

function buildEndnotes(params: {
  candidate: CuratedDayCandidate
  referenceHits: ReferenceHit[]
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note: params.candidate.scriptureReference,
    },
    {
      id: 2,
      source: params.candidate.sourcePath,
      note: `${params.candidate.seriesSlug} day ${params.candidate.dayNumber}`,
    },
    {
      id: 3,
      source: 'Composition Policy',
      note: 'Curated core modules 80% / generation-assisted bridge and language polish 20%.',
    },
  ]

  params.referenceHits.forEach((hit) => {
    notes.push({
      id: notes.length + 1,
      source: hit.source,
      note: `Reference volume excerpt: ${hit.excerpt}`,
    })
  })

  return notes
}

function parseFrameworkFromSeries(framework: string | undefined): {
  reference: string
  text: string
} {
  if (!framework) return { reference: '', text: '' }
  const referenceMatch = framework.match(
    /(?:scripture|reference|verse)[:\s]*["']?([^"'\n]+)/i,
  )
  const textMatch = framework.match(/(?:text|passage)[:\s]*["']?([^"'\n]+)/i)
  return {
    reference: referenceMatch?.[1]?.trim() || framework.split('\n')[0] || '',
    text: textMatch?.[1]?.trim() || '',
  }
}

function metadataFallbackCandidate(slug: string): CuratedDayCandidate | null {
  const series = SERIES_DATA[slug]
  if (!series) return null
  const dayOne = [...series.days].sort((a, b) => a.day - b.day)[0]
  if (!dayOne) return null

  const framework = parseFrameworkFromSeries(series.framework)
  return {
    key: `metadata-fallback:${slug}:1`,
    seriesSlug: slug,
    seriesTitle: series.title,
    sourcePath: 'series-metadata',
    dayNumber: dayOne.day,
    dayTitle: dayOne.title,
    scriptureReference: framework.reference || 'Scripture',
    scriptureText:
      framework.text ||
      series.introduction?.slice(0, 300) ||
      series.context?.slice(0, 300) ||
      '',
    teachingText:
      [series.introduction, series.context]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 2000) || series.title,
    reflectionPrompt:
      series.question || `What does ${series.title} stir in you?`,
    prayerText: `Lord, meet me in this season and guide my next faithful step in ${series.title}.`,
    takeawayText: `Take one concrete action from ${series.title} before today ends.`,
    searchText: [slug, series.title, series.question, series.introduction]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }
}

function selectPlanCandidates(params: {
  seriesSlug: string
  userResponse: string
  anchorSeed?: CurationSeed | null
}): CuratedDayCandidate[] {
  const allCandidates = getCuratedDayCandidates()
  const preferredSeries = allCandidates
    .filter((candidate) => candidate.seriesSlug === params.seriesSlug)
    .sort((a, b) => a.dayNumber - b.dayNumber)

  const selected: CuratedDayCandidate[] = []
  const usedKeys = new Set<string>()

  const pushUnique = (candidate: CuratedDayCandidate | null) => {
    if (!candidate || usedKeys.has(candidate.key)) return
    selected.push(candidate)
    usedKeys.add(candidate.key)
  }

  if (params.anchorSeed) {
    pushUnique(findCandidateBySeed(params.anchorSeed))
  }

  for (const candidate of preferredSeries) {
    if (selected.length >= 5) break
    pushUnique(candidate)
  }

  if (selected.length >= 5) {
    return selected.slice(0, 5)
  }

  const ranked = rankCandidatesForInput({
    input: `${params.userResponse} ${params.seriesSlug}`,
    anchorSeriesSlug: params.seriesSlug,
    anchorSeed: params.anchorSeed,
  })

  for (const entry of ranked) {
    if (selected.length >= 5) break
    pushUnique(entry.candidate)
  }

  // When the curated catalog is unavailable (e.g. Vercel serverless
  // functions missing the content/series-json files), fall back to a
  // single-day plan built from series metadata in SERIES_DATA.
  if (selected.length === 0) {
    const fallback = metadataFallbackCandidate(params.seriesSlug)
    if (fallback) {
      selected.push(fallback)
    }
  }

  if (selected.length === 0) {
    throw new MissingCuratedModuleError(params.seriesSlug, 1, 'day')
  }

  return selected.slice(0, 5)
}

function buildSabbathDay(
  devotionalDays: CustomPlanDay[],
  userResponse: string,
): CustomPlanDay {
  const scriptureRefs = devotionalDays
    .map((d) => d.scriptureReference)
    .filter(Boolean)
  const anchorRef = scriptureRefs[0] || 'Genesis 2:2-3'
  const allRefs = scriptureRefs.join('; ')
  const themes = focusPhrase(userResponse)
  const thematicLine = themes
    ? `This week you brought ${themes} before God.`
    : 'This week you brought honest questions before God.'

  return {
    day: 6,
    dayType: 'sabbath',
    chiasticPosition: 'Sabbath',
    title: 'Sabbath Rest',
    scriptureReference: anchorRef,
    scriptureText:
      'And on the seventh day God finished his work that he had done, and he rested on the seventh day from all his work that he had done.',
    reflection: [
      `${thematicLine} Today is not for striving — it is for receiving.`,
      `Return to the passages that moved you most this week (${allRefs}). Read them slowly, without analysis. Let the text read you.`,
      'Sabbath is not earned. It is given. You do not need to produce anything today.',
      'Sit with whatever phrase stayed with you longest this week. Write it down. Carry it into silence.',
    ].join('\n\n'),
    prayer: [
      'Lord of rest, I stop. I am not the engine of my own transformation.',
      `You have met me this week through ${allRefs}. Let what you planted take root in stillness.`,
      'Give me the courage to stop fixing and start receiving. Amen.',
    ].join('\n\n'),
    nextStep:
      'Do not add a task. Instead, remove one. Create space in your day for silence, even five minutes.',
    journalPrompt:
      'Which moment this week felt most like God speaking directly to you?\nWhat are you still carrying that you can set down today?',
    endnotes: [
      { id: 1, source: 'Scripture', note: anchorRef },
      {
        id: 2,
        source: 'Week Scripture',
        note: `Week references: ${allRefs}`,
      },
      { id: 3, source: 'Day Type', note: 'Sabbath rest day — no striving.' },
    ],
  }
}

function buildReviewDay(
  devotionalDays: CustomPlanDay[],
  userResponse: string,
): CustomPlanDay {
  const titles = devotionalDays.map((d) => `Day ${d.day}: ${d.title}`)
  const scriptureRefs = devotionalDays
    .map((d) => d.scriptureReference)
    .filter(Boolean)
  const anchorRef = scriptureRefs[scriptureRefs.length - 1] || 'Psalm 119:105'
  const themes = focusPhrase(userResponse)
  const thematicLine = themes
    ? `You began this week wrestling with ${themes}.`
    : 'You began this week with an honest question.'

  return {
    day: 7,
    dayType: 'review',
    chiasticPosition: 'Review',
    title: 'Week in Review',
    scriptureReference: anchorRef,
    scriptureText: 'Your word is a lamp to my feet and a light to my path.',
    reflection: [
      `${thematicLine} Look at the arc of your week:`,
      titles.join('\n'),
      '',
      'What pattern do you see? Where did God show up in ways you did not expect?',
      "The chiastic structure of your week (A-B-C-B'-A') mirrors how Scripture often works: the center reveals, the bookends confirm.",
      'Name one thing that shifted in you this week — not what you learned, but how you changed.',
    ].join('\n'),
    prayer: [
      'God of the long arc, thank you for meeting me in every day of this week.',
      'Seal what you started. Where I resisted, soften me. Where I opened, deepen me.',
      'Send me into the next week with the courage of someone who has been honestly met. Amen.',
    ].join('\n\n'),
    nextStep:
      'Write one sentence summarizing what God did in you this week. Share it with someone, or keep it as a milestone marker for your next audit.',
    journalPrompt:
      'If you could keep only one insight from this entire week, what would it be?\nWhat will you do differently starting tomorrow because of what you received this week?',
    endnotes: [
      { id: 1, source: 'Scripture', note: anchorRef },
      { id: 2, source: 'Day Type', note: 'Week review and integration day.' },
      {
        id: 3,
        source: 'Week Arc',
        note: `${devotionalDays.length} devotional days + Sabbath + Review.`,
      },
    ],
  }
}

export function buildCuratedFirstPlan(params: {
  seriesSlug: string
  userResponse: string
  anchorSeed?: CurationSeed | null
}): CustomPlanDay[] {
  const selectedDays = selectPlanCandidates(params)

  const devotionalDays = selectedDays.map((candidate, index) => {
    const dayNumber = index + 1
    // Reference grounding is optional — the 13GB reference library is
    // gitignored and not deployed to Vercel. When absent, the plan still
    // builds with curated content and a fallback reflection paragraph.
    const referenceHits = retrieveReferenceHits({
      userResponse: params.userResponse,
      scriptureReference: candidate.scriptureReference,
      limit: 3,
    })
    const reflection = expandedReflection(
      params.userResponse,
      candidate,
      referenceHits,
    )
    const prayer = expandedPrayer(params.userResponse, candidate)

    const nextStep =
      expandedNextStep(candidate) ||
      "Choose one concrete action from today's reading you can complete before the day ends, and set a specific hour to do it."
    const journalPrompt =
      expandedJournalPrompt(candidate, params.userResponse) ||
      "What is one phrase from today's Scripture that speaks to where you are right now?\nWhat resistance do you notice in yourself, and what would faithful obedience look like in one sentence?"

    return {
      day: dayNumber,
      dayType: 'devotional' as const,
      chiasticPosition: CHIASTIC_POSITIONS[index],
      title: candidate.dayTitle,
      scriptureReference: candidate.scriptureReference,
      scriptureText: candidate.scriptureText,
      reflection,
      prayer,
      nextStep,
      journalPrompt,
      modules: buildModules({
        candidate,
        userResponse: params.userResponse,
        referenceHits,
      }),
      endnotes: buildEndnotes({
        candidate,
        referenceHits,
      }),
    }
  })

  // Append Sabbath (day 6) and Review (day 7) to complete the 7-day arc.
  const sabbath = buildSabbathDay(devotionalDays, params.userResponse)
  const review = buildReviewDay(devotionalDays, params.userResponse)

  return [...devotionalDays, sabbath, review]
}

export function buildOnboardingDay(params: {
  userResponse: string
  firstDay: CustomPlanDay
  variant: OnboardingVariant
  onboardingDays: number
}): CustomPlanDay {
  const snippet = params.userResponse.trim().slice(0, 180)
  const firstDayTitle = params.firstDay.title
  const variantLabel =
    params.variant === 'wednesday_3_day'
      ? 'Wednesday 3-Day Primer'
      : params.variant === 'thursday_2_day'
        ? 'Thursday 2-Day Primer'
        : params.variant === 'friday_1_day'
          ? 'Friday 1-Day Primer'
          : 'Weekend Bridge Primer'
  const intro =
    params.variant === 'wednesday_3_day'
      ? 'Wednesday start: a 3-day rhythm primer (Wed-Thu-Fri) to establish momentum before Monday cycle launch.'
      : params.variant === 'thursday_2_day'
        ? 'Thursday start: a 2-day rhythm primer (Thu-Fri) so your Monday cycle begins with pace.'
        : params.variant === 'friday_1_day'
          ? 'Friday start: a focused 1-day primer to orient your heart before the full Monday cycle.'
          : 'Weekend start: a bridge devotional to settle your pace before Monday cycle launch.'
  const nextStep =
    params.onboardingDays >= 2
      ? `Read this onboarding day now, then return daily for your ${params.onboardingDays}-day rhythm primer. Full cycle unlock begins Monday at 7:00 AM local time.`
      : 'Read this onboarding day now. Full cycle unlock begins Monday at 7:00 AM local time.'

  return {
    day: 0,
    title: `Onboarding: ${variantLabel}`,
    scriptureReference: params.firstDay.scriptureReference,
    scriptureText: params.firstDay.scriptureText,
    reflection: snippet
      ? `You shared: "${snippet}". ${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`
      : `${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`,
    prayer:
      'Lord Jesus, steady my pace as I begin this path. Give me courage to be honest and faithful in each next step.',
    nextStep: `${nextStep} Keep this same daily reading window to build consistency.`,
    journalPrompt:
      'What do I want to bring before God first as this devotional path begins?',
    endnotes: [
      {
        id: 1,
        source: 'Scripture',
        note: params.firstDay.scriptureReference,
      },
      {
        id: 2,
        source: 'Scheduling Policy',
        note: `${params.variant} onboarding before Monday cycle.`,
      },
      {
        id: 3,
        source: 'Curated Plan Anchor',
        note: `Day 1 preview: ${firstDayTitle}.`,
      },
    ],
  }
}
