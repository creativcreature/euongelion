# Overnight Result — 2026-05-11

**Status:** READY TO DEPLOY · 15/16 tasks shipped + 1 skipped · branch pushed · local Workers-runtime curl verification all green.

**One morning command ships it to production:**

```bash
cd ~/Documents/app-projects/external/euangelion
git checkout main && git pull
git merge --ff-only claude/audit-fixes-2026-05-11
git push origin main
wrangler login                     # one-time interactive auth
npm run deploy                     # opennextjs-cloudflare build + deploy
```

Then curl the live site to confirm:

```bash
curl -sI https://euangelion.app/                                               # 200
curl -s https://euangelion.app/llms.txt | head -2                              # "# Euangelion"
curl -s https://euangelion.app/robots.txt | grep -c GPTBot                     # 1
curl -s https://euangelion.app/devotional/standing-strong-day-5 | grep -oE '<title>[^<]*</title>'  # "Day 5 | Euangelion" (NOT "Day 5: Day 5")
curl -s https://euangelion.app/ | grep -c AUGUSTINE                            # 1 (colophon shipped)
```

---

## What I did

**Branch:** `claude/audit-fixes-2026-05-11` (pushed to `creativcreature/euongelion`).

**Commits (5, including the audit-docs commit from before the work started):**

| SHA       | Title                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `2c003d5` | audit(2026-05-11): consolidated sitewide audit + overnight execution prompt                                       |
| `c53b4ab` | audit-fix(devotional-meta): kill "Day N: Day N" title duplication                                                 |
| `9252247` | audit-fix(devotional-meta): use day teaser for meta description                                                   |
| `6be38f8` | audit-fix(homepage): editorial pass — stable H1, trust strip, copy refresh                                        |
| `e63f7f5` | audit-fix(seo+ux): demote sign-in, rename devotional buttons, ship llms.txt, robots per-bot, replace chiastic arc |

**Diff vs main:** 14 files changed, 1,871 insertions, 95 deletions. Six source files (`page.tsx`, `globals.css`, `robots.ts`, two devotional `page.tsx`, one wake-up `page.tsx`, `DevotionalPageClient.tsx`), one new public file (`llms.txt`), two new docs (`F-061.md`, `TAGLINE-CANDIDATES-2026-05-11.md`), one new audit (the consolidated audit + PDF + overnight prompt).

## Task ledger

