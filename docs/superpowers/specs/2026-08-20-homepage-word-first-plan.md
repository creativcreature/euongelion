# Homepage: the Word leads (Option G as founder-amended) — execution plan

Founder rulings (2026-08-20, overnight authorization "get it all done", scope
items 1-4): the homepage below the header is rebuilt to the research-backed
order; THE WORD LEADS via a daily verse pulled from the Daily Bread; TDD
throughout; copy via DEVOTIONAL-WRITER (recommendations adopted tonight, all
options presented in the morning report).

## Design decisions taken (flagged for morning review)

1. **The daily Word = the edition's PROVERB row** (`kind: 'proverb'`, one BSB
   proverb per day, verbatim, deterministic). The edition's `verse` kind is
   the WEEKLY memory verse (repeats seven days by design) and so cannot be
   "the verse of the day, which changes daily". Swapping to the weekly verse
   later is a one-line kind change.
2. **Homepage becomes ISR (revalidate 3600)** via a thin server `page.tsx`
   wrapping the existing client component (renamed `HomeClient`). This is the
   exact daily-bread pattern ("revalidate every hour so the edition date is
   always correct") and replaces the year-long static cache — required for a
   server-fetched daily verse without client pop-in.
3. **Rule-1 posture:** `getEdition` throws on DB failure; the page catches
   ONLY to render a visibly-unavailable Word block ("Today's verse is
   unavailable.") — the block looks broken, the page survives.
4. **Copy adopted** (writer's recommendations): Grace Line "Free. No account.
   No ads. No streaks. Nothing to fall behind on." · Condition line "Maybe
   faith went quiet. Maybe it never started. Maybe you're just worn out." ·
   One action "Start where you are" · Reading caption "Today's reading.
   Tomorrow brings another."
5. **Scale line is computed, never hand-typed:** readings from
   `Object.keys(DEVOTIONAL_TEASERS).length`, hours from `AUDIO_HOURS`,
   series from `SERIES_COUNT`.

## Target order (below the untouched header area)

hero (untouched) → resume banner (untouched) → **The Word** (daily proverb) →
**Soul Audit** (condition line above the question) → **Grace Line** strip →
**featured reading** (+ caption) with **audio callout** beside it → **scale
line** → series row → how-it-works → **one action** → FAQ (reordered:
sign-up, missed-day, time, skeptical).

Deleted: action ladder, standalone CTA block, both trust rows, "What is this
place?" (folds into the condition line). Every deletion founder-authorized
("this final one can change the entire homepage minus the header area").

## Tasks

- T1 RED: `__tests__/homepage-word-first-contract.test.ts` — word-of-the-day
  resolver behavior (injected fetcher), page-split contract, block-order
  contract, deletion contract, FAQ order. Watch it fail.
- T2 GREEN: `src/lib/home/word-of-the-day.ts` resolver.
- T3 GREEN: split `page.tsx` → server wrapper (revalidate 3600, fetch word)
  - `HomeClient.tsx`; update the three contract tests that pin
    `src/app/page.tsx` paths.
- T4 GREEN: reorder + deletions + new blocks (Word, Grace Line, scale line,
  one action, condition line, caption) reusing existing classes — reorder,
  not restyle (SA-037 precedent). CSS additions minimal.
- T5 Full gates: type-check, verify:\*, lint, full suite, build.
- T6 Docs: fresh SA id + F-PRD + registry/index/EXPECTED bump + CHANGELOG;
  pool doc + proofs artifact Moses truth-up rides along.
- T7 Preview (Workers runtime): curl + real-Chrome checks of order, verse
  presence, one-action; then merge to main, push, clean-worktree deploy,
  live verify in real Chrome. SW pair bump (check prod version first).
- T8 Morning report: what shipped, the two flagged decisions, all copy
  alternates, and the one-tap swaps available.
