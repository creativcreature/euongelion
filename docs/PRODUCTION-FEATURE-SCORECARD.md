# Production Feature Scorecard

Last Updated: 2026-02-20
Owner: Product + Engineering
Scoring Rule: Founder scoring authority is capped at **5/10** baseline until founder elevation. Engineering implementation scores may exceed 5 with evidence. Every row includes a path to verified 10/10.

## PRD Linkage

1. Canonical feature PRD index: `docs/feature-prds/FEATURE-PRD-INDEX.md`
2. Canonical machine registry: `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
3. Every score change must be reflected in the matching `docs/feature-prds/F-xxx.md` outcomes log.

## Evaluation Sources

1. `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
2. `docs/production-decisions.yaml`
3. `docs/AUDIENCE.md`
4. `docs/PUBLIC-FACING-LANGUAGE.md`
5. `docs/UX-FLOW-MAPS.md`
6. `docs/SUCCESS-METRICS.md`
7. Current runtime implementation in `src/app`, `src/components`, `src/lib`
8. Verification stack (`type-check`, `verify:production-contracts`, `verify:tracking`, `lint`, `test`, `verify:ios-readiness`, `build`)

## User Flow Scorecard

| Flow                              | User Expectation                                             | Current | Gap | 10/10 Fix                                                          | Real-World Reference                                                             |
| --------------------------------- | ------------------------------------------------------------ | ------: | --: | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Landing -> first action           | Understand value and start in under 10 seconds               |       5 |   5 | Lock hierarchy and CTA language to one obvious next action         | [Headspace](https://www.headspace.com/) clear first-step funnel                  |
| Soul audit submit                 | Submit never fails silently and gives clear feedback         |       5 |   5 | Add explicit loading, retry, timeout, and failure recovery states  | [Stripe Checkout](https://stripe.com/payments/checkout) robust form resilience   |
| Consent -> option unlock          | Consent behavior is explicit and reversible                  |       5 |   5 | Add stronger inline rationale and state transitions                | [Notion privacy controls](https://www.notion.so/help) clear settings semantics   |
| Option selection -> plan          | No full plan before selection, then immediate progression    |       5 |   5 | Add plan-generation status timeline with recovery                  | [Headspace program pick flow](https://www.headspace.com/) progressive disclosure |
| Daily devotional as home          | Returning user lands in the right daily context              |       8 |   2 | Keep current-route validity + prefab continuity contracts enforced | [Notion Home](https://www.notion.so/product) return-to-work continuity           |
| Archive/bookmarks/notes retrieval | User can retrieve prior content with one predictable pattern |       4 |   6 | Normalize left-rail IA and add mobile access parity                | [Apple Notes](https://www.apple.com/ios/notes/) retrieval model                  |
| Cross-page navigation             | Sticky nav is stable, consistent, and non-janky              |       5 |   5 | Add scroll-state integration tests + snapshot baselines            | [Linear](https://linear.app/) stable shell behavior                              |
| Long-form reading continuity      | Typography and spacing remain comfortable at all sizes       |       4 |   6 | Lock type scale tokens and desktop/mobile readability thresholds   | [Apple News](https://www.apple.com/apple-news/) editorial rhythm                 |
| Help/recovery states              | Every error or empty state gives an actionable path          |       4 |   6 | Replace generic errors with route-specific recovery CTAs           | [Linear](https://linear.app/) action-first error handling                        |
| End-to-end trust                  | User understands what is saved, why, and where               |       4 |   6 | Add explicit persistence labels and data-boundary copy             | [Notion](https://www.notion.so/security) transparency patterns                   |

## Feature-by-Feature Scorecard

| Category          | Feature                                       | Current | Gap | 10/10 Fix Direction                                                                                 | Real-World Reference                                                         |
| ----------------- | --------------------------------------------- | ------: | --: | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Governance        | Changelog discipline                          |       5 |   5 | Enforce pass template: scope, evidence, blockers, next step                                         | [Stripe changelog](https://stripe.com/changelog) release trust model         |
| Governance        | CLAUDE tracking spine                         |       5 |   5 | Keep required references machine-enforced in `verify:tracking`                                      | [Notion engineering docs](https://www.notion.so/) source-of-truth culture    |
| Governance        | Version sync                                  |       5 |   5 | Block commit/CI when `package.json` and changelog diverge                                           | [SemVer](https://semver.org/) release contract                               |
| Governance        | Compaction continuity                         |       5 |   5 | Require continuity snapshot on every major pass                                                     | SRE runbook handoff pattern                                                  |
| Homepage UX       | Masthead sizing/fidelity                      |       5 |   5 | Add viewport/font-load snapshot assertions for clipping                                             | Newspaper masthead standards                                                 |
| Homepage UX       | Hero proportion parity                        |       4 |   6 | Add pixel-grid target metrics and regression snapshots                                              | Design-spec parity workflows                                                 |
| Homepage UX       | Primary CTA clarity                           |       5 |   5 | Keep one primary intent and secondary supporting actions                                            | [Headspace](https://www.headspace.com/) conversion clarity                   |
| Homepage UX       | FAQ interaction model                         |       4 |   6 | Normalize hover/focus/tap reveal mechanics across devices                                           | [Notion toggles](https://www.notion.so/help) predictable disclosure          |
| Navigation        | Sticky desktop nav                            |       6 |   4 | Add deterministic dock state tests and fallback state                                               | [Notion](https://www.notion.so/) sticky shell                                |
| Navigation        | Sticky mobile nav                             |       7 |   3 | Validate two-tier mobile IA on physical devices + reduced-motion parity                             | [Linear mobile web](https://linear.app/) minimal sticky controls             |
| Navigation        | Menu correctness                              |       8 |   2 | Add full route navigation walkthrough evidence and keyboard-only nav traversal logs                 | Common SaaS nav QA pattern                                                   |
| Typography        | Instrument Serif coverage                     |       4 |   6 | Component audit and tokenized font utility enforcement                                              | [The New Yorker](https://www.newyorker.com/) type consistency                |
| Typography        | Industry UI/meta coverage                     |       4 |   6 | Restrict UI labels to Industry class tokens only                                                    | Editorial design systems                                                     |
| Typography        | Readability floor                             |       5 |   5 | Enforce min readable size at 375/390 breakpoints                                                    | WCAG + Apple readability guidance                                            |
| Typography        | Hierarchy cadence                             |       4 |   6 | Lock ratio-based scale and line-length constraints                                                  | [Apple News](https://www.apple.com/apple-news/) hierarchy discipline         |
| Motion            | Micro-interaction polish                      |       5 |   5 | Keep shared link/button affordance system and reduced-motion parity enforced across all routes      | [Stripe Docs](https://docs.stripe.com/) subtle motion quality                |
| Motion            | Reduced-motion parity                         |       4 |   6 | Disable non-essential transforms/autoplay under PRM                                                 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) motion safety                      |
| Motion            | Scroll reveal restraint                       |       4 |   6 | Keep reveals boundary-only, never body-copy jitter                                                  | [Medium](https://medium.com/) reading comfort model                          |
| Soul Audit        | Submit contract (options-only)                |       5 |   5 | Keep staged API contract tests and forbidden-token checks                                           | Progressive disclosure best practice                                         |
| Soul Audit        | Consent gate                                  |       5 |   5 | Maintain essential-only gate and optional analytics OFF                                             | [Headspace privacy UX](https://www.headspace.com/)                           |
| Soul Audit        | 3 AI + 2 prefab split                         |       7 |   3 | Keep split assertions and add live telemetry for fallback-series usage                              | Editorial rail balancing pattern                                             |
| Soul Audit        | Selection locking                             |       5 |   5 | Persist selection idempotently and guard duplicate submits                                          | Checkout idempotency patterns                                                |
| Soul Audit        | Curated curation quality                      |       7 |   3 | Add founder-curated relevance QA set and rank explainability traces                                 | Human+AI editorial attribution models                                        |
| Soul Audit        | Crisis path                                   |       4 |   6 | Add explicit ack checkpoints with tested continuation paths                                         | Mental-health product crisis flows                                           |
| Devotional Engine | Curated-first assembly                        |       7 |   3 | Add observability on cross-series fallback and tighten curation quality thresholds                  | Content safety governance                                                    |
| Devotional Engine | 80/20 curation/generation                     |       4 |   6 | Add measurable module contribution telemetry                                                        | Human-in-the-loop generation standards                                       |
| Devotional Engine | Endnotes output                               |       4 |   6 | Require structured source endnotes per generated section                                            | Citation integrity pattern                                                   |
| Devotional Engine | Length/depth quality                          |       4 |   6 | Add min section-length and narrative coherence checks                                               | High-quality editorial standards                                             |
| Devotional UX     | Daily home continuity                         |       8 |   2 | Complete route-level parity QA for `/my-devotional` + devotional shells on mobile/desktop           | [Notion Home](https://www.notion.so/product)                                 |
| Devotional UX     | Left rail (archive/bookmarks/notes/favorites) |       4 |   6 | Add unified nav + deep-link states + mobile drawer equivalent                                       | [Notion sidebar](https://www.notion.so/product)                              |
| Devotional UX     | Day progression display                       |       4 |   6 | Add clear past/current/next status chips                                                            | Habit app progression models                                                 |
| Devotional UX     | Onboarding Wed/Thu/Fri variants               |       5 |   5 | Expand day-start branching tests and copy variants                                                  | [Headspace onboarding adaptation](https://www.headspace.com/)                |
| Chat              | Local-corpus-only guardrail                   |       5 |   5 | Add explicit refusal + source-scope UI indicators                                                   | Safe assistant scoping                                                       |
| Chat              | Citation visibility                           |       5 |   5 | Link response segments to source metadata inline                                                    | [Perplexity](https://www.perplexity.ai/) citation expectation                |
| Data & privacy    | Anonymous default                             |       5 |   5 | Keep no-account default and explicit opt-ins                                                        | Privacy-by-default product pattern                                           |
| Data & privacy    | Data export (mock account)                    |       4 |   6 | Add export completeness checks and schema version stamp                                             | GDPR-style export standards                                                  |
| Data & privacy    | Retention clarity                             |       4 |   6 | Add visible retention policy per artifact type                                                      | [Notion security docs](https://www.notion.so/security)                       |
| Reliability       | API abuse controls                            |       5 |   5 | Add route-level rate/size/validation tests                                                          | [Stripe API hardening](https://stripe.com/docs)                              |
| Reliability       | Error observability                           |       4 |   6 | Add request-id and failure taxonomy logging                                                         | Production SRE observability                                                 |
| Reliability       | Offline/degraded states                       |       4 |   6 | Add explicit degraded mode behavior and retry loops                                                 | PWA resilience patterns                                                      |
| Performance       | No horizontal overflow                        |       4 |   6 | Add viewport overflow CI checks (375,390,768,1280,1440)                                             | Responsive QA best practice                                                  |
| Performance       | LCP/CLS stability                             |       4 |   6 | Add budget gates and layout shift tests                                                             | Lighthouse budget discipline                                                 |
| Performance       | Interaction smoothness                        |       5 |   5 | Maintain incremental DOM scanning for motion prep and continue adding interaction latency checks    | Core Web Vitals INP targets                                                  |
| Accessibility     | Keyboard navigation                           |       5 |   5 | Keep keyboard-first affordances on interactive FAQ/cards and continue tab-order audits              | WCAG keyboard success criteria                                               |
| Accessibility     | Contrast & readability                        |       4 |   6 | Add theme contrast snapshots and enforcement gates                                                  | WCAG AA compliance                                                           |
| Accessibility     | Screen reader semantics                       |       4 |   6 | Add ARIA landmark and label audit for key flows                                                     | Assistive tech compatibility patterns                                        |
| Billing           | Entitlement checks                            |       7 |   3 | Enforce entitlement checks at premium UI entry points and sync from webhook-backed purchase records | [Headspace subscriptions](https://www.headspace.com/)                        |
| Billing           | Payment lifecycle states                      |       7 |   3 | Complete webhook-driven async state reconciliation and store restore QA evidence                    | [RevenueCat](https://www.revenuecat.com/) flow patterns                      |
| iOS               | Shell readiness                               |       7 |   3 | Add physical-device safe-area QA evidence for Safari and standalone shell                           | Apple HIG shell patterns                                                     |
| iOS               | App Store submission readiness                |       7 |   3 | Complete remaining App Store Connect evidence and metadata finalization                             | [Apple App Review](https://developer.apple.com/app-store/review/guidelines/) |

## Category Rollup

| Category                        | Score |
| ------------------------------- | ----: |
| Governance + Tracking           |  5/10 |
| User Flow + Navigation          |  6/10 |
| Typography + Motion             |  4/10 |
| Soul Audit + Curation Engine    |  5/10 |
| Devotional Experience + Library |  5/10 |
| Reliability + Security          |  5/10 |
| Accessibility + Performance     |  4/10 |
| Billing + iOS Readiness         |  7/10 |

## Target

No category can be marked 10/10 until:

1. Automated verification matrix passes.
2. Manual QA matrix passes on desktop/mobile + light/dark + reduced-motion.
3. Real-world reference pattern and rationale are documented.
4. Evidence is recorded in changelog and continuity snapshot.
