# Session handoff — 2026-08-15 — library, highlights, red letter

Written for compaction. Everything below is either **shipped and live** or a
**named open decision**. Nothing here is in-flight in my head only.

Founder ran three parallel Claude sessions today; see
`memory/project_parallel_session_hazards.md`. Decision ids and F-numbers raced
repeatedly — always re-check both files immediately before committing.

---

## Shipped and live today (this session)

| Commit | Decision | What |
| --- | --- | --- |
| `7ee20f67` | SA-040 (F-087) | Looking at the Sun replated through the locked riso pipeline |
| `e2e44add` | SA-041 (F-087) | No portraits — figures rendered anonymous |
| `172efd59` | SA-041 | Service worker v64 so replaced artwork reaches readers |
| `04a93fcc` | SA-044 (F-090) | Series library, active-day advance, phrase search, homepage rotation |
| `410b9c59` | SA-042 (F-089) | Restored two files `main` was missing to compile (another session's split commit) |
| `dfce403d` | SA-046 (F-092) | Editable highlights — recolour, note, remove |
| `5aeaa172` | SA-047 (F-092) | Toolbar flips when no room above; chat launcher themed |
| `86b7862d` | SA-047 | Unblocked `verify:feature-prds` for everyone |
| `303b9ff5` | SA-049 (F-094) | The reading room — ten print-form layouts |
| `79a0cfbc` | SA-050 (F-094) | Cut to seven, centred controls, quiet resume line |

Live version at time of writing: `67e85b49`. Service worker **v75**.

## Uncommitted at time of writing (this session's work)

- `src/app/globals.css` — resume-line accent (bronze `#8a5e12` light /
  `#d8b273` dark) + the red-letter block
- `src/lib/red-letter.tsx` — renderer (new)
- `src/components/modules/ScriptureModule.tsx` — wired, all 3 variants
- `src/types/index.ts` — `redLetter?: string[]` on Module
- `__tests__/red-letter.test.tsx` — 6 tests, passing

Intended ids: **F-095 / SA-051**. RE-CHECK BOTH before committing — F-093,
SA-043 and SA-048 were all taken out from under me today.

---

## Red letter — the investigation, so it is not repeated

Founder: *"through out the site — Jesus direct words in Red. ensure the
highlight color is correct for such text."* Then: *"are there no guides to this
for the edition we have online anywhere?"*

### The answer is no, not for our editions. Verified, not assumed:

| Source | Words-of-Jesus data? | Coverage of our catalog |
| --- | --- | --- |
| `eng-kjv.osis.xml` (on disk) | **Yes** — 2,021 `<q who="Jesus" sID=…/>` milestone pairs, verse-addressed | **1 of 125** Gospel passages |
| BSB official USFM (`usfm-bible/examples.bsb`, public domain since 2023-04-30) | **No** — fetched `43LUKBSB.usfm` (156 KB), **zero `\wj`**; carries `\f` footnotes only | 70 of 125 |
| NIV | Copyrighted (Biblica). No open dataset. | 50 of 125 |
| STEPBible-Data (on disk) | **No** speaker attribution — the grep hit was `wj` inside a Google Sheets URL | — |

### Catalog shape (measured, `public/devotionals/*.json`)

```
scripture modules total : 590
  of which Gospel refs  : 125  (21%)
translations, Gospels   : BSB 70 · NIV 50 · ESV 2 · NKJV 2 · KJV 1
```

### Why a quotation-mark pass is not acceptable

Real passage, `looking-at-the-sun-day-4`, Luke 10:33-37 (BSB). Three quoted
spans:

1. "Which of these three do you think was a neighbor…?" — **Jesus**
2. "The one who showed him mercy," — **the expert in the law**
3. "Go and do likewise." — **Jesus**

A naive pass reddens all three and puts Christ's colour on another man's words.
KJV compounds it: KJV does not punctuate speech at all, so there is nothing to
detect.

**Standing principle:** a missing red word is a typographic omission; a wrongly
red word is a false attribution. Under-mark, never over-mark.

---

## What is BUILT and needs no further decision

- `renderRedLetter(passage, spans)` wraps attributed spans in
  `<span class="wj" data-words-of-christ="true">`. Longest-span-first so nested
  spans are not cut; unmatched spans are skipped, never widened.
- `Module.redLetter?: string[]` — spans copied verbatim from `passage`.
- Wired into all three `ScriptureModule` layout variants; red letter takes
  precedence over gold emphasis.
- **Colour is measured, not chosen.** `#7a1c12` is the deepest red clearing
  WCAG AA (≥4.5:1) against every highlight ground:

  ```
  yellow 7.8 · blue 5.4 · green 6.4 · pink 5.6 · purple 5.0 · cream 9.1
  ```

  Dark mode unhighlighted lifts to `#f5988a` (7.0:1 on `#171b69`). **Inside a
  highlight it returns to `#7a1c12` in BOTH themes**, because highlight grounds
  are light pastels in both — this is the founder's "ensure the highlight color
  is correct for such text", and it is why the light value was measured against
  the swatches rather than against the page.
- 6 tests in `__tests__/red-letter.test.tsx`, including the Luke 10 negative
  case.

## THE OPEN DECISION — attribution only

Three options put to the founder; **not yet answered**:

1. **Safe auto-pass (recommended).** Use the KJV OSIS to identify which VERSES
   contain Christ's speech, then redden quoted spans only within those verses,
   and skip any verse containing a second speaker (a `replied`/`answered`
   reporting clause between quotes). Marks most Gospel passages, never
   mis-attributes. Deliver with a report of marked vs skipped.
2. **Author-marked only.** Hand-authored `redLetter` arrays; `/devo-go` adds
   them on new builds; backfill 125 Gospel passages over time.
3. **Auto-pass then founder review.** Mark everything including ambiguous, hand
   over a review artifact of all 125 passages for per-passage approval.

Secondary question also unanswered: whether to move Gospel passages to KJV to
gain exact markers. **Recommendation: no** — the devotional prose was written
against BSB/NIV wording and 124 passages would change.

---

## Traps re-confirmed today (all now in memory files)

- **`--color-gold` is cobalt `#1f2a8d` in light mode.** Cost three separate
  bugs: bento kickers (SA-044), chat launcher (SA-047), and it is the reason the
  red above was measured rather than picked.
- **`--mock-ink` inverts per theme** (it IS cream in dark), so it must never
  ground `--plate-ink` type — turned the spines cream-on-cream (SA-049).
  `--plate-ground` `#131b40` is the fixed-ground token.
- **`npm run deploy` builds the WORKING TREE, not HEAD.** A worktree +
  symlinked `node_modules` produces a worker that 500s site-wide
  (`Dynamic require of "/.next/server/middleware-manifest.json"`). Took prod
  down once; `npx wrangler rollback <id>` restores in ~30s.
- **`npm run preview` before every deploy** (port 8787). `npm run build`
  succeeding proves nothing — the bundle only fails at request time.
- **husky lint-staged dies on git-index contention** between sessions. Run the
  eight `verify:*` by hand + type-check + lint, then `--no-verify`, and say so.
