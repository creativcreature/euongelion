# Session boundaries — 2026-08-16

Two sessions are working this repo at once. This is written to be read by the
**other** session as much as by mine. Founder is relaying it both ways.

- **Session A — design/motion.** Mobile pass, home page, series rack + Rose,
  Today/Daily Bread newspaper layout, site-wide scroll motion, image regen.
- **Session B — reader systems (this one).** Audio transport, cross-device
  resume, journaling, Library, the two-state auth model.

---

## 1. Who owns which files

**Session A's working set — I will not touch these.** Confirmed from
`git status` at 15:10:

```
src/app/daily-bread/page.tsx      src/app/layout.tsx
src/app/globals.css               src/app/page.tsx
src/components/EuangelionShellHeader.tsx
src/components/series/SeriesLayouts.tsx
src/components/motion/Reveal.tsx  src/data/devotional-teasers.ts
```

**Session B's working set — please leave these to me:**

```
src/components/NarrationPlayer.tsx      src/components/audio/*
src/components/NarrationMiniBar.tsx     src/components/NarrationChapters.tsx
src/components/reader/*                 src/lib/audio/*
src/components/DevotionalLibraryRail.tsx
src/components/LibraryView.tsx          src/components/TextHighlightTrigger.tsx
src/app/api/annotations/route.ts        src/app/api/listening-progress/route.ts
src/lib/privacy/*                       src/lib/soul-audit/repository.ts
```

**Shared, touched carefully:** `src/app/devotional/[slug]/DevotionalPageClient.tsx`
(I added `ReaderProvider`, `moduleIndex` and a journal section; motion markup is
welcome around them), `ModuleRenderer.tsx` (I added an optional `moduleIndex` —
additive), `CHANGELOG.md`, and the feature-PRD registry.

---

## 2. Id collisions — FOUR so far today

Every one cost a renumber. `docs/production-decisions.yaml` is canonical for SA
ids; a PRD file on disk is canonical for F ids.

| #   | What happened                        | Resolution                              |
| --- | ------------------------------------ | --------------------------------------- |
| 1   | `6f5f040c` took **SA-057 / F-100**   | Session B renumbered to SA-062 / F-103  |
| 2   | `27da1135` took **SA-059 AND F-103** | Session B renumbered to SA-061 / F-105  |
| 3   | `Reveal.tsx` cites **F-104**         | Session B yielded; F-104 is Session A's |
| 4   | `debea132` took **SA-060**           | Session B renumbered to SA-062          |

**Currently claimed by Session B:** SA-058 (transport, F-101), SA-061
(journaling, F-102), SA-062 (two-state model, **F-105** — not yet written).

Collision #4 landed in the ninety seconds between checking the yaml and writing
this file, which is the clearest possible argument for the convention below:
**checking is not claiming.**

**Suggested convention:** claim an id by committing the `docs/feature-prds/F-xxx.md`
stub FIRST, before writing code that cites it. Re-check both sources immediately
before writing, not at planning time — the gap between planning and writing is
where all three collisions happened.

> **Trap:** `scripts/check-feature-prd-integrity.mjs` hardcodes the expected PRD
> count. Adding a PRD without bumping `EXPECTED_FEATURE_IDS` blocks **every**
> commit in the repo, not just yours. Its error message used to print the wrong
> number; that is fixed.

---

## 3. Findings from Session B that affect Session A's work

Offered because they will cost time otherwise.

**`--color-text` does not exist in this codebase.** The token is
`--color-text-primary`. An invalid `var()` falls back to `inherit` for `color`
(so text survives and the bug hides) but computes to **transparent** for
`background`. This made the new play button invisible in light mode, and it was
already latent in `NarrationChapters`. Same family as SA-044/SA-047. Worth a
grep during the motion/CSS pass — `grep -rn 'var(--color-text)' src/`.

**`--color-gold` is COBALT `#1f2a8d` in light mode.** The name is historical.
Any element pairing a background and a foreground must set both halves per
theme.

**Do not change the mini bar's height.** `globals.css` positions the
reader-theme button and the chat launcher off `--narration-bar-h`; changing it
silently re-collides them. If the motion pass restyles the bar, keep the box.

**The scroll-progress bar sits under the header** — Session A already found
this. `ScrollProgress` is mounted inside the reader too, so a z-index fix in the
shell should be checked on `/devotional/[slug]` as well.

**Statically generated reader.** `/devotional/[slug]` uses
`generateStaticParams()` + `revalidate = 3600`. Anything that forces it dynamic
(reading `getUser()`, `cookies()`, `headers()` in the server component) drops
ISR across ~568 pages. This is why Session B resolves auth client-side.

---

## 4. What Session B has NOT done, and why

**Phase 4 — the two-state auth gate (SA-062 / F-105) is deliberately paused.**
It needs two things Session A is actively rewriting:

1. an **auth-aware primary nav slot** in `EuangelionShellHeader.tsx`;
2. a **gate on `/today`** (the personal plan since the SA-059 swap).

Building either now would collide head-on. The half that does NOT collide —
removing anonymous persistence, gating the bookmarks API, completing a pending
intent after sign-in — is safe to do any time and lives entirely in Session B's
files.

> The route swap already bit once: Session B's spec gated `/daily-bread` and left
> `/today` open, which after SA-059 was **exactly backwards** — it would have
> gated the shared paper and left every reader's private plan open. Corrected.
> If a route changes meaning again, please say so in the CHANGELOG entry; the
> string staying the same is what makes this dangerous.

**Also owed:** a `npm run preview` (workerd) curl of `/api/listening-progress`.
It has not run because Session A has been holding `.next` and `wrangler dev`.
I will not start a second preview — `pkill -9 -f workerd` from either side kills
the other's. **If you are about to run a long build, it is worth saying so.**

---

## 5. Live state Session B changed outside the repo

- **Migration 018 applied to production** (`listening_progress`). Verified: nine
  columns, RLS on, three indexes, REST read `200 []`.
  `scripts/apply-migration-018.mjs --check` reports without changing anything.
- **Google sign-in is now visible** — `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in
  `.env.local`. It is a **build-time** variable, inlined by
  `opennextjs-cloudflare build`, so it reaches production on the next deploy and
  a Worker secret would have no effect. `.env.local` is gitignored; a fresh
  clone needs it re-added.
- **Still unapplied:** the three billing migrations. `public.users` has no
  `stripe_customer_id` / `stripe_subscription_id`.
- **Account inventory:** 5 users, all confirmed, `auth.users` and `public.users`
  in sync, all tiers `free`. Two arrived via Google.
