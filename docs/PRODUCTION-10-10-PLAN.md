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
