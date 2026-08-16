# Handoff — Imagery, Reader Redesign & Repo Cleanup Session

**Date:** 2026-07-30
**Scope:** devotional reader continuous-flow (shipped), imagery system direction (locked, not yet on-site), full repo/branch/stash cleanup (local done, remote pending).

---

## TL;DR

- **Shipped & live:** devotional reader is now one continuous piece (no module boxes, no desktop rail, left-aligned titles). Deployed to production.
- **Imagery:** direction fully locked and a mockup approved-in-spirit, but the new images are **not yet wired into the real site** — that's the main open build item.
- **Repo cleanup:** local branches/stashes cleaned and unique work rescued to `archive/*`; **remote deletions are still pending founder approval**, and the `archive/*` branches are **local-only (not backed up)**.
- **Jabez skill:** already exists as **`/devo-go`** — likely fulfills the "make a skill from how I built Jabez" ask; just verify it matches intent.

---

## 1. SHIPPED & LIVE — Reader continuous flow

- **Commit** `fac09c6b` on `main` (pushed). **Cloudflare Version `4f4131f9`**, live on euangelion.app. **SA-013 / F-007.**
- Changed:
  - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` — module box wrapper `devotional-shell-panel border px-6 py-6` → borderless `devotional-flow-article`; desktop two-column sticky-image rail disabled via `DevotionalRhythm enabled={false}`.
  - `src/app/globals.css` — continuous-flow CSS block (`.devotional-flow-article`, ~44rem measure, left-aligned titles).
- Gate passed: type-check, `verify:production-contracts`, `verify:tracking`, lint (0 errors), **1791 tests**, `next build`. Verified live: 12 flow modules, **0** old boxed wrappers, rail off, dev + prod screenshots confirmed.

### Follow-ups (NOT done)

- **Swap the `DevotionalHeadline` hero** to the new cobalt tomb-proportion imagery — it still uses the old tall halftone artwork.
- Optional hardening flagged by the `peaceful-dijkstra` branch audit:
  - a `ChunkErrorBoundary` around the dynamic `DevotionalChat` import (main's `dynamic()` has `loading:()=>null` but no error boundary);
  - a reset-on-slug-change / `key` on `DevotionalPageClient` to prevent stale devotional content during client-side nav (main relies on a `cancelled` fetch-guard). Worth an independent check.

---

## 2. Imagery system — direction locked, not yet on-site

- **Mockup artifact (the reference):** https://claude.ai/code/artifact/d31ebd6b-06ba-45cb-950a-15f11fdbe3d0
- **Full pinned direction** lives in memory: `feedback_imagery_dynamic_direction.md`. Key rules:
  - flat **riso screenprint**, heavy halftone; **cobalt + cream + crimson halation + one small warm-yellow core**;
  - **Higgsfield GPT Image 2** (NOT Gemini/Nano Banana);
  - **historically/regionally accurate first-century Judeans** (not African, not European, no anachronism);
  - **obvious-depiction** — image must clearly depict the adjacent text; no arbitrary/thematic images; **no text baked into images**;
  - full-width images use the **homepage tomb proportion 3.65:1** (`3358/920`) and must **FILL the band** edge-to-edge like the homepage hero (not a sparse subject in empty cream);
  - reads as one continuous piece; header on every devotional; title lives in a panel/over a clean area (no cream-glow behind headline — founder rejected that).
- **Generated keeper images** are in `scratchpad/imagery-samples/` (`header-fill`/`header-band`, `solomon-band`, `closer-v2`/`closer-band`, `hevel-lg`, `sarah-v2`/`sarah-lg`, `lamp-detail`). Builder: `scratchpad/build_site_mock.py`.
  - **These are NOT in the repo** (scratchpad is session-temp). To go live they must be (re)generated, committed under `public/images/...`, and wired into the devotional image slots (`DevotionalHeadline` + inline image modules).
- Higgsfield flow used: `media_upload` → confirm → `generate_image` (model `gpt_image_2`, all params incl. `prompt`/`model` inside `params`, max aspect 16:9) → `job_status` → download raw PNG → `sharp` crop to 3.65:1 band → webp.

---

## 3. Repo cleanup — done locally, remote pending

### Done (local)

- **38 local branches deleted.** Every one rigorously audited by 5 parallel read-only agents (diff each branch's real changes vs. main's current code, not commit messages). All confirmed already-in-main or deliberately-obsolete with file-level evidence. Nothing needed was lost. (Deletions printed their SHAs — recoverable via reflog ~90 days.)
- **All 8 stashes cleared.** Unique work rescued to 5 **local** branches first:
  - `archive/precomputed-plan-library-v1` (stash{1})
  - `archive/precomputed-plan-library-v2` (stash{2}, the fuller superset)
  - `archive/print-conversion-tooling` (stash{4})
  - `archive/animation-candidates` (stash{5}, incl. `CANDIDATES.md`)
  - `archive/image-pipeline-skill` (stash{6})
  - Obsolete stashes {0}/{3}/{7} dropped (audit-confirmed superseded).

### PENDING / needs founder action

1. **Delete 26 audited-safe remote branches on `origin`** — the safety system blocked the mass remote deletion (correctly: needs explicit named approval). The exact command with all 26 names was provided in-chat; re-request it next session or run with `!`. The 26 are the `claude/*` May/Feb branches + `elevation/soul-audit-rebuild` that were verified in-main/obsolete.
2. **11 remote-only branches were never audited** (no local copy existed) — DO NOT delete until verified:
   `claude/audit-batch-r11`, `claude/audit-fixes-2026-05-11`, `claude/audit-round-3`, `claude/audit-t2-teaser-index`, `claude/hero-empty-tomb-riso`, `claude/hero-no-crop`, `claude/hero-stormy-sea`, `claude/hero-twilight-wilderness`, `claude/homepage-restructure`, `claude/series-list-thumbnails`, `claude/three-quick-edits`.
   Next session: `git fetch`, then run the same diff-vs-main audit before deleting.
3. **`archive/*` branches are LOCAL-ONLY** — the rescued unique work is **not backed up to origin**. Recommend `git push origin archive/precomputed-plan-library-v1 archive/precomputed-plan-library-v2 archive/print-conversion-tooling archive/animation-candidates archive/image-pipeline-skill`.
4. **Product decision pending:** the **precomputed devotional-plan library** in `archive/precomputed-plan-library-v2` (pgvector `match_devotional_plans`, tables `generated_devotional_plans` / `devotional_personalization_jobs`, types `ProgressiveContentModule`/`contentBlocks`/`pardesLevel`). `main` deliberately chose **live-RAG (SA-033)** instead. Decide: abandoned-but-archived, or revive.

### Current branch state

- Local: `main` + the 5 `archive/*` branches only.
- Working tree: clean (reader change committed).

---

## 4. Jabez "how I built it" skill

- Method is captured in the repo: `docs/feature-prds/F-081.md`, `content/AUTHORING-SPEC.md`, `.claude/agents/DEVOTIONAL-WRITER.md` + `DEVOTIONAL-EDITOR.md`, `scripts/validate-devotional.mjs`.
- **A skill already exists: `/devo-go`** — "Build a new prefab devotional series end-to-end … distilled from the Prayer of Jabez reference build (SA-029/F-081)." Standard process for all devotional builds per founder ruling 2026-07-22.
- **Action:** run/review `/devo-go` to confirm it captures the intended process; refine if not.

---

## 5. Deploy reference (next session)

Identity gate before ANY push/deploy:

- `gh auth switch --user creativcreature` → `gh auth status` (active = creativcreature)
- `git config user.email` = `chrisparker21@gmail.com`
- `npx wrangler whoami` = `chrisparker21@gmail.com` (account `15a3f83632fea316caa448503bb786f9`)

Deploy = `npm run deploy` (`opennextjs-cloudflare build && deploy`) — treat manual deploy as the real path (GitHub→CF auto-deploy is unreliable). Repo: `creativcreature/euongelion`. `timeout` is NOT available on this macOS shell (use plain commands). Verify live route with `curl` after deploy.

---

## Immediate next-session checklist

1. Decide + execute the **26 remote-branch deletions** (approve the named command).
2. **Push the 5 `archive/*` branches to origin** (back up rescued work).
3. **Audit the 11 remote-only branches**, then delete the safe ones.
4. Rule on the **precomputed-plan-library** architecture (abandon-archive vs. revive).
5. When ready to finish imagery: (re)generate the approved images, commit under `public/images/`, and **wire the tomb-proportion header + inline images** into the devotional (`DevotionalHeadline` + image modules).
6. Verify **`/devo-go`** matches the Jabez method you want to standardize.
