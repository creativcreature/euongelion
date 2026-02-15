# Master Decisions Log

All founder decisions persisted across sessions. Referenced by CLAUDE.md.

---

## Session: Feb 8 2026 (Sprint 5)

| #   | Decision               | Answer                                                                                         | Source                                             |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| D1  | Fonts                  | FREE alternatives: Cormorant Garamond (display) + Space Grotesk (body). Keep SBL Hebrew.       | User choice                                        |
| D2  | Landing hero           | EUANGELION massive edge-to-edge + meaning + tagline + Soul Audit INLINE (textarea on homepage) | User direction                                     |
| D3  | Soul Audit on homepage | Textarea is INLINE on the homepage. No navigation to /soul-audit needed.                       | User: "immediately accessible"                     |
| D4  | Value prop above fold  | Site value communicated above the fold alongside the audit                                     | User direction                                     |
| D5  | Soul Audit results     | 3 EQUAL cards with real Day 1 content preview (anchor verse + first teaching paragraph)        | User choice                                        |
| D6  | Seven Questions        | REMOVED from homepage. Not featured on landing page.                                           | User: "I don't like the questions on the homepage" |
| D7  | Below-fold images      | Full-bleed editorial images below the fold                                                     | User direction                                     |
| D8  | Featured Series        | 3-4 curated (most popular/newest), will change over time                                       | User choice                                        |
| D9  | Day-gating             | DISABLED for now (all content freely accessible)                                               | User direction                                     |
| D10 | All 26 series          | Wake-Up 7 + Substack 19 = 26 series coexist. No overlap.                                       | User direction                                     |
| D11 | Navigation (Desktop)   | Persistent top bar: logo left, nav links, dark toggle right                                    | User choice                                        |
| D12 | Navigation (Mobile)    | Hamburger slide-out with same links                                                            | User choice                                        |
| D13 | Dark mode toggle       | BOTH: quick icon in header + full options in Settings                                          | User choice                                        |
| D14 | Reading experience     | Hybrid cinematic: Scripture/Vocab/Prayer full-width. Teaching/Story/Bridge continuous column.  | User choice                                        |
| D15 | Images                 | CSS placeholders first. Generate real images with Gemini pipeline later.                       | User choice                                        |
| D16 | Post-audit flow        | Pick series -> series overview -> start -> Day 1 (all accessible)                              | User direction                                     |
| D17 | Secondary CTAs         | "Browse All Series" + "Skip to a series" links below inline audit                              | User choice                                        |
| D18 | Substack content       | 19 series wired into the app. Normalized to module format.                                     | User requirement                                   |
| D19 | Module format          | Normalized: Substack nested `{type, content: {}}` -> flat `{type, word, definition}`           | Technical fix                                      |
| D20 | Reference library      | 13GB in content/reference/. Feeds AI pipeline. Not deployed.                                   | From docs                                          |
| D21 | Soul Audit function    | MATCHES to existing series (not generates new content)                                         | From docs                                          |

## Prior Sessions (Carried Forward)

| #   | Decision       | Answer                                                                    |
| --- | -------------- | ------------------------------------------------------------------------- |
| P1  | Brand copy     | "Daily bread for the cluttered, hungry soul." / "Something to hold onto." |
| P2  | BANNED copy    | "VENERATE THE MIRACLE. DISMANTLE THE HAVEL." — NEVER use                  |
| P3  | Vercel account | wokegodx on team wokegodxs-projects ONLY                                  |
| P4  | Git email      | wokegod3@gmail.com                                                        |
| P5  | Domain         | euangelion.app (custom domain live)                                       |
| P6  | Port           | 3333 (3000-3005 occupied)                                                 |
