# Handoff — 2026-08-30 — Who is God, and Seeking Help GA moved last

**Shipped and live.** `SA-134 (F-178)`. Deployed version `d3ad378c`, branch
`feat/seeking-help-georgia`, pushed. Another session owns Drawing Near
(`SA-132/133`) on the same branch — that work was already live before this run
and is untouched here.

## What is live

| Thing                                 | State                              |
| ------------------------------------- | ---------------------------------- |
| `/who-is-god`                         | 200, static, 82 KB, 20,239 px tall |
| Homepage doorway band → `/who-is-god` | live                               |
| Seeking Help GA last on the homepage  | live, renders after the FAQ        |
| `/video/who-is-god-genesis.mp4`       | 200, 4.5 MB, 1280×720, 5.04 s      |
| Sitemap entry                         | present, priority 0.9              |

## The two things worth knowing

**1. The hero film could not seek, and the fix is not obvious.**
Cloudflare Workers' asset handler does not answer HTTP Range requests for this
bundle — `Range: bytes=0-1023` returns `200` with the whole file and no
`Accept-Ranges`. Chrome refuses to seek a progressive video it cannot
range-request, so `video.seekable` was `[0,0]` and every write to `currentTime`
read back `0`. The scrub was fully implemented and did nothing; the hero was a
still frame on the first deploy.

`ScrubbedFilm` now `fetch`es the mp4 once, makes an object URL, and points the
element at that. Verified live: `seekable.end(0)` 0 → 5.042, scroll drives
`currentTime` 0 → 4.616 and back to 0.005.

**If you add another scrubbed film anywhere on this site, it will hit the same
wall.** Reuse `ScrubbedFilm`, do not hand-roll it.

**2. The animation must never gate the words.**
Staged entrances start at `opacity: 0`, scoped to `.wig[data-js='true']` which
the component sets in an effect. The first implementation had this inverted and
rendered a blank page with JavaScript off. Caught by screenshotting with
`--disable-javascript` — the build passed the whole time. Keep that scope.

## Open, deliberately not done

- **SBL Hebrew is missing.** `design-system/typography.css:71` declares
  `@font-face` for `/fonts/SBLHebrew.woff2` and that file is not in
  `public/fonts/`. All 15 names render in the Times New Roman fallback —
  correctly vocalised and legible, but not the intended face. Dropping the woff2
  in fixes it with no code change. This affects every Hebrew surface on the site,
  not just this page.
- **`__tests__/narration-manifest-current.test.ts` fails** on
  `all-these-things-*` and `drawing-near-*` tracks pointing at non-content-
  versioned keys. Pre-existing, belongs to the narration work, not touched here.
- **The cookie notice covers the hero sub-copy** on a first visit. Site-wide
  component; would need its own decision.
- **Only one film was generated** (~319 of the 1,000 credits allowed). Chapters
  2–7 use founder-approved series plates from `public/images/site/series/`,
  because `CLAUDE.md` forbids Claude Code generating imagery and
  `public/images/library/` is gitignored and absent from the tree.

## Where the content came from

All 92 scripture quotations were extracted by script from `public/bibles/BSB`
into `src/data/who-is-god-verses.ts` and the two modules beside it. None was
typed from memory. The verse bank is deliberately **not** annotated
`Record<string, Verse>` — letting TypeScript infer the literal key union is what
makes a bad `<Scripture k="...">` a compile error. That caught the one real
content bug in this build, which had previously only surfaced as a prerender
crash in `next build`.
