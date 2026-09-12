# Audible-style Audio Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revised 2026-09-12.** Three things in the first draft were wrong and are corrected here, each marked **WAS WRONG** at the point of correction: the type floor (Task 3), the scrubber shape (Task 5), and the assumption that section labels are editorial (Task 4 — the premise).

**Goal:** Make the listening player usable at a glance and by feel — on a phone, one-handed, while driving — by making the named section the unit of navigation instead of the whole-track scrubber.

**Architecture:** No new state layer. `audioStore` (the queue) and `GlobalAudioHost` (the site's one `<audio>` element) are untouched in shape. The work is four things: wire the Media Session actions a car actually sends; teach `tracks.ts` to tell an *editorial* chapter from a *structural* one; replace the whole-track `<input type="range">` in `AudioDrawer` with a thin ruled section track; and add a Drive mode.

**Tech Stack:** Next 16 App Router, React 19, TypeScript strict, styled-jsx (the file's existing convention), Zustand, Vitest + React Testing Library.

**Spec:** This plan argues from four sources. Read the first three before Task 4.

- `docs/audio/AUDIO-UX-PATTERN-RESEARCH-2026-08-19.md` — the Mobbin/community sweep. §3 now-playing anatomy, §4 mini-bar grammar, §5 binding deltas.
- `docs/audio/PLAYER-GAP-ANALYSIS-2026-08-20.md` — feature-by-feature against 8 shipped players.
- `design-system/typography-craft.css` — the F-012..F-015 type contract. **This is the file the first draft got wrong.**
- Design canvas: https://claude.ai/code/artifact/cc38bb7f-8dcf-4267-996a-d07b77443f19 — seven artboards: full player, drive mode, docked bar, desktop sidebar, lock screen, twelve states, and the measured case.

---

## Global Constraints

- **Use tokens, never literals.** `--color-gold` resolves to **cobalt `#1f2a8d` in light** and **amber `#c8a56a` in dark**; `--color-amber` itself lifts to `#d8b878` in dark. A hard-coded amber measures **2.1:1 on cream** and fails AA. This trap is logged twice already (SA-044, SA-047) with "this has bitten twice" comments in `globals.css`. The canvas artboards use literal hex because a `.dc.html` has no token layer — **shipped CSS must not**.
- **Type comes from the ladder, not from rem.** `typography-craft.css` defines `--ts-xs … --ts-3xl` with a readability floor of `--ts-floor: 1.0625rem` (17px), and says new surfaces should adopt `.font-*` + `.ts-*` + `.measure-*` so the rule is enforced by class. SA-092 is explicit: *"Any font-size in this stylesheet that is not one of these tokens is a defect."*
- **Serif is the default.** `--font-family` **is** Instrument Serif — body *and* display. `--font-family-ui` (Industry, a condensed grotesque) is for UI/meta/nav labels only.
- **Rules are `--mock-stroke` (1.5px);** progress furniture is 2–3px (`.series-progress`, `.scroll-progress`). Radii top out at 12px — this is a hard-edged design.
- **Class prefix is `lsn-`, never `ad-`.** `AudioDrawer.tsx:42-50` documents why: ad-blocker cosmetic filters match `ad-root` and inject `display:none !important` from the user origin, which beats author `!important` and is invisible to `document.styleSheets`.
- **styled-jsx does not scope child components.** Any `lsn-` class on a `<Link>` or capitalised JSX tag needs `:global(...)` under a scoped ancestor. `__tests__/audio-drawer-styles.test.ts` fails the build on that and on unstyled classes. Keep it passing.
- **Touch targets ≥ 44px** (`--touch-min`). This plan raises the primary transport above it; nothing goes below.
- **No trim-silence, ever.** Research §1 and §5.3: the renderer's `PAUSE_AFTER` grammar is content — the beat after a Scripture line. Not as a default, not as a toggle.
- **Default speed stays 1.0×.**
- **Commit gates.** `scripts/check-decision-reference.mjs` requires an `SA-###` **and** an `F-###` whose `docs/feature-prds/F-###.md` is staged — but **only when `src/**.ts(x)` is staged**; a docs-only commit is exempt. `pre-commit` additionally runs `type-check` and every `verify:*`. Allocate ids from `docs/production-decisions.yaml` (canonical — CHANGELOG carries phantom ids) and bump `EXPECTED_FEATURE_IDS` when adding a PRD. Never cite a historical `F-###`.
- **Stage by explicit file list.** A parallel session works in this tree; `git add -A` sweeps its in-flight files into your commit.

### Facts already verified — do not re-litigate

1. **Seeking is cheap.** Research §5.0 says "fix seeking before adding any surface that encourages it", because Cloudflare's static-asset layer returned `200` + the whole 8 MB body for a Range request. **SA-098 fixed it.** `src/app/audio/[file]/route.ts:91-97` serves real `206 Partial Content` from R2 with a correct `Content-Range`. Verify once: `curl -r 0-999 -o /dev/null -D - https://euangelion.app/audio/<file>.m4a` → expect `206`.
2. **Every reading has chapters.** All 571 manifest entries carry `chapters`; **none has zero or one**. There is no "no sections" degrade path to build.
3. **The typical reading has 10 chapters.** Median 10, min 5, max 33 — and **442 of 571 have exactly 10**. Density is not the problem; do not engineer for the 33-chapter outlier.
4. **56% of chapter labels are structural, not editorial.** Of 6,132 marks: Scripture 687, Reflect 592, Word study 590, Opening 568, Prayer 520, Takeaway 487 — **3,444 total**. And **13% of readings repeat a label** (`bible-365-day-1` says "Scripture" seven times). This is why Task 4 exists, and it is the premise the whole design rests on.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/audio/GlobalAudioHost.tsx` (modify) | Media Session: `seekbackward`/`seekforward`/`seekto`, `setPositionState`, artwork, section-aware metadata. No UI. |
| `src/lib/audio/tracks.ts` (modify) | Add `isStructuralChapter()` and `sectionBack()`. `chapterAt()` and `chapterBounds()` **already exist** (lines 107, 134) — use them; do not write a third function answering "which chapter is this". |
| `src/components/audio/SectionRule.tsx` (create) | The ruled track: ticks, thumb, snap, keyboard, `aria-valuetext`. Pure presentation. |
| `src/components/audio/DriveMode.tsx` (create) | Full-screen, large targets, the section list, wake lock. |
| `src/components/audio/AudioDrawer.tsx` (modify) | Transport order/sizes; type ladder; mount `SectionRule`; docked-bar rework; Drive entry. |
| `__tests__/audio-media-session.test.tsx` (create) | Task 1 guard. |
| `__tests__/audio-type-ladder.test.ts` (create) | Task 3 guard — a source scan, in the style of `audio-drawer-styles.test.ts`. |
| `__tests__/audio-chapter-tiers.test.ts` (create) | Task 4 guard. |
| `__tests__/audio-section-rule.test.tsx` (create) | Task 5 guard. |
| `__tests__/audio-drive-mode.test.tsx` (create) | Task 7 guard. |

---

### Task 1: Media Session — the car

The highest-value change and the only one that works with the phone in a pocket. `GlobalAudioHost.tsx:243-246` registers exactly four handlers — `play`, `pause`, `nexttrack`, `previoustrack`. There is **no skip-back at all** on a lock screen, steering-wheel control, CarPlay or Android Auto; the OS scrub bar is empty because nothing calls `setPositionState`; and no artwork is set, so the OS draws a blank square.

**Interfaces:** consumes `useAudioStore`, `audioRef`, and (from Task 4) `chapterAt`. Produces no exports.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { useAudioStore } from '@/stores/audioStore'

const handlers = new Map<string, (d?: { seekTime?: number; seekOffset?: number }) => void>()

beforeEach(() => {
  handlers.clear()
  // @ts-expect-error — jsdom has no mediaSession
  navigator.mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: (a: string, h: never) => handlers.set(a, h),
    setPositionState: vi.fn(),
  }
  useAudioStore.getState().start({
    items: [{ slug: 's', title: 'T', src: '/a.m4a', duration: 600, href: '/devotional/s' }],
    source: 'single',
  })
})

describe('the car controls are wired', () => {
  it('registers every action a head unit sends', () => {
    render(<GlobalAudioHost />)
    expect([...handlers.keys()]).toEqual(
      expect.arrayContaining([
        'play', 'pause', 'nexttrack', 'previoustrack',
        'seekbackward', 'seekforward', 'seekto',
      ]),
    )
  })

  it('seekbackward clamps at zero', () => {
    const { container } = render(<GlobalAudioHost />)
    const audio = container.querySelector('audio') as HTMLAudioElement
    audio.currentTime = 5
    handlers.get('seekbackward')!({})
    expect(audio.currentTime).toBe(0)
  })

  it('seekto honours the offset the OS supplies, WITHOUT snapping', () => {
    const { container } = render(<GlobalAudioHost />)
    const audio = container.querySelector('audio') as HTMLAudioElement
    handlers.get('seekto')!({ seekTime: 123 })
    // The OS bar is continuous. Rounding it to a chapter would give a driver
    // a jump they did not ask for. The in-app rule snaps; this must not.
    expect(audio.currentTime).toBe(123)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-media-session.test.tsx`
Expected: FAIL — `seekbackward` is not registered.

- [ ] **Step 3: Register the seek actions**

In the existing `useEffect` at `GlobalAudioHost.tsx:225`, after `set('previoustrack', ...)`:

```tsx
    // A head unit and a lock screen both send seek actions, and a car is the
    // one place a reader cannot look at the screen. `seekOffset` is what the
    // OS suggests; the 15s fallback matches the in-app skip.
    const nudge = (seconds: number) => {
      if (!audio) return
      const to = audio.currentTime + seconds
      audio.currentTime = Math.max(0, Math.min(to, audio.duration || item.duration))
    }
    set('seekbackward', (d) => nudge(-((d as MediaSessionActionDetails)?.seekOffset ?? 15)))
    set('seekforward', (d) => nudge((d as MediaSessionActionDetails)?.seekOffset ?? 15))
    // Deliberately NOT snapped to a chapter — see the test.
    set('seekto', (d) => {
      const at = (d as MediaSessionActionDetails)?.seekTime
      if (audio && typeof at === 'number') audio.currentTime = at
    })
```

Extend the cleanup list at `:247` to null all three.

- [ ] **Step 4: Feed the OS scrub bar**

`setActionHandler` alone leaves the lock-screen progress bar empty, so `seekto` has nothing to aim at. Add a second effect:

```tsx
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const push = () => {
      const duration = audio.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: audio.playbackRate || 1,
          position: Math.min(audio.currentTime, duration),
        })
      } catch {
        // Safari throws on a position past duration mid-seek. Skipping one
        // tick is correct; the next timeupdate carries a valid pair.
      }
    }
    audio.addEventListener('loadedmetadata', push)
    audio.addEventListener('timeupdate', push)
    return () => {
      audio.removeEventListener('loadedmetadata', push)
      audio.removeEventListener('timeupdate', push)
    }
  }, [item])
```

- [ ] **Step 5: Set artwork and the section-aware metadata**

**This carries a founder decision — see "Open decisions". Do not guess.** The canvas draws both options. The proposed mapping puts the section in `title`, because the biggest text on a lock screen should be the thing a driver needs:

```tsx
    const chapter = chapterAt(getNarrationTrack(item.slug)?.chapters, audio?.currentTime ?? 0)
    const cover = coverForReading(item.slug)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter?.label ?? item.title,
      artist: item.title,
      album: item.context ?? useAudioStore.getState().label ?? 'Euangelion',
      artwork: cover ? [{ src: cover.src, sizes: '512x512', type: 'image/webp' }] : [],
    })
```

Re-run this effect when the **chapter** changes, not on every tick — the boundary crosses roughly once a minute.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run __tests__/audio-media-session.test.tsx __tests__/audio-single-element.test.tsx __tests__/audio-continuity.test.tsx`
Expected: PASS, no regression in the two existing host tests.

- [ ] **Step 7: Verify on a device — this is the whole point**

`npm run preview`, open on a phone over the LAN, start a reading, lock the screen. Expect skip-back/forward, a tracking progress bar, and the plate as artwork. **jsdom has no Media Session**, so the unit test proves registration and nothing about the car. If a real car is not available, report the car behaviour as **UNVERIFIED** in those words.

- [ ] **Step 8: Commit**

```bash
git add src/components/audio/GlobalAudioHost.tsx __tests__/audio-media-session.test.tsx CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "feat(audio): wire seek, position and artwork for lock screen and car — SA-<id> (F-<id>)"
```

---

### Task 2: Transport order and target sizes

`AudioDrawer.tsx:463-536` renders in source order: **back-15, play, forward-15, next, previous**. Previous is the last control, to the right of Next. Every surveyed player orders it prev · back · play · forward · next, and eyes-free use is muscle memory.

All five are `min-width: 44px; min-height: 44px` (`:1053-1062`) with only the play glyph larger. Nothing is distinguishable by feel.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/narration-transport-layout.test.tsx` (reuse its existing store setup):

```tsx
it('orders the transport prev, back, play, forward, next', () => {
  render(<AudioDrawer />)
  const labels = screen
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label') ?? '')
    .filter((l) => /Previous section|Back 15|the reading$|Forward 15|Next section/.test(l))
  expect(labels).toEqual([
    'Previous section',
    'Back 15 seconds',
    expect.stringMatching(/the reading$/),
    'Forward 15 seconds',
    'Next section',
  ])
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/narration-transport-layout.test.tsx`
Expected: FAIL — received order ends `[..., 'Next…', 'Previous…']`.

- [ ] **Step 3: Move the two outer buttons, and change what they do**

Cut the `Next in queue` (`:513-523`) and `Previous in queue` (`:524-534`) blocks. Paste **Previous** as the first child of `.lsn-transport`, **Next** as the last.

They now step **sections**, not queue items — relabel to `Previous section` / `Next section`, wire Previous to `sectionBack()` (Task 4) and Next to the following chapter's `t`. Queue movement belongs in the queue list, which already has it.

Give the ±15 buttons `className="lsn-btn lsn-btn-skip"` and the section buttons `lsn-btn lsn-btn-step`.

- [ ] **Step 4: Size the hierarchy**

Replace `.lsn-btn` at `:1053-1074`:

```css
        .lsn-transport {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.25rem;
          padding: 0.9rem 1rem;
          border-bottom: var(--mock-stroke, 1.5px) solid var(--color-border);
        }
        /* Three sizes, so the hand can tell them apart without the eye. */
        .lsn-btn {
          display: grid;
          place-items: center;
          min-width: 54px;
          min-height: 54px;
          background: transparent;
          border: 0;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .lsn-btn svg { width: 22px; height: 22px; fill: currentColor; }
        .lsn-btn-skip {
          min-width: 60px;
          min-height: 60px;
          color: var(--color-text-primary);
        }
        .lsn-btn-skip svg { width: 28px; height: 28px; }
        .lsn-btn-play {
          min-width: 82px;
          min-height: 82px;
          background: var(--color-amber);
          border-radius: 50%;
          color: var(--color-bg);
        }
        .lsn-btn-play svg { width: 30px; height: 30px; }
        .lsn-btn:disabled { opacity: 0.3; }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run __tests__/narration-transport-layout.test.tsx __tests__/audio-drawer.test.tsx __tests__/audio-drawer-styles.test.ts`
Expected: PASS on all three.

- [ ] **Step 6: Commit**

```bash
git add src/components/audio/AudioDrawer.tsx __tests__/narration-transport-layout.test.tsx CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "fix(audio): transport in conventional order, sized for eyes-free use — SA-<id> (F-<id>)"
```

---

### Task 3: Adopt the type ladder

The player is typeset for a desk: `.lsn-context` `0.50rem` = **8px**, `.lsn-eyebrow` `0.53rem` = 8.5px, `.lsn-dur` `0.58rem` = 9.3px, `.lsn-times` `0.62rem` = 9.9px.

> **WAS WRONG.** The first draft of this task proposed a hard-coded **11px floor** and a test asserting `font-size >= 0.6875rem`. That is itself a defect under SA-092 — *"any font-size that is not one of these tokens"* — and it ignores that `typography-craft.css` already ships a ladder with a **17px** reading floor. Map onto the rungs; do not invent a floor.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Listening surfaces set type from the ladder, never from a literal rem.
 *
 * SA-092: "Any font-size in this stylesheet that is not one of these tokens is
 * a defect." The player shipped with four labels between 8 and 9.9px, which is
 * also the founder's "hard to navigate on mobile" report. Unit tests cannot see
 * this — an 8px label is perfectly findable by role — so it is checked against
 * the source, like the unstyled-class guard beside it.
 */
describe('the listening surfaces use the type ladder', () => {
  const files = [
    'src/components/audio/AudioDrawer.tsx',
    'src/components/audio/SectionRule.tsx',
    'src/components/audio/DriveMode.tsx',
  ].filter((f) => fs.existsSync(path.join(process.cwd(), f)))

  it.each(files)('%s sets no font-size from a literal rem', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    const literals = [...source.matchAll(/font-size:\s*([0-9.]+)rem/g)].map((m) => m[1])
    expect(literals).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-type-ladder.test.ts`
Expected: FAIL — a list of ~14 literals.

- [ ] **Step 3: Map every size onto a rung**

Apply exactly these. Change nothing not listed.

| Class | Was | Becomes |
| --- | --- | --- |
| `.lsn-context` | `0.5rem` | `var(--ts-xs)` |
| `.lsn-eyebrow` | `0.53rem` | `var(--ts-xs)` |
| `.lsn-handle-count` | `0.58rem` | `var(--ts-xs)` |
| `.lsn-uplabel` | `0.55rem` | `var(--ts-xs)` |
| `.lsn-chip` | `0.6rem` | `var(--ts-xs)` |
| `.lsn-close` | `0.58rem` | `var(--ts-xs)` |
| `.lsn-save`, `.lsn-clear` | `0.58rem` | `var(--ts-xs)` |
| `.lsn-offer-play` | `0.6rem` | `var(--ts-xs)` |
| `.lsn-dur` | `0.58rem` | `var(--ts-sm)` |
| `.lsn-times` | `0.62rem` | `var(--ts-sm)` |
| `.lsn-remaining` | `0.6rem` | `var(--ts-sm)` |
| `.lsn-name` | `0.95rem` | `var(--ts-base)` |
| `.lsn-handle-title` | `0.86rem` | `var(--ts-base)` |
| `.lsn-now` | `1.15rem` | `var(--ts-md)` |

Also: `.lsn-chip` `min-height` 34px → 48px, `.lsn-icon` `min-width` 38px → 44px. Every label keeps `font-family: var(--font-family-ui)`; every title keeps `var(--font-family-serif)`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run __tests__/audio-type-ladder.test.ts __tests__/audio-drawer.test.tsx __tests__/audio-drawer-styles.test.ts`
Expected: PASS.

- [ ] **Step 5: Look at it, at both text scales**

`npm run dev`, drawer open at 375px. Then set `html[data-text-scale="xlarge"]` in DevTools. The ladder grows with it, but **fixed row heights do not** — confirm the 54px rows and the 56px track strip still hold their content, and raise them if not.

- [ ] **Step 6: Commit**

```bash
git add src/components/audio/AudioDrawer.tsx __tests__/audio-type-ladder.test.ts CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "fix(audio): listening surfaces set type from the ladder — SA-<id> (F-<id>)"
```

---

### Task 4: Tell an editorial chapter from a structural one

**The premise of the whole redesign.**

> **WAS WRONG.** The first draft asserted that "Euangelion can do this better than a podcast app, because the sections carry *editorial* names — not 'Chapter 4'". Measured over all 6,132 marks in `audio-manifest.json`, that is true for **44%** of them. The other **3,444 (56%)** carry one of six module names:
>
> | Label | Count |
> | --- | --- |
> | Scripture | 687 |
> | Reflect | 592 |
> | Word study | 590 |
> | Opening | 568 |
> | Prayer | 520 |
> | Takeaway | 487 |
>
> And **13% of readings repeat a label** — `bible-365-day-1` says "Scripture" seven times. So "Now · Scripture" answers nothing, and a rail built only on names is broken for more than half the catalog.

Two tiers fix it: editorial chapters own the headline and take a tall tick; structural ones take a short tick and carry a timecode, which is what separates the three Scriptures.

**Interfaces produced:**

```ts
/** True when a chapter label is module furniture rather than an editorial title. */
export function isStructuralChapter(label: string): boolean

/** Where "back a section" should land: restart this one unless it just began. */
export function sectionBack(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
  duration: number,
  graceSeconds?: number,
): number | null
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isStructuralChapter, sectionBack } from '@/lib/audio/tracks'
import manifest from '@/data/audio-manifest.json'

describe('chapter tiers', () => {
  it('names the six module labels as structural', () => {
    for (const l of ['Opening', 'Scripture', 'Word study', 'Reflect', 'Prayer', 'Takeaway']) {
      expect(isStructuralChapter(l)).toBe(true)
    }
  })

  it('treats an editorial title as editorial', () => {
    expect(isStructuralChapter('The Tabernacle Principle')).toBe(false)
    expect(isStructuralChapter('Unplowed Ground')).toBe(false)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(isStructuralChapter('  scripture ')).toBe(true)
  })

  // The tiering must leave every reading something to navigate BY.
  it('leaves every reading at least two editorial chapters', () => {
    const thin: string[] = []
    const entries = Object.entries(
      manifest as Record<string, { chapters?: { label: string }[] }>,
    )
    for (const [slug, track] of entries) {
      const editorial = (track.chapters ?? []).filter((c) => !isStructuralChapter(c.label))
      if (editorial.length < 2) thin.push(slug)
    }
    expect(thin).toEqual([])
  })
})

describe('sectionBack', () => {
  const ch = [
    { t: 0, label: 'A', module: 0 },
    { t: 60, label: 'B', module: 1 },
    { t: 200, label: 'C', module: 2 },
  ]
  it('restarts the current section when it is under way', () => {
    expect(sectionBack(ch, 150, 300)).toBe(60)
  })
  it('goes to the previous section when this one just began', () => {
    expect(sectionBack(ch, 62, 300)).toBe(0)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-chapter-tiers.test.ts`
Expected: FAIL — `isStructuralChapter` is not exported.

**If the last assertion fails**, the tier list is too greedy for some readings. Do not widen the test to pass — narrow the list, and record in the commit which slugs forced it. A reading with fewer than two editorial chapters has nothing for the rule's tall ticks to mark, and the design needs to know that before it ships.

- [ ] **Step 3: Implement, in `tracks.ts`**

```ts
/**
 * Labels that are module furniture rather than an editorial title.
 *
 * Measured over all 6,132 chapter marks in the manifest: Scripture 687,
 * Reflect 592, Word study 590, Opening 568, Prayer 520, Takeaway 487 — 3,444
 * marks, 56% of the catalog. 13% of readings repeat a label; bible-365-day-1
 * says "Scripture" seven times.
 *
 * The player asks the reader to navigate by section NAME, so a name appearing
 * three times in one reading cannot be the thing they aim at. These stay
 * reachable — you may well want the prayer — but they never own the headline,
 * and they carry a timecode to tell them apart.
 *
 * Deliberately a fixed list, not a heuristic: these come from
 * `narration_extract.py`'s module types, so the set is known rather than
 * guessed, and a new module type should fail the tier test loudly.
 */
const STRUCTURAL_LABELS = new Set([
  'opening', 'title', 'scripture', 'word study',
  'reflect', 'reflection', 'prayer', 'takeaway',
])

export function isStructuralChapter(label: string): boolean {
  return STRUCTURAL_LABELS.has(label.trim().toLowerCase())
}

/**
 * Where "back a section" should land: restart this one unless it just began,
 * which is what every audiobook player does and what a listener means by
 * "back". Shared by SectionRule and DriveMode so the grace period cannot
 * drift between them.
 */
export function sectionBack(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
  duration: number,
  graceSeconds = 4,
): number | null {
  const bounds = chapterBounds(chapters, seconds, duration)
  if (!bounds || !chapters) return null
  if (seconds - bounds.start > graceSeconds) return bounds.start
  return chapters[bounds.index - 1]?.t ?? bounds.start
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run __tests__/audio-chapter-tiers.test.ts __tests__/narration-chapter-stepping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/tracks.ts __tests__/audio-chapter-tiers.test.ts CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "feat(audio): tier chapter labels, editorial vs structural — SA-<id> (F-<id>)"
```

---

### Task 5: The section rule

`AudioDrawer.tsx:540-561` gives a reading one `<input type="range">`. Across a 350px control a 21-minute reading is **3.6 seconds per pixel** with chapter marks ~15px apart — the one gesture the control exists for cannot be aimed, least of all in a car.

> **WAS WRONG, twice.** The first draft proposed a three-row prev/now/next **rail** with no scrubber at all, which removed the ability to move to an arbitrary section. The second proposed a **segmented bar**, which needed a 9px minimum width per segment (the real chapters run 6.6s to 149s, so proportional segments make the short ones 1.7px) and therefore distorted the track away from real time. Founder: *"the line is too thick — needs a thinner rule."*

The answer is a **2px rule with chapter ticks and a 26px thumb**. Thin because the site's progress furniture is 2–3px and `--mock-stroke` is 1.5px; a bar was shouting where a rule should whisper. Ticks need no width, so the track stays **true linear time** and the 9px floor disappears.

**Interfaces produced:**

```ts
export interface SectionRuleProps {
  chapters: NarrationChapter[]
  currentTime: number
  duration: number
  /** Armed sleep-stop, in seconds, drawn as a full-height marker. */
  stopAt?: number | null
  onSeek: (seconds: number) => void
}
export default function SectionRule(props: SectionRuleProps): JSX.Element | null
```

Returns `null` when `chapters.length < 2`. Fact 2 says that never happens in the catalog, but the prop is public and a caller can pass anything.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SectionRule from '@/components/audio/SectionRule'

const chapters = [
  { t: 0, label: 'Opening', module: 0 },
  { t: 60, label: 'Unplowed Ground', module: 3 },
  { t: 200, label: 'Scripture', module: 7 },
]

describe('the section rule', () => {
  it('is a slider a screen reader can read', () => {
    render(<SectionRule chapters={chapters} currentTime={90} duration={300} onSeek={vi.fn()} />)
    const s = screen.getByRole('slider')
    expect(s).toHaveAttribute('aria-valuenow', '1')
    expect(s.getAttribute('aria-valuetext')).toMatch(/Unplowed Ground/)
  })

  // A drag-only control is a REGRESSION from the <input type="range"> it
  // replaces, which was at least operable by keyboard.
  it('steps sections with the arrow keys', async () => {
    const onSeek = vi.fn()
    render(<SectionRule chapters={chapters} currentTime={90} duration={300} onSeek={onSeek} />)
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onSeek).toHaveBeenCalledWith(200)
    await userEvent.keyboard('{Home}')
    expect(onSeek).toHaveBeenCalledWith(0)
  })

  it('gives a structural chapter its timecode, so repeats differ', () => {
    render(<SectionRule chapters={chapters} currentTime={210} duration={300} onSeek={vi.fn()} />)
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toMatch(/3:20/)
  })

  it('renders nothing for a single-chapter reading', () => {
    const { container } = render(
      <SectionRule chapters={[chapters[0]]} currentTime={5} duration={300} onSeek={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-section-rule.test.tsx`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Build it from the canvas**

Implement the `Main.dc.html` artboard's track. Non-negotiables, each of which the canvas shows:

- the rule is **2px**; filled portion `var(--color-amber)`, unfilled `var(--color-border-strong)`;
- ticks are **1.5px** wide — **13px** tall for editorial, **7px** for structural (via `isStructuralChapter`), **15px** and accented for the current one;
- the thumb is **26px**, and the track is **inset by the thumb's radius at both ends** so a handle at 0:00 is not half off-screen;
- the touch strip is **56px** tall with `touch-action: none`;
- drag **snaps to the nearest chapter start**; `pointerdown` calls `setPointerCapture`;
- `role="slider"`, `tabindex="0"`, `aria-valuemin/max/now` in **section indices**, and `aria-valuetext` reading `"Section N of M, <label>, M:SS into the reading"`;
- Arrow keys step one section, `Home`/`End` jump to the ends, each calling `onSeek`;
- `stopAt` draws a full-height **22px** marker in `var(--color-text-primary)`.

Every size comes from the ladder — Task 3's test catches a literal rem. Style in this component's own styled-jsx block with an `lsn-rule-` prefix.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run __tests__/audio-section-rule.test.tsx`
Expected: PASS, all four.

- [ ] **Step 5: Mount it in the drawer**

In the `{item && (<div className="lsn-seek">` block, replace the `<label className="lsn-seek-label">` range with:

```tsx
                <SectionRule
                  chapters={getNarrationTrack(item.slug)?.chapters ?? []}
                  currentTime={elapsed}
                  duration={total || item.duration}
                  stopAt={sleepStopAt}
                  onSeek={(seconds) => {
                    const a = audio()
                    if (a) a.currentTime = seconds
                    setElapsed(seconds)
                  }}
                />
```

Keep the time readout and the chips. Delete the `Chapters` chip (`:588-594`) — the rule carries it — and keep `NarrationChapters` reachable from the "All N sections" cell.

- [ ] **Step 6: Run the whole audio suite**

Run: `npx vitest run __tests__/audio-*.test.* __tests__/narration-*.test.*`
Expected: PASS.

- [ ] **Step 7: Verify a real seek**

`npm run preview`, play a devotional, drag to a section, and confirm in DevTools Network that the request carries a `Range` header and returns **206**, not 200 with the whole body. This is what makes section navigation affordable on cellular.

- [ ] **Step 8: Commit**

```bash
git add src/components/audio/SectionRule.tsx src/components/audio/AudioDrawer.tsx __tests__/audio-section-rule.test.tsx CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "feat(audio): a section rule replaces the whole-track scrubber — SA-<id> (F-<id>)"
```

---

### Task 6: The docked bar

Two defects, both on the record. Research §5.1 calls the missing dismiss "the one clear defect the pattern sweep found in our current build" — it is still missing. And `AudioDrawer.tsx:304` hides the handle on the reading it is playing (`!(pathname === item.href)`), so the persistent control vanishes exactly where a reader is most likely to be.

- [ ] **Step 1: Write the failing test**

```tsx
it('can be dismissed without clearing the queue', async () => {
  render(<AudioDrawer />)
  await userEvent.click(screen.getByRole('button', { name: /stop showing the player/i }))
  expect(screen.queryByRole('button', { name: /open the queue/i })).not.toBeInTheDocument()
  expect(useAudioStore.getState().queue).toHaveLength(1)
})

it('names the section in the bar, not only the reading', () => {
  render(<AudioDrawer />)
  expect(screen.getByRole('button', { name: /open the queue/i }))
    .toHaveAccessibleName(/Unplowed Ground/)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-drawer.test.tsx`
Expected: FAIL — no dismiss control exists.

- [ ] **Step 3: Add dismissal to the store**

In `audioStore.ts`, add `barDismissed: boolean` and `setBarDismissed`, defaulting `false`. **Do not add it to `partialize`** — a bar dismissed yesterday should come back with a new session, exactly as `playing` and `panelOpen` are left out for the reasons the file documents. Reset it to `false` inside `start()`.

- [ ] **Step 4: Rework the handle**

At `:304`, drop `!(pathname === item.href)` and add `&& !barDismissed`. Give the handle a second line and a dismiss:

```tsx
              <span className="lsn-handle-title">{sectionLabel ?? item.title}</span>
              <span className="lsn-handle-sub">
                {item.title}
                {remaining !== null ? ` · ${formatTime(remaining)} left` : ''}
              </span>
```

where `sectionLabel` is `chapterAt(getNarrationTrack(item.slug)?.chapters, elapsed)?.label`. Add a third sibling button (`aria-label="Stop showing the player"`, 48px min) calling `setBarDismissed(true)`. Add rules for `.lsn-handle-sub` (`var(--ts-xs)`) and `.lsn-handle-close`, or `audio-drawer-styles.test.ts` fails. Thin the bar's own progress line to **2px** to match the rule.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run __tests__/audio-drawer.test.tsx __tests__/audio-drawer-styles.test.ts __tests__/audio-queue.test.ts __tests__/audio-type-ladder.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stores/audioStore.ts src/components/audio/AudioDrawer.tsx __tests__/audio-drawer.test.tsx CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "feat(audio): dismissible docked bar that names the section — SA-<id> (F-<id>)"
```

---

### Task 7: Drive mode

Audible ships Car Mode; this is the same answer. The section rule at the top, a 68px-row section list beneath it, and a transport where nothing is under 76px with play at 132px full-bleed. Sliding beats scrolling while the car is moving; the list is for when it is stopped.

- [ ] **Step 1: Write the failing test**

```tsx
describe('drive mode', () => {
  it('gives every control a target of at least 76px', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/audio/DriveMode.tsx'), 'utf8',
    )
    const heights = [...source.matchAll(/height:\s*(\d+)px/g)].map((m) => Number(m[1]))
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(76)
  })

  it('switches to any section, not just the next one', () => {
    render(<DriveMode onExit={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: /section/i }).length).toBeGreaterThan(5)
  })

  it('exits on Escape as well as the button', async () => {
    const onExit = vi.fn()
    render(<DriveMode onExit={onExit} />)
    await userEvent.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run __tests__/audio-drive-mode.test.tsx`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Build it from the canvas**

Implement the `Drive.dc.html` artboard. Two behaviours that are not visual and must not be skipped:

```tsx
  // A driver cannot fight an accidental modal. Escape and the hardware back
  // button both leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit])

  // Keep the screen awake — a locked screen mid-drive means fumbling to
  // unlock at exactly the wrong moment. Released on exit, and absent on iOS
  // Safari before 16.4, where the promise rejects and nothing else breaks.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> }
    }
    nav.wakeLock?.request('screen').then((s) => { sentinel = s }).catch(() => {})
    return () => void sentinel?.release().catch(() => {})
  }, [])
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run __tests__/audio-drive-mode.test.tsx __tests__/audio-section-rule.test.tsx __tests__/audio-type-ladder.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify it in a car, or say UNVERIFIED**

This is the one task whose whole purpose is a context no test reproduces. Put it on a phone in a mount and use it **stationary with the engine running** before using it moving. If that is not done, report it as **UNVERIFIED** in those words.

- [ ] **Step 6: Commit**

```bash
git add src/components/audio/DriveMode.tsx src/components/audio/AudioDrawer.tsx __tests__/audio-drive-mode.test.tsx CHANGELOG.md docs/feature-prds/F-<id>.md
git commit -m "feat(audio): drive mode — section switching at car-sized targets — SA-<id> (F-<id>)"
```

---

### Task 8: Desktop parity check (no new code expected)

At ≥768px the drawer is a **right sidebar** at `min(26rem, 92vw)` with a 3px left edge (`AudioDrawer.tsx:961-976`) — not a bottom sheet. Volume, share, download, cover art, the full queue with reorder/remove, save-as-playlist and the OccasionPicker **all ship there today**. Tasks 2–6 touch shared markup, so this task exists to prove none of it regressed.

- [ ] **Step 1: Exercise the sidebar**

`npm run dev` at ≥1024px, open the drawer, confirm: it docks right; the cover renders; volume appears (it is `display: none` under `@media (pointer: coarse)` because iOS Safari ignores `audio.volume`, so a slider on touch would move and change nothing); share opens the system sheet or copies to clipboard; the queue reorders and removes; save-as-playlist and clear both work; the OccasionPicker renders.

- [ ] **Step 2: Screenshot both breakpoints**

375px and 1280px, drawer open. Compare against the `Desktop.dc.html` artboard.

- [ ] **Step 3: Commit only if something needed fixing**

---

## Before calling any of this done

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
```

Then `npm run preview` and exercise every affected route in the Workers runtime. A passing build is not a test, and four of these eight tasks change behaviour that only appears on a device.

## Open decisions — the founder's, not the implementer's

1. **The lock-screen metadata mapping** (Task 1 Step 5). Does `title` carry the **section** ("The Tabernacle Principle") or the **reading** ("The True Vine")? Section-as-title puts what a driver needs in the biggest text and updates roughly once a minute, which is what Audible does with chapters; reading-as-title is steadier. The canvas draws both.
2. **Whether the narration is disclosed as synthesised.** Open since research §6 and unchanged by this plan. Real products name the voice, and a devotional audience is sharper than average about authenticity.

## Deliberately not in this plan

- **A "no chapters" degrade path.** All 571 entries carry chapters; none has zero or one. `SectionRule` still returns `null` below two because the prop is public — but no UI is built for a state the data does not produce.
- **Word-level read-along.** Needs per-word timings the render pipeline does not emit; manifests carry chapter marks only. Section-level highlighting already ships (F-086/SA-035) and the `data-narrating` gutter rule is untouched here.
- **A browsable CarPlay list.** Media Session gives a web app metadata, artwork, a seek bar and five buttons in the car. A browse list needs a native shell. This is precisely why Drive mode exists on the phone.
- **Trim silence.** Recorded as a permanent no so a future session does not add it as an obvious win.
