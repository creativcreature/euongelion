# Shadow Advisory Board: Euangelion

_Run date: February 17, 2026_
_Skill: `/shadow-board` — rerun anytime with updated context_

---

## Product Brief

| Field                  | Value                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**            | Euangelion                                                                                                                                                                                                                                                          |
| **Description**        | Christian devotional PWA delivering personalized Bible study through a Soul Audit personality assessment. 26 series, 120 devotional days, AI-curated matching, hybrid cinematic reader. Ancient wisdom, modern design. Spiritual formation over engagement metrics. |
| **Current State**      | MVP (v0.7.0) — live at euangelion.app, pre-public-launch, targeting Easter 2026 (~6 weeks)                                                                                                                                                                          |
| **Key Metrics**        | 146 commits in 11 days. 193 source files, 57 components, 879 tests across 52 files. 120 devotional JSONs, 26 series, 3,988 lines CSS, 184 docs, 50 feature PRDs. Scorecard: 4-8/10 across all categories.                                                           |
| **Market**             | YouVersion (500M+ installs), Dwell, Lectio 365, Abide, Pray.com. None combine Soul Audit + personalized curation + editorial-quality design.                                                                                                                        |
| **Audience**           | 4 segments: The Drifted (lapsed faith), Skeptical Seekers (spiritually curious, church-hurt), Stuck Believers (going through motions), Weary Shepherds (pastors/leaders who feed others but aren't fed).                                                            |
| **Revenue**            | Not yet active. Billing infrastructure built (entitlement checks, payment lifecycle). Free core, premium planned.                                                                                                                                                   |
| **Metrics Philosophy** | Anti-manipulation. No streaks, no DAU chasing, no guilt. Primary metric: steadfastness (30+ day sustained return). "We sow seeds. God gives the growth."                                                                                                            |

---

## Round 1: Cold Read

_Board evaluates on product description and metrics only. No founder context._

| Persona        | Verdict         | Confidence | Key Concern                                                                                       | What Would Change Their Mind                                                       |
| -------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Peter Thiel    | Conditional Yes | 5          | "Is personalized devotional content a new category or a better Bible app?"                        | Evidence that Soul Audit creates a category no incumbent can replicate             |
| Naval Ravikant | No              | 4          | "This looks like a feature (personalized quiz) on top of a commodity (devotional content)"        | Proof of organic pull demand — people seeking this out without being told to       |
| Warren Buffett | No              | 3          | "No revenue, no paying users, heavy infrastructure for a free devotional product"                 | A clear, simple revenue model with evidence of willingness to pay                  |
| YC Partner     | Conditional Yes | 6          | "Incredible shipping velocity but zero users. All infrastructure, no distribution."               | 100 real users who return for Day 2                                                |
| Skeptical VC   | No              | 3          | "Faith-based app market has a graveyard. YouVersion owns the category. Solo founder pre-revenue." | Clear differentiation story and a path to 10K users that doesn't require a miracle |

**Round 1 Board Confidence: 4.2/10**

### Per-Persona Detail

**Peter Thiel:**
The contrarian truth here — that existing devotional apps fail at engagement because they treat spiritual formation like task completion — is interesting but not yet articulated as a monopoly thesis. The Soul Audit is genuinely novel. Personalized spiritual matching hasn't been done well. But the question remains: is this Zero to One, or is it "a better Headspace for Christians"? The anti-manipulation metrics philosophy (no streaks, no DAU) is either a profound insight about what spiritual products should be, or naivete about growth. I need to know which.

**Naval Ravikant:**
The product complexity concerns me. 50 PRDs, 184 docs, 879 tests — for a product with zero users. This feels like building the factory before validating the widget. The best products start simple: one thing, done perfectly. What is the one sentence? "Take a quiz, get a personalized devotional." That could be a feature inside YouVersion. Why is this a standalone product? The content volume (26 series, 120 devotionals) is impressive but also a liability — maintaining quality across that much content is a full-time job. I'd want to see this working with 3 series first.

**Warren Buffett:**
Where does the money come from? The billing infrastructure exists but there's no revenue model articulated. Faith-based content has a notorious willingness-to-pay problem — the expectation is that spiritual content should be free. YouVersion is completely free. Dwell charges but is audio-focused. What's the premium tier? What would someone pay for? The moat question is also unclear: is the moat the content library (replicable), the design (replicable with money), or the curation algorithm (defensible but needs data)? I'd pass until the economics are clearer.

**YC Partner:**
The shipping velocity is extraordinary — 146 commits in 11 days is legitimate "hair on fire" energy. The feature scope is ambitious and mostly built. The Soul Audit concept is smart — it solves the "where do I start?" problem that kills retention in content apps. But — and this is the critical gap — there are no users. Not "few users." Zero. All this infrastructure is a hypothesis until someone who isn't the builder uses it daily for a month. Ship it. Get 10 people using it. Then 100. The governance system is impressive but also concerning — is the builder shipping product or shipping process?

**Skeptical VC:**
The faith-based app graveyard is real. Faithlife, Bible Gateway, dozens of devotional apps — most failed to build sustainable businesses. YouVersion won by being free and ubiquitous. The ones that charge (Dwell, Abide, Pray.com) survive on audio and meditation, not text-based devotionals. A text-first devotional app in 2026 is swimming upstream against every content consumption trend (video, audio, short-form). Solo founder, pre-revenue, no users, complex infrastructure. The Easter deadline is also concerning — launching a spiritual product on a holiday sounds poetic but gives zero room for iteration based on real feedback. Multiple kill risks with no mitigation evidence.

---

## Round 2: Contextualized Re-evaluation

_The board receives founder context:_

> SCAD-trained fine arts + graphic design. Creative director, not a coder. Personal pain point — struggled with Bible engagement, tried every solution, nothing stuck. Started making own devotionals with AI. Shared via Google Docs — people valued them. Moved to Substack — audience grew, but styling each one took hours. Realized he needed a dedicated platform. Using AI (Claude) as full engineering team. Governance/tests serve as QA replacement for a solo builder. Has shown the app to people — "their eyes light UP." This is designer-led product development: creative direction + AI engineering.

| Persona        | Updated Verdict | Confidence | What Shifted                                                                                                                     | Remaining Concern                                                            |
| -------------- | --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Peter Thiel    | Yes             | 7          | "The founder IS the product. Designer taste applied to a category dominated by engineers. That's the contrarian insight."        | The monopoly mechanism still needs articulation beyond taste                 |
| Naval Ravikant | Conditional Yes | 6          | "Specific knowledge confirmed — personal pain, validated across 3 formats, organic demand. This is the right person."            | Still too much infrastructure for the stage. Needs users, not more features. |
| Warren Buffett | Conditional Yes | 5          | "Three-format validation (Docs → Substack → App) is proof of demand compounding. The content is the moat seed."                  | Revenue model remains undefined. "Eyes light up" isn't "wallets open."       |
| YC Partner     | Yes             | 7          | "Founder-market fit is exceptional. Built from personal pain. Validated organically. 11-day velocity with AI is a new paradigm." | Easter deadline is tight. Ship what works, cut what doesn't.                 |
| Skeptical VC   | Conditional Yes | 5          | "The validation journey is real — Docs → Substack → App is genuine pull. 'Eyes light UP' is anecdotal but directional."          | Solo founder burnout is the #1 kill risk. AI dependency is #2.               |

**Round 2 Board Confidence: 6.0/10**

### What Shifted

The founder context fundamentally changes the evaluation. This is not a speculative tech startup — it's a **creator-led product company** with validated demand across three prior distribution formats. Key shifts:

1. **Thiel** moved to Yes because the insight crystallized: a design-first devotional platform in a market of engineer-built apps is genuinely contrarian. The taste gap is the moat.

2. **Naval** moved to Conditional because the specific knowledge is confirmed — this founder has lived the problem, validated the solution organically, and brings irreplaceable creative direction. But he's still concerned about complexity relative to stage.

3. **Buffett** moved to Conditional because the three-format validation proves compounding demand. People wanted this when it was ugly Google Docs. They wanted it more on Substack. They'll want it even more as a polished app. But he needs the revenue conversation.

4. **YC Partner** moved to Yes because the AI development model is itself a paradigm proof. A designer shipping production software with AI in 11 days IS the story. The velocity is real.

5. **Skeptical VC** moved to Conditional because the validation journey addresses his biggest concern (is there demand?), but new concerns surfaced: founder sustainability and platform dependency on AI tooling.

---

## Round 3: Final Vote & Consensus

_Each persona delivers final assessment with full context._

| Persona        | Final Vote          | Confidence | One Line of Advice                                                                                                                         |
| -------------- | ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Peter Thiel    | **Yes**             | 7          | "Articulate the monopoly thesis explicitly: 'We own the intersection of design taste and spiritual formation.' Then defend that position." |
| Naval Ravikant | **Yes**             | 6          | "Cut scope to the bone for Easter. Soul Audit + 5 best series + beautiful reader. Everything else is post-launch."                         |
| Warren Buffett | **Conditional Yes** | 5          | "Define the premium tier before launch — even if it's not built yet. 'What would someone pay $5/month for?' Answer that."                  |
| YC Partner     | **Yes**             | 8          | "You have 6 weeks. Get 50 real users before Easter. Their feedback is worth more than 50 more PRDs."                                       |
| Skeptical VC   | **Conditional Yes** | 5          | "Build a sustainability plan for yourself, not just the product. Solo founder burnout kills more companies than bad products."             |

**Final Board Confidence: 6.2/10**

---

## Board Consensus

### What the board unanimously agrees on:

1. **The founder-product fit is exceptional.** A SCAD-trained designer building a devotional app from personal pain, with organic validation across 3 formats, is exactly the kind of founder-market fit that produces category-defining products.

2. **The Soul Audit is the killer feature.** No competitor does personalized spiritual assessment → curated devotional matching. This is the wedge that differentiates Euangelion from every Bible app in the market.

3. **Design quality IS the moat.** In a market full of engineer-built, feature-bloated Bible apps, a product that is genuinely beautiful and respects the reader's intelligence is a defensible advantage. The anti-manipulation metrics philosophy (no streaks, no guilt) is a product insight, not naivete.

4. **The AI development model is a proof case.** A designer shipping production-grade software with AI in 11 days is its own story — and that story has networking and portfolio value independent of Euangelion's commercial success.

5. **Easter 2026 must be protected.** It's the most meaningful launch date for a devotional product. Non-negotiable. But it requires ruthless scope discipline.

### Key Risks (ranked):

1. **No real users yet.** All 879 tests and 50 PRDs are hypotheses until real people use the product daily for a sustained period. This is the single biggest gap between current state and launch-ready.

2. **Revenue model undefined.** The market expectation for spiritual content is "free." YouVersion is free. Substack posts were free. The premium value proposition needs articulation — what transforms "eyes light up" into "I'd pay for this."

3. **Solo founder sustainability.** 146 commits in 11 days is heroic but not repeatable long-term. The governance system is smart (it replaces a team), but the human still needs margin. Burnout is the #1 killer of creator-led products.

4. **Scope creep risk for Easter.** 50 features scored 3-8/10, all with "path to 10/10" plans. Trying to bring everything to 10/10 before launch will blow the deadline. The question is: what's good enough for a meaningful Easter launch vs. what can wait for v1.1?

5. **Content maintenance burden.** 120 devotionals across 26 series is a library. Keeping quality consistent across that volume while also building features is a resource tension that will only grow.

### Action Items for the Founder:

1. **Get 50 real users in the next 3 weeks.** Not friends being polite — strangers from the Substack audience, church connections, or online communities. Track who comes back for Day 2 and Day 5. This is the only metric that matters before Easter.

2. **Define the "premium would be..." sentence.** Even if premium isn't built for Easter, know what it is. Possibilities: additional series depth, Shepherd-tier content, annotation sync across devices, AI chat depth, community features. Write it down. Test it in conversation with 5 people.

3. **Lock Easter scope NOW.** Identify the 10 features that must be 8+/10 for launch. Accept 5/10 on everything else. Candidates for "must be great": Soul Audit, devotional reader, homepage first impression, mobile experience, core navigation. Candidates for "can be 5/10": billing, admin, chat, left-rail archive, onboarding walkthrough.

4. **Build the public narrative concurrently.** The BUILD-STORY.md is a start. Share the journey on social media, in design communities, with the networking program. The story of "SCAD designer builds production app in 11 days with AI" is itself a distribution channel — people who are impressed by the story will try the product.

5. **Plan the post-Easter cadence.** Launch is not the end. What does week 2 look like? Month 2? Have a loose roadmap: Easter launch → first user feedback → first paid tier test → first content expansion. The governance system makes iteration fast — use it.

---

## Confidence Score Interpretation

| Range      | Meaning                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **6.2/10** | **Viable with clear path forward; address identified risks.** The product has genuine founder-market fit, a novel wedge (Soul Audit), and extraordinary execution velocity. The gaps — no users, no revenue model, solo sustainability — are all addressable before and shortly after Easter. The board recommends proceeding with focus. |

### Verdict Breakdown

- **3 Yes** (Thiel 7, Naval 6, YC 8) — conviction that the founder, the insight, and the execution are aligned
- **2 Conditional Yes** (Buffett 5, Skeptical VC 5) — the business model and sustainability questions need answers, but not before Easter

### Hard Blocks

None. No persona scored a hard "No" with confidence >= 8. All concerns are addressable.

---

_Board session complete. Re-run with `/shadow-board` when new evidence is available (post-launch metrics, revenue data, user feedback)._
