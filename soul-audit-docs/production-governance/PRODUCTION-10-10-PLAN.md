# Production 10/10 Plan

Last Updated: 2026-02-14
Owner: Product + Engineering
Objective: Move every scorecard category to verified **10/10** with evidence, not claims.

## Execution Ordering (Locked)

1. Layout
2. Chat
3. Onboarding
4. Remaining features in PRD registry order with dependency constraints
5. App Store release gate and submission preparation

## PRD Operating System Requirement

1. Every tracked feature is represented in `docs/feature-prds/F-xxx.md`.
2. PRD outcomes log updates are required with feature code changes.
3. Methodology mapping is required per PRD (`M00` + one or more source methods).

## Execution Update (2026-02-13 Pass C)

Completed in this pass:

1. Billing lifecycle polish: web checkout flash handling, billing portal route, iOS/web message states, and stricter iOS-readiness checks.
2. Accessibility polish: keyboard-operable FAQ card state and improved live-region messaging for billing errors/success.
3. Motion/performance polish: incremental motion scanning and `content-visibility` support for long-form reading blocks.

Still required for 10/10:

1. Full entitlement enforcement and subscription state persistence.
2. Billing E2E route tests for checkout/portal success and failure branches.
3. Automated accessibility/performance regression gates (keyboard path + INP budget alerts).

## Execution Update (2026-02-14 Layout Pass)

Completed in this pass:

1. Unified homepage masthead/topbar/navigation into shared `EuangelionShellHeader` to remove duplicate logic and route drift.
2. Replaced observer-only nav docking with deterministic scroll/resize dock-state computation and added dedicated regression tests.
3. Expanded mobile topbar ticker from two items to three (date, descriptor line, mode label) with reduced-motion safeguards.
4. Improved masthead readability/fit behavior by loosening max-size clipping constraints and tightening line-height precision.

Still required for 10/10:

1. Manual viewport parity QA against mock proportions (375/390/768/1280/1440, light/dark).
2. Route-by-route navigation walkthrough and keyboard traversal evidence capture.
3. Additional automated visual regression snapshots for masthead and sticky shell transitions.

## Execution Update (2026-02-14 Chat Pass)

Completed in this pass:

1. Added explicit chat guardrail metadata from API (`local-corpus-only`, no internet search, context presence flags).
2. Added structured citation payloads in chat responses combining local-context sources and scripture citations detected in assistant output.
3. Rendered guardrail scope messaging and per-message source lists in chat UI for desktop/mobile.
4. Added regression tests validating chat response metadata contract.

Still required for 10/10:

1. Manual UX pass for citation density and readability at 375/390 and desktop widths.
2. Add inline source-to-text segment anchors for long assistant replies.
3. Add explicit empty-state handling when no citations are produced.

## Execution Update (2026-02-14 Onboarding Pass)

Completed in this pass:

1. Added explicit onboarding metadata propagation from selection/day APIs (`startPolicy`, variant, onboarding days, cycle start, timezone).
2. Added visible onboarding variant context in Soul Audit results for Wed/Thu/Fri/weekend starts, including cycle start timestamp.
3. Upgraded onboarding devotional fallback/title copy to variant-specific naming and cadence language.
4. Added onboarding variant content tests to prevent regression.

Still required for 10/10:

1. Manual QA pass on onboarding variant messaging across desktop/mobile breakpoints.
2. Add integration test coverage for API route metadata payloads under real plan-instance fetches.
3. Add visual state chips for onboarding day progression in the left rail.

## Execution Update (2026-02-14 Curation Reliability Pass)

Completed in this pass:

1. Added repository-backed metadata fallback candidates when curated catalog files are unavailable at runtime.
2. Hardened option split quality by preferring series with complete 5-day candidate coverage.
3. Improved plan assembly coherence by prioritizing preferred-series day flow before ranked cross-series fallback.
4. Added dedicated curation reliability test coverage (`__tests__/soul-audit-curation.test.ts`).

Still required for 10/10:

1. Founder-led relevance QA dataset pass against real audit inputs.
2. Selection-level observability on fallback usage and relevance drift.
3. Manual desktop/mobile walkthrough evidence for option quality and plan specificity.

## Execution Update (2026-02-14 Devotional Home Shell Pass)

Completed in this pass:

1. Restyled `/my-devotional` into the same newspaper shell (`mock-home` + `mock-paper`) used by homepage/devotional routes.
2. Unified breadcrumb and panel rhythm so devotional-home continuity is visually and structurally consistent.
3. Preserved existing library mechanics while aligning entry layout with the core editorial shell.

Still required for 10/10:

1. Full route continuity walkthrough from home -> my devotional -> devotional day -> archive return path.
2. Mobile spacing and touch-target QA at 375/390 with screenshot evidence.
3. Left-rail parity expansion on devotional detail pages (beyond link-out shortcuts).

## Operating Rules

1. Highest current score is capped at 5/10 per founder baseline.
2. Each phase must map behavior to a real-world reference pattern.
3. No category can graduate to 10/10 without automated and manual verification.
4. `CHANGELOG.md`, scorecard, plan, and compaction handoff must be updated together.

## Category Targets

