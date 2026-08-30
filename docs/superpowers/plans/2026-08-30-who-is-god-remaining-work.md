# /who-is-god Remaining Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every open item on the /who-is-god correction list, so the page can be verified and deployed without a single unverified claim.

**Architecture:** The page is built and committed (`7d3bfbc5`, `a6b42f43`, `df4ff53d`, `7d15dba1`, `78dff8a1`). What remains is (a) content the founder has decided on but which is not wired, (b) assets that fail an existing gate, (c) interaction work awaiting founder decisions, and (d) an entire verification pass that has never run. Tasks are ordered so nothing verifies work that later tasks will change.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Vitest + React Testing Library, Cloudflare Workers via OpenNext, Playwright for measurement.

**Spec:** `docs/superpowers/specs/2026-08-30-who-is-god-immersive-design.md`

## Global Constraints

- Every scripture quotation is copied verbatim from `public/bibles/BSB`. Never typed from memory. Verify with a byte-comparison before shipping.
- Reading level target Flesch-Kincaid ≤ 8.5, using the exact formula in `scripts/check-readability.mjs`. Current measured value is 2.74; do not regress past 8.5.
- No Comfy call may pass `confirm: true`. Video work uses `video_minimax_h3_i2v` on the GPU path only, which the estimator reports at 0 credits.
- Image generation for this project goes through `/imagen` → Codex built-in `image_gen`. Never Nano Banana, never the fallback CLI at `~/.codex/skills/.system/imagegen/scripts/image_gen.py` (that one bills the founder's API account per image).
- **Do not upscale served plates to 2400×1600.** Masters stay in `design-sources/`. `next.config.ts` sets `images.unoptimized`, so there is no srcset; a larger served file is a straight payload increase.
- Commit gates: `pre-commit` requires CHANGELOG.md staged when any `.ts`/`.tsx` changes, plus an `F-###.md`. `commit-msg` requires both `SA-134` and `F-178` in the message. Stage by explicit path — three sessions share this tree.
- Measure LCP **without scrolling**. LCP stops updating at first user input and a programmatic scroll is not input; scrolling while observing it produces a number no real user experiences.

---

### Task 1: Wire the eleven extra attributes behind an expander

The data is already in `src/data/who-is-god-attributes.ts` — 18 rows, 7 marked `core: true`, all 54 cells verified present in BSB. `CompareStage` still renders all 18 with no split, so a beginner meets an eighteen-row matrix.

**Files:**

- Modify: `src/components/who-is-god/CompareStage.tsx`
- Modify: `src/app/who-is-god/who-is-god.css`
- Test: `__tests__/who-is-god-compare.test.tsx`

**Interfaces:**

- Consumes: `SHARED_ATTRIBUTES` from `@/data/who-is-god-attributes`, each row now carrying optional `core?: true`
- Produces: nothing other tasks depend on

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompareStage from '@/components/who-is-god/CompareStage'

test('shows the seven core attributes and hides the other eleven until asked', async () => {
  render(<CompareStage />)
  expect(screen.getByText('Eternal')).toBeInTheDocument()
  expect(screen.queryByText('Merciful')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /eleven more/i }))
  expect(screen.getByText('Merciful')).toBeInTheDocument()
  expect(screen.getByText('Self-existent')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/who-is-god-compare.test.tsx`
Expected: FAIL — "Merciful" is found immediately, because nothing is hidden yet.

- [ ] **Step 3: Split core from extra in the matrix**

In `CompareStage.tsx`, add state and derive the two groups:

```tsx
const [showAll, setShowAll] = useState(false)
const core = SHARED_ATTRIBUTES.filter((a) => a.core)
const extra = SHARED_ATTRIBUTES.filter((a) => !a.core)
const shown = showAll ? SHARED_ATTRIBUTES : core
```

Render `shown` in the matrix instead of `SHARED_ATTRIBUTES`, and add the control directly beneath it:

```tsx
{
  !showAll && (
    <button
      type="button"
      className="wig-matrix-more"
      onClick={() => setShowAll(true)}
    >
      {extra.length} more, all said of all three
    </button>
  )
}
```

- [ ] **Step 4: Style the control**

Append to `who-is-god.css`:

```css
.wig-matrix-more {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  min-height: 44px;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: none;
  border: 1px solid color-mix(in srgb, var(--amber) 45%, transparent);
  color: var(--amber);
  cursor: pointer;
}
.wig-matrix-more:hover {
  color: var(--fg);
  border-color: var(--fg);
}
.wig-matrix-more:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 3px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/who-is-god-compare.test.tsx`
Expected: PASS

- [ ] **Step 6: Re-check the reading level did not regress**

Run the FK measurement over `WhoIsGod.tsx` using the formula in `scripts/check-readability.mjs`.
Expected: FK ≤ 8.5.

- [ ] **Step 7: Commit**

```bash
git add src/components/who-is-god/CompareStage.tsx src/app/who-is-god/who-is-god.css __tests__/who-is-god-compare.test.tsx docs/feature-prds/F-178.md CHANGELOG.md
git commit -m "feat(outreach): eighteen attributes, eleven tucked away — SA-134 (F-178)"
```

---

### Task 2: Rendered-DOM tests for the seven new components

devo-go `traps.md` #1: client-render drops are invisible to curl, and rendered-DOM assertions are REQUIRED for any new module shape. Seven components shipped with zero tests. Null renders now ship as silent gaps rather than visible empty boxes, so this matters more, not less.

**Files:**

- Create: `__tests__/who-is-god-render.test.tsx`

**Interfaces:**

- Consumes: `WhoIsGod` default export, `Room`, `StickyStepper`, `NameStage`, `ProgressRail`, `LightSpine`, `ScrubbedFilm`
- Produces: the standing regression suite for this page

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import WhoIsGod from '@/components/who-is-god/WhoIsGod'
import { DIVINE_NAMES } from '@/data/who-is-god-names'

test('all seven rooms render with their headings', () => {
  render(<WhoIsGod />)
  for (const n of ['01', '02', '03', '04', '05', '06', '07']) {
    expect(screen.getByText(n)).toBeInTheDocument()
  }
  expect(screen.getByText(/Not a force\. Someone\./)).toBeInTheDocument()
  expect(screen.getByText(/The ninth hour/)).toBeInTheDocument()
  expect(screen.getByText(/Where you go from here/)).toBeInTheDocument()
})

test('every Hebrew name renders with its transliteration beside it', () => {
  render(<WhoIsGod />)
  for (const n of DIVINE_NAMES) {
    expect(screen.getAllByText(n.hebrew).length).toBeGreaterThan(0)
    expect(screen.getAllByText(n.translit).length).toBeGreaterThan(0)
  }
})

test('Seeking Help Georgia renders as a full section with its link', () => {
  render(<WhoIsGod />)
  const help = screen.getByRole('region', { name: /phone number/i })
  expect(
    within(help).getByRole('link', { name: /Seeking help in Georgia/i }),
  ).toHaveAttribute('href', '/seeking-help-georgia')
})

test('no scripture block renders empty', () => {
  const { container } = render(<WhoIsGod />)
  const quotes = container.querySelectorAll('.wig-scripture blockquote')
  expect(quotes.length).toBeGreaterThan(20)
  quotes.forEach((q) =>
    expect(q.textContent?.trim().length).toBeGreaterThan(10),
  )
})
```

- [ ] **Step 2: Run test to verify it fails or passes honestly**

Run: `npx vitest run __tests__/who-is-god-render.test.tsx`
Expected: any failure here is a real client-render drop. Fix the component, not the test.

- [ ] **Step 3: Fix whatever the tests catch**

No code written in advance — these tests exist to find drops. If `getByRole('region')` fails, the `wig-help` section is missing its `aria-labelledby`; add it. If a Hebrew name is absent, `NameStage` is rendering only the active step's name and the test should assert against the stage plus the step list together.

- [ ] **Step 4: Run to verify green**

Run: `npx vitest run __tests__/who-is-god-render.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add __tests__/who-is-god-render.test.tsx docs/feature-prds/F-178.md CHANGELOG.md
git commit -m "test(outreach): rendered-DOM suite for the seven who-is-god components — SA-134 (F-178)"
```

---

### Task 3: Regenerate the two plates that fail the accuracy gate

**BLOCKED until the founder answers decision 2 on the pitch.** `verify-masters.mjs` reports `deep` at 54% and `restore` at 39% blank paper. devo-go calls this gate mandatory before placement.

**Files:**

- Modify: `public/images/site/who-is-god/deep.webp`, `restore.webp` and their `-sm` derivatives

- [ ] **Step 1: Confirm the founder said regenerate**

If the answer is "ship as-is", skip this task entirely and record the waiver in `F-178.md` under Known gaps. Do not silently proceed either way.

- [ ] **Step 2: Rewrite the two subject lines with all four axes assigned**

Each prompt must name: composition archetype (A–J), coverage band with a target percentage, one conceptual device, and camera as distance + height + relationship. `deep` and `restore` currently share archetype B with `rescue`; give them different ones. Neither may be wide/frontal/eye-level — that default is already three-sixths of the set.

- [ ] **Step 3: Generate via /imagen → Codex built-in image_gen**

```bash
CODEX="$(command -v codex || echo /Applications/ChatGPT.app/Contents/Resources/codex)"
"$CODEX" exec --skip-git-repo-check -s read-only --json "$(cat prompt.txt)" < /dev/null > run.jsonl 2>&1 &
```

- [ ] **Step 4: Inspect at 1:1 before installing**

Open each at full resolution. Check for text (banned), impossible geometry, and whether it suits the room. A thumbnail hides exactly the failures that matter.

- [ ] **Step 5: Re-run the gate**

Run: `node scripts/imagery/verify-masters.mjs <dir>`
Expected: both pass border and blank-paper checks.

- [ ] **Step 6: Install both sizes and commit**

Convert to webp at 1536 and 960 with Pillow, quality 82 and 78 respectively.

```bash
git add public/images/site/who-is-god/ docs/feature-prds/F-178.md CHANGELOG.md
git commit -m "fix(outreach): regenerate the two plates failing the accuracy gate — SA-134 (F-178)"
```

---

### Task 4: Resolve SBL Hebrew

**BLOCKED until the founder answers decision 1 on the pitch.** `design-system/typography.css:71` declares an `@font-face` for `/fonts/SBLHebrew.woff2` and the file is absent. This affects every Hebrew surface on the site, not only this page.

**Files:**

- Create: `public/fonts/SBLHebrew.woff2` (option a), or
- Modify: `design-system/tokens.css` `--font-hebrew` (option b)

- [ ] **Step 1: Act on the founder's choice**

(a) Self-host — place the woff2 and verify the `@font-face` resolves. (b) Swap `--font-hebrew` to a licensed alternative and update the `@font-face` so the stylesheet no longer names a file that does not exist. (c) Leave as-is and record the gap in `F-178.md`.

- [ ] **Step 2: Verify which face actually renders**

```js
document.fonts.check('16px "SBL Hebrew"')
```

Expected: `true` for option (a). For (b) and (c), confirm the fallback in use and record it — do not claim SBL Hebrew is rendering when it is not.

- [ ] **Step 3: Commit**

```bash
git add public/fonts design-system docs/feature-prds/F-178.md CHANGELOG.md
git commit -m "fix(type): resolve the missing SBL Hebrew face — SA-134 (F-178)"
```

---

### Task 5: The full verification pass

Nothing here has run since the rebuild. Run every check and record the number, not an impression.

**Files:**

- Modify: `docs/feature-prds/F-178.md` (results), `docs/superpowers/specs/2026-08-30-who-is-god-immersive-design.md` (acceptance boxes)

- [ ] **Step 1: Scripture integrity**

Re-extract all 92 references from `public/bibles/BSB` and byte-compare against `src/data/who-is-god-{verses,names,attributes}.ts`.
Expected: zero differences. Any difference is a corpus-verbatim violation and blocks the deploy.

- [ ] **Step 2: No-JS**

```bash
"$CHROME" --headless --disable-gpu --disable-javascript --virtual-time-budget=4000 \
  --window-size=1440,2000 --screenshot=nojs.png http://localhost:8787/who-is-god
```

Open it. Expected: complete prose, every room visible, nothing hidden. The `[data-js="true"]` scope is what makes this true — if the page is blank, that scope has been removed.

- [ ] **Step 3: Reduced motion**

Emulate `prefers-reduced-motion: reduce`. Expected: no pinned stages, no staged entrances, `--room-light` at a fixed 0.55, film replaced by the still, page still readable end to end.

- [ ] **Step 4: AA contrast at BOTH ends of the light spine**

Sample rendered foreground and background at `--room-light: 0` and `1`. Compute the ratio.
Expected: ≥ 4.5:1 for body, ≥ 3:1 for large text, at both ends. Cream-on-cream at 1.0 is the live risk.

- [ ] **Step 5: Keyboard**

Tab from the door to Room 07. Expected: the two-ways-up buttons, every rail link, the matrix expander, every name button and every link reachable, with a visible focus ring throughout.

- [ ] **Step 6: Mobile at 375px**

Expected: no horizontal document overflow, the matrix scrolls inside its own container, tap targets ≥ 44px.

- [ ] **Step 7: Look at rooms 01–07**

Screenshot each. Describe what you see. Measurement is not looking, and the layout defect three independent sources flagged — text beside the plate with a dead gutter rather than over it — will only be visible this way.

- [ ] **Step 8: Full suite and gates**

Run: `npm test`, `npm run type-check`, `npm run lint`, every `verify:*`, `npm run build`.
Expected: green, except the known pre-existing `narration-manifest-current.test.ts` failure which belongs to another session's work.

- [ ] **Step 9: Record every number and tick only what passed**

Update the spec's acceptance list. A box is ticked only where a measurement or a screenshot backs it.

- [ ] **Step 10: Commit**

```bash
git add docs/ CHANGELOG.md
git commit -m "docs(outreach): full verification pass results — SA-134 (F-178)"
```

---

### Task 6: Deploy and verify live

**Do not start until Task 5 is green.**

- [ ] **Step 1: Identity gate — all four, stop if any fails**

```bash
gh auth switch --user creativcreature
gh auth status
git config user.email    # must be chrisparker21@gmail.com
npx wrangler whoami      # must be chrisparker21@gmail.com
```

- [ ] **Step 2: Surface what else ships**

`npm run deploy` builds the working tree and ships everything on the branch, not just this work. List the other sessions' commits that will ride along and let the founder choose the merge path.

- [ ] **Step 3: Preview in the Workers runtime first**

Run: `npm run preview`, then curl `/who-is-god` and assert on the response body, not the status code.

- [ ] **Step 4: Deploy**

```bash
git fetch && git status
npm run deploy
```

- [ ] **Step 5: Warm the edge cache**

devo-go traps #3: pages cache `s-maxage=3600, stale-while-revalidate`, so the old page is served after the fix deploys. Request each affected URL, wait ~10s, then verify a fix marker per URL. In zsh use an array loop — unquoted `$URLS` does not word-split.

- [ ] **Step 6: Live-verify**

Fetch `https://euangelion.app/who-is-god` and grep the body for the Hebrew, the matrix, the Seeking Help section and the two-ways-up control. A 200 that serves the old page is still a 200. Screenshot it and look.

---

## Deferred, with reasons

**Parallax (decision 4), video in the rooms (decision 5), the ninth-hour film (decision 6)** — all await founder answers on the pitch. Each has a real trade-off recorded there; none should be built on a guess.

**Narration** — excluded by founder direction ("finish the entire overhaul minus audio"). When it returns it runs last, after all text is final, because the track stores a `textHash` that any later prose edit invalidates.

**The door film's 640×640 aspect** — the GPU template's ResolutionSelector produced a square. Two attempts to drive it to 16:9, then keep the existing 1280×720 genesis film.

## Self-review

**Spec coverage:** Every open acceptance box in the spec maps to Task 1, 3, 4 or 5. The three set-level plate axes are covered by Task 3 step 2. The layout defect is covered by Task 5 step 7, which is deliberately a looking task rather than a measuring one.

**Placeholder scan:** No TBDs. Tasks 3 and 4 are explicitly blocked on named decisions rather than vaguely deferred, and each states what to do for every possible answer including "record the waiver".

**Type consistency:** `core?: true` is the field added in Task 1 and it matches the type already committed in `who-is-god-attributes.ts`. `SHARED_ATTRIBUTES`, `DIVINE_NAMES` and `PERSONS` are used with their existing shapes throughout.
