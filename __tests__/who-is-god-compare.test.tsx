import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompareStage from '@/components/who-is-god/CompareStage'
import { SHARED_ATTRIBUTES } from '@/data/who-is-god-attributes'

// vitest.config.ts does not set `globals: true`, so Testing Library's automatic
// afterEach cleanup never registers and renders accumulate across tests in a
// file. Clean up explicitly here rather than changing shared test config as a
// side effect of this feature.
afterEach(cleanup)

describe('the attributes comparison', () => {
  test('carries eighteen attributes, seven of them core', () => {
    expect(SHARED_ATTRIBUTES).toHaveLength(18)
    expect(SHARED_ATTRIBUTES.filter((a) => a.core)).toHaveLength(7)
  })

  test('every one of the 54 cells carries a real reference and text', () => {
    for (const a of SHARED_ATTRIBUTES) {
      for (const cell of [a.father, a.son, a.spirit]) {
        expect(cell.ref).toMatch(/\w+ \d+:\d+/)
        expect(cell.text.trim().length).toBeGreaterThan(10)
      }
    }
  })

  test('shows the seven core attributes and tucks the other eleven away', async () => {
    const { container } = render(<CompareStage />)
    const matrix = () => container.querySelector('.wig-matrix') as HTMLElement

    // Each label legitimately appears twice — once as a step heading, once as a
    // matrix row — so assert against the matrix specifically.
    expect(within(matrix()).getByText('Eternal')).toBeInTheDocument()
    expect(within(matrix()).getByText('Holy')).toBeInTheDocument()
    expect(within(matrix()).queryByText('Merciful')).not.toBeInTheDocument()
    expect(
      within(matrix()).queryByText('Self-existent'),
    ).not.toBeInTheDocument()

    await userEvent.click(
      within(matrix()).getByRole('button', { name: /11 more/i }),
    )

    expect(within(matrix()).getByText('Merciful')).toBeInTheDocument()
    expect(within(matrix()).getByText('Self-existent')).toBeInTheDocument()
    expect(within(matrix()).getByText('Unchanging')).toBeInTheDocument()
    expect(within(matrix()).getByText('Eternal')).toBeInTheDocument()
  })

  test('the expander says how many are hidden, so nothing is silently withheld', () => {
    const { container } = render(<CompareStage />)
    const matrix = container.querySelector('.wig-matrix') as HTMLElement
    expect(
      within(matrix).getByRole('button', { name: /11 more/i }),
    ).toBeInTheDocument()
  })
})
