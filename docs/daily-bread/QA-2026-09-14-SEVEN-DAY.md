# Daily Bread V2 — seven-day visual comparison (plan §86)

SA-142 / F-184, 2026-09-14. Seven fixture editions (Sep 14–20, offline sources,
deterministic frames) were rendered by a local production build at 390×844 and captured
as first screens and full pages.

- First screens: `qa/2026-09-14-seven-day-first-screens.webp`
- Full pages: `qa/2026-09-14-seven-day-full-pages.webp`

The plan's test: the same publication, clearly different daily editions. It fails if
they look like "the same stack of cards + new text".

## Round 1 (rotation and anti-repeat as of `f994ef01`)

| Date | Archetype | What the phone shows first |
| --- | --- | --- |
| Sep 14 | Broadsheet | series plate (sprouting tree), lead headline |
| Sep 15 | Red Letter | Christ's words set large in crimson |
| Sep 16 | Study Table | series plate (hands breaking bread), lead headline |
| Sep 17 | Field Notes | **the same plate and a lead headline** |
| Sep 18 | Prayer Book | the day's prayer, set as the front page |
| Sep 19 | Joy | the procedural scene (ASCII renderer), then the plate |
| Sep 20 | Red Letter | Christ's words in crimson |

**Verdict: fails on Sep 16 → 17.** On a desktop, Study Table (lead + word) and Field
Notes (lead + Scripture rail) differ. At phone width both rails drop below the lead, so
the two days opened identically with new text. The hero rule compared hero variants
(`lead-with-word` ≠ `lead-with-rail`), not what a phone shows.

**Fix (`heroGroup`).** Every lead-led opening is one hero for the day-to-day exclusion.
The 60-day simulation now asserts no two consecutive lead-led fronts.

## Round 2 (after the fix)

| Date | Archetype | First screen |
| --- | --- | --- |
| Sep 14 | Broadsheet | plate + headline |
| Sep 15 | Red Letter | Christ's words |
| Sep 16 | Study Table | plate + headline |
| Sep 17 | Prayer Book | the prayer |
| Sep 18 | Broadsheet | plate + headline |
| Sep 19 | Joy | scene, then plate |
| Sep 20 | Red Letter | Christ's words |

**Verdict: passes the plan's test. No two consecutive days open the same way.** Below the
first screen, the band order, the rotating departments (games on Study Table and Joy,
none on Prayer Book, the Gallery on Broadsheet), and page lengths from 12,477 to
14,880 px all differ day to day. It is recognisably one paper: the same masthead,
contents line, type and rules.

## What still weakens the week (not fixed here)

1. **The same series plate on non-consecutive days** (Sep 16 and Sep 18: hands breaking
   bread). Offline fixtures have no generated daily plates, so each lead falls back to
   its series art, which repeats for the length of a series. In production the CI "Draw
   the lead plates" step makes a plate per date when it runs, so this is partly a
   fixture artifact. It is UNVERIFIED how often production falls back to series art.
2. **The Joy front page opens on the ASCII scene**: a visible glyph field, which
   `VISUAL-ENGINE-CONSTRAINTS.md` C13 fails. This waits on the scenes verdict.
3. **Red Letter appears twice in the week** (Sep 15 and Sep 20). This is allowed
   (anti-repeat bars consecutive days and penalises the last three), but a reader may
   notice.
