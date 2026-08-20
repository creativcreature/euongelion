/**
 * SA-114 / F-158 — the preview command bar.
 *
 * Founder, looking at the live preview: "looks very confusing." Once you
 * scrolled, the preview was indistinguishable from the paper — no sign of
 * which day you were on, how many pieces awaited a verdict, or where they
 * were in ~17,000px of page. The contract now:
 *
 *  1. A sticky command bar always shows the edition date, day nav, and a
 *     LIVE count of pieces still awaiting a verdict (from the DOM).
 *  2. REVIEW NEXT scrolls to the next piece that still needs a verdict.
 *  3. When a verdict lands anywhere (chrome dispatches `preview-verdict`),
 *     the count updates without a reload; at zero the bar says plainly that
 *     the paper prints itself.
 *  4. PreviewChrome marks awaiting pieces with data-preview-draft and drops
 *     the mark + announces the verdict once ruled.
 */
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import PreviewCommandBar from '@/components/edition/PreviewCommandBar'
import PreviewChrome from '@/components/edition/PreviewChrome'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function mountDrafts(n: number) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div')
    el.setAttribute('data-preview-draft', '')
    el.scrollIntoView = vi.fn()
    document.body.appendChild(el)
  }
}

describe('the preview command bar', () => {
  it('shows the edition date, day nav, and the live count of pieces awaiting a verdict', () => {
    mountDrafts(3)
    render(
      <PreviewCommandBar
        date="2026-08-20"
        prev="2026-08-19"
        next="2026-08-21"
      />,
    )
    expect(screen.getByText(/2026-08-20|Aug(ust)? 20/i)).toBeTruthy()
    expect(screen.getByText(/3 pieces? await/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /previous day/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /next day/i })).toBeTruthy()
  })

  it('REVIEW NEXT scrolls to a piece that still needs a verdict', async () => {
    const user = userEvent.setup()
    mountDrafts(2)
    render(
      <PreviewCommandBar
        date="2026-08-20"
        prev="2026-08-19"
        next="2026-08-21"
      />,
    )
    await user.click(screen.getByRole('button', { name: /review next/i }))
    const first = document.querySelector('[data-preview-draft]') as HTMLElement
    expect(first.scrollIntoView).toHaveBeenCalled()
  })

  it('the count follows verdicts and lands on a plain sentence at zero', async () => {
    mountDrafts(1)
    render(
      <PreviewCommandBar
        date="2026-08-20"
        prev="2026-08-19"
        next="2026-08-21"
      />,
    )
    expect(screen.getByText(/1 piece awaits/i)).toBeTruthy()
    const el = document.querySelector('[data-preview-draft]') as HTMLElement
    el.removeAttribute('data-preview-draft')
    act(() => {
      window.dispatchEvent(new CustomEvent('preview-verdict'))
    })
    await waitFor(() => {
      expect(
        screen.getByText(/nothing awaits your verdict.*prints itself/i),
      ).toBeTruthy()
    })
  })
})

describe('PreviewChrome marks and announces (the bar depends on it)', () => {
  it('a draft carries data-preview-draft and a plain-English label; a verdict drops the mark and dispatches preview-verdict', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
          }) as Response,
      ),
    )
    const heard = vi.fn()
    window.addEventListener('preview-verdict', heard)
    const { container } = render(
      <PreviewChrome
        id="11111111-1111-4111-8111-111111111111"
        kind="lead"
        status="draft"
      >
        <p>the rendered lead</p>
      </PreviewChrome>,
    )
    expect(container.querySelector('[data-preview-draft]')).not.toBeNull()
    expect(screen.getByText(/the lead devotional/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => {
      expect(container.querySelector('[data-preview-draft]')).toBeNull()
      expect(heard).toHaveBeenCalled()
    })
    window.removeEventListener('preview-verdict', heard)
  })
})
