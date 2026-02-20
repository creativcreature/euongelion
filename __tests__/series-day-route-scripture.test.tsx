import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WakeUpSeriesPage from '@/app/wake-up/series/[slug]/page'
import EuangelionSeriesPage from '@/app/series/[slug]/page'

const buildSeriesDayScriptureMap = vi.fn((_params: unknown) => ({
  1: { reference: 'Matthew 6:33', snippet: 'Seek first the kingdom.' },
}))

vi.mock('@/lib/soul-audit/series-day-scripture', () => ({
  buildSeriesDayScriptureMap: (params: unknown) =>
    buildSeriesDayScriptureMap(params),
}))

vi.mock('@/app/wake-up/series/[slug]/SeriesPageClient', () => ({
  default: (props: {
    dayScriptureByDayNumber?: Record<
      number,
      { reference: string; snippet: string }
    >
  }) => (
    <div data-testid="series-page-client">
      {props.dayScriptureByDayNumber?.[1]?.reference || ''}
    </div>
  ),
}))

describe('series route day scripture wiring', () => {
  beforeEach(() => {
    buildSeriesDayScriptureMap.mockClear()
  })
  afterEach(() => {
    cleanup()
  })

  it('passes day scripture map into wake-up series route', async () => {
    const element = await WakeUpSeriesPage({
      params: Promise.resolve({ slug: 'identity' }),
    })
    render(element)

    expect(buildSeriesDayScriptureMap).toHaveBeenCalledWith({
      seriesSlug: 'identity',
      framework: expect.any(String),
      dayNumbers: [1, 2, 3, 4, 5],
    })
    expect(screen.getByTestId('series-page-client')).toHaveTextContent(
      'Matthew 6:33',
    )
  })

  it('passes day scripture map into euangelion series route', async () => {
    const element = await EuangelionSeriesPage({
      params: Promise.resolve({ slug: 'identity' }),
    })
    render(element)

    expect(buildSeriesDayScriptureMap).toHaveBeenCalledWith({
      seriesSlug: 'identity',
      framework: expect.any(String),
      dayNumbers: [1, 2, 3, 4, 5],
    })
    expect(screen.getByTestId('series-page-client')).toHaveTextContent(
      'Matthew 6:33',
    )
  })
})
