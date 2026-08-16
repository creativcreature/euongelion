# Reader Transport & Journaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Audio Edition transport on the Audible model, open the 2,062 journal prompts already shipping in the catalog to reader input, and move the product to a two-state auth model where signed-out is a reader and signed-in is a practice.

**Architecture:** Three phases over existing infrastructure. The transport keeps `NarrationPlayer`'s media-element core and replaces its control surface, extracting icons and sheets into `src/components/audio/`. Journaling adds no schema — every writing surface rides the existing `annotations` table via `style.kind`, which inherits GDPR export/delete/retention for free. One new table, `listening_progress`, exists solely for cross-device resume. The auth sweep comes last because it touches everything the first two phases build.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4 + styled-jsx (component-local), Vitest + React Testing Library, Supabase (PostgreSQL), Cloudflare Workers via OpenNext.

**Spec:** `docs/superpowers/specs/2026-08-16-reader-transport-and-journaling-design.md`

## Global Constraints

- **Port 3333** for dev. Ports 3000–3005 are occupied.
- **No silent fallbacks.** Every write reports its outcome on the control that triggered it. A failed save must never leave the reader believing their words were kept.
- **No placeholder values.** No TODO stubs, no "missing" strings in production code.
- **Touch targets ≥ 44px.** WCAG 2.1 AA minimum throughout.
- **Test at 375 / 768 / 1024px.** Mobile first.
- **Dark-first**, `html.dark`, HSL colour system.
- **Never use `bg-gold` / `--color-gold` for a paired background+foreground.** `--color-gold` resolves to COBALT `#1f2a8d` in light mode — the alias is historical. This trap has shipped bugs twice (SA-044, SA-047). Set both halves explicitly per theme.
- **Component-local styles go in styled-jsx**, matching `NarrationPlayer`/`NarrationChapters`. Do NOT add to `src/app/globals.css` (11k lines) — and note that unlayered design-system CSS beats `globals.css` `@layer utilities`.
- **New styles must not regress the `data-narration-bar` / `data-narration-panel` handshake** in `globals.css:11075-11123`, which lifts the reader-theme button and chat launcher clear of the transport.
- **Workers runtime is the only real test.** `npm run build` succeeding is NOT a test. Any server code reading `public/` off disk is broken on Workers; `fs` reads return `[]` rather than throwing. Verify in `npm run preview` (workerd), never in `npm run dev`.
- **Pre-commit gate** (husky) runs `type-check` + all `verify:*`, requires `CHANGELOG.md` staged when any `.ts/.tsx` changes, and requires a `docs/feature-prds/F-xxx.md` staged. The commit message must cite an `SA-###` id AND an `F-###` whose `.md` is staged.
- **`docs/production-decisions.yaml` is canonical for SA ids**, not CHANGELOG. F-numbers race under parallel sessions — re-check before claiming one.
- **Stage commits by explicit file list.** Never `git add -A`: other sessions may have in-flight files.

---

## File Structure

**New**
| Path | Responsibility |
|---|---|
| `src/components/audio/TransportIcons.tsx` | The glyph set — play, pause, skip-15, chapter step, sleep, clip, speed. Pure SVG, no state. |
| `src/components/audio/SpeedSheet.tsx` | Speed + skip-interval chooser. Reuses the `NarrationChapters` sheet idiom. |
| `src/components/audio/SleepTimer.tsx` | Sleep-timer chooser and countdown, including end-of-chapter. |
| `src/lib/audio/listening-progress.ts` | Client sync for resume: local cache, server read/write, conflict resolution. |
| `src/app/api/listening-progress/route.ts` | GET/PUT listening position for the signed-in reader. |
| `src/components/reader/ReaderContext.tsx` | Provides `devotionalSlug` + auth state to any module, without threading props through 30 components. |
| `src/components/reader/JournalField.tsx` | The one input control every writing surface uses. Autosave, locked-when-signed-out, honest failure. |
| `database/migrations/018_create_listening_progress.sql` | Cross-device resume table. |

**Modified**
| Path | Change |
|---|---|
| `src/lib/soul-audit/repository.ts:1209` | `updateAnnotation` becomes a true partial update (Task 1). |
| `src/app/api/annotations/route.ts:277` | PATCH passes only present keys. |
| `src/lib/privacy/data-export.ts:61` | Add 4 missing tables + `listening_progress`. |
| `src/lib/privacy/account-deletion.ts:70` | Add `listening_progress`. |
| `src/components/NarrationPlayer.tsx` | New control surface; resume via `listening-progress`. |
| `src/components/NarrationMiniBar.tsx` | Inherit the glyph set. |
| `src/lib/audio/tracks.ts` | Add `chapterBounds()`. |
| `src/components/modules/ReflectionModule.tsx` | Answer field per question. |
| `src/components/modules/RecapModule.tsx` | Answer field on `integration_question`. |
| `src/components/modules/PrayerModule.tsx` | "Add your own prayer". |
| `src/components/TextHighlightTrigger.tsx` | `Highlight · Note · Ask`; remove localStorage persistence (Task 13). |

---

## Phase 1 — Foundations

### Task 1: PATCH becomes a true partial update

The prerequisite bug. `updateAnnotation` overwrites `anchor_text` and `body` with whatever the PATCH carried; `persistEdit` sends only `annotationId` + `style`; `sanitizeOptionalText(undefined, n)` returns `null`. Recolouring a highlight or saving a note on it therefore nulls its anchor text, the mark never repaints on reload, and the Library row renders blank. Silent data loss.

**Files:**

- Modify: `src/lib/soul-audit/repository.ts:1209-1252`
- Modify: `src/app/api/annotations/route.ts:277-347`
- Test: `__tests__/annotation-patch-partial-update.test.ts` (create)

**Interfaces:**

- Produces: `updateAnnotation({ sessionToken, annotationId, anchorText?, body?, style? })` — a key absent from the params object leaves that column alone; an explicit `null` clears it.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/annotation-patch-partial-update.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import {
  addAnnotation,
  updateAnnotation,
  listAnnotations,
} from '@/lib/soul-audit/repository'

const SESSION = 'user-partial-update'

