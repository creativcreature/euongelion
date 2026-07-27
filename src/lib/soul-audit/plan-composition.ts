// Deterministic plan-day composition shared by every generation executor
// (the Next.js generate-day route, the local dev generator shim, and the
// Supabase Edge function). Extracted from generate-day/route.ts so the
// recap/sabbath days stay byte-identical no matter which runtime writes them.
import type { DayContent } from '@/types/soul-audit-plan'

// ─── Recap Day 6 (deterministic) ────────────────────────────────────

export function composeRecap(
  savedDays: Array<{ day_number: number; content: DayContent }>,
  planTheme: string,
): DayContent {
  const textB = savedDays
    .filter((d) => d.day_number <= 5)
    .map((d) => {
      const c = d.content
      const summary =
        c.previousDaysSummaryForNext || `${c.title} — ${c.scriptureReference}`
      return `**Day ${d.day_number}: ${c.title}** — ${c.scriptureReference}\n${summary}`
    })
    .join('\n\n')

  return {
    title: 'Week in Review',
    hookA: `This week you explored "${planTheme}." Here's what God revealed.`,
    textB,
    textBPreview: `A reflection on your week's journey through ${planTheme}.`,
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime:
      "Review your journal entries, revisit a day that struck you, or sit in what you've received.",
    scriptureReference: '',
    scriptureText: '',
    hebrewGreekStudy: null,
    interactiveElement: {
      type: 'weekly_review',
      content: 'Which day challenged you most? Which gave you peace?',
    },
    metaStoryPlacement: '',
    backwardLink: `This week covered days 1-5 of ${planTheme}.`,
    forwardLink: 'Tomorrow is Sabbath. Rest.',
    reflectionQuestions: [
      'Which scripture stayed with you?',
      'What shifted in your understanding?',
      'What will you carry forward?',
    ],
    prayer:
      'Lord, thank you for this week of walking with Your word. Seal what You have spoken. Let it bear fruit in the days ahead. Amen.',
    endnotes: [],
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

// ─── Sabbath Day 7 (deterministic constant) ──────────────────────────

export const SABBATH_DAY: DayContent = {
  title: 'Sabbath Rest',
  hookA:
    'Today is Sabbath. No new content. Just rest.\n\nYou have spent this week in the Word and in review. Now be still.',
  textB:
    '"Be still, and know that I am God; I will be exalted among the nations." — Psalm 46:10',
  textBPreview: 'Be still, and know that I am God. — Psalm 46:10',
  centerC: '',
  christConnectionBPrime: '',
  returnAPrime: '',
  scriptureReference: 'Psalm 46:10',
  scriptureText:
    'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.',
  hebrewGreekStudy: null,
  interactiveElement: {
    type: 'sabbath_silence',
    content: 'Set a timer for 5 minutes. Sit in silence. You are held.',
  },
  metaStoryPlacement: '',
  backwardLink:
    'This week you walked through days of devotion and a day of review.',
  forwardLink: '',
  reflectionQuestions: [
    'What moment from this week do you most want to carry into the next?',
  ],
  prayer: '',
  endnotes: [],
  previousDaysSummaryForNext: '',
  tier3Extended: null,
}
