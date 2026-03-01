import type { AuditOptionPreview } from '@/types/soul-audit'

/**
 * Creates mock ingredient-selection options (3 ai_primary directions).
 * Used by test files that exercise the submit → consent → select flow.
 */
export function createMockDirectionOptions(): AuditOptionPreview[] {
  const titles = [
    'Finding Peace in the Storm',
    'Rooted in Ancient Promises',
    'Walking by Faith, Not Sight',
  ]
  const questions = [
    'What does it mean to trust God when everything feels uncertain?',
    'How does Scripture help us find anchor points when faith feels shaky?',
    'What would it look like to take one step of obedience today?',
  ]
  const reasonings = [
    'Your words connect to themes of anxiety, trust — this path addresses those directly with Psalm 46:10.',
    'Your reflection touches on doubt — this path grounds it in Romans 8:28-29.',
    'This path offers a focused 5-day journey grounded in Hebrews 11:1-3.',
  ]
  const scriptureAnchors = ['Psalm 46:10', 'Romans 8:28-29', 'Hebrews 11:1-3']
  const slugs = [
    'finding-peace-in-the-storm',
    'rooted-in-ancient-promises',
    'walking-by-faith',
  ]

  return titles.map((title, i) => ({
    id: `direction:${slugs[i]}:1:${i + 1}`,
    kind: 'ai_primary' as const,
    rank: i + 1,
    slug: slugs[i],
    title,
    question: questions[i],
    confidence: 0.85 - i * 0.05,
    reasoning: reasonings[i],
    preview: {
      verse: scriptureAnchors[i],
      verseText: 'The Lord is my shepherd; I shall not want.',
      paragraph: reasonings[i],
      curationSeed: {
        seriesSlug: slugs[i],
        dayNumber: 1,
        candidateKey: `${slugs[i]}:day-1`,
      },
    },
  }))
}