| ID                                      | Status     | Files touched                                                                      | Local curl verification                                                                                                                                                                                                                       |
| --------------------------------------- | ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 — Day N: Day N title fix             | ✅ DONE    | `src/app/devotional/[slug]/page.tsx`, `src/app/wake-up/devotional/[slug]/page.tsx` | `<title>` for standing-strong-day-5 → `"Day 5 \| Euangelion"` (not `"Day 5: Day 5"`); peace-day-3 → `"Day 3: Peace the world can't give \| Euangelion"` (real title preserved).                                                               |
| T2 — meta description uses day teaser   | ✅ DONE    | same two files                                                                     | peace-day-3 `<meta description>` is now the day teaser: _"The pivot: Jesus offers a peace that doesn't depend on controlling chaos..."_                                                                                                       |
| T3 — stable H1 + demote rotating to H2  | ✅ DONE    | `src/app/page.tsx`                                                                 | Homepage h1 count = 1 (`<h1 class="sr-only">Euangelion — A daily newspaper of the Gospel</h1>`).                                                                                                                                              |
| T4 — drop TODAY kicker                  | ✅ DONE    | `src/app/page.tsx`                                                                 | Page contains `FEATURED · WHAT IS THE GOSPEL? · DAY 1`; no `TODAY · WHAT IS THE GOSPEL?` anywhere. Hero CTA is `BEGIN THIS DEVOTIONAL`.                                                                                                       |
| T5 — homepage copy rewrites             | ✅ DONE    | `src/app/page.tsx`                                                                 | All audit §6.2 lines applied. `BROWSE EVERY PLAN`, `What's been weighing on you?`, `Or — start where you actually are.`, new pill #2, new How-It-Works copy, new FAQ heading.                                                                 |
| T6 — editorial colophon trust strip     | ✅ DONE    | `src/app/page.tsx`                                                                 | Page contains `ANCHORED IN THE APOSTLES' AND NICENE CREEDS · VOICES FROM AUGUSTINE, À KEMPIS, SPURGEON, TOZER, AND MORE`.                                                                                                                     |
| T7 — Reset Audit conditional + rename   | ✅ DONE    | `src/app/page.tsx`                                                                 | Renamed to "Start a new audit"; wrapped in `{hydrated && auditCount > 0 && ...}`. CSR-rendered so not curl-visible at boot, but source confirmed.                                                                                             |
| T8 — real alt text on Images            | ✅ DONE    | `src/app/page.tsx`                                                                 | Hero alt = `"Illustration accompanying A Voice in the Wilderness"`; step alts = `"Name it"`, `"Read it"`, `"Walk it out"`.                                                                                                                    |
| T9 — demote SIGN IN to text link        | ✅ DONE    | `src/app/globals.css`                                                              | `.mock-auth-link` lost its border + padding; baseline opacity 0.78; hover = underline only (no button-style background flip). Visually confirmed via CSS read.                                                                                |
| T10 — MARK COMPLETE / BOOKMARK rename   | ✅ DONE    | `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`                       | Source contains `MARK READ` + `BOOKMARK`; no `MARK COMPLETE` / `SAVE BOOKMARK`. Curl can't see (CSR shell — that's audit C1).                                                                                                                 |
| T11 — devotional sidebar section labels | ⏭️ SKIPPED | —                                                                                  | Section labels (S1/S2/S3-style) are driven by per-devotional JSON `module.heading` fields. Renaming requires touching 175 JSON files and counts as content work, not engineering. Out of scope overnight per the prompt's explicit skip rule. |
| T12 — public/llms.txt                   | ✅ DONE    | `public/llms.txt` (new)                                                            | `curl /llms.txt` returns 200 with the full content. Previously returned the SPA 404 shell.                                                                                                                                                    |
| T13 — robots.ts per-AI-bot rules        | ✅ DONE    | `src/app/robots.ts`                                                                | `curl /robots.txt` returns 12 per-bot rules + the `*` fall-through (was 1 silent allow-all).                                                                                                                                                  |
| T14 — replace "chiastic arc" jargon     | ✅ DONE    | `src/app/wake-up/page.tsx`                                                         | `curl /wake-up` returns 0 matches for `chiastic arc`. The term remains in `src/lib/soul-audit/composer.ts` because that's an internal LLM-prompt contract, not user copy.                                                                     |
| T15 — Organization JSON-LD on homepage  | ✅ DONE    | `src/app/page.tsx`                                                                 | Homepage emits a third JSON-LD block with `"@type":"Organization"`, `name`, `url`, `logo`, empty `sameAs[]` (founder to fill in socials).                                                                                                     |
| T16 — tagline candidates note           | ✅ DONE    | `docs/decisions/TAGLINE-CANDIDATES-2026-05-11.md` (new)                            | Five candidates saved with mode + tradeoff. **No production tagline change was made.** Founder picks one and the next pass ships it.                                                                                                          |

## Verification artifacts

**Per-commit gate:** Every commit passed `npm run lint && npm run type-check && npm test` via the project's husky pre-commit chain (lint-staged + 8 verify:\* scripts + build + test). The commit-msg hook required `SA-NNN` + `F-NNN` references in every message; both present in all four work commits.

**End-of-batch verification on local Workers runtime (`npm run start` after `npm run build`):**

```text
═══ T1: titles ═══
standing-strong-day-5:  <title>Day 5 | Euangelion</title>          ✅
surrender-to-gods-will-day-4:  <title>Day 4 | Euangelion</title>   ✅
peace-day-3:  <title>Day 3: Peace the world can't give | Euangelion</title>  ✅ (real title preserved)

═══ T2: meta description ═══
peace-day-3 description = "The pivot: Jesus offers a peace that doesn't depend on controlling chaos..."  ✅
(was "Peace — How can I find peace in a world that constantly disturbs it?")

═══ T3: h1 count ═══
homepage h1 count = 1                                              ✅

═══ T6: colophon ═══
"ANCHORED IN THE APOSTLES' AND NICENE CREEDS · VOICES FROM AUGUSTINE, À KEMPIS, SPURGEON, TOZER, AND MORE"  ✅

═══ T12: /llms.txt ═══
HTTP 200; body starts with "# Euangelion"                          ✅
(was an HTML SPA shell with <meta name="robots" content="noindex"/>)

═══ T13: /robots.txt ═══
12 per-bot rules + fall-through wildcard                            ✅

═══ T14: chiastic arc ═══
0 matches in /wake-up                                              ✅
```

