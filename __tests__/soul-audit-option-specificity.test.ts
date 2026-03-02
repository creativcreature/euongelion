import { describe, expect, it } from 'vitest'
import { selectIngredients } from '@/lib/soul-audit/ingredient-selector'

const CASES = [
  {
    input: 'Teach me about Genesis',
    expectAny: /(genesis)/,
  },
  {
    input: 'Who was Paul?',
    expectAny: /(paul)/,
  },
  {
    input: 'I want to learn about prophets',
    expectAny: /(prophets?)/,
  },
  {
    input: 'I keep falling into the same sin',
    expectAny: /(sin|falling)/,
  },
  {
    input: 'I feel anxious about my future',
    expectAny: /(anxious|future|anxiety)/,
  },
] as const

describe('Soul Audit option specificity', () => {
  it('anchors direction copy to user language while keeping scripture-first previews', () => {
    const input =
      'My rent is overdue, parenting exhaustion is crushing me, and layoff anxiety keeps me awake.'

    const { directions } = selectIngredients(input)
    expect(directions).toHaveLength(3)

    const copy = directions
      .map((direction) =>
        [
          direction.title,
          direction.question,
          direction.day1Preview.teachingExcerpt,
        ]
          .join(' ')
          .toLowerCase(),
      )
      .join(' ')

    expect(copy).toMatch(
      /(rent|overdue|parenting|exhaustion|layoff|anxiety|awake)/,
    )

    expect(
      directions.every(
        (direction) => direction.scriptureAnchor.trim().length > 0,
      ),
    ).toBe(true)
  })

  it(
    'keeps option cards directly relevant across common prompt types',
    () => {
      for (const testCase of CASES) {
        const { directions } = selectIngredients(testCase.input)
        expect(directions).toHaveLength(3)
        expect(
          new Set(directions.map((direction) => direction.title)).size,
        ).toBe(3)
        expect(
          new Set(directions.map((direction) => direction.directionSlug)).size,
        ).toBe(3)

        const allText = directions
          .map((direction) =>
            [
              direction.title,
              direction.question,
              direction.day1Preview.title,
              direction.day1Preview.reflectionPrompt,
              direction.matchedKeywords.join(' '),
            ]
              .join(' ')
              .toLowerCase(),
          )
          .join(' ')

        expect(allText).toMatch(testCase.expectAny)
      }
    },
    20_000,
  )
})
