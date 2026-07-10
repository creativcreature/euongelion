# DECISIONS — judgment calls made during the run

Format: id · date · decision · options considered · reasoning · real-world anchor (where applicable).

## D-001 (2026-07-10) — Commit prior session's uncommitted Bible-365 rewrite as run baseline

- **Options:** (a) commit as-is after validation; (b) stash; (c) leave dirty.
- **Choice:** (a). Validated first: 365/365 JSON-parse, 365 modules-format, 0 stubs. A 358-file dirty tree is a hazard across a multi-day autonomous run (accidental loss, ambiguous diffs). Committed as `27c88829` citing SA-020/F-051 to match the pilot commit convention (a39c5cae).
- **Anchor:** n/a (process decision).

## D-002 (2026-07-10) — Branch/deploy strategy: stay on `elevation/soul-audit-rebuild`, fast-forward `main` at deploy points

- **Options:** (a) merge to main per sprint + deploy from main; (b) deploy from branch, merge at Task 9; (c) work directly on main.
- **Choice:** (a), via fast-forward (main is a strict ancestor, so no merge commits and no hook complications). Keeps the repo rule "main = production" true, and production deploys have historically come from this branch lineage anyway (last deploy 2026-06-21 predates only the July commits).
- **Anchor:** n/a (process decision).

## D-003 (2026-07-10) — GitHub push deferred to founder; deploys proceed via wrangler

- **Options:** (a) block the run on push credentials; (b) proceed local-only + deploy via verified wrangler token; log push as HUMAN_REQUIRED.
- **Choice:** (b). The DEPLOY-BEFORE-GATE rule is about the live site; wrangler deploys from the working tree and its token is verified. No gh binary or GitHub credential exists on this machine — exhausted: gh in PATH/homebrew/mdfind, ~/.config/gh/hosts.yml, git credential store, osxkeychain.
- **Anchor:** n/a (process decision).

## D-004 (2026-07-10) — PRDs F-063..F-074 indexed but not added to FEATURE-PRD-REGISTRY.yaml

- **Options:** (a) add to registry + bump the hardcoded `54` count in check-feature-prd-integrity.mjs; (b) PRD file + INDEX row only, matching the existing F-056..F-062 precedent.
- **Choice:** (b). The integrity script hardcodes the registry count; editing a verify script to admit new entries is riskier than following the established pattern for the last seven PRDs. Flag for founder at Task 9 if registry should be reconciled.
- **Anchor:** repo precedent (F-056..F-062).

## D-005 (2026-07-10) — CTA verb unified to GET MATCHED (not Continue)

- **Options:** (a) "Continue" both; (b) "GET MATCHED" both; (c) a new verb.
- **Choice:** (b). "Matched" is the product's honest vocabulary sitewide ("three matched recommendations" on /about, "three matched paths" in Soul Audit subcopy); what was false was "from our library," which is now corrected. Homepage widget already used GET MATCHED; the standalone page's bare "Continue" was the outlier.
- **Anchor:** Calm Sleep quiz CTA consistency (one verb per action across entry points).

## D-006 (2026-07-10) — Orphan disposition split

- **Choice:** Delete 5 with zero product intent attached (WalkthroughModal, SeriesSearchPanel, MixedHeadline, NetworkStatusBanner, SeriesHero — all 0-import, grep-verified). Retain GuestSignupGate (audit Part 3 schedules it for onboarding wiring, Sprint C) and DevotionalMilestoneReveal (SA-025 explicitly says revive-or-delete at the completion beat, Sprint D). Deleting-then-rebuilding would be waste; git history preserves the deleted five if ever needed.
- **Anchor:** audit Part 3 #2 and Part 5A.
