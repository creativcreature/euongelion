# Newspaper-Metaphor Pitch — session notes (2026-05-16)

## What this is

A single review page for the founder presenting:

1. The "Peanuts but Jesus" tone study for THE FUNNIES (six sample captions).
2. A two-sided argument for the LETTERS TO THE EDITOR sub-kicker on Soul Audit.
3. The bento tile gamut — every tile concept worth considering.
4. The interaction + animation gamut — small touches → cinematic moments.
5. A recommended v1 cut.

**Strict scope per founder lock-in:** the only files touched this round are this `notes.md` and `public/audits/2026-05-16-newspaper-metaphor/index.html`. Nothing in `src/`, nothing live on the homepage. The pitch page is decision-support only.

## What the founder confirmed before this page was drafted

- Funnies tone: "Peanuts but Jesus" — Charlie-Brown energy, hope held alongside doubt, philosophical innocence. Never preachy; never snarky.
- Wants research + pitch before committing to LTE kicker, bento tile set, or interaction concepts.
- Format: one long page, focused/distilled sections, one-thing-at-a-time scanning.
- Wants a *lot* of ideas — including ones they may not have considered.
- Named interaction candidates: cinemagraphs, scroll-reveal "roll the stone from the grave" hero.
- Bar: Awwwards / Steve-Jobs-tier feel without slipping into gimmick.

## Page structure

- `01 Brief` — frames the decision space.
- `02 The Funnies` — six panels reusing existing archive prints (Chartres labyrinth, Aivazovsky's Ninth Wave, Vermeer's Christ in the House of Martha and Mary, Watts' Hope, Fra Angelico's Annunciation, Chardin's Grace Before a Meal). Each pairs the painting with one Schulz-flavored caption.
- `03 Letters sub-kicker` — pro/con/recommendation. Recommendation: ship the LETTERS bento tile that funnels into Soul Audit; don't add a sub-kicker on Soul Audit itself.
- `04 Bento tile gamut` — 12 tiles total (7 core + 12 wildcards). Each is a pitch card with effort (S/M/L/XL) + what-it-gives-up + ship-in-v1 tag.
- `05 Interaction gamut` — 24 cards grouped into seven categories (founder-named, subtle motion, scroll storytelling, page-turn metaphors, Awwwards-tier, typography, hardware-tier).
- `06 Recommended v1` — green-light list, v2 list, and skip list.

## Sources

- Bento grid 2026 — [Landdding "Bento Grid Design Guide"](https://landdding.com/blog/blog-bento-grid-design-guide); [Studiomeyer "Bento Grid Layouts"](https://studiomeyer.io/en/blog/bento-grid-layouts).
- Cinemagraphs in web — [Internetdevels "Cinemagraphs: Subtle Motion"](https://internetdevels.com/blog/cinemagraphs-for-your-websites-design); [Skya Designs trend write-up](https://www.skyadesigns.co.uk/web-design-insights/top-web-trend-in-2024-cinemagraphs/).
- CSS scroll-driven animations — [Josh W. Comeau](https://www.joshwcomeau.com/animation/scroll-driven-animations/); [MDN scroll-driven timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines); [design.dev scroll-timeline guide](https://design.dev/guides/scroll-timeline/).
- Newspaper-metaphor web design — [Webflow "10 best news websites"](https://webflow.com/blog/news-web-design); [Colorlib "Best Newspaper Website Designs"](https://colorlib.com/wp/newspaper-website-design/).
- Peanuts / Schulz theology — [Stephen J. Lind, *A Charlie Brown Religion*](https://www.upress.state.ms.us/Books/A/A-Charlie-Brown-Religion); [Beliefnet "Religion, Charlie Brown, and Charles Schultz"](https://www.beliefnet.com/entertainment/articles/religion-charlie-brown-and-charles-schultz.aspx); [Agape Review summary](https://agapereview.com/2022/12/22/acharliebrownreligion/).

## Why each Funnies caption was drafted

The six sample captions span a deliberate range of tone so the founder can pick the center of gravity:

- **A · Chartres labyrinth** — quiet, philosophical. Anonymous voice; a confession about repetition that doesn't quite land as progress.
- **B · Aivazovsky stormy sea** — Charlie-Brown confessional. "I keep waiting until the boat goes under" is Linus speaking from the back of the boat. Direct, self-aware.
- **C · Vermeer Christ / Martha / Mary** — dry, observational. The Mary/Martha line is the most quotable of the six; functions as a punchline without being a joke.
- **D · Watts' *Hope*** — the most Linus-like. Hope as the one string still tuning; eyes blindfolded. Schulz-tier image-text pairing.
- **E · Fra Angelico Annunciation** — angels and ordinary people. The honest beat is "I would have fainted." Hope-with-doubt voice.
- **F · Chardin grace before meal** — the quietest of the six. About faith preceding outcome. The kind of line that lands on the fourth read.

All six can be cut or rewritten. The grid is calibrated to surface tone, not to be shipped verbatim.

## Why the LTE recommendation is "don't add the sub-kicker"

The Soul Audit section was just twice-reverted (R39 stripped the trust-row cobalt, R42 stripped the section's deep-navy block). Adding another theming layer immediately after stripping two would create a yo-yo signal — and Soul Audit is the section most exposed to "this is software, not a paper" framing, where over-theming hurts more than it helps. The bento LETTERS tile gets the metaphor without paying a tax on the working CTA.

## What's deliberately not in the v1 pick list

- **Editions Archive** — daily snapshots of the homepage that stay readable at `/editions/YYYY-MM-DD/`. The strongest metaphor on the page. Skipped for v1 because it requires daily snapshot infrastructure and storage. Worth a separate plan in v2 or v3.
- **Audio Edition** — TTS-narrated daily edition. Premature; needs quality-of-narration commitment.
- **Marginalia tile** — reader-submitted quotes. Chicken-and-egg; ship when there's a base.
- **Page-flip mode toggle / Page-turn route transition** — Awwwards-grade visual moments but XL effort. v2 candidates.
- **Custom cursor / Soundscape toggle** — Awwwards staples that could feel disorienting on a contemplative site. Marked Maybe rather than v1.
- **Long-scroll dateline fade / Reading-time gated reveals / Kinetic headline scatter** — explicitly skipped; they fight the founder's "no engagement bait" rule.

## Where this page lives

```
public/audits/2026-05-16-newspaper-metaphor/index.html   (live; reviewable on phone)
docs/audits/2026-05-16-newspaper-metaphor/notes.md       (this file)
```

Matches the existing audit-folder convention established by `overnight-2026-05-14/` and `visual-audit-2026-05-13/`. All review/audit pages live together for archiving.

## Phase 2 (not in scope this round)

After founder review, a follow-up plan will:

1. Implement the selected bento tiles via a new `src/components/homepage/FrontPage.tsx` + tile components.
2. Author the Funnies corpus in `src/data/funnies.ts` and render via `src/components/homepage/DailyFunnies.tsx`.
3. Upgrade the topbar dateline in `src/components/EuangelionShellHeader.tsx`.
4. Add the selected interaction CSS (scroll-timeline, view-timeline, hover micro-interactions) in `src/app/globals.css`.
5. Gate each interaction behind a class flag so it can be turned off in one line if it doesn't land.

No changes to Soul Audit, Ready-to-Begin, hero image, masthead, devotional reader, Daily Bread, or sidebar — per the founder's standing constraints.
