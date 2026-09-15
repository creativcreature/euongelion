# Daily Bread V2 — dependencies and licences (plan §46)

SA-142 / F-184. Recorded 2026-09-14 from `package.json`, each package's own
`package.json`, and `npm audit`.

## What V2 added

`git diff e6e4c714~1 HEAD -- package.json` shows one dependency added by V2:

| Package | Version | Licence | Kind | Why |
| --- | --- | --- | --- | --- |
| `@electric-sql/pglite` | 0.2.17 (pinned) | Apache-2.0 | devDependency | Runs the real migration SQL in Postgres-compiled-to-WASM for `__tests__/daily-bread-v2-sql.test.ts`. Never shipped to readers. |

No runtime dependency was added.

## The visual stack is first-party

The procedural engine uses no third-party graphics, shader, ASCII or dither library.
Everything under `src/lib/daily-bread/visual/` and
`src/components/daily-bread/visual/` is written in this repository:
- raw WebGL 1 with GLSL ES 1.00 shaders (`webgl.ts`, `shaders.ts`);
- the seeded scene fields (`field.ts`);
- the halftone poster (`poster.ts`);
- the ASCII renderer (`ascii.ts`);
- the frame scheduling (`loop.ts`).

The comic renderers are also first-party.

| Not used, as the plan requires | Status |
| --- | --- |
| aiscii | Not a dependency. |
| asciigen.art runtime | Not used. |
| ASCII Motion | Not used, not even offline. |
| Paid image or graphics APIs on the request path | None (plan §54). A grep of the route and component tree finds no image-model call. |
| Code copied from shader examples | None. The shaders were written for these three scenes. |

## What Daily Bread imports at runtime

| Module | Version | Licence |
| --- | --- | --- |
| `next` (`next`, `next/link`, `next/image`, `next/navigation`) | 16.2.10 | MIT |
| `react`, `react-dom` | 19.2.3 | MIT |
| `@supabase/supabase-js` (repository, via the admin client) | 2.95.3 | MIT |
| `@opennextjs/cloudflare` (the Worker) | 1.20.1 | MIT |

The fonts on the paper are the site's own (Instrument Serif, Industry, SBL Hebrew). V2
did not add a font. Their licences predate V2 and are not re-audited here.

## Build and QA tools V2 relies on

| Tool | Version | Licence | Use |
| --- | --- | --- | --- |
| `tsx` | 4.23.12 | MIT | runs `npm run daily-bread` |
| `playwright` | 1.59.1 | Apache-2.0 | local screenshots and QA |
| `sharp` | 0.34.5 | Apache-2.0 | measuring the style anchors for `VISUAL-ENGINE-CONSTRAINTS.md` (local, not committed) |

## Audit run: `npm audit --omit=dev`, 2026-09-14

12 findings: 1 critical, 9 high, 2 moderate. **None comes from a V2 addition.** PGlite
is a devDependency and is not in this report.

| Package | Severity | Direct | Note |
| --- | --- | --- | --- |
| `next` 16.2.10 | critical (a group of advisories) | yes | Fixed in **16.2.11**. The group includes GHSA-6gpp-xcg3-4w24 (middleware/proxy bypass with Turbopack and a single locale), GHSA-p9j2-gv94-2wf4 (SSRF in rewrites), GHSA-89xv-2m56-2m9x (SSRF in Server Actions on custom servers), GHSA-m99w-x7hq-7vfj (Server Actions DoS), two cache-confusion advisories and an Image Optimization SVG DoS. |
| `wrangler` | high | yes | `npm audit fix` available |
| `miniflare`, `undici`, `tar`, `sharp`, `postcss`, `nanoid`, `brace-expansion`, `@xmldom/xmldom` | high | no | transitive; fixes available |
| `qs`, `baseline-browser-mapping` | moderate | no | transitive; fixes available |

**Not fixed in this change, and why.** Upgrading `next` touches every route on the site,
including the auth middleware, and needs a Workers preview check before any deploy
(CLAUDE.md rule 9). Deploys are on hold. The upgrade to 16.2.11 or later is a
site-wide step for the founder to schedule. It is recorded in the realignment
CHANGELOG entry.
