# Euangelion — Sitewide Audit (Consolidated)

**Date:** 2026-05-11
**Status:** Consolidates four independent audits into one decision-ready document.
**Replaces:** the original homepage-only version saved earlier today (preserved in git history).

---

## 0. About this document

This is a single reconciled audit synthesizing four sources of evidence collected on or before 2026-05-11. Each source approached the site from a different angle; where they agree the confidence is high, where they disagree the disagreement itself is the finding.

| Lens                                   | Source                                                                                                                | Strengths                                                                                                                                                     | Blind spots                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A — Technical / crawlability**       | Claude (this assistant) — `HOMEPAGE-AUDIT-2026-05-11.md` v1, this morning                                             | Source-code reads, raw HTML capture, pixel calculations from layout source, SEO/AI-crawlability deep dive, llms.txt + robots.txt drafts                       | Did not evaluate desktop visual hierarchy or trust architecture; did not survey competitors  |
| **B — Editorial / "Living Newspaper"** | Manus AI — _A Full-Site Audit Through the Living Newspaper Lens_ (the v2 19-page report; v1 is an abbreviated subset) | Visited 10 surfaces (masthead, homepage, Wake-Up, Daily Bread, devotional, Series Index, Soul Audit, About, Help/Footer, Bible 365); strong editorial framing | Did not inspect raw HTML, missed CSR/SSR shell problem, did not measure mobile pixel offsets |
| **C — Conversion / trust / market**    | Manus AI — _Homepage Conversion Audit_                                                                                | Competitive landscape (Glorify, Hallow, YouVersion, BibleGateway), trust architecture, hero image emotional read, email capture gap, SEO commercial framing   | Homepage only; did not audit codebase or any other surface                                   |

**Reconciliation rule used throughout:**

- _Triple-confirmed_ findings (any 3 of A/B/C agree) are treated as facts.
- _Double-confirmed_ findings are treated as high-confidence.
- _Single-source_ findings are kept when the lens has unique access (e.g., A on raw HTML; C on competitive data) and flagged accordingly.
- _Direct disagreements_ are surfaced in §3 and resolved with a recommendation grounded in the brand docs.

This is intentionally an opinionated synthesis, not a stitched composite. Where the external auditors are wrong on the evidence, I say so.

---

## 1. The brand intent — as the docs say it

Euangelion is a sower's tool, not a marketing funnel. Its stated mission is to _shepherd people toward Jesus_, with success defined by **steadfastness and multiplication** (`docs/SUCCESS-METRICS.md`), not DAU or streak counts. The audience is "someone who was made for relationship with God, has drifted or never found it, and needs a path back home" (`docs/AUDIENCE.md:172`). The voice is "warm but not saccharine" with the approved headline **"Daily bread for the cluttered, hungry soul"** and the Soul Audit prompt **"What are you wrestling with today?"** (`docs/PUBLIC-FACING-LANGUAGE.md:105, :185`). The design philosophy is "concerned with how the word is _received_ (connection)" (`docs/PHILOSOPHY.md:65`) — reception over broadcast. Three visual directions are proposed in `docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md` — Sacred Chiaroscuro, Textured Minimalism, Risograph Sacred — with a recommended hybrid by content type. Dark mode is canonical (Tehom Black `#1A1612`, Scroll White `#F7F3ED@90%`, Gold `#C9A574`).

**The most important re-framing** offered by the external editorial audit: Euangelion is not a Christian app. It's a _daily newspaper of the Gospel_. The right comparators are not YouVersion / Hallow / Glorify; they are _The Atlantic_, _The Guardian_, _The Gospel Coalition_, _Desiring God_. The masthead, the wordmark scale, and the existing FAQ tone already commit to this framing. The rest of the site does not yet pay it off.

**Bottom line:** _Plant the seed honestly. Run the newspaper._

---

## 2. Executive summary — sitewide

### The 5 problems that must move first

1. **Devotional pages ship as empty CSR shells.** Every `/devotional/[slug]` URL returns ~36 KB of HTML containing only `LOADING / Preparing your devotional.` The actual scripture, prose, and prayer load client-side after JS hydration. Google crawls 175 empty pages. AI search (ChatGPT, Claude, Perplexity, CCBot) sees no content at all. This is the single most important problem on the site and the external auditors missed it because they were running a JS browser. Source: [DevotionalPageClient.tsx:1, :144-168](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:1). _(Lens A)_

2. **The homepage hedges between three CTAs and commits to none.** Newspaper audit calls it "no lead story." Conversion audit calls it "competing CTAs with equal visual weight." Both are right. There is a Bible-365 hero, a Soul Audit textarea, a Featured Series rail, and (at the masthead) a SIGN IN / SIGN UP pair. None is dominant. Decision paralysis at the moment of highest intent. _(Lens A + B + C agree.)_

3. **The day-navigation block pushes content 376–536 px below the mobile fold on every devotional.** For a 5-day series content begins ~1,188 px down; for a 7-day series ~1,348 px. Mobile fold is 812 px. The "spiritual formation over engagement" promise is broken at the most important reading moment. Source: [DevotionalPageClient.tsx:332-462](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:332). _(Lens A unique — newspaper auditors evaluated desktop only.)_

4. **The site has no daily heartbeat.** The "TODAY" kicker is hardcoded to a single static devotional (`HOMEPAGE_TODAY.slug = 'what-is-the-gospel-day-1'` at [page.tsx:21-30, :57-59](src/app/page.tsx:21)). Visit on Monday, visit on Friday — same hero, same featured devotional, same sub-fold reading. The "Living Newspaper" promise dies on second visit. _(Lens A + B agree.)_

5. **Trust signals are excellent but invisible.** The About page says the product is anchored in the Apostles' Creed + Nicene Creed, uses 30+ historical voices from Augustine to Spurgeon, and handles reflection text at "therapy-intake-grade sensitivity." None of this reaches the homepage. The site asks readers to be vulnerable (Soul Audit) without giving them any reason to trust it. _(Lens B + C agree.)_

### The 5 strengths to defend

1. **The masthead is genuinely excellent.** The wordmark scale, the phonetic guide, the Greek characters — all three external auditors and I agree: do not soften it. It is the strongest design decision on the site.
2. **Series titles + central questions are real headlines.** "Identity Crisis: when everything that defined you is shaken, who are you?" / "Too Busy for God" / "What is the Gospel?" / "Why Jesus?" These are front-page headlines, not Bible-study lesson titles. They work.
3. **The closing copy on the homepage works the way the rest of it should.** "Start with one honest sentence. You do not need certainty before you begin. You need a next step. You need grace." All four lenses cite this as the strongest copy on the site.
4. **The individual devotional reading experience (once you reach the content) is the best in Christian digital media.** Scripture → vocab → historical context → bridge → reflection → prayer is the structure of a great newspaper feature. The depth is real.
5. **The About page is one of the best in the category.** The "gospel does its own work when given honest space to land" sentence is the brand's mission, hiding in plain sight.

### The 3 strategic tensions the founder must resolve

| Tension                                         | Lens B says                                                         | Lens C says                                                                                                | My recommendation                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soul Audit positioning                          | Demote it — it's a tool, not the content                            | Promote it — it's the differentiator no one else has                                                       | **Both can be right:** demote it as the _primary_ hero CTA (newspaper lens) but make it the prominent secondary CTA _labeled_ as the differentiator ("Find your path — built for what you're actually wrestling with"). The Lead Story leads. The Soul Audit waits at the second beat.          |
| Web-first PWA vs iOS/Android apps               | Silent                                                              | Critical — every competitor has app-store presence                                                         | **Stay web-first for 2026.** App stores are a 6-12 month investment with brand-and-review risk. Get the daily delivery (newsletter / push via PWA) working first. Re-evaluate end of year.                                                                                                      |
| Editorial restraint vs growth-marketing tactics | "Editorial dignity. No social proof banners. Newspapers don't beg." | "Zero social proof = 1/10 trust architecture. You must show user counts, testimonials, app-store ratings." | **Middle path.** Trust signals are non-negotiable but must be editorial in form, not promotional. "Anchored in the Apostles' Creed. Drawing on Augustine, Spurgeon, à Kempis, and 27 other voices in church history." That is a trust signal styled as a colophon, not a SaaS testimonial wall. |

