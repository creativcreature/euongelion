# Change Execution Protocol (Founder-Authority)

This protocol is the default operating contract for all future implementation work.

## Non-Negotiable Rules

1. Founder request is the source of truth.
2. No code changes begin until a written plan is submitted first.
3. No feature is called "fixed" without live UI verification in a real browser flow.
4. Unit tests, linters, and hooks are supporting evidence only; they do not override runtime behavior.

## Mandatory Pre-Change Plan

Before editing files, submit a concise plan with:

1. Problem statement in plain language.
2. Reproduction path (exact page/flow).
3. Suspected root cause(s).
4. Proposed change scope (files/components).
5. Validation plan (desktop + mobile live UI checks, keyboard + mouse path).
6. Rollback plan if behavior regresses.

No implementation starts until this plan is provided in-thread.

## Live UI Verification Requirement

After changes, verify using an actual browser interaction flow:

1. Launch app and open the target route.
2. Use keyboard and mouse interactions as an end user would.
3. Verify primary success criteria and edge cases.
4. Verify desktop and mobile viewport behavior.
5. Capture concrete evidence (measured behavior + screenshots/logs).

## Definition of Done

A change is only done when all are true:

1. Founder-requested runtime behavior is confirmed in live UI.
2. Regressions are checked in adjacent critical flows.
3. Supporting checks pass (type-check/tests/hooks).
4. Results are reported with evidence, not assumption.

## Prohibited Behaviors

1. Claiming "fixed" from tests alone.
2. Committing/pushing before live UI verification.
3. Repeating speculative micro-patches without an updated plan.
4. Prioritizing repository gates over founder-observed runtime behavior.
