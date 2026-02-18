# Founder 10/10 UX Evaluation Runbook

Purpose: run a consistent manual product review so you can score each major area out of 10 and make release decisions from evidence, not memory.

## Scoring Scale

- `10` = production-polished, no notable friction, visually coherent, behavior predictable.
- `8` = strong and shippable, minor polish gaps only.
- `6` = works but noticeable friction, inconsistency, or unclear behavior.
- `4` = major UX debt; users will hesitate or get confused.
- `0-2` = broken or misleading.

## Test Environment Setup

1. Desktop:
   - Chrome (latest), viewport `1440x900`.
   - Safari (latest), viewport `1512x982` (MacBook baseline).
2. Mobile:
   - iPhone 14/15 viewport (`390x844`) in Safari.
   - Android viewport (`412x915`) in Chrome.
3. Clear state for full-flow pass:
   - clear local/session storage.
   - sign out.
4. Record:
   - screen capture per section.
   - score + one-line reason.

## Section A: Brand and Visual Continuity

Routes:

- `/`
- `/soul-audit`
- `/soul-audit/results`
- `/daily-bread`
- `/series`

Checks:

1. Header/topbar/nav/masthead feel like one system on every route.
2. Border grid, paper/ink palette, and spacing rhythm are consistent.
3. Body typography size is readable at first glance on desktop and mobile.
4. No abrupt style jumps between routes.

Score this section `/10`.

## Section B: Navigation and Scroll Behavior

Routes:

- `/`
- `/soul-audit/results?planToken=<active-token>`
- `/daily-bread`

Checks:

1. Sticky behavior is predictable (no jump/clip/overlap).
2. Mobile menu opens/closes cleanly; no scroll lock traps.
3. Primary nav targets route correctly.
4. Header does not shift off-screen during scroll.

Score this section `/10`.

## Section C: Soul Audit Submission and Option Selection

Route:

- `/soul-audit`
- `/soul-audit/results`

Checks:

1. Submit gives 5 options (`3 AI + 2 prefab`) every time.
2. Consent gating is clear and required before selection.
3. Option cards feel clickable and provide understandable rationale.
4. Reroll flow is explicit and safe.
5. Error states provide recovery path.

Score this section `/10`.

## Section D: Plan Activation and Reading Continuity

Route:

- `/soul-audit/results?planToken=<active-token>`
- `/daily-bread`

Checks:

1. Selecting an option leads to clear active devotional state.
2. Current day content, locked previews, and progression are understandable.
3. Reading flow feels stable (no jank or layout shifts while scrolling).
4. Transition from results -> daily devotional feels continuous.

Score this section `/10`.

## Section E: Library and Archive System

Route:

- `/daily-bread`

Tabs:

- `Today + 7 Days`
- `Bookmarks`
- `Highlights`
- `Notes`
- `Chat History`
- `Archive`
- `Trash`

Checks:

1. Every rail section opens and contains meaningful state messaging.
2. Archive and restore flows are understandable.
3. Data relationships feel logical (day, verse, note, chat context).
4. No duplicate/conflicting navigation labels.

Score this section `/10`.

## Section F: Interaction Polish

Routes:

- `/`
- `/soul-audit/results`
- `/daily-bread`

Checks:

1. Buttons and links have clear affordance and consistent hover/focus behavior.
2. Micro-interactions are subtle and non-distracting.
3. No noisy visual effects that hurt readability.
4. Light/dark mode both preserve newspaper identity.

Score this section `/10`.

## Section G: Accessibility and Legibility

Checks:

1. Keyboard-only: complete a core flow (home -> audit -> results -> daily bread).
2. Focus states are always visible.
3. Contrast is readable for body/meta text in light and dark.
4. On mobile, no horizontal overflow and text remains legible.

Score this section `/10`.

## Section H: Trust and Product Clarity

Checks:

1. User always understands what happens next.
2. Empty/error states are specific, not generic.
3. Content appears scripture-led and spiritually coherent.
4. Product feels intentional, not stitched together.

Score this section `/10`.

## Final Scorecard Template

| Section                       | Score (0-10) | Notes |
| ----------------------------- | ------------ | ----- |
| A. Brand continuity           |              |       |
| B. Navigation + scroll        |              |       |
| C. Soul Audit flow            |              |       |
| D. Plan activation + reading  |              |       |
| E. Library + archive          |              |       |
| F. Interaction polish         |              |       |
| G. Accessibility + legibility |              |       |
| H. Trust + clarity            |              |       |

Overall score formula:

- `Overall = average(A..H)`
- release-ready threshold recommendation: `>= 8.5` with no section under `8.0`.

## Escalation Rule

If any section is `< 7`:

1. open one focused issue.
2. attach route + screenshot/video.
3. define expected behavior in one sentence.
4. patch only that category before re-scoring.