describe('updateAnnotation is a partial update', () => {
  beforeEach(async () => {
    await addAnnotation({
      sessionToken: SESSION,
      devotionalSlug: 'looking-at-the-sun-day-1',
      annotationType: 'highlight',
      anchorText: 'the promise was not made to the strong',
      body: 'the promise was not made to the strong',
      style: {
        source: 'text-selection',
        kind: 'favorite_verse',
        color: 'yellow',
      },
    })
  })

  it('preserves anchor_text and body when only style is sent', async () => {
    const [row] = listAnnotations(SESSION)
    await updateAnnotation({
      sessionToken: SESSION,
      annotationId: row.id,
      style: {
        source: 'text-selection',
        kind: 'favorite_verse',
        color: 'blue',
      },
    })
    const [after] = listAnnotations(SESSION)
    expect(after.anchor_text).toBe('the promise was not made to the strong')
    expect(after.body).toBe('the promise was not made to the strong')
    expect(after.style?.color).toBe('blue')
  })

  it('clears a column only when null is sent explicitly', async () => {
    const [row] = listAnnotations(SESSION)
    await updateAnnotation({
      sessionToken: SESSION,
      annotationId: row.id,
      body: null,
    })
    const [after] = listAnnotations(SESSION)
    expect(after.body).toBeNull()
    expect(after.anchor_text).toBe('the promise was not made to the strong')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/annotation-patch-partial-update.test.ts`
Expected: FAIL — first test reports `anchor_text` is `null`.

- [ ] **Step 3: Make `updateAnnotation` partial**

Replace the body of `updateAnnotation` in `src/lib/soul-audit/repository.ts`:

```ts
export async function updateAnnotation(params: {
  sessionToken: string
  annotationId: string
  anchorText?: string | null
  body?: string | null
  style?: Record<string, unknown> | null
}): Promise<AnnotationRecord | null> {
  const store = getStore()
  const cached = store.annotationsBySession.get(params.sessionToken) ?? []
  const existing =
    cached.find((row) => row.id === params.annotationId) ??
    (await safeSelectOne<AnnotationRecord>('annotations', {
      id: params.annotationId,
      session_token: params.sessionToken,
    }))

  if (!existing) return null

  // Only keys PRESENT on params reach the patch. A caller that sends just
  // `style` must not blank the anchor text — that was silent data loss:
  // hydration matches on anchor_text, so a nulled row stopped repainting
  // its mark and the reader's highlight vanished.
  const patch: Partial<AnnotationRecord> = {}
  if ('anchorText' in params) patch.anchor_text = params.anchorText ?? null
  if ('body' in params) patch.body = params.body ?? null
  if ('style' in params) patch.style = params.style ?? null

  if (Object.keys(patch).length === 0) return existing

  const nextRow: AnnotationRecord = { ...existing, ...patch }
  store.annotationsBySession.set(
    params.sessionToken,
    cached.map((row) => (row.id === params.annotationId ? nextRow : row)),
  )

  const persisted = await safeUpdate<AnnotationRecord>(
    'annotations',
    { id: params.annotationId, session_token: params.sessionToken },
    patch,
  )

  return persisted ?? nextRow
}
```

- [ ] **Step 4: Stop the API route from manufacturing nulls**

In `src/app/api/annotations/route.ts`, replace the `updateAnnotation` call in `PATCH` so absent fields stay absent:

```ts
const patch: Parameters<typeof updateAnnotation>[0] = {
  sessionToken: user.id,
  annotationId,
}
// `sanitizeOptionalText(undefined, n)` returns null, so passing these
// unconditionally is what blanked the columns. Presence in the request
// body is what decides whether a column is touched at all.
if ('anchorText' in payload) {
  patch.anchorText = sanitizeOptionalText(payload.anchorText, 500)
}
if ('body' in payload) {
  patch.body = sanitizeOptionalText(payload.body, 4_000)
}
if ('style' in payload) {
  patch.style = payload.style ?? null
}

const row = await updateAnnotation(patch)
```

- [ ] **Step 5: Run the new test and the existing highlight suite**

Run: `npx vitest run __tests__/annotation-patch-partial-update.test.ts __tests__/highlight-editing.test.tsx __tests__/saves-highlights-archive.test.ts`
Expected: PASS, all three files.

- [ ] **Step 6: Verify against production data**

This is the bug that eats real highlights, so confirm the fix end-to-end rather than trusting the unit test.

```bash
npm run preview
# In the preview browser, signed in: highlight a passage, recolour it,
# reload, confirm the mark is still painted and still coloured.
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/soul-audit/repository.ts src/app/api/annotations/route.ts \
  __tests__/annotation-patch-partial-update.test.ts CHANGELOG.md docs/feature-prds/F-102.md
git commit -m "fix(annotations): a style-only PATCH stopped eating the anchor text — SA-061 (F-102)"
```

---

### Task 2: Migration 018 + close the privacy export gap

**Files:**

- Create: `database/migrations/018_create_listening_progress.sql`
- Modify: `src/lib/privacy/data-export.ts:61-65`
- Modify: `src/lib/privacy/account-deletion.ts:70-78`
- Test: `__tests__/privacy-table-coverage.test.ts` (create)

**Interfaces:**

- Produces: table `listening_progress`, unique on `(user_id, devotional_slug)`.

- [ ] **Step 1: Write the failing test**

Pins the invariant that caused the gap: anything deletable must be exportable, or the right of access is incomplete while the right to erasure is not.

```ts
// __tests__/privacy-table-coverage.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(p, 'utf8')
const tablesIn = (src: string, listName: string): string[] => {
  const block =
    src.split(`const ${listName} = [`)[1]?.split('] as const')[0] ?? ''
  return [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
}

describe('privacy table coverage', () => {
  it('exports every table it deletes', () => {
    const del = read('src/lib/privacy/account-deletion.ts')
    const exp = read('src/lib/privacy/data-export.ts')
    const deletable = [
      ...tablesIn(del, 'SESSION_TOKEN_TABLES'),
      ...tablesIn(del, 'USER_ID_TABLES'),
    ]
    const exportable = new Set([
      ...tablesIn(exp, 'SESSION_TOKEN_TABLES'),
      ...tablesIn(exp, 'USER_ID_TABLES'),
    ])
    const missing = deletable.filter((t) => !exportable.has(t))
    expect(missing).toEqual([])
  })

  it('covers listening_progress in both', () => {
    expect(read('src/lib/privacy/account-deletion.ts')).toContain(
      "'listening_progress'",
    )
    expect(read('src/lib/privacy/data-export.ts')).toContain(
      "'listening_progress'",
    )
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/privacy-table-coverage.test.ts`
Expected: FAIL — `missing` contains `soul_audit_sessions`, `active_series`, `scheduled_series_swap`, `archived_series`.

- [ ] **Step 3: Write the migration**

```sql
-- database/migrations/018_create_listening_progress.sql
-- Cross-device audio resume. Founder-approved 2026-08-16, satisfying the
-- named-approval requirement SA-039 §2 places on prod DDL.
--
-- One upserted row per reader per devotional — deliberately NOT an
-- append-only event log, which would be a write firehose for no benefit.
-- `seconds_listened` accumulates real playback time so a later year-in-review
-- can total hours without an events table.

CREATE TABLE IF NOT EXISTS listening_progress (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotional_slug   TEXT NOT NULL,
  position_seconds  REAL NOT NULL DEFAULT 0,
  duration_seconds  REAL,
  seconds_listened  REAL NOT NULL DEFAULT 0,
  completed_at      TIMESTAMPTZ,
  first_played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, devotional_slug)
);

CREATE INDEX IF NOT EXISTS idx_listening_progress_user
  ON listening_progress (user_id, last_played_at DESC);

ALTER TABLE listening_progress ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; all access is server-side, matching migration 009.
```

- [ ] **Step 4: Add the tables to both privacy lists**

In `src/lib/privacy/account-deletion.ts`, append to `USER_ID_TABLES`:

```ts
  'archived_series',
  // Cross-device audio resume (migration 018).
  'listening_progress',
] as const
```

In `src/lib/privacy/data-export.ts`, replace `USER_ID_TABLES` entirely:

```ts
const USER_ID_TABLES = [
  'bookmarks',
  'user_progress',
  'soul_audit_responses',
  // These four were deletable but not exportable — an incomplete right of
  // access (GDPR Art. 15) sitting alongside a complete right to erasure.
  'soul_audit_sessions',
  'active_series',
  'scheduled_series_swap',
  'archived_series',
  'listening_progress',
] as const
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run __tests__/privacy-table-coverage.test.ts`
Expected: PASS, both tests.

- [ ] **Step 6: Hand the migration to the founder**

The migration is applied by the founder in the Supabase dashboard, like every other migration in this repo. It is additive and idempotent, so applying it early cannot break the running site. **Report explicitly that 018 is pending and must not silently join the three unapplied billing migrations.** Task 8 fails closed until it is applied — resume stays on-device, which is current behaviour, rather than erroring.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/018_create_listening_progress.sql \
  src/lib/privacy/data-export.ts src/lib/privacy/account-deletion.ts \
  __tests__/privacy-table-coverage.test.ts CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(privacy): listening_progress, and everything deletable is now exportable — SA-058 (F-101)"
```

---

## Phase 2 — The transport

### Task 3: The glyph set

**Files:**

- Create: `src/components/audio/TransportIcons.tsx`
- Test: `__tests__/transport-icons.test.tsx` (create)

**Interfaces:**

- Produces: `PlayIcon`, `PauseIcon`, `SkipBackIcon`, `SkipForwardIcon`, `ChapterPrevIcon`, `ChapterNextIcon`, `SleepIcon`, `ClipIcon`, `ChaptersIcon` — each `(props: { size?: number }) => JSX.Element`, rendering `<svg aria-hidden="true" focusable="false">` with `fill="currentColor"` or `stroke="currentColor"`. `SkipBackIcon`/`SkipForwardIcon` accept `seconds: number` and render it inside the arc.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/transport-icons.test.tsx
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { PlayIcon, SkipBackIcon } from '@/components/audio/TransportIcons'

describe('transport icons', () => {
  it('renders decorative svg that inherits colour', () => {
    const { container } = render(<PlayIcon />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    // Colour must come from the button, so the same glyph works in the
    // panel, the mini bar, light mode and dark without a second variant.
    expect(container.innerHTML).toContain('currentColor')
  })

  it('prints the skip interval inside the arc', () => {
    const { container } = render(<SkipBackIcon seconds={15} />)
    expect(container.textContent).toContain('15')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/transport-icons.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the icons**

Create `src/components/audio/TransportIcons.tsx`. Every icon is a pure function of `size`, uses `currentColor`, and is `aria-hidden` — the accessible name lives on the button, never on the glyph. `SkipBackIcon` and `SkipForwardIcon` draw a circular arrow with the interval as a `<text>` element centred inside it, matching the Audible idiom.

```tsx
export function PlayIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  )
}

export function SkipBackIcon({
  size = 22,
  seconds = 15,
}: {
  size?: number
  seconds?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="7.5"
        fill="currentColor"
      >
        {seconds}
      </text>
    </svg>
  )
}
```

Implement `PauseIcon`, `SkipForwardIcon` (mirror of back), `ChapterPrevIcon`/`ChapterNextIcon` (bar + triangle), `ChaptersIcon` (three rules), `SleepIcon` (crescent), and `ClipIcon` (pen nib) in the same shape.

- [ ] **Step 4: Run the test**

Run: `npx vitest run __tests__/transport-icons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/audio/TransportIcons.tsx __tests__/transport-icons.test.tsx \
  CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): a transport glyph set that inherits its colour — SA-058 (F-101)"
```

---

### Task 4: Speed sheet, to 2× and beyond

Replaces the four-value cycle (`0.8 → 1 → 1.25 → 1.5`), which has no 2× at all and takes up to four taps to reach any value.

**Files:**

- Create: `src/components/audio/SpeedSheet.tsx`
- Modify: `src/components/NarrationPlayer.tsx:8` (SPEEDS), `:196-205` (cycleSpeed), `:386-395` (the button)
- Test: `__tests__/narration-speed-sheet.test.tsx` (create)

**Interfaces:**

- Consumes: the sheet idiom from `src/components/NarrationChapters.tsx` — portal to `document.body`, focus trap, Escape to close, `body.overflow` lock, restore focus on unmount. Copy that structure; do not invent a second modal pattern.
- Produces: `<SpeedSheet speed skipSeconds onSelectSpeed onSelectSkip onClose />`, where `SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]` and `SKIP_CHOICES = [15, 30]`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/narration-speed-sheet.test.tsx
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SpeedSheet from '@/components/audio/SpeedSheet'

afterEach(cleanup)

describe('speed sheet', () => {
  it('offers 2x, which the old cycle never reached', () => {
    render(
      <SpeedSheet
        speed={1}
        skipSeconds={15}
        onSelectSpeed={() => {}}
        onSelectSkip={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /^2×$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^3×$/ })).toBeTruthy()
  })

  it('reports the chosen speed once, not a cycle step', () => {
    const onSelectSpeed = vi.fn()
    render(
      <SpeedSheet
        speed={1}
        skipSeconds={15}
        onSelectSpeed={onSelectSpeed}
        onSelectSkip={() => {}}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^2×$/ }))
    expect(onSelectSpeed).toHaveBeenCalledWith(2)
  })

  it('marks the active speed for assistive tech', () => {
    render(
      <SpeedSheet
        speed={1.5}
        skipSeconds={15}
        onSelectSpeed={() => {}}
        onSelectSkip={() => {}}
        onClose={() => {}}
      />,
    )
    expect(
      screen
        .getByRole('button', { name: /^1.5×$/ })
        .getAttribute('aria-current'),
    ).toBe('true')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/narration-speed-sheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the sheet**

Create `src/components/audio/SpeedSheet.tsx` following `NarrationChapters.tsx` exactly: `createPortal` to `document.body`, `role="dialog"` + `aria-modal`, focus trap on Tab, Escape closes, `document.body.style.overflow = 'hidden'` while open, focus restored on unmount. Two labelled groups — **Speed** (eight buttons) and **Skip by** (15 / 30 seconds). Each button is ≥44px and carries `aria-current="true"` when active.

- [ ] **Step 4: Wire it into the player**

In `src/components/NarrationPlayer.tsx`: delete `cycleSpeed`, add `const [speedOpen, setSpeedOpen] = useState(false)` and `const [skipSeconds, setSkipSeconds] = useState(15)`. The speed button opens the sheet. On select:

```ts
const applySpeed = useCallback((next: number) => {
  const audio = audioRef.current
  if (!audio) return
  audio.playbackRate = next
  // Without this a 2× reading is chipmunked and unusable. Safari names it
  // preservesPitch too now, but the vendor-prefixed field is still present
  // on older WebKit and setting both is free.
  audio.preservesPitch = true
  ;(
    audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }
  ).webkitPreservesPitch = true
  setSpeed(next)
  try {
    localStorage.setItem('euangelion:narration-speed', String(next))
  } catch {
    // A device preference, not the reading. Losing it costs nothing.
  }
}, [])
```

Restore the stored speed in the existing `onLoadedMetadata` handler alongside `restorePosition`, so it applies before the first play.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run __tests__/narration-speed-sheet.test.tsx __tests__/narration-player.test.tsx`
Expected: PASS. If `narration-player.test.tsx` asserted on the old `1×` cycling button, update that assertion to open the sheet — the behaviour genuinely changed.

- [ ] **Step 6: Commit**

```bash
git add src/components/audio/SpeedSheet.tsx src/components/NarrationPlayer.tsx \
  __tests__/narration-speed-sheet.test.tsx __tests__/narration-player.test.tsx \
  CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): a speed sheet that actually reaches 2× — SA-058 (F-101)"
```

---

### Task 5: Chapter stepping, ticks, and time left in chapter

All 528 tracks carry measured chapter timings and nothing in the transport uses them.

**Files:**

- Modify: `src/lib/audio/tracks.ts` (add `chapterBounds`)
- Modify: `src/components/NarrationPlayer.tsx`
- Test: `__tests__/narration-chapter-stepping.test.ts` (create)

**Interfaces:**

- Produces: `chapterBounds(chapters, seconds, duration): { index: number; start: number; end: number } | null` — `end` is the next chapter's start, or `duration` for the last.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/narration-chapter-stepping.test.ts
import { describe, expect, it } from 'vitest'
import { chapterBounds } from '@/lib/audio/tracks'

const CHAPTERS = [
  { t: 0, label: 'Opening', module: 0 },
  { t: 3.3, label: 'Scripture', module: 1 },
  { t: 19.1, label: 'Word study', module: 2 },
]

describe('chapterBounds', () => {
  it('ends the last chapter at the track duration', () => {
    expect(chapterBounds(CHAPTERS, 25, 120)).toEqual({
      index: 2,
      start: 19.1,
      end: 120,
    })
  })

  it('ends a middle chapter at the next start', () => {
    expect(chapterBounds(CHAPTERS, 5, 120)).toEqual({
      index: 1,
      start: 3.3,
      end: 19.1,
    })
  })

  it('returns null when the track has no chapters', () => {
    expect(chapterBounds(undefined, 5, 120)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/narration-chapter-stepping.test.ts`
Expected: FAIL — `chapterBounds` is not exported.

- [ ] **Step 3: Implement `chapterBounds`**

Append to `src/lib/audio/tracks.ts`, beside `chapterAt`:

```ts
/**
 * The chapter containing `seconds`, with the boundaries the transport needs.
 *
 * `chapterAt` answers "which chapter", which is enough to mark a section but
 * not enough to step between them or to say how much of one is left.
 */
export function chapterBounds(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
  duration: number,
): { index: number; start: number; end: number } | null {
  if (!chapters?.length) return null
  let index = 0
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].t <= seconds + 0.001) index = i
    else break
  }
  return {
    index,
    start: chapters[index].t,
    end: chapters[index + 1]?.t ?? duration,
  }
}
```

- [ ] **Step 4: Add the controls to the player**

In `NarrationPlayer.tsx`:

```ts
// Audible's chapter step: back goes to the START of the current chapter
// unless you are already near it, in which case it goes to the previous
// one. Jumping straight to the previous chapter would make the control
// useless for "restart this section", which is the common case.
const CHAPTER_RESTART_WINDOW_S = 3
const stepChapter = useCallback(
  (direction: -1 | 1) => {
    const bounds = chapterBounds(track.chapters, current, duration)
    if (!bounds) return
    const chapters = track.chapters ?? []
    if (direction === -1) {
      const target =
        current - bounds.start > CHAPTER_RESTART_WINDOW_S
          ? bounds.start
          : (chapters[bounds.index - 1]?.t ?? 0)
      seekTo(target)
      return
    }
    const next = chapters[bounds.index + 1]
    if (next) seekTo(next.t)
  },
  [track.chapters, current, duration, seekTo],
)
```

Add `⏮`/`⏭` buttons using `ChapterPrevIcon`/`ChapterNextIcon`, labelled `Previous chapter` / `Next chapter`. Render the active chapter's label in the eyebrow row and a `−{formatTime(bounds.end - current)} left in chapter` readout beside the elapsed pair.

- [ ] **Step 5: Add chapter ticks to the scrubber**

Absolutely-positioned 1px marks over the existing range input, in a container with `pointer-events: none` so they never steal a drag from the slider:

```tsx
<span className="narration-ticks" aria-hidden="true">
  {(track.chapters ?? []).map((c) => (
    <i
      key={`${c.t}-${c.module}`}
      style={{ left: `${(c.t / Math.max(duration, 1)) * 100}%` }}
    />
  ))}
</span>
```

Do **not** replace the `<input type="range">` with a div — it is the keyboard and screen-reader affordance.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run __tests__/narration-chapter-stepping.test.ts __tests__/narration-player.test.tsx __tests__/narration-chapters.test.tsx`
Expected: PASS, all three.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audio/tracks.ts src/components/NarrationPlayer.tsx \
  __tests__/narration-chapter-stepping.test.ts CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): chapters you can step through, and a rail that shows them — SA-058 (F-101)"
```

---

### Task 6: Sleep timer

**Files:**

- Create: `src/components/audio/SleepTimer.tsx`
- Modify: `src/components/NarrationPlayer.tsx`
- Test: `__tests__/narration-sleep-timer.test.tsx` (create)

**Interfaces:**

- Produces: `<SleepTimer activeMinutes remainingMs onSelect onClose />` with `MINUTES = [5, 10, 15, 30]` plus `'end-of-chapter'` and `'off'`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/narration-sleep-timer.test.tsx
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SleepTimer from '@/components/audio/SleepTimer'

afterEach(cleanup)

describe('sleep timer', () => {
  it('offers end of chapter alongside the fixed durations', () => {
    render(
      <SleepTimer
        activeMinutes={null}
        remainingMs={null}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /end of chapter/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /15 minutes/i })).toBeTruthy()
  })

  it('can be turned off once set', () => {
    const onSelect = vi.fn()
    render(
      <SleepTimer
        activeMinutes={15}
        remainingMs={60_000}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^off$/i }))
    expect(onSelect).toHaveBeenCalledWith('off')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/narration-sleep-timer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the sheet and the countdown**

Same portal/focus-trap idiom as `SpeedSheet`. When a timer is running the transport's `⏱` button shows the remaining minutes rather than the glyph, so the state is visible without opening anything.

- [ ] **Step 4: Wire the fade in the player**

```ts
// Fade rather than cut: this is a devotional played at night, and a hard
// stop mid-sentence is the opposite of what the feature is for. Volume is
// restored on the way out so the next play does not start silent.
const FADE_MS = 5000
const fadeOutAndPause = useCallback(() => {
  const audio = audioRef.current
  if (!audio) return
  const reduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
  if (reduced) {
    audio.pause()
    return
  }
  const startVolume = audio.volume
  const startedAt = performance.now()
  const tick = () => {
    const elapsed = performance.now() - startedAt
    const ratio = Math.min(elapsed / FADE_MS, 1)
    audio.volume = startVolume * (1 - ratio)
    if (ratio < 1) {
      requestAnimationFrame(tick)
      return
    }
    audio.pause()
    audio.volume = startVolume
  }
  requestAnimationFrame(tick)
}, [])
```

For `'end-of-chapter'`, watch `chapterBounds(...).end` in the existing `timeupdate` path and trigger the fade as it is crossed.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run __tests__/narration-sleep-timer.test.tsx __tests__/narration-player.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/audio/SleepTimer.tsx src/components/NarrationPlayer.tsx \
  __tests__/narration-sleep-timer.test.tsx CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): a sleep timer that fades instead of cutting — SA-058 (F-101)"
```

---

### Task 7: Mini-bar parity

The panel and the bar currently disagree about what a play button looks like.

**Files:**

- Modify: `src/components/NarrationMiniBar.tsx`
- Test: `__tests__/narration-player.test.tsx` (extend)

- [ ] **Step 1: Write the failing test**

Add to `__tests__/narration-player.test.tsx`:

```tsx
it('gives the mini bar the same glyph transport as the panel', () => {
  render(
    <NarrationMiniBar
      title="The Fruit of Lies"
      playing={false}
      current={30}
      duration={600}
      onToggle={() => {}}
      onSkip={() => {}}
      onSeek={() => {}}
      onReturnToPanel={() => {}}
      skipSeconds={15}
      chapterLabel="Scripture"
    />,
  )
  // Named by aria-label, drawn as an icon — no uppercase word buttons.
  expect(screen.getByRole('button', { name: /play|pause/i })).toBeTruthy()
  expect(screen.queryByText('LISTEN')).toBeNull()
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/narration-player.test.tsx -t "mini bar"`
Expected: FAIL.

- [ ] **Step 3: Swap the bar onto the shared glyphs**

Replace the bar's text controls with `PlayIcon`/`PauseIcon`/`SkipBackIcon`/`SkipForwardIcon`, keeping every existing `aria-label` and the 44px targets. Do not change the bar's height — `globals.css:11077-11123` positions the reader-theme button and chat launcher off `--narration-bar-h`, and changing it silently re-collides them.

- [ ] **Step 4: Run the test**

Run: `npx vitest run __tests__/narration-player.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify the handshake did not regress**

```bash
npm run dev   # port 3333
# Open a devotional with narration, press play, scroll the panel off screen.
# Confirm: the mini bar appears, the theme button sits ABOVE it, and the chat
# launcher is not covered — at 375px, 768px and 1024px.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/NarrationMiniBar.tsx __tests__/narration-player.test.tsx \
  CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): the mini bar stops disagreeing with the panel — SA-058 (F-101)"
```

---

### Task 8: Cross-device resume

**Files:**

- Create: `src/lib/audio/listening-progress.ts`
- Create: `src/app/api/listening-progress/route.ts`
- Modify: `src/components/NarrationPlayer.tsx:20-38` (replace the local-only helpers), `:91-118`
- Test: `__tests__/listening-progress-sync.test.ts` (create)

**Interfaces:**

- Produces:
  - `readLocalPosition(slug): { seconds: number; at: number } | null`
  - `writeLocalPosition(slug, seconds): void` — stamps `at` with `Date.now()`
  - `resolvePosition(local, server): number | null` — newest-timestamp wins
  - `fetchServerPosition(slug): Promise<{ seconds: number; at: number } | null>` — resolves `null` when signed out or when the table is absent
  - `pushPosition({ slug, seconds, duration, listenedDelta, ended }): void` — throttled, `sendBeacon` on unload

- [ ] **Step 1: Write the failing test**

The conflict rule is the whole point of this task, so it is what gets pinned.

```ts
// __tests__/listening-progress-sync.test.ts
import { describe, expect, it } from 'vitest'
import { resolvePosition } from '@/lib/audio/listening-progress'

describe('resolvePosition', () => {
  it('takes the newer write, not the further position', () => {
    // The reader deliberately restarted on their phone AFTER listening on
    // the laptop. max(position) would drag them back to the laptop's spot,
    // silently undoing what they just chose to do.
    const laptop = { seconds: 900, at: 1_000 }
    const phone = { seconds: 12, at: 2_000 }
    expect(resolvePosition(phone, laptop)).toBe(12)
  })

  it('falls back to whichever side exists', () => {
    expect(resolvePosition({ seconds: 40, at: 1 }, null)).toBe(40)
    expect(resolvePosition(null, { seconds: 90, at: 1 })).toBe(90)
    expect(resolvePosition(null, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/listening-progress-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the client sync**

Create `src/lib/audio/listening-progress.ts`. Move the existing `readPositions`/`writePosition` helpers out of `NarrationPlayer.tsx` and add a timestamp to the stored shape. `resolvePosition` compares `at` and returns the newer side's `seconds`.

`pushPosition` throttles to **at most one write per 30s** while playing, and flushes unconditionally on pause, seek, end, and `pagehide`. A DB write every 5s would be punishing under the Workers 10ms CPU budget.

```ts
const THROTTLE_MS = 30_000
let lastPushAt = 0

export function pushPosition(params: {
  slug: string
  seconds: number
  duration: number
  listenedDelta: number
  ended?: boolean
  flush?: boolean
}): void {
  writeLocalPosition(params.slug, params.seconds)
  const now = Date.now()
  if (!params.flush && now - lastPushAt < THROTTLE_MS) return
  lastPushAt = now

  const payload = JSON.stringify({
    devotionalSlug: params.slug,
    positionSeconds: params.seconds,
    durationSeconds: params.duration,
    listenedDelta: params.listenedDelta,
    ended: params.ended ?? false,
  })

  // On unload only sendBeacon survives — a fetch is cancelled with the page,
  // which is exactly the moment the position matters most.
  if (params.flush && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(
      '/api/listening-progress',
      new Blob([payload], { type: 'application/json' }),
    )
    return
  }
  void fetch('/api/listening-progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Local cache already holds it; resume still works on this device.
  })
}
```

- [ ] **Step 4: Build the API route**

Create `src/app/api/listening-progress/route.ts` following `src/app/api/annotations/route.ts` exactly: `createRequestId`, `getClientKey`, `takeRateLimit`, `readJsonWithLimit`, `isSafeSlug`, `jsonError`, `logApiError` + `logApiFailure`, `withRequestIdHeaders`.

- `GET ?devotionalSlug=` → `{ ok: true, progress: { positionSeconds, lastPlayedAt } | null }`. Signed out returns `{ progress: null }` with 200 — not an error; there is simply nothing to resume from an account.
- `PUT` → upserts on `(user_id, devotional_slug)`, adds `listenedDelta` to `seconds_listened`, sets `last_played_at = NOW()`, and sets `completed_at` when `ended` is true. Requires auth; returns `AUTH_REQUIRED_SAVE_STATE` 401 signed out.

**Fail closed on the missing table.** Until migration 018 is applied, a Postgres `42P01` must degrade to on-device resume rather than erroring the reading:

```ts
    // 42P01 = undefined_table. Migration 018 may not be applied yet; resume
    // then behaves exactly as it did before this feature — on-device only.
    // The error is still LOGGED, so this is a degraded path we can see, not
    // a silent fallback.
    if (isUndefinedTable(error)) {
      logApiFailure({ scope: 'listening-progress-put', requestId, code: 'MIGRATION_018_PENDING', error, ... })
      return withRequestIdHeaders(
        NextResponse.json({ ok: true, progress: null, pendingMigration: true }, { status: 200 }),
        requestId,
      )
    }
```

- [ ] **Step 5: Wire the player**

Replace `restorePosition` so it awaits both sides before seeking:

```ts
// Both sides are read before seeking. Seeking to the local value first and
// correcting after would yank the reader mid-sentence on every load.
const restorePosition = useCallback(
  async (audio: HTMLAudioElement) => {
    const end = Number.isFinite(audio.duration)
      ? audio.duration
      : track.duration
    const [local, server] = [
      readLocalPosition(slug),
      await fetchServerPosition(slug),
    ]
    const resolved = resolvePosition(local, server)
    if (resolved === null) return
    if (resolved > RESUME_FLOOR_S && resolved < end - RESUME_TAIL_S) {
      audio.currentTime = resolved
      setCurrent(resolved)
      setResumedFrom(resolved)
    }
  },
  [slug, track.duration],
)
```

Replace the 5s `setInterval` with `pushPosition`, and add `pagehide` + `visibilitychange` listeners that call it with `flush: true`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run __tests__/listening-progress-sync.test.ts __tests__/narration-player.test.tsx`
Expected: PASS.

- [ ] **Step 7: Verify in the Workers runtime**

`npm run build` is not a test (dev rule #9).

```bash
npm run preview
curl -i 'http://localhost:8788/api/listening-progress?devotionalSlug=looking-at-the-sun-day-1'
# Expect 200 with {"ok":true,"progress":null} when signed out.
curl -i -X PUT http://localhost:8788/api/listening-progress \
  -H 'Content-Type: application/json' \
  -d '{"devotionalSlug":"looking-at-the-sun-day-1","positionSeconds":42,"durationSeconds":600,"listenedDelta":42}'
# Expect 401 AUTH_REQUIRED_SAVE_STATE when signed out.
```

Then signed in, in the preview browser: play, pause at a known time, reload — confirm it resumes. Show the founder the curl output and both responses.

- [ ] **Step 8: Commit**

```bash
git add src/lib/audio/listening-progress.ts src/app/api/listening-progress/route.ts \
  src/components/NarrationPlayer.tsx __tests__/listening-progress-sync.test.ts \
  CHANGELOG.md docs/feature-prds/F-101.md
git commit -m "feat(narration): where you stopped follows you between devices — SA-058 (F-101)"
```

---

## Phase 3 — Journaling

### Task 9: Reader context + the shared journal field

Modules receive only `module` from `ModuleRenderer`, across three call sites. A context avoids threading `devotionalSlug` through 30 components and leaves `ModuleRenderer`'s signature untouched.

**Files:**

- Create: `src/components/reader/ReaderContext.tsx`
- Create: `src/components/reader/JournalField.tsx`
- Modify: `src/app/devotional/[slug]/DevotionalPageClient.tsx`, `src/components/daily-bread/DailyBreadView.tsx`, `src/components/daily-bread/CuratedActiveView.tsx` (wrap in the provider)
- Test: `__tests__/journal-field.test.tsx` (create)

**Interfaces:**

- Produces:
  - `<ReaderProvider devotionalSlug signedIn>{children}</ReaderProvider>`
  - `useReader(): { devotionalSlug: string | null; signedIn: boolean }` — returns nulls outside a provider rather than throwing, so a module rendered in isolation (tests, Storybook) still works.
  - `<JournalField kind anchorKey label placeholder />` where `kind` is `'reflection' | 'prayer' | 'entry'`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/journal-field.test.tsx
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { ReaderProvider } from '@/components/reader/ReaderContext'
import JournalField from '@/components/reader/JournalField'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, annotation: { id: 'a1' } }),
    } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const wrap = (signedIn: boolean) => (
  <ReaderProvider devotionalSlug="looking-at-the-sun-day-1" signedIn={signedIn}>
    <JournalField
      kind="reflection"
      anchorKey="m3:q0"
      label="Your answer"
      placeholder="Write…"
    />
  </ReaderProvider>
)

describe('JournalField', () => {
  it('saves on blur when signed in', async () => {
    render(wrap(true))
    const box = screen.getByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'He kept his word.' } })
    fireEvent.blur(box)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    )
    expect(body.annotationType).toBe('note')
    expect(body.style.kind).toBe('reflection')
    expect(body.style.anchorKey).toBe('m3:q0')
  })

  it('is visible but locked when signed out, and writes nothing', () => {
    render(wrap(false))
    // Locked, NOT hidden — a control that vanishes never teaches the reader
    // the product does this, and loses the best conversion moment there is.
    expect(
      screen.getByRole('button', { name: /sign in to write/i }),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Your answer')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failed save on the control rather than silently dropping it', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response)
    render(wrap(true))
    const box = screen.getByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'Something' } })
    fireEvent.blur(box)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/couldn.t save/i),
    )
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/journal-field.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Build the context**

```tsx
// src/components/reader/ReaderContext.tsx
'use client'
import { createContext, useContext, useMemo } from 'react'

interface ReaderValue {
  devotionalSlug: string | null
  signedIn: boolean
}

const ReaderCtx = createContext<ReaderValue>({
  devotionalSlug: null,
  signedIn: false,
})

export function ReaderProvider({
  devotionalSlug,
  signedIn,
  children,
}: ReaderValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ devotionalSlug, signedIn }),
    [devotionalSlug, signedIn],
  )
  return <ReaderCtx.Provider value={value}>{children}</ReaderCtx.Provider>
}

/**
 * Reader identity for any module that wants it.
 *
 * Returns nulls outside a provider rather than throwing: modules render in
 * tests and in the archive views without one, and a module that explodes
 * because nobody wrapped it is worse than one that quietly offers no field.
 */
export function useReader(): ReaderValue {
  return useContext(ReaderCtx)
}
```

- [ ] **Step 4: Build `JournalField`**

One control, three kinds. Signed in: a `<textarea>` autosaving on blur and on a 2s debounce, POSTing `{ devotionalSlug, annotationType: 'note', body, style: { kind, anchorKey, editedAt } }`, then PATCHing by id on subsequent edits. Hydrates existing answers via `GET /api/annotations?devotionalSlug=…&annotationType=note&styleKind=<kind>` and matches on `style.anchorKey`.

Signed out: renders the prompt plus a `Sign in to write` button that dispatches the existing library auth-required event with a new intent, and **never** writes to `localStorage` or the network. Show `Saved`, `Saving`, and `Couldn't save` in a `role="status"` region — never a silent drop.

- [ ] **Step 5: Mount the provider at the three call sites**

Wrap the module list in `DevotionalPageClient.tsx`, `DailyBreadView.tsx`, and `CuratedActiveView.tsx` with `<ReaderProvider devotionalSlug={slug} signedIn={…}>`. `ModuleRenderer`'s signature does not change.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run __tests__/journal-field.test.tsx`
Expected: PASS, all three.

- [ ] **Step 7: Commit**

```bash
git add src/components/reader/ReaderContext.tsx src/components/reader/JournalField.tsx \
  src/app/devotional/\[slug\]/DevotionalPageClient.tsx \
  src/components/daily-bread/DailyBreadView.tsx \
  src/components/daily-bread/CuratedActiveView.tsx \
  __tests__/journal-field.test.tsx CHANGELOG.md docs/feature-prds/F-102.md
git commit -m "feat(reader): one field for every kind of writing, locked not hidden — SA-061 (F-102)"
```

---

### Task 10: Open the 2,062 prompts

545 reflection modules carry 1,517 additional questions. Every prompt is already written and shipping; none has ever had anywhere to write an answer.

**Files:**

- Modify: `src/components/modules/ReflectionModule.tsx`
- Modify: `src/components/modules/RecapModule.tsx:61-73`
- Modify: `src/components/modules/PrayerModule.tsx`
- Test: `__tests__/reflection-journaling.test.tsx` (create)

**Interfaces:**

- Consumes: `useReader()`, `<JournalField>` from Task 9.
- `anchorKey` format is `m{moduleIndex}:q{questionIndex}`; the primary prompt is `q0` and `additionalQuestions[i]` is `q{i+1}`. This must stay stable — it is how an answer finds its question on reload.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/reflection-journaling.test.tsx
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ReaderProvider } from '@/components/reader/ReaderContext'
import ReflectionModule from '@/components/modules/ReflectionModule'

afterEach(cleanup)

const MODULE = {
  type: 'reflection',
  prompt: 'Where have you been strong in your own eyes?',
  additionalQuestions: [
    'What would trusting look like today?',
    'Who needs to hear this?',
  ],
} as never

describe('ReflectionModule journaling', () => {
  it('offers a field for the prompt and for every additional question', () => {
    render(
      <ReaderProvider devotionalSlug="jabez-day-1" signedIn>
        <ReflectionModule module={MODULE} moduleIndex={3} />
      </ReaderProvider>,
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
  })

  it('still renders the prompts unchanged outside a provider', () => {
    render(<ReflectionModule module={MODULE} moduleIndex={3} />)
    expect(screen.getByText(/strong in your own eyes/i)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/reflection-journaling.test.tsx`
Expected: FAIL — renders 0 textboxes.

- [ ] **Step 3: Add the fields**

`ReflectionModule` gains an optional `moduleIndex` prop (passed by `ModuleRenderer` from the existing map index) and renders a `JournalField` under the primary prompt and under each `additionalQuestions` entry. Keep the existing `<ol>` structure and typography — the field goes inside the `<li>`, below the question.

`RecapModule` gets one field under `integration_question` with the same `kind="reflection"`.

`PrayerModule` gets **not** an answer field — all 543 prayer modules pose no question; they are prayers to be prayed. It gets an _Add your own prayer_ disclosure that opens a `JournalField kind="prayer"`, framed as writing alongside rather than answering.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run __tests__/reflection-journaling.test.tsx __tests__/journal-field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify against real content**

```bash
npm run dev
# Open /devotional/jabez-day-1 signed in. Write an answer, reload, confirm it
# is still there. Sign out, confirm the field is replaced by "Sign in to write"
# and that nothing was retained.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/modules/ReflectionModule.tsx src/components/modules/RecapModule.tsx \
  src/components/modules/PrayerModule.tsx src/components/ModuleRenderer.tsx \
  __tests__/reflection-journaling.test.tsx CHANGELOG.md docs/feature-prds/F-102.md
git commit -m "feat(reader): 2,062 prompts that finally have somewhere to answer — SA-061 (F-102)"
```

---

### Task 11: Passage notes, the free entry, and audio clips

**Files:**

- Modify: `src/components/TextHighlightTrigger.tsx:757-779` (toolbar), `:782-814` (note panel)
- Modify: `src/components/NarrationPlayer.tsx` (clip control)
- Test: `__tests__/highlight-editing.test.tsx` (extend), `__tests__/audio-clip-capture.test.tsx` (create)

**Interfaces:**

- Clip payload: `{ annotationType: 'note', style: { kind: 'clip', t: number, chapter: string, chapterIndex: number } }`, `body` = the reader's note (may be empty).
- `AudioPlayerProps` and `NarrationPlayerProps` both gain `signedIn?: boolean`, threaded from the page. The player sits outside the module tree, so it cannot read `useReader()` — the prop is the seam. Default `false`: an unknown auth state must lock the control, never expose an unsaveable one.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/audio-clip-capture.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'

vi.mock('@/data/audio-manifest.json', () => ({
  default: {
    'has-track-day-1': {
      src: '/audio/has-track-day-1.m4a',
      duration: 600,
      words: 1500,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 8001959,
      chapters: [
        { t: 0, label: 'Opening', module: 0 },
        { t: 120, label: 'Word study', module: 2 },
      ],
    },
  },
}))

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, annotation: { id: 'c1' } }),
    } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('audio clips', () => {
  it('captures the timestamp and the chapter it fell in', async () => {
    const { container } = render(
      <AudioPlayer title="X" segments={[]} slug="has-track-day-1" signedIn />,
    )
    const audio = container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'currentTime', { value: 140, writable: true })
    fireEvent.timeUpdate(audio)
    fireEvent.click(screen.getByRole('button', { name: /clip this moment/i }))
    fireEvent.click(screen.getByRole('button', { name: /save clip/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    )
    expect(body.style.kind).toBe('clip')
    expect(body.style.t).toBe(140)
    // The chapter is stored so the Library row reads "Word study — 2:20"
    // rather than a bare number the reader has to decode.
    expect(body.style.chapter).toBe('Word study')
  })
})
```

- [ ] **Step 2: Run and confirm both fail**

Run: `npx vitest run __tests__/audio-clip-capture.test.tsx`
Expected: FAIL — no clip control.

- [ ] **Step 3: Split the selection toolbar into Highlight · Note · Ask**

In `TextHighlightTrigger.tsx`, the create branch gains a **Note** button that applies the mark _and_ opens the note editor in one action. Replace the cramped inline `<textarea>` with the same anchored panel used for editing, so writing a note is not done in a tooltip.

- [ ] **Step 4: Add the clip control to the transport**

The `✎` button pauses nothing; it captures `{ t: audio.currentTime, chapter, chapterIndex }` from `chapterBounds` and opens a small note panel over the transport. Signed out it is visible and opens sign-in, per Task 9's rule.

- [ ] **Step 5: Add the free journal entry**

One `JournalField kind="entry"` at the close of the reading in `DevotionalPageClient.tsx`, headed with a quiet invitation rather than a form label.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run __tests__/audio-clip-capture.test.tsx __tests__/highlight-editing.test.tsx __tests__/journal-field.test.tsx`
Expected: PASS, all three files.

- [ ] **Step 7: Commit**

```bash
git add src/components/TextHighlightTrigger.tsx src/components/NarrationPlayer.tsx \
  src/app/devotional/\[slug\]/DevotionalPageClient.tsx \
  __tests__/audio-clip-capture.test.tsx __tests__/highlight-editing.test.tsx \
  CHANGELOG.md docs/feature-prds/F-102.md
git commit -m "feat(reader): a note is a highlight with words on it, and listening can mark too — SA-061 (F-102)"
```

---

### Task 12: The journal never reaches the model

Spec §2.8. `POST /api/chat` accepts `highlightedText` and puts it straight into the prompt (`src/app/api/chat/route.ts:350-358`). Today that string is always _published_ devotional text the reader selected, which is fine. The moment notes exist, the same channel could carry the reader's own writing — and religious-belief journaling is special-category data under GDPR Art. 9. The boundary has to be enforced and pinned, not assumed.

**Files:**

- Modify: `src/components/reader/JournalField.tsx` (no chat affordance, ever)
- Modify: `src/app/api/chat/route.ts:505-521` (reject journal-kind payloads)
- Test: `__tests__/journal-never-leaves-account.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/journal-never-leaves-account.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('the reader’s own writing never reaches the model', () => {
  it('JournalField has no route into the chat store', () => {
    const src = readFileSync('src/components/reader/JournalField.tsx', 'utf8')
    // Selecting published devotional text and asking about it is fine — that
    // is what TextHighlightTrigger's "Ask" does. Piping what the READER wrote
    // is not: it is Art. 9 special-category data leaving the account.
    expect(src).not.toContain('useChatStore')
    expect(src).not.toContain("'/api/chat'")
  })

  it('the chat route refuses an explicitly journal-sourced payload', () => {
    const src = readFileSync('src/app/api/chat/route.ts', 'utf8')
    expect(src).toContain('JOURNAL_CONTEXT_REFUSED')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/journal-never-leaves-account.test.ts`
Expected: FAIL — the second test finds no guard.

- [ ] **Step 3: Add the server-side refusal**

In `src/app/api/chat/route.ts`, beside the existing `highlightedText` sanitisation:

```ts
// The server cannot tell published prose from a reader's journal entry by
// inspecting the string, so the CLIENT must declare the source and the
// server refuses the one kind that may never be sent. This is a boundary
// discipline, not a cryptographic guarantee — its value is that a future
// "ask about my note" button fails loudly here instead of shipping.
if (String(body.contextSource || '') === 'journal') {
  return jsonError({
    error: 'Your own writing is never sent to the model.',
    code: 'JOURNAL_CONTEXT_REFUSED',
    status: 400,
    requestId,
  })
}
```

- [ ] **Step 4: Keep `JournalField` free of any chat affordance**

`JournalField` must not import `useChatStore` and must not call `/api/chat`. Add a file-top comment stating why, so the next person to add an "Ask about this" button reads the reason before deleting the guard.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run __tests__/journal-never-leaves-account.test.ts __tests__/journal-field.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/chat/route.ts src/components/reader/JournalField.tsx \
  __tests__/journal-never-leaves-account.test.ts CHANGELOG.md docs/feature-prds/F-102.md
git commit -m "feat(privacy): what the reader writes never reaches the model — SA-061 (F-102)"
```

---

## Phase 4 — The two-state model

> Phase 4 is separately shippable and separately revertable. Phases 1–3 leave the product working under the current auth rules; this phase changes the rules.

### Task 13: The auth-state sweep

Reverses SA-018 (as amended), SA-038 §2, and SA-039 §5.

**Files:**

- Modify: `src/components/TextHighlightTrigger.tsx:123-183` (delete `LOCAL_HIGHLIGHTS_KEY` and its three helpers), `:596-685`
- Modify: `src/app/api/bookmarks/route.ts` (require auth)
- Modify: `src/components/EuangelionShellHeader.tsx` (`DESKTOP_NAV_ITEMS` — auth-aware primary slot, and the mobile tab bar label)
- Modify: `src/app/daily-bread/page.tsx` (gate)
- Test: `__tests__/save-state-auth-gate.test.ts` (rewrite), `__tests__/two-state-model.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/two-state-model.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: 'AUTH_REQUIRED_SAVE_STATE' }),
    } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('signed out retains nothing', () => {
  it('writes no highlight to localStorage', () => {
    const root = document.createElement('div')
    root.id = 'main-content'
    root.innerHTML = '<p>the promise was not made to the strong</p>'
    document.body.appendChild(root)

    render(<TextHighlightTrigger devotionalSlug="jabez-day-1" />)
    // SA-039 §5 is reversed: there is no device-kept state any more.
    expect(localStorage.getItem('euangelion-local-highlights-v1')).toBeNull()
    expect(Object.keys(localStorage)).not.toContain(
      'euangelion-local-highlights-v1',
    )
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run __tests__/two-state-model.test.tsx`
Expected: FAIL — the key is written.

- [ ] **Step 3: Delete the anonymous-persistence path**

Remove `LOCAL_HIGHLIGHTS_KEY`, `readLocalHighlights`, `writeLocalHighlight`, `mutateLocalHighlight`, and every call site. Signed out, the selection toolbar's Highlight and Note buttons open sign-in with intent instead of painting an unsaveable mark.

Keep `euangelion:narration-position`, the reader theme, font size, and translation keys — those are device preferences, not authored content (spec §2.5).

- [ ] **Step 4: Gate bookmarks and Daily Bread**

`/api/bookmarks` requires auth on every method. `/daily-bread` redirects signed-out visitors to sign-in with a return path.

- [ ] **Step 5: Make the primary nav slot auth-aware**

Signed out the slot reads `TODAY` → `/today`; signed in it reads `DAILY BREAD` → `/daily-bread`. Without this, SA-045's single primary nav entry sends every signed-out visitor into a wall.

- [ ] **Step 6: Complete the pending intent after sign-in**

Extend `LibraryIntent` with the reader's actions so the thing the reader reached for actually happens once they are back:

```ts
  | { kind: 'highlight'; devotionalSlug: string; anchorText: string; color: string }
  | { kind: 'journal'; devotionalSlug: string; noteKind: string; anchorKey: string; body: string }
  | { kind: 'clip'; devotionalSlug: string; t: number; chapter: string }
```

- [ ] **Step 7: Rewrite the stale gate test**

`__tests__/save-state-auth-gate.test.ts` encodes the SA-018 amendment (anonymous bookmarks). Rewrite it for the new rule and reference the reversal in a comment so the next reader knows it was deliberate, not drift.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS. Several highlight/bookmark tests will need updating — they pin behaviour this task deliberately reverses. Update them; do not delete them.

- [ ] **Step 9: Commit**

```bash
git add src/components/TextHighlightTrigger.tsx src/app/api/bookmarks/route.ts \
  src/app/daily-bread/page.tsx __tests__/two-state-model.test.tsx \
  __tests__/save-state-auth-gate.test.ts CHANGELOG.md docs/feature-prds/F-104.md
git commit -m "feat(auth): two states — signed out reads, signed in keeps — SA-060 (F-104)"
```

---

### Task 14: Verify the door before locking it — GATES THE RELEASE

The gate cannot go live on an unverified account system. The known problems are Supabase-dashboard-side, not in this repo: the built-in mailer capped at ~2 emails/hour, and `{{ .Token }}` reported missing from the templates.

- [ ] **Step 1: Confirm identity before touching production**

```bash
gh auth switch --user creativcreature
gh auth status                # active must be creativcreature
git config user.email         # must be chrisparker21@gmail.com
npx wrangler whoami           # must be chrisparker21@gmail.com
```

If any check fails: STOP.

- [ ] **Step 2: Run a real sign-in against production**

With the founder present, request a magic link / OTP to their address on `https://euangelion.app`. Confirm the email **arrives**, contains a **working token**, and that following it lands an authenticated session.

- [ ] **Step 3: Confirm the rate limit under real conditions**

Request three sign-ins inside an hour from different addresses. If the 2/hour cap is real, the third fails — and the two-state model would make the product look dead to a third of new users. **If this fails, the gate does not ship.** Report it and stop; configuring a custom SMTP provider is a founder action in the Supabase dashboard, not a code change.

- [ ] **Step 4: Confirm migration 018 is applied**

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
fetch(u+'/rest/v1/listening_progress?select=id&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}})
 .then(r=>r.text()).then(t=>console.log(t));"
```

Expected: `[]` (applied). A `42P01` means it is still pending — report it rather than shipping cross-device resume as a silent no-op.

- [ ] **Step 5: Report to the founder and wait**

Show the curl output, the received email, and the rate-limit result. Do not flip the gate until the founder confirms.

---

### Task 15: Docs and decision reversals

- [ ] **Step 1: Record the three decisions**

Add `SA-060`, `SA-058`, `SA-061` to `docs/production-decisions.yaml`. SA-060's note must state explicitly that it **reverses** SA-018 (as amended 2026-06-09), SA-038 §2 and SA-039 §5, and that SA-026 (Soul Audit anonymous and free forever) is **not** reversed.

- [ ] **Step 2: Write the feature PRDs**

`docs/feature-prds/F-104.md` (two-state model), `F-101.md` (transport), `F-102.md` (journaling). Re-check the registry first — F-numbers race under parallel sessions.

- [ ] **Step 3: Update the tracking spine**

`docs/PRODUCTION-SOURCE-OF-TRUTH.md`, `docs/PRODUCTION-FEATURE-SCORECARD.md`, `docs/PRODUCTION-10-10-PLAN.md`, `docs/feature-prds/FEATURE-PRD-INDEX.md`, `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`, `CHANGELOG.md`. Rule #9: these must not drift.

- [ ] **Step 4: Run the full gate**

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add docs/production-decisions.yaml docs/feature-prds/ docs/PRODUCTION-*.md CHANGELOG.md
git commit -m "docs(tracking): SA-060/058/059 and the reversals they carry — SA-060 (F-104)"
```

---

## Verification

Per dev rules #9 and #10, `npm run build` succeeding is NOT a test, and "it works" means the endpoint was hit and the response shown.

**Automated**

```bash
npm run type-check && npm run verify:production-contracts && \
  npm run verify:tracking && npm run lint && npm test
```

**Workers runtime** — `npm run preview`, then curl `/api/listening-progress` (GET + PUT) and `/api/annotations` (POST + PATCH), signed in and signed out, and confirm the response bodies.

**Manual matrix**, at 375 / 768 / 1024, each signed in and signed out:

| Surface     | Check                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Transport   | play/pause, ±15, chapter prev/next, scrubber + ticks, time-left-in-chapter     |
| Speed       | sheet opens, 2× plays in-pitch, choice survives reload                         |
| Sleep timer | fades not cuts; end-of-chapter fires at the right boundary                     |
| Mini bar    | appears on scroll, theme button and chat launcher clear it                     |
| Resume      | pause, reload, resumes; then resume on a second device                         |
| Clips       | captures time + chapter, opens the reading at that point from the Library      |
| Highlight   | create, recolour, reload — **the mark survives** (Task 1's regression)         |
| Notes       | passage note, reflection answer, own prayer, free entry — all persist          |
| Signed out  | every save control visible and locked; nothing in localStorage but preferences |
| Nav         | primary slot reads TODAY signed out, DAILY BREAD signed in                     |

**Release gate:** Task 14 must pass before the two-state gate goes live.
