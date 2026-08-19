import { describe, expect, it } from 'vitest'
import {
  CROSSWORD_BANK,
  PuzzleDateBeforeEpochError,
  generateCrossword,
  generateQuiz,
  generateUnscramble,
} from '@/lib/edition/generators/puzzles'
import { validateEditionItem, type EditionItem } from '@/lib/edition/kinds'
import { getVerse } from '@/lib/bible/getVerse'

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** A run of consecutive UTC dates starting at `iso`. */
function days(iso: string, count: number): Date[] {
  const start = Date.parse(`${iso}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => new Date(start + i * 86400000))
}

/** The grid numbering the payload claims, recomputed from the grid alone. */
function numberingFromGrid(grid: (string | null)[][]) {
  const size = grid.length
  const filled = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && grid[r][c] !== null

  const across: { number: number; row: number; col: number; answer: string }[] =
    []
  const down: { number: number; row: number; col: number; answer: string }[] =
    []
  const numbers: { number: number; row: number; col: number }[] = []

  let next = 1
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!filled(row, col)) continue
      const startsAcross = !filled(row, col - 1) && filled(row, col + 1)
      const startsDown = !filled(row - 1, col) && filled(row + 1, col)
      if (!startsAcross && !startsDown) continue
      const number = next
      next += 1
      numbers.push({ number, row, col })
      if (startsAcross) {
        let answer = ''
        for (let c = col; filled(row, c); c += 1) answer += grid[row][c]
        across.push({ number, row, col, answer })
      }
      if (startsDown) {
        let answer = ''
        for (let r = row; filled(r, col); r += 1) answer += grid[r][col]
        down.push({ number, row, col, answer })
      }
    }
  }
  return { across, down, numbers }
}

describe('the puzzles page — determinism', () => {
  const date = utc('2026-08-18')

  it('builds the same unscramble twice', async () => {
    const a = await generateUnscramble(date)
    const b = await generateUnscramble(new Date(date.getTime()))
    expect(a).toEqual(b)
  })

  it('builds the same quiz twice', async () => {
    const a = await generateQuiz(date)
    const b = await generateQuiz(new Date(date.getTime()))
    expect(a).toEqual(b)
  })

  it('builds the same crossword twice', async () => {
    const a = await generateCrossword(date)
    const b = await generateCrossword(new Date(date.getTime()))
    expect(a).toEqual(b)
  })

  it('keys off the UTC day, not the wall clock', async () => {
    const morning = await generateUnscramble(new Date('2026-08-18T00:14:00Z'))
    const evening = await generateUnscramble(new Date('2026-08-18T23:46:00Z'))
    expect(morning).toEqual(evening)
    expect(morning[0].publishDate).toBe('2026-08-18')
  })

  it('refuses a date before the epoch, by name', async () => {
    // The rotation index is days since 1970, so an earlier date makes it
    // negative and every pool lookup misses. Say so instead of crashing later.
    await expect(generateUnscramble(utc('1969-12-31'))).rejects.toBeInstanceOf(
      PuzzleDateBeforeEpochError,
    )
    await expect(generateQuiz(utc('1969-12-31'))).rejects.toThrow(
      /before 1970-01-01/,
    )
  })
})

describe('the unscramble', () => {
  it('publishes one approved item in slot 0', async () => {
    const items = await generateUnscramble(utc('2026-08-18'))
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('unscramble')
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('approved')
    expect(items[0].payload.translation).toBe('BSB')
  })

  it('shuffles the indexes into a permutation that is not the source order', async () => {
    for (const date of days('2026-08-18', 30)) {
      const { payload } = (await generateUnscramble(date))[0]
      const { words, shuffled } = payload
      expect(shuffled).toHaveLength(words.length)
      expect([...shuffled].sort((a, b) => a - b)).toEqual(
        words.map((_, i) => i),
      )
      expect(shuffled).not.toEqual(words.map((_, i) => i))
    }
  })

  it('prints the real BSB verse, punctuation and all', async () => {
    for (const date of days('2026-08-18', 10)) {
      const { payload } = (await generateUnscramble(date))[0]
      const lookup = await getVerse(payload.reference, 'BSB')
      expect(lookup.verses).toHaveLength(1)
      expect(payload.words.join(' ')).toBe(lookup.text)
      expect(payload.words.length).toBeGreaterThanOrEqual(8)
      expect(payload.words.length).toBeLessThanOrEqual(18)
    }
  })

  it('does not repeat a reference across a month of editions', async () => {
    const refs = new Set<string>()
    for (const date of days('2026-08-18', 30)) {
      refs.add((await generateUnscramble(date))[0].payload.reference)
    }
    expect(refs.size).toBe(30)
  })
})

describe('the quiz', () => {
  it('publishes three approved questions in slots 0, 1 and 2', async () => {
    const items = await generateQuiz(utc('2026-08-18'))
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.slot)).toEqual([0, 1, 2])
    for (const item of items) {
      expect(item.kind).toBe('quiz')
      expect(item.status).toBe('approved')
      expect(item.payload.translation).toBe('BSB')
    }
  })

  it('offers four references with the right one at answerIndex', async () => {
    for (const date of days('2026-08-18', 14)) {
      for (const item of await generateQuiz(date)) {
        const { text, options, answerIndex } = item.payload
        expect(options).toHaveLength(4)
        expect(new Set(options).size).toBe(4)
        expect(answerIndex).toBeGreaterThanOrEqual(0)
        expect(answerIndex).toBeLessThan(4)

        // The option at answerIndex is the reference the quoted text came from.
        const lookup = await getVerse(options[answerIndex], 'BSB')
        expect(lookup.text).toBe(text)

        // ...and every decoy really is a decoy.
        for (let i = 0; i < options.length; i += 1) {
          if (i === answerIndex) continue
          expect(options[i]).not.toBe(options[answerIndex])
          const decoy = await getVerse(options[i], 'BSB')
          expect(decoy.text).not.toBe(text)
        }
      }
    }
  })

  it('asks about three different verses each day', async () => {
    for (const date of days('2026-08-18', 14)) {
      const items = await generateQuiz(date)
      const answers = items.map((i) => i.payload.options[i.payload.answerIndex])
      expect(new Set(answers).size).toBe(3)
      expect(new Set(items.map((i) => i.payload.text)).size).toBe(3)
    }
  })

  it('asks about three different chapters each day', async () => {
    // Two questions out of one chapter make each other's decoys obvious, and
    // the pool is in canon order, so neighbouring entries share a chapter often.
    for (const date of days('2026-08-18', 60)) {
      const chapters = (await generateQuiz(date)).map((i) =>
        i.payload.options[i.payload.answerIndex].replace(/:\d+$/, ''),
      )
      expect(new Set(chapters).size).toBe(3)
    }
  })

  it('does not repeat a question across a month of editions', async () => {
    // Two windows: an ordinary month, and one that straddles New Year — which
    // a day-of-the-year rotation would repeat on January 1st.
    for (const start of ['2026-08-18', '2026-12-17']) {
      const asked = new Set<string>()
      for (const date of days(start, 30)) {
        for (const item of await generateQuiz(date)) {
          asked.add(item.payload.options[item.payload.answerIndex])
        }
      }
      expect(asked.size).toBe(90)
    }
  })

  it('never offers two options that read the same', async () => {
    /** Verses the quiz pool holds twice over: word for word in the BSB,
     * 1 Chronicles 16:34 is Psalms 107:1 and Matthew 6:21 is Luke 12:34.
     * Offering a pair in one question makes two of the four options right. */
    const twinned = [
      '1 Chronicles 16:34',
      'Psalms 107:1',
      'Matthew 6:21',
      'Luke 12:34',
    ]
    const asked = new Set<string>()

    for (const date of days('2026-08-18', 120)) {
      for (const item of await generateQuiz(date)) {
        const { options, answerIndex } = item.payload
        const texts = await Promise.all(
          options.map(async (ref) => (await getVerse(ref, 'BSB')).text),
        )
        expect(new Set(texts).size).toBe(options.length)
        asked.add(options[answerIndex])
      }
    }

    // The window has to actually ask about the twinned verses, or it proves
    // nothing about them.
    expect(twinned.filter((ref) => asked.has(ref))).toEqual(twinned)
  })
})

describe('the crossword', () => {
  it('publishes one approved 11x11 grid in slot 0', async () => {
    const items = await generateCrossword(utc('2026-08-18'))
    expect(items).toHaveLength(1)
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('approved')
    expect(items[0].payload.size).toBe(11)
    expect(items[0].payload.grid).toHaveLength(11)
    expect(items[0].payload.source).toBe('BSB')
  })

  it('spells every clue answer when read back off the grid', async () => {
    for (const date of days('2026-08-18', 14)) {
      const { payload } = (await generateCrossword(date))[0]
      const { grid, clues } = payload

      for (const entry of clues.across) {
        let read = ''
        for (
          let c = entry.col;
          c < payload.size && grid[entry.row][c] !== null;
          c += 1
        ) {
          read += grid[entry.row][c]
        }
        expect(read).toBe(entry.answer)
        expect(entry.clue.length).toBeGreaterThan(0)
      }
      for (const entry of clues.down) {
        let read = ''
        for (
          let r = entry.row;
          r < payload.size && grid[r][entry.col] !== null;
          r += 1
        ) {
          read += grid[r][entry.col]
        }
        expect(read).toBe(entry.answer)
        expect(entry.clue.length).toBeGreaterThan(0)
      }
    }
  })

  it('places at least fourteen answers, all A-Z and three letters or more', async () => {
    for (const date of days('2026-08-18', 14)) {
      const { clues } = (await generateCrossword(date))[0].payload
      const answers = [...clues.across, ...clues.down].map((e) => e.answer)
      expect(answers.length).toBeGreaterThanOrEqual(14)
      expect(new Set(answers).size).toBe(answers.length)
      for (const answer of answers) {
        expect(answer).toMatch(/^[A-Z]{3,11}$/)
      }
    }
  })

  it('numbers the grid in standard order, one number per starting square', async () => {
    for (const date of days('2026-08-18', 14)) {
      const { payload } = (await generateCrossword(date))[0]
      const expected = numberingFromGrid(payload.grid)

      expect(payload.clues.across).toEqual(
        expected.across.map((run) => expect.objectContaining(run)),
      )
      expect(payload.clues.down).toEqual(
        expected.down.map((run) => expect.objectContaining(run)),
      )

      // Standard order: numbers ascend left to right, top to bottom, and every
      // starting square owns exactly one of them.
      const cells = expected.numbers.map((n) => `${n.row},${n.col}`)
      expect(new Set(cells).size).toBe(cells.length)
      expect(expected.numbers.map((n) => n.number)).toEqual(
        expected.numbers.map((_, i) => i + 1),
      )
      const sorted = [...expected.numbers].sort((a, b) =>
        a.row === b.row ? a.col - b.col : a.row - b.row,
      )
      expect(sorted).toEqual(expected.numbers)

      // A square that begins both an across and a down answer shares a number.
      const byNumber = new Map<number, string>()
      for (const entry of [...payload.clues.across, ...payload.clues.down]) {
        const cell = `${entry.row},${entry.col}`
        const seen = byNumber.get(entry.number)
        if (seen !== undefined) expect(seen).toBe(cell)
        byNumber.set(entry.number, cell)
      }
    }
  })

  it('leaves unused squares blank rather than filling them', async () => {
    const { payload } = (await generateCrossword(utc('2026-08-18')))[0]
    const flat = payload.grid.flat()
    expect(flat).toHaveLength(121)
    expect(flat.some((cell) => cell === null)).toBe(true)
    for (const cell of flat) {
      if (cell !== null) expect(cell).toMatch(/^[A-Z]$/)
    }
  })
})

describe('the crossword clue bank', () => {
  const describeEntry = (entry: (typeof CROSSWORD_BANK)[number]) =>
    `${entry.answer}: ${entry.clue}`

  it('never prints its own answer in the clue', () => {
    const offenders = CROSSWORD_BANK.filter((entry) =>
      entry.clue.toUpperCase().includes(entry.answer),
    ).map(describeEntry)
    expect(offenders).toEqual([])
  })

  it('never cites the book that is the answer', () => {
    // "(Isa. 6:8)" under a six-letter answer is ISAIAH in all but spelling, so
    // a citation whose book abbreviates the answer gives it away just the same.
    const offenders = CROSSWORD_BANK.filter((entry) => {
      const cited = /\(([^)]+)\)$/.exec(entry.clue.trim())
      if (!cited) return false
      const book = /^[A-Za-z]+/.exec(cited[1].replace(/^\d\s+/, ''))?.[0]
      if (!book || book.length < 3) return false
      return entry.answer.startsWith(book.toUpperCase())
    }).map(describeEntry)
    expect(offenders).toEqual([])
  })
})

describe('every puzzle item is writable', () => {
  it('passes validateEditionItem for a fortnight of editions', async () => {
    for (const date of days('2026-08-18', 14)) {
      const items: EditionItem[] = [
        ...(await generateUnscramble(date)),
        ...(await generateQuiz(date)),
        ...(await generateCrossword(date)),
      ]
      expect(items).toHaveLength(5)
      for (const item of items) {
        expect(validateEditionItem(item)).toBeNull()
      }
    }
  })
})
