# Handoff — 2026-08-16 — the design session

Written for compaction. Everything here is either **shipped and live**, **open
with a named reason**, or a **trap worth keeping**. Nothing is in my head only.

Three sessions ran in parallel today. Decision ids and F-numbers collided four
times; see “Parallel-session hazards” at the end.

---

## Shipped and live

| Commit | Decision | What |
| --- | --- | --- |
| `debea132` | SA-060 (F-104) | Mobile pass, the lancet, site-wide scroll motion |
| — | SA-062 (F-106) | **Flow** — the artboard, replacing the rose window |
| — | SA-063 (F-107) | Imagery ruling, fail-open motion, the mobile menu |
| — | SA-064 (F-108) | The press impression (open animation), centred resume button |

Live at time of writing: service worker **v92** (v93 with the last commit).

### The big ones

- **Daily Bread ↔ Today swapped**, paper renamed *The Daily Bread* (SA-059 /
  F-103). Swapped **by meaning, not by string** — ~20 references meaning “my
  plan reader” followed the content to `/today`, including the soul-audit
  redirect payloads, middleware auth matcher, onboarding destination and the
  router pushes in LibraryView / SeriesActions / DevotionalActions.
- **Flow** is the first toggle and the default view; **Rose is deleted**
  entirely (view, geometry, tests, CSS).
- **Site-wide scroll motion** — reveal + capped parallax, plus the **press
  impression** intro.
- **The paper is a bento sheet** on both `/daily-bread` and `/today`.

---

## Still open

1. **Imagery generation belongs to Codex.** Founder ruling (now in `CLAUDE.md`):
   Codex built-in `image_gen` only — never `~/.codex/skills/.system/imagegen/scripts/image_gen.py`
   (it bills the API account per image), never Nano Banana, never Higgsfield.
   **Claude Code has no built-in `image_gen`, and there is no `codex` binary on
   PATH**, so this cannot be done from a Claude session at all.
   *Disclosure: 8 images were generated through the billed CLI before that
   ruling arrived; the founder accepted the spend.*
2. **Full mobile audit of all seven toggles.** Blocked, not skipped — the
   browser tooling repeatedly reported a 1313px viewport while the window was
   414px, so measurements were worthless. Covers, Rack, the lancet and Flow were
   verified by screenshot; the rest were not.
3. **Wider contextual imagery / transparent-PNG plates / remaining awkward
   gaps.** Needs generation → Codex.

---

## Traps worth keeping

**Motion must fail open.** The home page shipped its three step cards
**invisible** — they carried `data-reveal`, the observer never fired, and they
sat at `opacity: 0`. `Reveal.tsx` now reveals anything already in the viewport
on mount **and** sweeps everything still hidden after 2.5s. Both guards can only
ever reveal. If you add motion anywhere, keep that property.

**Lazy loading never fires inside a transformed container.** Hit twice — the
rose window, then Flow. Children of an element with a `transform` keep an empty
`currentSrc` forever, even dead centre in the viewport. Those plates load
`eager`.

**`??` keeps a zero.** Flow's dead right-hand column: an un-laid-out frame
reports `clientWidth === 0`, and `0 ?? fallback` is `0`. The real fix was to
stop measuring — the board is a CSS grid at `width: 100%` and fills by
construction.

**`--color-gold` is cobalt in light mode.** Fourth time this has cost something;
here it made the scroll-progress line invisible *even where it was not covered*.

**`max-height` caps LINE LENGTH in vertical writing mode.** A hardcoded
`max-height: 300px` on `.spine-title` is what ellipsised the spine titles. I
raised the spine height twice before finding it — height was never the
constraint.

**`statusLabel` already falls back to `dayCountLabel`.** Pairing them prints
“6 DAYS · 6 DAYS”.

**The `type-check` gate has a hole.** `tsc --noEmit` passes code that
`next build` rejects — Next's typed-routes check is stricter (`Type 'string |
null' is not assignable to type 'Url'`). Green gates do **not** guarantee a
green build.

**Centring that “is already centred”.** The resume button ignored
`justify-items: center` while the copy above it looked centred — because
`text-align` was doing that job inside full-width grid items and masking the
fact that item alignment never reached the link. It now carries `justify-self`,
`align-self` **and** `margin-inline: auto` so it holds under grid, flex or
block.

**A test can pass while testing nothing.** Flow's first test read inline
`left`/`top` that no longer existed, so `parseFloat` returned `NaN` and every
comparison passed. Rewritten against real grid placement.

---

## The open animation (SA-064 / F-108)

First attempt was a curtain — founder: *“It was half assed.”* Rebuilt as **the
press impression**, which is the one sequence only this masthead can make:

1. **Ink** — solid cobalt, wordmark knocked out (the letters are paper showing
   through, not white type on top).
2. **Set** — the word arrives over-tracked and tightens, the way type is set.
3. **Register** — a crimson ghost offset a few px slides into alignment.
   Misregistration is this brand's actual signature.
4. **Hand off** — the ink lifts on a hard edge and the wordmark **flies to the
   measured position and size of the real masthead**. The intro *becomes* the
   site rather than getting out of its way.

Two calibration notes, both found by slowing it 6× and photographing it:

- The **widest** frame is the one that must fit the viewport. At `10.5vw` with
  `0.34em` tracking the word ran off both edges.
- The slip's own opacity keyframes **override** the shared fade-in, so if it
  starts at full strength the crimson arrives before the cream and the whole
  thing reads as a red word. It now fades in from zero and trails.

Safety, unchanged: paints on top of a fully rendered page, `pointer-events:
none` + `aria-hidden` from frame one, home only, once per session, skipped under
reduced motion, hard-stopped at 3.2s.

---

## Parallel-session hazards (re-confirmed, four collisions today)

- **F-101, F-102, SA-058 were all taken** by another session mid-work. I
  overwrote their `F-101.md`; it was committed, so I restored it from HEAD
  intact and renumbered mine. **Always re-check both `production-decisions.yaml`
  and `docs/feature-prds/` immediately before committing.**
- **`EXPECTED_FEATURE_IDS`** in `scripts/check-feature-prd-integrity.mjs` is
  bumped by whoever adds a PRD — it will be stale under your feet.
- **Concurrent `next build`s corrupt each other** through
  `node_modules/.cache`: you get either a `WasmHash` null crash or a spurious
  type error. Four rushed attempts failed; waiting for the other session to go
  quiet succeeded first try. There is a watcher script pattern in the scratchpad
  that polls for build processes + `src/` mtimes before starting.
- Stage by **explicit file list**, never `git add -A`.

---

## Verification discipline that held

`npm run preview` (Workers runtime) before every deploy, and check the served
HTML — not the build log. Two things that look like failures and are not:

- **The preview binds IPv6-only.** `curl http://localhost:8787` returns nothing
  while `curl "http://[::1]:8787"` returns 200. I lost ~40 minutes to this.
- **The in-page JS tool can attach to a stale document** — it reported a 1313px
  viewport against a 414px window and `clientWidth: 0` for a visibly-sized
  element. When numbers disagree with a screenshot, trust the screenshot.