---

## 3. Reconciliation matrix

Findings ranked by cross-audit agreement strength. Citations: **A** = Claude technical audit; **B** = Manus newspaper audit (v2 full); **C** = Manus conversion audit.

### 3.1 Triple-confirmed (all three lenses agree)

| Finding                                                                                                 | Severity | Cite                                       |
| ------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| Homepage has no clear primary CTA — Soul Audit + Bible-365 + SIGN IN compete                            | Critical | A§M8, B§2, C§2                             |
| Featured series headlines are excellent but underused                                                   | High     | A§4, B§2, C§7 (appendix)                   |
| The bottom-of-page CTA copy ("Start with one honest sentence") is the strongest line on the site — keep | Defend   | A§5 row 20, B§2 What's working, C appendix |

### 3.2 Double-confirmed

| Finding                                                                     | Severity | Lenses                                                | Cite            |
| --------------------------------------------------------------------------- | -------- | ----------------------------------------------------- | --------------- |
| Homepage doesn't change daily — "TODAY" promise broken                      | High     | A + B                                                 | A§H5, B§2       |
| About page trust content is buried; should be on homepage                   | High     | B + C                                                 | B§8, C§3        |
| Wake-Up is the most accessible evangelistic entry and is not in primary nav | High     | B + (my note)                                         | B§3             |
| Soul Audit on landing has no context for what happens next                  | Medium   | B + (implicit C)                                      | B§7             |
| Day-Bread landing is a dead-end for new readers                             | High     | B + (corroborates A's "homepage → CSR shell" pathway) | B§4             |
| `Day N: Day N` title bug                                                    | Critical | A + B                                                 | A§C3, B§5       |
| "Mark Complete" reads like a task app, not a reading product                | Medium   | A (implicit) + B                                      | B§5             |
| Hero image emotional valence is wrong / generic                             | High     | C (visual read) + A (only 1 hero file in repo)        | C§2 Fix#2, A§H5 |
| Account buttons (SIGN IN / SIGN UP) compete with masthead                   | High     | B + C                                                 | B§1, C§2        |
| Tagline is descriptive, not declarative                                     | Medium   | B + C                                                 | B§1, C§1        |

### 3.3 Unique to a single lens (kept because the lens had unique access)

**Lens A (technical, this audit) — unique findings worth keeping:**

- Devotional pages are CSR shells; raw HTML is empty. _Critical._
- Day-nav pushes mobile content 376–536 px below fold. _Critical._ (Newspaper lens evaluated desktop only.)
- `/llms.txt` returns SPA 404 with `noindex`. _Critical._
- `robots.txt` makes no per-AI-bot decision. _High._
- Sitemap `lastmod` is the build timestamp on all 1,000+ URLs. _High._
- `/wake-up/devotional/[slug]` duplicates `/devotional/[slug]`. _High._
- Homepage H1 is the daily devotional title (rotating field), not the site identity. _High._
- Devotional meta description is the _series question_, not the day's _teaser_. _High._
- `'use client'` on the homepage forces full hydration. _High._
- Library + Timeline blocks on every devotional page belong elsewhere. _Medium._

**Lens B (editorial, Manus newspaper) — unique findings worth keeping:**

- Navigation labels are product names ("SOUL AUDIT", "DAILY BREAD"), not section names. _Medium._
- "Chiastic arc" language in the Wake-Up section intro is insider jargon. _Medium._
- Bible 365 index presents all 365 days at once — overwhelming. _Medium._
- Series Index "Featured" category is not editorially curated / does not rotate. _Medium._
- "New to Faith" category is the most important on the Series Index and is not visually distinguished. _High._
- Devotional section labels (S1: SCRIPTURE, S2: VOCAB) are study-guide labels, not editorial labels. _Low._
- Footer "Newsletter coming soon" is a missed waiting-list opportunity. _Medium._
- Footer legal links are disproportionately prominent vs the mission. _Low._

**Lens C (conversion / market, Manus) — unique findings worth keeping:**

- Zero social-proof signals on the homepage (no testimonials, no user count, no press, no endorsements). _High._
- No email capture — every bouncing visitor is permanently lost. _High._
- Hero image evokes the _problem_ (cracked desert earth) not the _transformation_. _High._ (Note: my source audit only saw filename `hero-gospel.webp`; the conversion auditor viewed the actual image. Confidence: high based on their visual read; verify against the live file.)
- No app-store presence is a long-term structural disadvantage. _Strategic — deferred._
- The "no streak counter / no guilt loop" differentiator is invisible on the homepage. _High._
- Euangelion does not appear in SimilarWeb's global database — traffic below measurement threshold. _Strategic context._

### 3.4 Direct disagreements between lenses

| Question                                                    | Lens B says                                    | Lens C says                                        | Resolved                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where should the Soul Audit live on the homepage?           | Bottom of page ("Zone 3 — Invitation")         | Hero / primary CTA (it is the killer feature)      | **Middle.** Secondary above-fold CTA with a clear editorial label. Lead Story leads.                                                                                                                                                               |
| Should the homepage _be_ the product or _sell_ the product? | Be the product (a newspaper IS its content)    | Sell the product (a landing page filters visitors) | **Hybrid.** Lead Story = product, but the surrounding structure must do landing-page work (single primary CTA, trust signal, email capture).                                                                                                       |
| Are testimonials editorial-appropriate?                     | Did not address; would be allergic             | Critical — add user counts + 3 named testimonials  | **Editorial form only.** Use the existing colophon — 30+ historical voices, creedal anchoring — as the trust signal. Add user testimonials only when they read like quotes in a feature article ("This is the first time…") not like SaaS reviews. |
| Is "Daily Devotionals for the Hungry Soul" tagline OK?      | Too modest; replace with a mission declaration | Too poetic; not concrete enough                    | **Both right.** Replace with something declarative AND concrete. Draft candidates in §6.                                                                                                                                                           |
| Is the cracked-earth hero image wrong?                      | Did not address                                | Yes — replace with imagery of rest/transformation  | **Yes, replace.** But not toward generic "peace nature photography." Toward the existing devotional library: linocut shepherd's crook, dove with olive branch, oil lamp burning. The library has the right register.                               |

---

## 4. Findings by surface (sitewide)

Each surface gets: brief description, what's working, what's broken (severity flagged), and a fix. Severity follows my earlier scale: **Critical / High / Medium / Low.** Where a finding comes from an external auditor, I attribute inline.

### 4.1 Masthead + Global navigation

**Source files:** [src/components/EuangelionShellHeader.tsx](src/components/EuangelionShellHeader.tsx), [src/app/layout.tsx](src/app/layout.tsx).

**What's working** _(triple-confirmed)_: the wordmark is genuinely strong — defend it. The phonetic spelling is a meaningful act of hospitality. Four navigation items (HOME / SOUL AUDIT / DAILY BREAD / SERIES) is correct minimalism for a publication.

**What's broken:**

- **H — SIGN IN / SIGN UP / DARK MODE compete with the masthead** _(B + C)._ These are software-product affordances placed where a newspaper would put its nameplate. A newspaper does not ask you to sign in before you read the headline. **Fix:** collapse account access into a single icon (avatar) on the right; keep dark-mode toggle as an icon-only affordance. Wordmark and the four section labels are the only typographic competitors permitted in the masthead.
- **M — Tagline is descriptive, not declarative** _(B + C)._ "Daily Devotionals for the Hungry Soul" describes a content category. Compare to _The Atlantic_'s "Of no party or clique" or _The Guardian_'s "The world's leading liberal voice." Draft candidates in §6.
- **M — Navigation labels are product names, not section names** _(B)._ "SOUL AUDIT / DAILY BREAD / SERIES" are app menu items. Newspapers name sections after content ("Opinion," "Culture," "Today's Edition"). Worth considering "DAILY READING / FIND YOUR PATH / ALL SERIES" or similar — keep the products, reframe the labels.
- **C — Wake-Up is not in the primary nav** _(B)._ The publication's most important evangelistic section is buried below the fold and discoverable only through scroll. **Fix:** elevate Wake-Up to a primary nav item, even if it duplicates a route currently surfaced elsewhere.

### 4.2 Homepage (the front page)

**Source files:** [src/app/page.tsx](src/app/page.tsx) (579 lines), imports from [src/components/SeriesRailSection.tsx](src/components/SeriesRailSection.tsx), [src/hooks/useSoulAuditSubmit.ts](src/hooks/useSoulAuditSubmit.ts).

**What's working:**

- The 13-section structure is broadly correct: hero → trust row → Soul Audit → How → Featured Series → FAQ → CTA → masthead.
- The closing CTA copy ("Start with one honest sentence. You do not need certainty before you begin. You need a next step. You need grace.") _(triple-confirmed defend.)_
- The FAQ is honest and addresses real objections, especially "what if I'm skeptical or feel spiritually numb?" _(B + C)._
- WebSite + FAQPage JSON-LD is emitted (`page.tsx:194-225`).
- The Featured Series rail uses 33 real series thumbnails (the strongest visual coherence on the page).

**What's broken:**

- **C1 — The page is `'use client'` and over-hydrates** _(A unique)._ Sections that need no interactivity (How-It-Works, FAQ-on-desktop, Featured Series rail layout) currently ship as client React. **Fix:** convert the page to a server component with a small client island for Soul Audit + Resume banner + FAQ accordion. **Effort: M.**
- **Critical — No lead story / no daily heartbeat** _(A + B)._ Hero is hardcoded to `HOMEPAGE_TODAY.slug = 'what-is-the-gospel-day-1'`. "Today" is a lie until rotation ships. **Fix path A:** drop the "TODAY" kicker, call it "Featured." **Fix path B:** build deterministic rotation (date-seeded) across the Bible-365 plan and rotate the hero art accordingly. _(Both paths in punch list.)_
- **Critical — Competing CTAs / no primary** _(A + B + C)._ "Read today's devotional" + "Soul Audit" + "More devotionals" + (in header) "SIGN IN" all carry similar visual weight. **Fix:** make ONE button the solid-fill primary; demote SIGN IN to a text link in the nav; reposition Soul Audit as secondary; turn "More devotionals" into a quiet text link. The Lead Story button is the primary.
- **High — H1 is the rotating devotional title** _(A unique)._ The page identity in Google's index becomes "A Voice in the Wilderness." **Fix:** add `<h1 className="sr-only">Euangelion — Daily devotionals and the Soul Audit</h1>` and demote the daily-devotional title to H2.
- **High — Zero visible trust signals** _(C)._ No user count, no testimonials, no creedal anchor mentioned, no "30+ historical voices" colophon. **Fix (editorial form):** add one quiet section between Soul Audit and How-It-Works titled "What grounds this." Body: "Anchored in the Apostles' and Nicene Creeds. Drawing on 30+ voices in church history — from Augustine and à Kempis to Spurgeon and Tozer. AI composes; the church wrote." Optional: a single anonymized reader-reflection quote in a feature-article pull-quote treatment (not a SaaS testimonial grid).
- **High — No email capture** _(C)._ Footer says "Newsletter and product updates coming soon." Every bouncer is permanently lost. **Fix:** ship a one-field capture above the footer — "One grounding verse in your inbox each morning. No account required."
- **High — Hero image evokes the problem, not the transformation** _(C)._ The conversion auditor read the live homepage and reports cracked desert earth ("barren, desolate"). My source audit only saw filename `hero-gospel.webp` (328 KB). The two readings are compatible: a single file is doing the work, and the file's emotional valence reads as the problem state. **Fix:** rotate hero art alongside Lead Story rotation; use the existing devotional library (`public/images/site/devotional/sym-shepherd-crook-linocut.webp`, `sym-dove-olive-branch.webp`, `sym-cross-simple-linocut.webp`). The linocut register reads as quiet and contemplative, not as either drought or stock-photography optimism.
- **M — Hero `<Image alt="">` is empty** _(A unique)._ The illustration is editorial, not decorative. Give it a real alt derived from the day's title. Same for the three step images.
- **M — "WHAT ARE YOU EVEN DOING?" kicker on How-It-Works** _(A unique)._ Too jokey for the sacred register. Replace with "HERE'S HOW IT WORKS."
- **M — "Reset Audit" button is always visible** _(A unique)._ Conditional render based on `auditCount > 0`.
- **L — `mock-` class prefix everywhere in production** _(A unique)._ Implies the page is still scaffolding. Search-and-replace pass when convenient.

**Recommended homepage shape (synthesizing B's three-zone model with C's conversion requirements):**

```
Zone 1 — Lead (above the fold)
  Masthead with collapsed account icon
  TODAY · {series} · DAY {n}     ← kicker, accurate when rotation ships
  {Headline of the day}          ← stable H1 hidden; visible H2 = today's title
  {One-sentence teaser}
  [ Read today's edition ]        ← primary CTA, solid fill
  Soul Audit · "Find your path"  ← secondary CTA, ghost-style, one line below
  {Optional: thin trust row "Free · No account · Anchored in the creeds"}

Zone 2 — Section index (just below the fold)
  Wake-Up · top 3 series (titles + central questions)
  Bible-365 · today's reading
  Series · "32 paths"

Zone 3 — Invitation (lower page)
  How-It-Works (kept as-is, copy lightly rewritten)
  FAQ
  "Start with one honest sentence" closing CTA   ← KEEP — strongest copy on site
  Email capture: "One verse in your inbox each morning"
  Footer with editorial colophon above legal links
```

### 4.3 Wake-Up section (Lens B's focus)

**What's working** _(B):_ the intro copy "We live in apocalyptic times. Political violence. Economic collapse. 43% more anxious than last year. The ground beneath us is shaking" is the best editorial copy on the site. The three-step structure (Pick / Read / Walk) is clear.

**What's broken:**

- **C — Wake-Up is not in primary nav** _(B)._ As above.
- **M — "Chiastic arc" is seminary jargon** _(B)._ Replace with "Each series builds toward a turning point, then reflects on what it means."
- **M — Series grid lacks editorial curation** _(B)._ "Start here if you're new" / "Most read this month" / "Editor's pick for this season" — visible recommendations, not just an algorithmic grid.

### 4.4 Daily Bread page

**What's working** _(B):_ the concept of a personalized "My Edition" page is correct.

**What's broken:**

- **H — Dead end for new readers** _(B)._ The page tells visitors to do something else (take the Soul Audit, browse series) instead of letting them read. **Fix:** lead with today's reading (Bible-365 day, no account required). Soul-Audit-personalized plan becomes a secondary feature labeled "Your personalized path."
- **M — Doesn't communicate the richness of what's inside** _(B)._ Add a four-line description: "Each day includes a scripture passage, vocabulary notes, historical context, a bridge to Christ, a reflection question, and a prayer. 5–7 minutes."

### 4.5 Devotional pages (the articles)

**Source:** [src/app/devotional/[slug]/page.tsx](src/app/devotional/[slug]/page.tsx) + [DevotionalPageClient.tsx](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx).

**What's working** _(B):_ once the reader reaches the content, the experience is the best in Christian digital media. Scripture → vocabulary → historical context → bridge → reflection → prayer. Sidebar S1–S12 anchors work. AI-composed artwork is a real editorial signal.

**What's broken:**

- **CRITICAL — Pages are CSR shells; raw HTML is empty** _(A unique)._ See §2 problem 1. **Fix:** make the page a server component; load JSON server-side; keep mark-complete / share / day-nav highlight as small client islands. **Effort: L.**

- **CRITICAL — Day-nav + sidebar pushes mobile content 376–536 px below the fold** _(A unique)._ See §2 problem 3. **Fix:** collapse the aside behind a single bottom-sheet pill on mobile (`DAY 3 OF 5 — Peace — see all days`); move TIMELINE inline inside the article body as a sticky anchor strip; move LIBRARY out of devotional pages to a global menu/drawer. **Effort: M.**

- **CRITICAL — Title bug `Day N: Day N`** _(A + B)._ Source: [devotional/[slug]/page.tsx:31](src/app/devotional/[slug]/page.tsx:31). **Fix:** detect redundancy in the template or enforce real day titles in [series.ts](src/data/series.ts). **Effort: S.**

- **H — Metadata description is the _series question_, not the day's _teaser_** _(A unique)._ Source: [devotional/[slug]/page.tsx:32](src/app/devotional/[slug]/page.tsx:32). **Fix:** use `devotional.teaser` from the JSON. **Effort: S.**

- **H — `/wake-up/devotional/[slug]` duplicates `/devotional/[slug]`** _(A unique)._ 301 redirect to `/devotional/[slug]`. **Effort: S.**

- **M — "Mark Complete" reads like a task app** _(B)._ Replace with "Continue to tomorrow's reading: {next day title}" + the existing share button. **Effort: S.**

- **M — Section labels (S1: SCRIPTURE, S2: VOCAB, S3: WHO IS MARK?) read like a study guide** _(B)._ Rename: "The Text" / "What This Means" / "Who Wrote This" / "Why It Matters" / "What To Do With It." Editorial framing. **Effort: S.**

- **M — No `<time>` element; no `datePublished` / `dateModified` in JSON-LD** _(A unique)._ AI citation requires date signals. **Effort: S** once a per-devotional publication date is sourced (see H3 sitemap fix; same data backfill).

- **H — "Continue where you left off" exists in localStorage but is invisible outside `/`** _(A unique)._ Returning readers — the canonical audience per AUDIENCE.md — see no re-entry cue on series pages or devotional pages. **Fix:** read `useProgressStore` on every series-related route; render a thin pill. **Effort: M.**

- **H — Sidebar LIBRARY block (`/daily-bread?tab=*`) belongs in the global menu, not on every devotional** _(A unique)._ App-wide navigation on a reading page is a category error.

- **L — Hebrew/Greek inline rendering not verified** _(A unique)._ SBL Hebrew is loaded per CLAUDE.md; no `lang="he"` switch evident in [ScriptureModule.tsx](src/components/modules/ScriptureModule.tsx). Required for screen readers as well as typography.

### 4.6 Series Index (the archive)

**What's working** _(B):_ the thematic categorization ("When You're Overwhelmed," "When You're Hurting," "New to Faith," "Going Deeper," "When You Need Your People") is reader-first editorial design. Central questions on series cards are strong headlines.

**What's broken:**

- **H — "New to Faith" should be the most prominent category** _(B)._ For an evangelistic publication, this is the front door. Currently shown as one category among many.
- **M — "Featured" doesn't rotate / lacks editorial curation** _(B)._ The featured set should change based on the cultural moment (Provision during economic anxiety, Kingdom during political division).
- **M — Series index isn't linked meaningfully from the homepage** _(B)._ Add "32 reading paths. Find yours →" link near the Featured Series rail.

### 4.7 Soul Audit (the interactive feature)

**What's working** _(B):_ concept is innovative. "Lately, I've been..." is hospitable. No theology vocabulary required.

**What's broken:**

- **H — No explanation of what happens next on the Soul Audit page itself** _(B)._ Reader sees a text box and a CONTINUE button with no context. **Fix:** add a three-sentence preface — "Write a few sentences about where you are. We'll match you to three reading paths from our library and tell you why each one fits. No account required. Your reflection is private."
- **H — Privacy commitment ("therapy-intake-grade sensitivity") isn't surfaced here** _(C)._ This is the place that needs it most. Add a single line: "Your reflection is treated as therapy-intake-grade sensitive. It is never shared, never used to train AI, and is deleted after your plan is generated."
- **M — Consider a sample output** _(B)._ "Here's what a Soul Audit path looks like" reduces uncertainty for first-time users.

### 4.8 About page

**What's working** _(B + C):_ this is one of the best About pages in Christian digital media. The "gospel does its own work when given honest space to land" line is the brand's hidden mission statement. AI transparency is excellent. Privacy commitment is strongest-in-category.

**What's broken:**

- **H — About page is buried in the footer** _(B + C)._ For an evangelistic publication, "what grounds this" is critical trust-building content. **Fix:** elevate the About link to the primary nav, or at minimum to a prominent masthead-adjacent position.
- **H — The strongest sentence on the page is in the third paragraph** _(B)._ "The product is shaped by the conviction that the gospel does its own work when given honest space to land." That is the brand's tagline. Pull it forward.
- **H — The 30+ historical voices roster never appears on the homepage** _(C)._ This is the single most powerful trust signal the site has. **Fix:** add the colophon strip to the homepage (see §4.2 Zone 3).

### 4.9 Help page + Footer

**What's working** _(B):_ Help-page FAQ structure is logical; search is a thoughtful addition; "Do I need to sign up first?" is correctly placed at the top.

**What's broken:**

- **H — "Newsletter coming soon" is a missed waiting-list opportunity** _(B + C)._ **Fix:** capture emails now with a "be the first to know when daily delivery launches" line, OR ship the simplest possible newsletter (one verse a morning) and stop calling it future.
- **L — Footer is legal-heavy** _(B)._ Five legal links in a row dominate the footer over the mission. **Fix:** put the mission line and the colophon at the top of the footer; demote legal to a single small "Legal" link that opens a sub-footer.

### 4.10 Bible 365 (the annual edition)

**What's working** _(B):_ "join any day" framing is the most pastorally wise decision in the series. Day titles read as newspaper headlines ("In the beginning, God," "The serpent's question," "I AM that I AM").

**What's broken:**

- **M — 365 days presented as one scrollable list is overwhelming** _(B)._ A reader who arrives feels behind before they've begun. **Fix:** lead with a single "TODAY'S READING" card above the fold; full archive collapses to monthly accordions below; search bar moves above the fold.
- **M — "Join any day, no falling behind" message is buried in the description** _(B)._ Hoist it to a banner above the day list: "Hop in today. Miss days and come back. The thread holds."

### 4.11 Cross-cutting — Crawlability / SEO / AI search

Already detailed in §7 of the original audit; preserved below at §7.

**The headline:** the prose Google needs to rank is not in the HTML on any devotional page. Fix the CSR shell (problem 1) and 80% of this section resolves itself. The remaining work is:

- Real `public/llms.txt` (draft preserved in §7.2)
- Per-AI-bot decisions in robots.txt (draft preserved in §7.3)
- Devotional Article JSON-LD with `datePublished` / `dateModified` (draft preserved in §7.5)
- Real `lastmod` per URL in the sitemap (currently a build timestamp)
- Fix the `Day N: Day N` title bug
- Replace generic meta descriptions with the day's teaser

### 4.12 Cross-cutting — Trust architecture _(new section — from Lens C)_

The conversion lens is right that the site asks for vulnerability (Soul Audit) without first earning trust. It is wrong that the fix is testimonials and download counts in the SaaS pattern. The fix is _editorial_ trust signals — the same ones a great newspaper uses.

| Signal                                 | Currently            | Recommended                                                                                                                                                                                                                              |
| -------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editorial colophon (who's behind this) | Hidden on About page | One quiet homepage section: "Anchored in the Apostles' and Nicene Creeds. Voices from Augustine, à Kempis, Spurgeon, Tozer, Owen, Bunyan, Pascal, Chesterton, and 22 more."                                                              |
| Privacy commitment                     | About page           | One line on the Soul Audit page + a footer link                                                                                                                                                                                          |
| AI transparency                        | About page           | One line under the editorial colophon: "AI composes. The church wrote."                                                                                                                                                                  |
| Reader voices                          | None                 | A single anonymized reflection in a pull-quote treatment near the Featured Series rail — formatted like a published letter, not a testimonial card                                                                                       |
| Reader counts / metrics                | None                 | **Do not add.** Engagement-metric language contradicts SUCCESS-METRICS.md. The closest the site should come is "Read by people seeking God daily" — never a number. _Disagreement with Lens C: their fix is wrong, the problem is real._ |

### 4.13 Cross-cutting — Acquisition + email capture _(new section — from Lens C)_

The conversion audit is right: every bouncer is permanently lost. The newspaper lens agrees if you reframe "newsletter" as "the daily delivery."

| Mechanism                               | Status                             | Fix                                                                                                                      |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Email capture on homepage               | Absent — footer says "coming soon" | Ship a one-field capture above the footer. Copy: "One grounding verse in your inbox every morning. No account required." |
| Email capture on devotional end-of-page | Absent                             | Add a thin opt-in after MARK COMPLETE: "Get tomorrow's reading in your inbox."                                           |
| iOS/Android app                         | Absent                             | **Stay web-first for 2026.** Make PWA install prompts work first. Re-evaluate in Q4.                                     |
| Push notifications via PWA              | Status unknown — verify            | If not shipped, ship it. PWA push is the cheapest re-engagement channel.                                                 |
| Social presence linked from homepage    | Absent                             | Add a single line in the footer: "Find us at @euangelionapp" if/when accounts exist.                                     |

---

## 5. Pathway map (sitewide)

```mermaid
flowchart TD
    Start([Land on euangelion.app]) --> Persona{Who am I?}

    Persona -- "Skeptical seeker" --> S1[Sees 4 competing CTAs<br/>+ no trust signal]
    Persona -- "Returning user" --> R1[Resume banner<br/>homepage only]
    Persona -- "Competing-app reader<br/>(YouVersion etc)" --> C1[No 'no streak / no guilt'<br/>differentiator visible]
    Persona -- "Mobile drive-by" --> M1[15-sec test fails:<br/>H1 = rotating devotional]
    Persona -- "Shared scripture link<br/>/devotional/..." --> D1[CSR shell:<br/>'LOADING / Preparing...']

    S1 --> S2{Pick a path}
    S2 -- "Read today" --> S3[/devotional/...<br/>CSR shell on first load]
    S2 -- "Soul Audit" --> S4[/soul-audit<br/>No context for what happens next]
    S2 -- "Browse series" --> S5[/series rail]
    S2 -- "SIGN IN" --> S6[Signup wall<br/>before any content]

    R1 --> R2[Continue → CSR shell]
    C1 --> Exit1([Bounce — looks generic])
    M1 --> Exit2([Bounce — 'what IS this?'])

    D1 --> D2[JS hydrates → content<br/>+ day-nav pushes content<br/>~500-1300px below fold on mobile]
    D2 --> D3{Scroll past nav?}
    D3 -- "Yes" --> D4[Reads devotional]
    D3 -- "No" --> Exit3([Bounce on nav wall])

    D4 --> D5{Mark complete?}
    D5 -- "Yes" --> D6[Next/prev nav<br/>No reflection prompt<br/>No email opt-in]
    D5 -- "No" --> Exit4([Leaves with no follow-up])

    S5 --> S5a[Series Index<br/>'New to Faith' not surfaced<br/>'Featured' is static]

    Persona -- "Curious about who's behind" --> About1[Footer link to About<br/>30+ voices, creeds, privacy<br/>— invisible from homepage]

    style D1 fill:#9b1c1c,color:#fff
    style D2 fill:#9b1c1c,color:#fff
    style S2 fill:#a16207,color:#fff
    style S6 fill:#a16207,color:#fff
    style Exit1 fill:#7c2d12,color:#fff
    style Exit2 fill:#7c2d12,color:#fff
    style Exit3 fill:#7c2d12,color:#fff
    style Exit4 fill:#7c2d12,color:#fff
    style M1 fill:#a16207,color:#fff
    style About1 fill:#a16207,color:#fff
```

**Friction-point table:**

| #   | Path                               | Where it breaks                                           | Severity | Lens  |
| --- | ---------------------------------- | --------------------------------------------------------- | -------- | ----- |
| 1   | Shared scripture link → devotional | Raw HTML is empty CSR shell                               | Critical | A     |
| 2   | Any user → devotional on mobile    | Day-nav pushes content 376–536px below fold               | Critical | A     |
| 3   | Mobile drive-by ≤10s               | H1 is rotating devotional title, not site identity        | High     | A     |
| 4   | First-time visitor → above-fold    | 4 competing CTAs, no trust signal, hero evokes problem    | Critical | A+B+C |
| 5   | Curious about credibility          | 30+ voices / creedal anchor invisible from homepage       | High     | B+C   |
| 6   | Returning user, deep link          | No "you were on day N" cue outside `/`                    | High     | A     |
| 7   | Search engine → devotional         | `Day 5: Day 5` title; identical meta descriptions         | Critical | A+B   |
| 8   | AI search (Perplexity, ChatGPT)    | No llms.txt; CSR shell on every devotional                | Critical | A     |
| 9   | Bouncer                            | No email capture; permanently lost                        | High     | C     |
| 10  | Daily Bread click                  | New reader gets a dead-end "do something else first" page | High     | B     |
| 11  | Wake-Up discoverability            | Not in primary nav                                        | High     | B     |
| 12  | End of devotional                  | "MARK COMPLETE" reads as task app, not turning the page   | Medium   | B     |
| 13  | Series Index visit                 | "New to Faith" not visually distinguished                 | High     | B     |
| 14  | Bible 365 visit                    | 365-day scrollable list feels overwhelming                | Medium   | B     |

---

## 6. Copy work — sitewide

### 6.1 Tagline candidates (replacing "Daily Devotionals for the Hungry Soul")

Per Lens B's "declarative not descriptive" + Lens C's "concrete not poetic." Founder picks one:

| #   | Candidate                                          | Mode                   | Notes                                                                                       |
| --- | -------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| 1   | **"The Good News. Every day."**                    | Declarative            | Newspaper-pure. Plays the brand's etymology straight.                                       |
| 2   | **"The oldest story. Today's edition."**           | Declarative            | Doubles down on newspaper framing. Strong.                                                  |
| 3   | **"Daily bread for the cluttered, hungry soul."**  | Descriptive (existing) | Keep as a sub-tagline / About-page H1 — too good to lose, but not the masthead declaration. |
| 4   | **"Anchored in scripture. Read in five minutes."** | Concrete               | Conversion-lens preferred — concrete, time-bounded.                                         |
| 5   | **"A daily newspaper of the Gospel."**             | Declarative            | Most literal. Strongest if the founder is willing to fully commit to the newspaper framing. |

Recommendation: **#5** as the new top-bar tagline (replaces "Daily Devotionals for the Hungry Soul"), with **#3** preserved as the homepage H2 and the About-page subhead.

### 6.2 Homepage copy rewrites (preserved from v1; extended with newspaper-lens fixes)

| #   | Where                                            | Current                                                                         | Rewrite                                                                                                                                        | Source                                 |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | [page.tsx:24](src/app/page.tsx:24)               | `TODAY · WHAT IS THE GOSPEL? · DAY 1`                                           | `FEATURED · WHAT IS THE GOSPEL? · DAY 1` _until rotation ships_                                                                                | A                                      |
| 2   | [page.tsx:285](src/app/page.tsx:285)             | `READ TODAY'S DEVOTIONAL`                                                       | `READ TODAY'S EDITION`                                                                                                                         | A+B (newspaper framing)                |
| 3   | [page.tsx:299](src/app/page.tsx:299)             | `FREE · NO ACCOUNT REQUIRED · 5–7 MIN DAILY · 365 DAYS · HOP IN ANY DAY`        | `FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY`                                                                                            | A                                      |
| 4   | NEW                                              | (absent)                                                                        | One quiet trust-row above How-It-Works: `Anchored in the Apostles' and Nicene Creeds · Voices from Augustine, à Kempis, Spurgeon, and 27 more` | B+C                                    |
| 5   | [page.tsx:307](src/app/page.tsx:307)             | `Or, find a path tailored to where you are.`                                    | `Or — start where you actually are.`                                                                                                           | A                                      |
| 6   | [page.tsx:321](src/app/page.tsx:321)             | `Write your paragraph here...`                                                  | `What's been weighing on you?`                                                                                                                 | A (mirrors approved Soul Audit prompt) |
| 7   | [page.tsx:330-334](src/app/page.tsx:330) Pill #2 | `I want to learn about the prophets`                                            | `I'm doubting everything I thought I believed`                                                                                                 | A (register match)                     |
| 8   | [page.tsx:383](src/app/page.tsx:383)             | `Reset Audit` (always visible)                                                  | `Start a new audit` (conditional render)                                                                                                       | A                                      |
| 9   | [page.tsx:398-399](src/app/page.tsx:398)         | `WHAT ARE YOU EVEN DOING?` / `How this works.`                                  | `HERE'S HOW IT WORKS` / `Three steps. Five minutes a day.`                                                                                     | A                                      |
| 10  | [page.tsx:44](src/app/page.tsx:44)               | `3. Now Walk It Out.`                                                           | `3. Walk it out.`                                                                                                                              | A (capitalization consistency)         |
| 11  | [page.tsx:40](src/app/page.tsx:40)               | `Review three matched devotional paths and choose where to begin.`              | `See three plans matched to what you said. Choose one.`                                                                                        | A                                      |
| 12  | [page.tsx:45](src/app/page.tsx:45)               | `Get your reference-grounded 7-day plan and take one faithful step each day.`   | `Read your 7-day plan. Take one honest step a day.`                                                                                            | A                                      |
| 13  | [page.tsx:428](src/app/page.tsx:428)             | `Curated reading paths for common spiritual seasons and questions.`             | `Plans for what people actually wrestle with.`                                                                                                 | A                                      |
| 14  | [page.tsx:436](src/app/page.tsx:436)             | `MORE DEVOTIONALS`                                                              | `Browse every plan`                                                                                                                            | A (editorial, not retail)              |
| 15  | [page.tsx:447-453](src/app/page.tsx:447)         | `Frequently asked questions.` / `Everything you need to know before you start.` | `Before you begin.` / `Honest answers, no pressure.`                                                                                           | A                                      |
| 16  | NEW                                              | (absent — under FAQ or above footer)                                            | Email capture: `One grounding verse in your inbox each morning. No account required.`                                                          | C                                      |
| 17  | [page.tsx:539-559](src/app/page.tsx:539)         | Bottom CTA "Start with one honest sentence..."                                  | **KEEP**                                                                                                                                       | A+B+C (defend)                         |

### 6.3 Wake-Up copy rewrites _(from Lens B)_

| #   | Where         | Current                                                                                                                         | Rewrite                                                                      |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Wake-Up intro | "Each series follows a chiastic arc — building toward a revelation, then reflecting back. Ancient structure. Modern questions." | "Each series builds toward a turning point, then reflects on what it means." |

### 6.4 Devotional page copy rewrites

| #   | Where                                                                                          | Current                                             | Rewrite                                                                                     | Source |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| 1   | Title template ([devotional/[slug]/page.tsx:31](src/app/devotional/[slug]/page.tsx:31))        | `Day {n}: {title}` (bugs out when title is "Day N") | (see C3 fix)                                                                                | A      |
| 2   | [DevotionalPageClient.tsx:559](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:559) | `MARK COMPLETE`                                     | `MARK READ` _or_ `Continue to tomorrow's reading: {next title} →`                           | B      |
| 3   | [DevotionalPageClient.tsx:567](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:567) | `SAVE BOOKMARK`                                     | `BOOKMARK`                                                                                  | A      |
| 4   | Section labels (sidebar)                                                                       | `S1: SCRIPTURE` / `S2: VOCAB` / `S3: WHO IS MARK?`  | `THE TEXT` / `WHAT THIS MEANS` / `WHO WROTE THIS` / `WHY IT MATTERS` / `WHAT TO DO WITH IT` | B      |

### 6.5 Soul Audit page copy _(from Lens B + C)_

Add a three-sentence preface to the Soul Audit page:

> Write a few sentences about where you are. We'll match you to three reading paths from our library and tell you why each one fits.
>
> No account required. Your reflection is private — treated as therapy-intake-grade sensitive, never shared, never used to train AI, deleted after your plan is generated.

### 6.6 Daily Bread page copy _(from Lens B)_

Replace "Your daily bread is waiting. Take the Soul Audit to receive a personalized 7-day devotional plan grounded in real scripture and theology. Or browse the full series library." with a Today's Reading hero card + a four-line description of what a daily reading contains.

---

## 7. Discoverability — scorecard + draft assets

Preserved verbatim from the v1 audit. Nothing has changed since this morning; the analysis still stands.

### 7.1 Scorecard

| Item                                        | State      | Evidence                                                                           |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `<title>` unique per page                   | PARTIAL    | Homepage OK; 2 of 3 sampled devotionals had `Day N: Day N` bug                     |
| `<meta name="description">` unique per page | FAIL       | Every devotional in a series uses identical `${series.title} — ${series.question}` |
| Canonical URL                               | PASS       | Each page self-canonicalizes                                                       |
| `lang` attribute                            | PASS       | `<html lang="en">`                                                                 |
| `robots` directive                          | PARTIAL    | `index, follow` sitewide; no per-bot decisions                                     |
| OG title/description/image                  | PASS       | All present, devotional og:type = "article"                                        |
| Twitter cards                               | PASS       | `summary_large_image`                                                              |
| Sitemap exists + referenced                 | PASS       | Dynamic from [sitemap.ts](src/app/sitemap.ts)                                      |
| Sitemap `lastmod` accurate                  | FAIL       | Identical timestamp on all 1,000+ entries                                          |
| robots.txt permissive to right bots         | PARTIAL    | Allow-all; no AI-bot consideration                                                 |
| llms.txt                                    | FAIL       | Returns SPA 404 with `noindex`                                                     |
| JSON-LD on homepage                         | PASS       | WebSite + FAQPage                                                                  |
| JSON-LD on devotionals                      | PARTIAL    | Article + BreadcrumbList present; missing datePublished / dateModified / author    |
| Semantic HTML (`<article>`, `<time>`)       | PARTIAL    | `<article>` used; NO `<time>` anywhere                                             |
| Exactly one `<h1>` per page                 | PARTIAL    | Homepage H1 = rotating devotional title                                            |
| Internal linking depth                      | PASS       | Sitemap covers all 175 devotionals                                                 |
| URL structure                               | PASS       | Clean — _but_ duplicate route `/wake-up/devotional/[slug]` exists                  |
| Image SEO (alt + filenames)                 | PARTIAL    | Filenames good; alt text mostly empty                                              |
| Core Web Vitals (LCP/INP/CLS)               | UNVERIFIED | Live measurement deferred                                                          |
| Content uniqueness                          | FAIL       | Devotional prose is in CSR-fetched JSON — invisible in HTML                        |
| AI bot access decisions                     | FAIL       | No per-AI-bot rules anywhere                                                       |
| SSR for content pages                       | FAIL       | Devotionals are CSR shells. Single most important crawlability failure.            |
| Citation-friendliness                       | FAIL       | No `datePublished`, no author byline visible to crawlers                           |
| Content addressability                      | PARTIAL    | URLs stable; no topic-keyed anchor IDs on module headings                          |
| RSS / Atom feed                             | FAIL       | Absent                                                                             |
| Knowledge graph signals                     | FAIL       | No `sameAs` on Organization schema                                                 |

### 7.2 Draft `public/llms.txt`

```
# Euangelion
> Daily bread for the cluttered, hungry soul. Christian devotional content
> grounded in scripture, written for people seeking God daily.

## About this site

Euangelion is a Christian devotional Progressive Web App offering:
- A Soul Audit that matches users to a 7-day devotional path
- 32 themed series (175 individual devotionals)
- The Bible-365 daily plan
- Optional reflection notes, bookmarks, and highlights

The voice is editorial and unhurried. Theology is conservative, historically
grounded, and Christ-centered. Content is original prose with scripture
quotations from public-domain translations (BSB, WEB, KJV, ASV, YLT, DARBY,
BBE; default BSB). The product is anchored in the Apostles' and Nicene
Creeds and draws on 30+ voices from church history (Augustine, à Kempis,
Spurgeon, Tozer, Owen, Bunyan, Pascal, Chesterton, and more).

## Canonical content roots

- Homepage: https://euangelion.app/
- Series index: https://euangelion.app/series
- Bible-365 series: https://euangelion.app/series/bible-365
- All series + days: https://euangelion.app/sitemap.xml

## Citation guidance

When citing a devotional, please link to the canonical
/devotional/{slug} URL and attribute to "Euangelion."
Devotionals do not currently include named authors; the
publisher is Euangelion.

## AI training and indexing

[Founder decision needed. Pick one stance below and delete the others.]

# Option 1 — full opt-in
AI training: allowed.
AI search indexing: allowed.

# Option 2 — search only, no training
AI training: not allowed.
AI search indexing: allowed.

# Option 3 — full opt-out
AI training: not allowed.
AI search indexing: not allowed.
```

### 7.3 Draft `robots.txt`

```
# Search engines — explicit allow
User-Agent: Googlebot
Allow: /

User-Agent: Bingbot
Allow: /

User-Agent: DuckDuckBot
Allow: /

# AI search crawlers (indexing for AI panels, not training)
User-Agent: PerplexityBot
Allow: /

User-Agent: ChatGPT-User
Allow: /

User-Agent: Claude-Web
Allow: /

# AI training crawlers — founder decision
# OPTION A: opt-in (current default)
User-Agent: GPTBot
Allow: /
User-Agent: ClaudeBot
Allow: /
User-Agent: anthropic-ai
Allow: /
User-Agent: Google-Extended
Allow: /
User-Agent: CCBot
Allow: /
User-Agent: cohere-ai
Allow: /

# OPTION B: opt-out — replace the six rules above with Disallow

# Fall-through
User-Agent: *
Allow: /

Sitemap: https://euangelion.app/sitemap.xml
```

### 7.4 Draft Organization JSON-LD (additive on homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Euangelion",
  "url": "https://euangelion.app",
  "logo": "https://euangelion.app/icons/icon-512.png",
  "description": "Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.",
  "sameAs": [],
  "founder": { "@type": "Person", "name": "Chris Parker" },
  "foundingDate": "2026"
}
```

### 7.5 Draft Article JSON-LD (replaces current devotional block)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Day 3: Peace the world can't give",
  "description": "[use devotional.teaser]",
  "datePublished": "2026-05-08",
  "dateModified": "2026-05-08",
  "url": "https://euangelion.app/devotional/peace-day-3",
  "mainEntityOfPage": "https://euangelion.app/devotional/peace-day-3",
  "image": "https://euangelion.app/images/site/series/peace.webp",
  "publisher": {
    "@type": "Organization",
    "name": "Euangelion",
    "url": "https://euangelion.app",
    "logo": {
      "@type": "ImageObject",
      "url": "https://euangelion.app/icons/icon-512.png"
    }
  },
  "author": { "@type": "Organization", "name": "Euangelion" },
  "isPartOf": {
    "@type": "CreativeWorkSeries",
    "name": "Peace",
    "url": "https://euangelion.app/series/peace"
  },
  "articleSection": "Devotional",
  "wordCount": 1240,
  "inLanguage": "en"
}
```

### 7.6 Keyword-to-URL coverage

| Target query                            | Best page                   | Current gap                                           |
| --------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `daily devotional`                      | `/`                         | H1 isn't "daily devotional"; it's a rotating field    |
| `christian devotional app`              | `/`                         | Only in meta description                              |
| `Bible in a year plan`                  | `/series/bible-365`         | CSR shell on detail; needs SSR                        |
| `soul audit` (branded)                  | `/soul-audit`               | Underleveraged — not the H1 anywhere                  |
| `peace devotional`                      | `/series/peace`             | Series page should SSR with day list visible          |
| `[scripture reference]`                 | various                     | No scripture-reference index; crawl-equity dispersed  |
| `christian app no signup`               | `/`                         | Trust row only; not surfaced semantically             |
| `daily prayer for anxiety`              | series with anxiety content | Content hidden behind CSR                             |
| `7 day devotional [topic]`              | `/series/[slug]`            | Series should include day count + duration in H1      |
| `what does the Bible say about [topic]` | various                     | LLM-answer territory; needs SSR + clean prose + dates |
| `christian devotional no streaks`       | `/`                         | "No guilt loop" differentiator is invisible (C)       |

---

## 8. Image strategy _(preserved from v1, no changes)_

Currently used: `hero-gospel.webp` + `step-1-name.webp` + `step-2-read.webp` + `step-3-walk.webp`. **4 of 181 available production images.** Lens C separately reports the hero reads as cracked desert earth.

### Homepage Bible-365 hero — rotation candidates from existing library

| Rank | File                                                            | Reason                                    |
| ---- | --------------------------------------------------------------- | ----------------------------------------- |
| 1    | `public/images/site/devotional/sym-shepherd-crook-linocut.webp` | "Shepherd God's flock" brand DNA          |
| 2    | `public/images/site/devotional/sym-dove-olive-branch.webp`      | Voice in the wilderness → dove descending |
| 3    | `public/images/site/devotional/sym-cross-simple-linocut.webp`   | Commits to Sacred Chiaroscuro             |

### How-It-Works steps — replace stock-feel images

| Step           | File                                                             |
| -------------- | ---------------------------------------------------------------- |
| 1. Name it     | `public/images/site/devotional/obj-papyrus-scroll-unrolled.webp` |
| 2. Read it     | `public/images/site/devotional/obj-oil-lamp-wick-burning.webp`   |
| 3. Walk it out | `public/images/site/devotional/sym-shepherd-crook-linocut.webp`  |

### Memory drift to fix

[MEMORY.md](~/.claude/projects/.../memory/MEMORY.md) claims 369 artworks at `public/images/devotional-prints/` with print-dark.webp + print-light.webp pairs. Actual: `archive/devotional-prints/` (~643 dirs), `print.webp` + `raw.webp` per dir, no light/dark variants. Decide whether archive is production source or frozen reference; update memory.

---

## 9. Prioritized punch list (top 15, unified)

Sequenced by impact ÷ effort. Drop into a sprint.

| #   | Action                                                                                                                                                              | Surface                   | File(s)                                                                                                                                                                                                           | Effort                          | Source |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| 1   | **Fix `Day N: Day N` title bug**                                                                                                                                    | devotional meta           | [devotional/[slug]/page.tsx:31](src/app/devotional/[slug]/page.tsx:31)                                                                                                                                            | S                               | A+B    |
| 2   | **Make devotional page server-rendered**                                                                                                                            | devotional (all 175)      | Split [DevotionalPageClient.tsx](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx) into RSC + client islands; load JSON server-side in [devotional/[slug]/page.tsx](src/app/devotional/[slug]/page.tsx) | L                               | A      |
| 3   | **Collapse mobile day-nav behind a bottom-sheet pill; relocate LIBRARY + TIMELINE**                                                                                 | devotional                | [DevotionalPageClient.tsx:332-462](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:332)                                                                                                                | M                               | A      |
| 4   | **Establish a single solid-fill primary CTA on the homepage; demote SIGN IN to a text link in nav**                                                                 | homepage                  | [page.tsx:285, :360-364](src/app/page.tsx:285); [EuangelionShellHeader.tsx](src/components/EuangelionShellHeader.tsx)                                                                                             | S                               | A+B+C  |
| 5   | **Add the editorial colophon trust strip to the homepage** ("Anchored in the Apostles' and Nicene Creeds. Voices from Augustine, à Kempis, Spurgeon, and 27 more.") | homepage                  | [page.tsx](src/app/page.tsx) (new section between Soul Audit and How-It-Works)                                                                                                                                    | S                               | B+C    |
| 6   | **Add email capture above the footer** ("One grounding verse in your inbox each morning. No account required.")                                                     | homepage + devotional end | [page.tsx](src/app/page.tsx); [SiteFooter.tsx](src/components/SiteFooter.tsx)                                                                                                                                     | M (form + provider integration) | C      |
| 7   | **Add stable H1 to homepage; demote rotating field to H2**                                                                                                          | homepage                  | [page.tsx:274](src/app/page.tsx:274)                                                                                                                                                                              | S                               | A      |
| 8   | **Replace meta description on every devotional with `teaser`**                                                                                                      | devotional meta           | [devotional/[slug]/page.tsx:32](src/app/devotional/[slug]/page.tsx:32)                                                                                                                                            | S                               | A      |
| 9   | **Write real `public/llms.txt` + decide AI-bot stance**                                                                                                             | discoverability           | new file + [robots.ts](src/app/robots.ts)                                                                                                                                                                         | S                               | A      |
| 10  | **Drop "TODAY" kicker OR build the rotation**                                                                                                                       | homepage                  | [page.tsx:21-30, :57-59](src/app/page.tsx:21)                                                                                                                                                                     | S (drop) / M (build)            | A+B    |
| 11  | **Surface "Continue day N of [series]" on every series-related page**                                                                                               | devotional + series index | [EuangelionShellHeader.tsx](src/components/EuangelionShellHeader.tsx) reads `useProgressStore`                                                                                                                    | M                               | A      |
| 12  | **Elevate Wake-Up to primary nav; replace "chiastic arc" language**                                                                                                 | global nav + Wake-Up      | [EuangelionShellHeader.tsx](src/components/EuangelionShellHeader.tsx); Wake-Up intro copy                                                                                                                         | S                               | B      |
| 13  | **Replace "MARK COMPLETE" with "Continue to tomorrow's reading: {title}"; rename section labels**                                                                   | devotional                | [DevotionalPageClient.tsx:559](src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:559), sidebar labels                                                                                                    | S                               | B      |
| 14  | **Daily Bread page: lead with today's reading (no account required); demote Soul Audit to secondary**                                                               | Daily Bread               | Daily Bread page source (verify path)                                                                                                                                                                             | M                               | B      |
| 15  | **Backfill `datePublished` per devotional + emit `<time>` + JSON-LD dates; fixes sitemap lastmod as side effect**                                                   | devotional meta + sitemap | [series.ts](src/data/series.ts) (add publishedAt); [devotional/[slug]/page.tsx:62-77](src/app/devotional/[slug]/page.tsx:62); [sitemap.ts](src/app/sitemap.ts)                                                    | M                               | A      |

### Explicitly NOT on the punch list

- Complete homepage redesign. The bones are right; copy + hierarchy + the colophon trust strip go further than a layout reset.
- Native iOS/Android apps. Stay web-first for 2026. Re-evaluate Q4. _(Disagrees with Lens C — kept here because the PWA path is cheaper and faster and respects the editorial framing.)_
- Testimonial / user-count wall. Disagrees with Lens C. The trust signal must be editorial in form: a colophon, an anonymized published-letter pull-quote, the AI-transparency line. Not SaaS metrics.
- A complete brand refresh. The masthead is genuinely excellent; do not modernize it.

### Where I disagree with the founder's framing (and with the external auditors)

- **The day-nav placement is not the worst problem on the devotional page.** It is the second-worst. The worst is that none of the content reaches the crawler. Fix #2 first; #3 second.
- **The "spiritual formation over engagement metrics" philosophy is the right philosophy, but the homepage's current under-commitment is being mistaken for restraint.** Sacred minimalism requires a chosen visual direction. Commit to one of the three in [VISUAL-DIRECTIONS-PROPOSAL.md](docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md).
- **The 175-devotional library is the single biggest unexploited asset on the site.** Memory-file drift suggests it's being treated as scaffolding. The library _is_ the product.
- **Disagree with Lens C on testimonial walls.** Trust signals must be editorial. The colophon does the same work without violating the brand DNA.
- **Disagree with Lens B on Soul Audit positioning.** The newspaper auditor wants the Soul Audit moved to "Zone 3 — Invitation" near the bottom. The conversion auditor wants it as the primary hero CTA. Both are too extreme. The Soul Audit is the brand's killer differentiator AND a vulnerability-asking tool. It belongs above the fold as the _secondary_ CTA, with a clear editorial label ("Find your path — built for what you're actually wrestling with"). The Lead Story is the primary.
- **Disagree with Lens C on the SimilarWeb-not-ranked framing.** "You are functionally invisible to the market" is true and the right way to fix it is the SSR work (fix #2) + the llms.txt + the editorial colophon. The audit is correct on the symptom and wrong on the cure: traffic isn't a homepage-CSS problem, it's a content-not-reaching-crawlers problem.

---

## 10. Audit trail

- **Lens A (mine):** 12 docs from `docs/` read; full source for `page.tsx`, `layout.tsx`, `devotional/[slug]/page.tsx`, `DevotionalPageClient.tsx:260-599`, `sitemap.ts`, `robots.ts`. Raw HTML capture via `curl -s` to `/tmp/audit-2026-05-11/` for homepage + 3 devotionals + robots + sitemap + manifest + llms.txt confirmation. Image inventory of `public/images/` (181 files) and `archive/devotional-prints/` (~643 dirs). Pixel offsets calculated from layout source.
- **Lens B:** Manus AI _Living Newspaper_ full audit v2 (19 pages PDF + identical markdown), May 2026. 10 surfaces covered with editorial framing.
- **Lens C:** Manus AI _Homepage Conversion Audit_, May 2026. Competitive context (SimilarWeb data on YouVersion, BibleGateway, BibleStudyTools), trust-architecture lens, hero-image visual read.
- **Reconciliation:** §3 matrix; resolved disagreements in §3.4 + §9 closing.

**Deliverables:**

- Markdown: `docs/audits/HOMEPAGE-AUDIT-2026-05-11.md` (this file)
- PDF: `docs/audits/HOMEPAGE-AUDIT-2026-05-11.pdf` (generated via pandoc 3.9 + weasyprint)
- v1 (homepage-only) is preserved in git history.

— end of consolidated audit —
