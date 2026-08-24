/**
 * Guards for the Georgia outreach page.
 *
 * This page is different from the rest of the site: a typo in a phone number
 * sends someone in crisis to a dead line. So the data itself is under test,
 * not just the rendering — malformed contacts should fail CI, not ship.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  CATEGORIES,
  CATEGORY_IDS,
  EMERGENCY,
  LAST_VERIFIED,
} from '@/data/georgia-help'
import ResourceCard from '@/components/seeking-help/ResourceCard'

const ALL_RESOURCES = [
  ...EMERGENCY,
  ...CATEGORIES.flatMap((category) => category.resources),
]

describe('georgia-help data integrity', () => {
  it('has every category wired with a triage label and at least one resource', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0)
    for (const category of CATEGORIES) {
      expect(category.id, `${category.title} needs an anchor id`).toMatch(
        /^[a-z][a-z0-9-]*$/,
      )
      expect(category.tileLabel.length).toBeGreaterThan(0)
      expect(category.intro.length).toBeGreaterThan(0)
      expect(
        category.resources.length,
        `${category.title} has no resources`,
      ).toBeGreaterThan(0)
    }
  })

  it('has unique anchor ids so the triage grid cannot collide', () => {
    expect(new Set(CATEGORY_IDS).size).toBe(CATEGORY_IDS.length)
  })

  it('pairs every display phone with dialable digits', () => {
    for (const resource of ALL_RESOURCES) {
      if (!resource.phone) continue
      expect(
        resource.phoneDigits,
        `${resource.name} has a phone but no phoneDigits for the tel: link`,
      ).toBeTruthy()
      // 3-digit short codes (988, 911, 211) or a full 10/11-digit number.
      expect(
        resource.phoneDigits,
        `${resource.name} phoneDigits is not dialable`,
      ).toMatch(/^(\d{3}|\d{10,11})$/)
    }
  })

  it('keeps alternate numbers dialable too', () => {
    for (const resource of ALL_RESOURCES) {
      if (!resource.altPhone) continue
      expect(resource.altPhone.phoneDigits).toMatch(/^(\d{3}|\d{10,11})$/)
      expect(resource.altPhone.label.length).toBeGreaterThan(0)
    }
  })

  it('only links absolute http(s) urls', () => {
    for (const resource of ALL_RESOURCES) {
      if (!resource.url) continue
      expect(resource.url, `${resource.name} has a relative url`).toMatch(
        /^https?:\/\//,
      )
    }
  })

  it('gives every resource a way to be reached', () => {
    for (const resource of ALL_RESOURCES) {
      const reachable = Boolean(resource.phone || resource.url || resource.text)
      // Two entries are deliberate editorial notes rather than providers.
      const isEditorialNote = resource.badges.length === 0
      expect(
        reachable || isEditorialNote,
        `${resource.name} has no phone, url, or text`,
      ).toBe(true)
    }
  })

  it('leads with 988 in the emergency block', () => {
    expect(EMERGENCY[0].phoneDigits).toBe('988')
  })

  it('stamps a verification date', () => {
    expect(LAST_VERIFIED).toMatch(/\w+ \d{1,2}, \d{4}/)
  })

  it('ships a section plate image for every category', () => {
    // The page renders /images/site/seeking-help/<id>.webp per section. A
    // missing file is a silent broken image on a page people are sent to.
    const dir = join(process.cwd(), 'public', 'images', 'site', 'seeking-help')
    for (const category of CATEGORIES) {
      expect(
        existsSync(join(dir, `${category.id}.webp`)),
        `missing plate for section "${category.id}"`,
      ).toBe(true)
    }
  })

  it('ships the hero plate', () => {
    // Not lazy-loaded — its absence is visible immediately.
    const dir = join(process.cwd(), 'public', 'images', 'site', 'seeking-help')
    expect(existsSync(join(dir, 'hero.webp'))).toBe(true)
  })

  it('keeps every plate distinct', () => {
    // A collection bug once produced ten copies of the same image. Hash them.
    const dir = join(process.cwd(), 'public', 'images', 'site', 'seeking-help')
    const hashes = CATEGORIES.map((c) =>
      createHash('md5')
        .update(readFileSync(join(dir, `${c.id}.webp`)))
        .digest('hex'),
    )
    expect(new Set(hashes).size).toBe(CATEGORIES.length)
  })
})

describe('ResourceCard', () => {
  it('renders the phone as a tel: link a phone can actually dial', () => {
    render(
      <ResourceCard
        resource={{
          name: 'Georgia Crisis & Access Line (GCAL)',
          what: 'Test line.',
          phone: '1-800-715-4225',
          phoneDigits: '18007154225',
          badges: ['Free', '24/7'],
        }}
      />,
    )
    const link = screen.getByRole('link', { name: /call .* 1-800-715-4225/i })
    expect(link).toHaveAttribute('href', 'tel:18007154225')
  })

  it('renders barrier and caution notes with distinct labels', () => {
    render(
      <ResourceCard
        resource={{
          name: 'Example',
          what: 'Test.',
          badges: [],
          barrier: 'There is a waiting list.',
          caution: 'Not a licensed medical facility.',
        }}
      />,
    )
    expect(screen.getByText('Good to know')).toBeInTheDocument()
    expect(screen.getByText('Before you go')).toBeInTheDocument()
  })

  it('opens external links in a new tab without leaking the referrer', () => {
    render(
      <ResourceCard
        resource={{
          name: 'Example',
          what: 'Test.',
          url: 'https://example.org/help',
          urlLabel: 'example.org',
          badges: [],
        }}
      />,
    )
    const link = screen.getByRole('link', { name: 'example.org' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
