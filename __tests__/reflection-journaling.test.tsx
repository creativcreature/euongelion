/**
 * SA-059 — the 2,062 prompts finally have somewhere to answer.
 *
 * Measured across the 568 devotional files: 545 reflection modules carrying
 * 1,517 additional questions. Every one already written and shipping; none had
 * an input until now.
 *
 * Also pins the two shapes that are deliberately NOT the same:
 *  - prayer modules pose no question (all 543 of them), so they get "in your
 *    own words", not an answer box;
 *  - without a provider or a module index, the prose renders exactly as it
 *    always did and no control appears at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  ReaderProvider,
  __resetSessionProbe,
} from '@/components/reader/ReaderContext'
import { useAuthStore } from '@/stores/authStore'
import ReflectionModule from '@/components/modules/ReflectionModule'
import PrayerModule from '@/components/modules/PrayerModule'

const REFLECTION = {
  type: 'reflection',
  prompt: 'Where have you been strong in your own eyes?',
  additionalQuestions: [
    'What would trusting look like today?',
    'Who needs to hear this?',
  ],
} as never

const PRAYER = {
  type: 'prayer',
  prayerText: 'Father, we are not strong. Be our strength.',
} as never

beforeEach(() => {
  __resetSessionProbe()
  useAuthStore.setState({ userId: null, email: null, initialized: false })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            String(input).startsWith('/api/auth/session')
              ? { authenticated: true, user: { id: 'u1' } }
              : { annotations: [] },
          ),
      } as Response),
    ),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const inReader = (node: React.ReactNode) => (
  <ReaderProvider devotionalSlug="jabez-day-1">{node}</ReaderProvider>
)

describe('ReflectionModule journaling', () => {
  it('offers a field for the prompt AND every additional question', async () => {
    render(inReader(<ReflectionModule module={REFLECTION} moduleIndex={3} />))
    const boxes = await screen.findAllByRole('textbox')
    expect(boxes).toHaveLength(3)
  })

  it('anchors each answer to its own question', async () => {
    const { container } = render(
      inReader(<ReflectionModule module={REFLECTION} moduleIndex={3} />),
    )
    await screen.findAllByRole('textbox')
    const ids = [...container.querySelectorAll('textarea')].map((t) => t.id)
    // m3:q0 is the prompt; q1..qN are the additional questions, in order.
    expect(ids).toEqual([
      'journal-reflection-m3-q0',
      'journal-reflection-m3-q1',
      'journal-reflection-m3-q2',
    ])
  })

  it('still renders the prompts unchanged outside a provider', () => {
    render(<ReflectionModule module={REFLECTION} moduleIndex={3} />)
    expect(screen.getByText(/strong in your own eyes/i)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('renders no control without a module index', async () => {
    render(inReader(<ReflectionModule module={REFLECTION} />))
    expect(screen.getByText(/strong in your own eyes/i)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('PrayerModule gets a different control', () => {
  it('invites a prayer rather than asking for an answer', async () => {
    render(inReader(<PrayerModule module={PRAYER} moduleIndex={5} />))
    await screen.findByRole('textbox')
    // All 543 prayer modules pose no question; a box labelled "your answer"
    // under one would misread the form.
    expect(screen.getByText('IN YOUR OWN WORDS')).toBeTruthy()
    expect(screen.getByLabelText('Your own prayer')).toBeTruthy()
  })

  it('keeps the prayer itself intact', async () => {
    render(inReader(<PrayerModule module={PRAYER} moduleIndex={5} />))
    expect(screen.getByText(/Be our strength/)).toBeTruthy()
  })
})
