import type { OutlineGeneratorResult } from '@/lib/soul-audit/outline-generator'
import type {
  AuditOptionPreview,
  PlanDayOutline,
  PlanOutline,
} from '@/types/soul-audit'

function makeDayOutlines(): PlanDayOutline[] {
  return [
    {
      day: 1,
      dayType: 'devotional',
      chiasticPosition: 'A',
      title: 'Beginning the Journey',
      scriptureReference: 'Psalm 23:1-3',
      topicFocus: 'Trust and surrender',
      pardesLevel: 'peshat',
      suggestedModules: ['scripture', 'teaching', 'reflection'],
    },
    {
      day: 2,
      dayType: 'devotional',
      chiasticPosition: 'B',
      title: 'Going Deeper',
      scriptureReference: 'Romans 8:28',
      topicFocus: 'Purpose in suffering',
      pardesLevel: 'remez',
      suggestedModules: ['scripture', 'insight', 'prayer'],
    },
    {
      day: 3,
      dayType: 'devotional',
      chiasticPosition: 'C',
      title: 'The Heart of the Matter',
      scriptureReference: 'Philippians 4:6-7',
      topicFocus: 'Peace beyond understanding',
      pardesLevel: 'derash',
      suggestedModules: ['scripture', 'story', 'reflection'],
    },
    {
      day: 4,
      dayType: 'devotional',
      chiasticPosition: "B'",
      title: 'Walking in New Light',
      scriptureReference: 'Isaiah 43:18-19',
      topicFocus: 'Renewal and transformation',
      pardesLevel: 'sod',
      suggestedModules: ['scripture', 'bridge', 'takeaway'],
    },
    {
      day: 5,
      dayType: 'devotional',
      chiasticPosition: "A'",
      title: 'Living the Promise',
      scriptureReference: 'Jeremiah 29:11',
      topicFocus: 'Hope and future',
      pardesLevel: 'integrated',
      suggestedModules: ['scripture', 'comprehension', 'prayer'],
    },
    {
      day: 6,
      dayType: 'sabbath',
      chiasticPosition: 'Sabbath',
      title: 'Sabbath Rest',
      scriptureReference: 'Genesis 2:2-3',
      topicFocus: 'Rest and reflection',
      pardesLevel: 'sabbath',
      suggestedModules: ['reflection', 'prayer'],
    },
    {
      day: 7,
      dayType: 'review',
      chiasticPosition: 'Review',
      title: 'Week Review',
      scriptureReference: 'Psalm 119:105',
      topicFocus: 'Looking back and forward',
      pardesLevel: 'review',
      suggestedModules: ['reflection', 'takeaway'],
    },
  ]
}

function makeOutline(index: number): PlanOutline {
  const angles = ['Through Lament', 'Through Hope', 'Through Obedience']
  const titles = [
    'Finding Peace in the Storm',
    'Rooted in Ancient Promises',
    'Walking by Faith, Not Sight',
  ]
  const questions = [
    'What does it mean to trust God when everything around you feels uncertain and the path ahead is unclear?',
    'How does Scripture help us find anchor points when our faith feels shaky and the world offers no comfort?',
    'What would it look like to take one step of obedience today even when you cannot see the destination ahead?',
  ]
  const reasonings = [
    'This path explores the intersection of anxiety and trust through the lens of the Psalms and prophetic promises.',
    'Grounded in Pauline theology, this path builds a practical framework for handling spiritual numbness and doubt.',
    'This approach walks through the discipline of daily obedience as an antidote to spiritual paralysis and fear.',
  ]
  const scriptureAnchors = [
    'Psalm 46:10',
    'Romans 8:28-29',
    'Hebrews 11:1-3',
  ]

  return {
    id: `outline-test-${index}`,
    angle: angles[index] ?? 'Through Reflection',
    title: titles[index] ?? `Test Plan ${index + 1}`,
    question: questions[index] ?? 'How can we grow closer to God today?',
    reasoning:
      reasonings[index] ??
      'This path offers a grounded approach to spiritual formation.',
    scriptureAnchor: scriptureAnchors[index] ?? 'Psalm 119:105',
    dayOutlines: makeDayOutlines(),
    referenceSeeds: ['commentary/psalms', 'lexicon/hebrew-peace'],
  }
}

function outlineToOption(
  outline: PlanOutline,
  rank: number,
): AuditOptionPreview {
  return {
    id: `ai_generative:${outline.id}:1:${rank}`,
    kind: 'ai_generative',
    rank,
    slug: outline.id,
    title: outline.title,
    question: outline.question,
    confidence: 0.85 - rank * 0.05,
    reasoning: outline.reasoning,
    preview: {
      verse: outline.scriptureAnchor,
      verseText: 'The Lord is my shepherd; I shall not want.',
      paragraph: outline.reasoning,
    },
    planOutline: {
      angle: outline.angle,
      dayOutlines: outline.dayOutlines.map((d) => ({
        day: d.day,
        dayType: d.dayType,
        title: d.title,
        scriptureReference: d.scriptureReference,
        topicFocus: d.topicFocus,
      })),
    },
  }
}

/**
 * Creates a mock `generatePlanOutlines` result with 3 AI options.
 */
export function createMockOutlineResult(): OutlineGeneratorResult {
  const outlines = [makeOutline(0), makeOutline(1), makeOutline(2)]
  const options = outlines.map((o, i) => outlineToOption(o, i + 1))

  return {
    outlines,
    options,
    strategy: 'generative_outlines',
  }
}
