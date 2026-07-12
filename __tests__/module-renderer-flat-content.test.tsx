import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ModuleRenderer from '@/components/ModuleRenderer'

/**
 * Regression guard for the Jabez ship (2026-07-12, SA-029/F-081):
 * normalizeModule destructured `content` off every module and only
 * restored it when it was a nested OBJECT (legacy Substack shape).
 * The canonical flat format — `content` as the prose string, exactly
 * as the Module type declares — was silently discarded, so teaching /
 * story / insight / pullquote modules rendered as empty bordered
 * panels on every day page. These tests render the REAL components
 * and assert the prose reaches the DOM.
 */
describe('ModuleRenderer — flat string `content` (canonical format)', () => {
  it('renders teaching prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'teaching',
          heading: 'The Names That Stick',
          content: 'Somebody named you. Probably without a birth certificate.',
        }}
      />,
    )
    expect(screen.getByText(/Somebody named you/)).toBeInTheDocument()
    expect(screen.getByText('The Names That Stick')).toBeInTheDocument()
  })

  it('renders story prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'story',
          heading: 'The Boy Born Dead',
          content:
            'On October 28, 1953, a baby was delivered without a heartbeat.',
        }}
      />,
    )
    expect(
      screen.getByText(/delivered without a heartbeat/),
    ).toBeInTheDocument()
  })

  it('renders insight prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'insight',
          content: 'The grant did not run along the bloodline.',
        }}
      />,
    )
    expect(
      screen.getByText(/did not run along the bloodline/),
    ).toBeInTheDocument()
  })

  it('renders pullquote text from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'pullquote',
          content: 'The sentence has one subject.',
        }}
      />,
    )
    expect(screen.getByText(/The sentence has one subject/)).toBeInTheDocument()
  })

  it('still spreads legacy nested-object content shapes', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'teaching',
          content: { content: 'Nested legacy prose survives.' } as never,
        }}
      />,
    )
    expect(screen.getByText(/Nested legacy prose survives/)).toBeInTheDocument()
  })

  it('still maps legacy body -> content', () => {
    render(
      <ModuleRenderer
        module={
          {
            type: 'teaching',
            body: 'Legacy body prose survives.',
          } as never
        }
      />,
    )
    expect(screen.getByText(/Legacy body prose survives/)).toBeInTheDocument()
  })
})