| Category                        | Current | Target | Definition of 10/10                                                                         |
| ------------------------------- | ------: | -----: | ------------------------------------------------------------------------------------------- |
| Governance + Tracking           |       5 |     10 | Zero drift for 3 consecutive passes, full evidence chain in changelog + handoff             |
| User Flow + Navigation          |       4 |     10 | All core routes predictable, sticky behavior deterministic, no dead-end states              |
| Typography + Motion             |       4 |     10 | Legible scale at all breakpoints, consistent fonts, calm micro-motion with PRM parity       |
| Soul Audit + Curation Engine    |       4 |     10 | 3+2 split always, curated-first assembly, no full plan pre-selection, robust retries        |
| Devotional Experience + Library |       4 |     10 | Daily home continuity, left rail parity, archive/bookmarks/notes/favorites always reachable |
| Reliability + Security          |       5 |     10 | Abuse controls, validation, observability, and tested recovery for all critical APIs        |
| Accessibility + Performance     |       4 |     10 | WCAG AA plus no-overflow plus stable LCP/CLS/INP across target devices                      |
| Billing + iOS Readiness         |       3 |     10 | Subscription lifecycle complete and App Store submission packet production-ready            |

## Real-World Pattern Mapping

| Product Surface                 | Pattern to Match                       | Why                                           |
| ------------------------------- | -------------------------------------- | --------------------------------------------- |
| Re-entry and continuity         | Notion workspace resume                | Strong orientation and immediate productivity |
| Onboarding and first action     | Headspace calm step-by-step start      | Reduces hesitation and increases completion   |
| Form/action reliability         | Stripe checkout resilience             | Predictable failure handling and trust        |
| Long-form reading shell         | Apple News editorial hierarchy         | Supports sustained reading comfort            |
| Sidebar retrieval model         | Notion/Apple Notes side library        | Fast memory retrieval and context switching   |
| Error and empty states          | Linear action-first recovery           | Prevents user drop-off during failures        |
| Subscription states             | RevenueCat + Headspace lifecycle norms | Reduces billing confusion and churn           |
| iOS polish and review readiness | Apple HIG + App Review checklist       | Submission readiness and UX consistency       |

## Phase Execution

### Phase 1: Governance and Continuity Hardening

Scope:

1. Keep `CLAUDE.md` references complete and enforced.
2. Keep semver/changelog sync enforced.
3. Require continuity snapshots after each major pass.

Deliverables:

1. `verify:tracking` green in pre-commit and CI.
2. Required docs and references validated by machine checks.
3. Commit messages for feature work include decision ids.

Exit:

1. Three consecutive passes with zero tracking drift.
2. No missing changelog entries for shipped behavior changes.

### Phase 2: Core Flow Completion (Landing -> Audit -> Plan)

Scope:

1. First screen clarity and above-fold action.
2. Submit/consent/select staged robustness.
3. Recovery-first error messaging.

Deliverables:

1. Deterministic API contracts and edge-case tests.
2. Visible action feedback for every loading/error/disabled state.
3. Route-state persistence across refresh/session churn.

Exit:

1. End-to-end flow tests pass for happy and failure paths.
2. No unresolved P1/P2 issues in audit pipeline.

### Phase 3: Devotional Home and Library Completion

Scope:

1. Daily devotional becomes default post-audit home.
2. Left rail archive/bookmarks/notes/favorites parity.
3. Mobile and desktop information architecture consistency.

Deliverables:

1. Unified left-rail model with mobile equivalent.
2. Archive and progression states visible per devotional.
3. Resume logic and day-state context badges.

Exit:

1. Retrieval tasks completed in one or two interactions max.
2. No broken nav path in manual walkthrough.

### Phase 4: Typography and Micro-Interaction Polish

Scope:

1. Instrument Serif and Industry coverage audit.
2. Legible minimum sizing and scale rhythm.
3. Link/button underline + line-box interactions.

Deliverables:

1. Type token map and component-level compliance list.
2. Motion tokens for hover/focus/active/disabled.
3. Reduced-motion parity for all non-essential animation.

Exit:

1. Typography visual QA passes at all target breakpoints.
2. Motion quality consistent and accessibility-safe.

### Phase 5: Accessibility and Performance Certification

Scope:

1. Keyboard-only and screen-reader correctness.
2. Contrast and reduced-motion compliance.
3. No horizontal overflow and strong web vitals.

Deliverables:

1. Automated a11y checks + manual assistive pass.
2. Overflow checks on 375/390/768/1280/1440.
3. LCP/CLS/INP budgets and regression alerts.

Exit:

1. WCAG AA pass on critical flows.
2. Performance budgets pass in CI.

### Phase 6: Billing and iOS Launch Completion

Scope:

1. Payment/entitlement lifecycle completion.
2. iOS shell behavior parity and metadata readiness.
3. Submission packet with evidence artifacts.

Deliverables:

1. Success/cancel/retry/restore billing tests.
2. Entitlement gating and fallback UX.
3. App Store docs/screenshots/privacy strings/review notes.

Exit:

1. Billing flow passes all edge-case tests.
2. iOS readiness checklist fully complete.

## Verification Matrix (Required per Major Pass)

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
npm run verify:ios-readiness
npm run build
```

## Manual QA Matrix (Required per Category Promotion)

1. Breakpoints: 375, 390, 768, 1280, 1440.
2. Themes: light and dark.
3. Inputs: mouse, touch, keyboard only.
4. Motion: default and `prefers-reduced-motion`.
5. Landing -> audit submit -> consent -> option select -> plan.
6. Returning user resume -> daily devotional home.
7. Archive/bookmarks/notes/favorites retrieval.
8. Locked-day and onboarding variants (Wed/Thu/Fri).
9. Network failure and retry paths.

## Evidence Artifacts Required

1. Verification command results.
2. File-level change list with reason.
3. Score deltas in `docs/PRODUCTION-FEATURE-SCORECARD.md`.
4. Continuity snapshot in `docs/PRODUCTION-COMPACTION-HANDOFF.md`.
5. Changelog entry with outcomes and blockers.
