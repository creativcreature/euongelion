# Production Source of Truth

Last Updated: 2026-02-13
Owner: Product + Engineering
Status: Authoritative

## Canonical Intent

Euangelion Soul Audit and Devotional Engine are curated-first and selection-first:

1. Repository content is canonical for devotional construction.
2. Local reference volumes are mandatory grounding inputs.
3. Construction target is 80% curated and 20% generation-assisted polish.
4. Soul Audit submit returns options only, never a full plan.
5. A full 5-day plan is generated only after user selection.

## Locked Product Decisions

1. No-account core usage in testing phase.
2. Simulated account mode exists now; real auth deferred.
3. Soul Audit returns exactly 5 choices:
4. 3 primary AI-ranked options.
5. 2 secondary curated prefab options.
6. Prefab selection routes to a series overview.
7. Essential consent is required; analytics consent is optional and defaults OFF.
8. Crisis flow requires explicit resource acknowledgement before continuation.
9. Tracking is anonymous by default.
10. Audit limit is 3 per cycle.
11. Curated source priority is:
12. `content/approved`
13. `content/final`
14. `content/series-json`
15. Missing curated core module fails closed and blocks publish/render.
16. Generation is constrained to assistive polishing only.
17. Endnotes are required on generated devotional days.
18. Chat is restricted to devotional context and local corpus only.
19. Unlock policy:
20. Monday start: normal weekly cycle.
21. Tuesday start: Monday is readable archived content.
22. Wednesday-Sunday start: onboarding devotional first, full cycle begins Monday.
23. Daily unlock remains 7:00 AM local-time cadence.

## Required API Contracts

1. `POST /api/soul-audit/submit`
2. `POST /api/soul-audit/consent`
3. `POST /api/soul-audit/select`
4. `GET /api/devotional-plan/:token/day/:n`
5. `POST /api/mock-account/session`
6. `GET /api/mock-account/export`
7. `POST /api/annotations`
8. `GET /api/annotations`
9. `POST /api/bookmarks`
10. `GET /api/bookmarks`

## Drift Policy

1. `docs/production-decisions.yaml` is the machine-readable contract.
2. CI fails when required contracts are missing or stale.
3. Feature commits must reference a production decision id.
4. `CHANGELOG.md` remains historical log only.