## What's deferred to supervised work (NOT in this branch)

| Audit punch-list item                                          | Why deferred                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| #2 — Make devotional page server-rendered (kill CSR shells)    | Architectural change; 175 pages at risk. Needs paired review. The single most-impactful audit finding. |
| #3 — Collapse mobile day-nav behind bottom-sheet pill          | Visual + interaction redesign; needs preview verification.                                             |
| #6 — Email capture form                                        | Requires ESP provider integration + founder decision on provider.                                      |
| #11 — Surface "Continue day N of [series]" cue beyond homepage | Cross-cutting; touches multiple route boundaries; visual placement decision.                           |
| #14 — Daily Bread page restructure                             | Founder UX call.                                                                                       |
| #15 — Backfill `datePublished` per devotional                  | Data sourcing required for 175 entries.                                                                |
| Tagline change (T16 production roll)                           | Awaiting founder selection from `docs/decisions/TAGLINE-CANDIDATES-2026-05-11.md`.                     |
| Hero image rotation (audit punch-list #10 path B)              | Visual call; current pass took the safer "drop the TODAY kicker" route.                                |
| Devotional sidebar section labels (T11)                        | 175 JSON files; counts as content work, not engineering.                                               |

## Account / stack reality

- `git config user.email` = `chrisparker21@gmail.com` (matches CLAUDE.md)
- `gh auth` active = `creativcreature` (matches CLAUDE.md; also wokegodX + meltatl-26 cached but inactive)
- `git remote get-url origin` = `https://github.com/creativcreature/euongelion.git` (matches CLAUDE.md, contradicts MEMORY.md's `wokegodX/euangelion`)
- `npx wrangler whoami` = **NOT AUTHENTICATED** — this is why the deploy step is in the morning command, not the overnight run.
- `wrangler.jsonc` present (Cloudflare Workers); no `vercel.json`/`vercel.ts` (no Vercel wiring)
- `.github/workflows/ci.yml` runs lint/type-check/build/test on push to main — **no auto-deploy workflow.** Production deploy is always `npm run deploy` interactively.

## Things to know before pushing

1. **The PR URL is** `https://github.com/creativcreature/euongelion/pull/new/claude/audit-fixes-2026-05-11`. If you'd rather review a PR than merge to main directly, open it first.
2. **The `revamp/overnight-2026-05-04` branch in your primary checkout has 2 untracked files** (`docs/audits/HOMEPAGE-AUDIT-PROMPT.md` from a prior session, and `scripts/duotone-halftone.py`). Stash or commit them before `git checkout main` in your primary checkout.
3. **Worktree note:** all of this work happened in `.claude/worktrees/hardcore-dewdney-58a479/`. Since worktrees share `.git/`, the branch and commits are immediately visible from your primary checkout — no fetch needed locally, just `git checkout claude/audit-fixes-2026-05-11` would also work to inspect.

## Rollback recipe (if something looks wrong post-deploy)

```bash
# Find the merge commit on main
git log --oneline -5

# Revert it
git revert -m 1 <merge-sha> --no-edit
git push origin main

# Redeploy the prior state
npm run deploy
```

Cloudflare's dashboard also supports rolling back to the prior Worker version via the UI if `npm run deploy` is slow or you want a one-click option.

## Bottom line

Branch is green, pushed, and ready for one merge + one `wrangler login` + one `npm run deploy`. The day-nav-pushes-content problem (the founder's original complaint) is _not_ fixed here — it's punch-list #3 and needs supervised work. What's shipping is everything from the audit that was safe to ship unattended: the title bug, the meta-description bug, the homepage editorial pass, the colophon trust strip, the llms.txt, the robots.txt per-bot decisions, the chiastic-arc jargon kill, the SIGN IN demotion, and a few quiet wins. Net change: the site reads more like a newspaper and is no longer invisible to AI crawlers.
