# Homepage + Devotional Audit Prompt — Euangelion

> Copy everything below the divider into Claude Code as a single message.

---

You are auditing the **Euangelion homepage** (https://euangelion.app) **and the devotional reading experience** — a Christian devotional PWA whose stated philosophy is "ancient wisdom, modern design" and "spiritual formation over engagement metrics." I feel both surfaces need significant work. One specific pain point I've already identified: on the devotional pages, the day-navigation links push the actual devotional content below the fold on mobile — you scroll past every day link before you reach the content you came for. That is exactly the kind of pattern I want flagged across the experience. I want a sharp, opinionated, evidence-based audit. **Do not modify any code.** Produce a single audit report. Disagree with my framing wherever you see it differently — I want clarity, not validation.

## Step 1 — Ground yourself (read in this order)

1. `CLAUDE.md`
2. `docs/VISION.md` and `docs/PHILOSOPHY.md`
3. `docs/AUDIENCE.md` and `docs/PUBLIC-FACING-LANGUAGE.md`
4. `docs/UX-FLOW-MAPS.md` and `docs/SUCCESS-METRICS.md`
5. `docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md`
6. `docs/DARK-MODE-SPECIFICATION.md` and `design-system/`
7. `docs/PRODUCTION-SOURCE-OF-TRUTH.md` and `docs/PRODUCTION-FEATURE-SCORECARD.md`
8. The live homepage: https://euangelion.app (fetch desktop + 375px viewport)
9. Source: `src/app/page.tsx` and every component it imports (trace the tree)
10. Source for the devotional reading experience: trace the route(s) under `src/app/` that render a single devotional (likely the series/day routes). Read the layout, the day-navigation component, the content renderer, and any client wrappers.
11. **Image library inventory:** recursively list every image in `public/` with dimensions, file size, and aspect ratio. Group by theme/style. Note which are currently used by the homepage and by devotional pages.
12. Visit at least 3 live devotional pages at 375px and desktop (pick one short series, one long series, one mid-series day).

State your one-paragraph understanding of the brand intent before proceeding. If it conflicts with what the homepage actually does, that is a finding.

## Step 2 — Run these skills (in sequence)

- `/design:design-critique` on the live homepage
- `/design:user-research` focused on landing-page pathways
- `/design:accessibility-review` (WCAG 2.1 AA)
- `/design:ux-copy` reviewing every visible word

## Step 3 — Audit dimensions

For each dimension, cite specific selectors, file paths, line numbers, and screenshots/observations. No generic feedback.

**1. The 15-second test.** What does a first-time visitor understand in 15 seconds — what this is, who it's for, why it matters, what to do next? Where does the eye actually go vs. where you'd want it to go? Compare to the emotional expectation in `AUDIENCE.md`.

**2. Brand alignment.** Does the page feel like "ancient wisdom, modern design"? Sacred minimalism without sterility? Are Instrument Serif and Industry deployed per the design system, or is type doing less work than it should? Does it commit to one of the three visual directions in `VISUAL-DIRECTIONS-PROPOSAL.md`, or feel uncommitted?

**3. Copy audit — every line.** For every headline, subhead, body sentence, label, microcopy, CTA: does it match `PUBLIC-FACING-LANGUAGE.md`? Is it specific or generic-spiritual? Does it earn the next scroll? Flag every line of filler, platitude, or marketing-speak.

**4. User pathways.** Map 4–5 plausible paths from landing: (a) new skeptical seeker, (b) returning user with account, (c) reader of competing devotional apps, (d) mobile drive-by, (e) someone arriving from a shared scripture link. For each: intended next action, actual friction, missing affordances, drop-off risk.

**5. Image strategy.** Given the pregenerated image library: (a) inventory it by theme/mood/style, (b) identify which images the homepage currently uses, (c) for each homepage section, recommend the **top 3 candidate images** with full file path, mood/theme rationale, technical fit (aspect ratio, dark-mode safety, LCP weight). Flag if the library is underutilized or if better candidates are sitting unused.

**6. Conversion design — without engagement bait.** What is the page asking the visitor to commit to? Is the ask appropriately weighted? Per `SUCCESS-METRICS.md`, what does "good flow" look like from this page, and does the page support it?

**7. Mobile-first (375px).** Audit at 375px **before** desktop. Note any section that breaks, hides value, or feels scaled-down rather than designed-for. Tap-target sizes, line lengths, image cropping.

**8. Accessibility.** Contrast ratios with measured values, focus states, alt text presence and quality, touch targets ≥ 44px, keyboard nav, screen reader pass.

**9. Performance proxies.** LCP candidate element, total image weight, font loading strategy, render-blocking resources. What's likely hurting LCP < 2.5s on Cloudflare Workers free tier?

**10. Discoverability — SEO + AI crawlability (separate audit pass).** This is a content-heavy site (32 series, 175 devotionals, growing). If it can't be found by Google, Bing, ChatGPT, Perplexity, Claude, and other LLM crawlers, the content might as well not exist. Treat findability as a first-class product concern, not an afterthought.

**Traditional SEO:**

- **Meta foundations.** Audit `<title>`, `<meta name="description">`, canonical URLs, `lang`, robots directives on the homepage AND on a representative devotional page. Are they unique, accurate, length-appropriate, and keyword-honest (no spam)? Cite the exact rendered HTML.
- **Open Graph + Twitter cards.** Are share previews well-formed with proper images, titles, descriptions? Test a representative URL through a meta-tag inspector. Flag missing or generic OG images.
- **Sitemap.** Does `sitemap.xml` exist, is it referenced in `robots.txt`, does it include every devotional and series page, are `lastmod`/`changefreq`/`priority` set sensibly? Is it dynamically generated?
- **`robots.txt`.** Is it permissive to the right bots and restrictive to the right ones? Does it point to the sitemap?
- **Structured data (JSON-LD).** Devotional and series pages should emit Schema.org markup. Candidates: `Article`, `CreativeWork`, `Book` or `BookSeries`, `Person` (author), `BreadcrumbList`, `Organization`, `WebSite` with `SearchAction`. Validate with the rich-results schema. The homepage should at minimum emit `Organization`, `WebSite`, and a logo/sitelinks search box.
- **Semantic HTML.** Are `<h1>`-`<h6>`, `<article>`, `<section>`, `<nav>`, `<main>`, `<time>` used correctly? Is there exactly one `<h1>` per page and does it match the actual page topic? Devotionals should use `<article>` with proper heading hierarchy and `<time datetime>` for dates.
- **Internal linking.** How discoverable is any given devotional from the homepage? Click-depth: how many hops from `/` to the deepest devotional? Are series cross-linked? Are scripture references linked to their canonical detail pages? Does the homepage surface enough content to give crawlers a wide entry point, or is it a dead-end landing page?
- **URL structure.** Are URLs human-readable, stable, lowercase, hyphenated, free of query-string cruft? Do they encode hierarchy (series/day) cleanly? Are there redirect chains or duplicate URLs (trailing slash, www vs apex)?
- **Image SEO.** Alt text quality on every image, descriptive filenames (not `IMG_4521.jpg`), proper `width`/`height`, modern formats, `loading="lazy"` on below-fold images.
- **Performance for ranking.** Core Web Vitals: LCP, INP, CLS — what's the live-page measurement?
- **Keyword positioning.** What queries should this site rank for? ("daily devotional," "advent devotional," "lent reflections," series-specific terms, scripture-passage queries). For each top target, does the corresponding page actually compete — title, H1, body coverage, internal link weight?
- **Content uniqueness.** Devotional text — is it original prose or boilerplate-feeling? Are scripture quotes wrapped in a way Google can recognize as quotation rather than thin content?

**AI crawlability (LLM-era discoverability):**

- **`llms.txt` / `llms-full.txt`.** Does the site publish an `llms.txt` at root summarizing the project and pointing to the most important content? If not, draft one. This is increasingly how LLM crawlers (and AI search engines like Perplexity, ChatGPT, Claude) understand a site.
- **AI bot access.** Does `robots.txt` permit (or intentionally restrict) `GPTBot`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Google-Extended`, `CCBot`, `anthropic-ai`, `cohere-ai`? Make a deliberate decision — surface the tradeoff rather than defaulting accidentally either way.
- **Server-side rendering check.** Hit a devotional page with `curl` (no JS execution) and confirm the full devotional text, scripture, headings, and links are present in the raw HTML. If content is client-rendered only, LLM crawlers and many SEO bots will see an empty shell. This is a critical failure mode for content sites.
- **Citation-friendliness.** Is each devotional structured so an LLM can quote it with attribution? Clear author byline, publication date (`<time>`), series name, stable URL, copyright notice. Can ChatGPT answer "what does Euangelion say about Lent" by surfacing a specific page?
- **Content addressability.** Can a user (or AI agent) deep-link to a single devotional or even a specific section/verse? Are anchor links present on headings?
- **RSS / Atom feed.** Does the site publish a feed for new devotionals? This still drives both human discovery and some AI ingestion pipelines.
- **Knowledge graph signals.** Is there a clear `Organization` schema with `sameAs` linking to social profiles, founder info, and a stable identity? This helps Google and LLMs build a confident entity for "Euangelion."

**Deliverable additions for this section:**

- A current-state scorecard (Pass / Partial / Fail) for each of the above bullets with file paths or rendered-HTML evidence
- A draft `llms.txt` ready to drop at `public/llms.txt`
- A draft JSON-LD block for the homepage and for a representative devotional page
- A `robots.txt` recommendation with explicit decisions on each major AI crawler
- A keyword-to-URL coverage table: target query → best-matching page → current optimization gap

**11. Devotional reading experience (separate audit pass).** Treat the devotional page as its own product surface. Specifically:

- **Content-first hierarchy.** On mobile (375px), measure how far the user must scroll before the **first line of the devotional body** is visible. Anything that pushes scripture or devotional text below the fold — day-link rails, series headers, breadcrumbs, share buttons, hero imagery, ads, related links — is a failure of the "spiritual formation over engagement" promise. Flag every offender with measured pixel offsets.
- **Day navigation pattern.** The current pattern (long list of day links above content) is the explicit problem I already see. Propose 3 alternative patterns with tradeoffs: (a) collapsed/accordion day index, (b) horizontal scroll strip or sticky compact selector, (c) "previous / next day" pagination with a separate index page. Pick a recommendation grounded in `AUDIENCE.md` and `UX-FLOW-MAPS.md`.
- **Typography for long-form scripture.** Line length, line height, paragraph spacing, drop caps, scripture vs commentary differentiation, Hebrew/Greek inline rendering. Is reading actually pleasant for 8–15 minutes?
- **Re-entry behavior.** A user returning to a devotional they started yesterday — does the page remember position? Surface "continue where you left off"? Or dump them at the top every time?
- **End-of-day affordances.** When the user finishes a devotional, what is the next action? Is it reflection, journaling, sharing, next day, or nothing? Does that match the philosophy?
- **Cross-device parity.** Compare mobile vs desktop devotional page: same content priorities, or does one surface betray the principle?
- **Reading-mode chrome.** Does the page strip away nav/chrome in service of focus, or does the global header/footer compete with the text?

Apply the same accessibility, performance, copy, and image-strategy checks to the devotional surface as to the homepage.

## Step 4 — Deliverable

Save to `docs/audits/HOMEPAGE-AUDIT-{YYYY-MM-DD}.md` with these sections:

1. **Executive summary** — top 3 problems and top 3 strengths across both surfaces (one sentence each)
2. **Severity-ranked findings** — Critical / High / Medium / Low. Each: _what / where (selector + file:line) / surface (homepage | devotional | both) / why it matters / recommended fix / effort estimate_
3. **Pathway map** — table or mermaid diagram of each user path with friction points marked, including the homepage → first devotional → return-visit loop
4. **Image recommendations** — section-by-section for the homepage AND for devotional page slots (hero, section breaks, etc.), top 3 candidates each with `public/...` file paths and rationale
5. **Copy rewrite table** — every weak line on the homepage and on a representative devotional page, before → after, with reasoning grounded in `PUBLIC-FACING-LANGUAGE.md`
6. **Devotional reading-experience redesign brief** — a focused section covering: content-first hierarchy fix, recommended day-navigation pattern with sketch/description, typography refinements, re-entry behavior, end-of-day flow
7. **Discoverability scorecard + assets** — SEO/AI-crawlability pass/partial/fail table, draft `llms.txt`, draft JSON-LD for homepage and a devotional page, draft `robots.txt`, and keyword-to-URL coverage table
8. **Prioritized punch list** — top 10 actions ordered by impact ÷ effort, ready to drop into a sprint

## Constraints

- **Audit only.** Do not modify code, components, or content files. The only file you create is the audit report.
- Cite file paths and line numbers for every claim about the codebase.
- Cite image file paths for every recommendation.
- If a doc contradicts the live page, flag it — both can be wrong.
- Where you're guessing, say so. Where you're confident, say so.
- No hedging language ("might consider," "perhaps look at"). Be direct.
