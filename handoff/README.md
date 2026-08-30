# Handoff Archive

Every handoff document for the Euangelion app, in one place, named `YYYY-MM-DD-<topic>.md`
so a plain `ls` returns them in chronological order.

Consolidated 2026-08-29 from eight scattered locations: the repo root, `docs/`, `docs/run/`,
`docs/brand/`, `soul-audit-docs/production-governance/`, and
`design-sources/image-library/generated-2026-05-04/`.

Dates come from each document's own header where it declares one, and from the date the file
entered git where it does not.

## Two documents are live, not archived

These two are still active parts of the resume protocol, so the originals stay where they are
and **the copy here is a snapshot, not the working file**. Edit the original:

| Working file                            | Snapshot here                         | Why it stays                                                                                         |
| --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `docs/PRODUCTION-COMPACTION-HANDOFF.md` | `2026-02-18-production-compaction.md` | Item 5 of the mandatory resume order in `AGENTS.md` and `CLAUDE.md`; 10 other docs point at the path |
| `docs/run/HANDOFF.md`                   | `2026-07-10-run-handoff-rolling.md`   | The rolling "resume here after compaction" doc                                                       |

Everything else in this folder was **moved**. Nothing was duplicated and nothing was deleted.

## The archive

| Date       | File                                                | Document                                                | Moved from                                           |
| ---------- | --------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| 2026-02-11 | `2026-02-11-opencode-typography-color.md`           | The Typography & Color Revolution                       | `opencode-handoff.md`                                |
| 2026-02-14 | `2026-02-14-production-compaction-soul-audit.md`    | Production Compaction Handoff                           | `soul-audit-docs/production-governance/`             |
| 2026-02-18 | `2026-02-18-production-compaction.md`               | Production Compaction Handoff                           | `docs/` — **copy, original is live**                 |
| 2026-02-28 | `2026-02-28-soul-audit-overhaul.md`                 | Soul Audit Overhaul — Running Handoff                   | repo root                                            |
| 2026-05-04 | `2026-05-04-brand-bible-workstream.md`              | Brand Bible Workstream — Session Handoff                | `docs/brand/HANDOFF.md`                              |
| 2026-05-04 | `2026-05-04-site-changes.md`                        | Site Changes — Handoff for Next Session                 | `design-sources/image-library/generated-2026-05-04/` |
| 2026-05-04 | `2026-05-04-homepage-devotional-redesign.md`        | Homepage Devotional Redesign                            | `design-sources/image-library/generated-2026-05-04/` |
| 2026-07-10 | `2026-07-10-run-handoff-rolling.md`                 | Resume here after any compaction/restart                | `docs/run/HANDOFF.md` — **copy, original is live**   |
| 2026-07-11 | `2026-07-11-reader-format-redesign.md`              | Reader Format Redesign                                  | `docs/reader-format-redesign-handoff.md`             |
| 2026-07-28 | `2026-07-28-claude-stabilization-audit.md`          | Euangelion Stabilization Audit                          | repo root                                            |
| 2026-07-30 | `2026-07-30-session-handoff.md`                     | 07-26 → 07-30: Harvest + Daily Bread + cleanup          | `docs/run/SESSION-HANDOFF-2026-07-30.md`             |
| 2026-07-30 | `2026-07-30-run-handoff.md`                         | Imagery, Reader Redesign & Repo Cleanup                 | `docs/run/HANDOFF-2026-07-30.md`                     |
| 2026-07-30 | `2026-07-30-custom-generation-session.md`           | Custom Generation, Accounts, Storefront                 | `docs/run/`                                          |
| 2026-08-13 | `2026-08-13-devo-pipeline-spec.md`                  | Devotional Media Pipeline — Build Spec                  | `docs/DEVO-PIPELINE-HANDOFF-SPEC.md`                 |
| 2026-08-15 | `2026-08-15-library-and-red-letter.md`              | Library, highlights, red letter                         | `docs/run/`                                          |
| 2026-08-15 | `2026-08-15-narration.md`                           | Narration                                               | `docs/run/`                                          |
| 2026-08-16 | `2026-08-16-design-session.md`                      | The design session                                      | `docs/run/`                                          |
| 2026-08-16 | `2026-08-16-transport-and-journaling.md`            | Reader Transport & Journaling                           | `docs/run/`                                          |
| 2026-08-19 | `2026-08-19-bible-365-overhaul-and-homepage.md`     | Bible 365 overhaul + homepage hero (08-19 → 24)         | `docs/run/`                                          |
| 2026-08-20 | `2026-08-20-audio-player.md`                        | The Audio Player                                        | `docs/run/`                                          |
| 2026-08-24 | `2026-08-24-all-these-things.md`                    | "All These Things" series build                         | `docs/run/`                                          |
| 2026-08-24 | `2026-08-24-soul-audit-day-zero.md`                 | Soul Audit day-zero completion                          | `docs/run/`                                          |
| 2026-08-24 | `2026-08-24-soul-audit-cost-architecture.md`        | Soul Audit cost architecture                            | `docs/run/`                                          |
| 2026-08-24 | `2026-08-24-youtube-channel-and-devotional-film.md` | YouTube channel + devotional film                       | `docs/run/`                                          |
| 2026-08-24 | `2026-08-24-intro-animation-and-mobile-images.md`   | Intro animation, mobile images, bad deploy              | `docs/run/`                                          |
| 2026-08-29 | `2026-08-29-video-pipeline-for-social-strategy.md`  | Video pipeline, for the social-strategy session         | `docs/run/`                                          |
| 2026-08-30 | `2026-08-30-drawing-near-and-image-intensity.md`    | Drawing Near series, image intensity, reader atmosphere | written in place                                     |

## `_variants/`

`WORKTREE-MANIFEST.md` records all 49 handoff files found across the 10 worktrees under
`.claude/worktrees/`. Forty-eight are byte-identical to a file above. The one genuine
difference is preserved as `2026-02-18-production-compaction-worktree-variant.md` — a 182-line
revision of the production compaction handoff held by 9 worktrees, against 203 lines in the
main tree. The worktrees themselves were not modified.

## Two caveats

- The three 2026-07-30 handoffs were written on the same day by parallel sessions. Their order
  within that day is not established; `2026-07-30-session-handoff.md` was written first.
- `2026-05-04-site-changes.md` and `2026-05-04-homepage-devotional-redesign.md` refer to sibling
  docs — `MANIFEST.md`, `SITE-REPLACEMENT-PLAN.md`, `BRAND-BIBLE-AUDIT.md`,
  `OVERNIGHT-DIRECTIVE-REVIEW.md` — that remain in
  `design-sources/image-library/generated-2026-05-04/`. Those are planning docs, not handoffs,
  so they were left in place.
