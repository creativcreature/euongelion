/**
 * SA-114 / F-158 — founder, 2026-08-20: "all footers should have copyright
 * and versioning info... Currently missing on daily bread. check all pages."
 *
 * The copyright line existed; the VERSION did not, anywhere. The contract:
 * SiteBottom's legal line carries both the WokeGod copyright and the app
 * version, and the version is read from package.json — never hand-typed,
 * so a release bump can't drift from the footer.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import React from 'react'
import SiteBottom from '@/components/SiteBottom'
import pkg from '../package.json'

afterEach(cleanup)

describe('the footer legal line', () => {
  it('carries the copyright and the live package version', () => {
    render(<SiteBottom />)
    const legal = screen.getByLabelText(/copyright and legal/i)
    expect(legal.textContent).toMatch(/Copyright © 2026 WokeGod/)
    expect(legal.textContent).toContain(`v${pkg.version}`)
  })
})
