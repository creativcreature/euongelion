# Soul Audit Persistence Migration — Staged Removal of Silent Fallbacks

**Status:** DESIGN ONLY — not implemented. Founder instruction 2026-07-28: _"design—but do not yet broadly implement—a staged removal of silent in-memory fallbacks."_
**Decision ids:** SA-023, SA-032 (extension pending a new id at implementation time)
**Related:** F-083, `docs/technical/database-schema.md`, dev rule #1 (NO SILENT FALLBACKS)

---

## 1. Why this exists

`src/lib/library/repository.ts` caused a six-month bug: it wrote to a Workers-isolate memory map, swallowed the failing Supabase write, and reported success. The activation "worked" until the next request hit a different isolate. That repository has now been repaired — writes throw `LibraryPersistenceError`, reads throw `LibraryReadError`, and the isolate cache is no longer read-authoritative.

`src/lib/soul-audit/repository.ts` still implements **the same architecture, deliberately and at much larger scale**. It is the older, bigger sibling of the bug we just spent a week fixing.

### Measured state (2026-07-28)

| Metric                                      | Count       |
| ------------------------------------------- | ----------- |
| File size                                   | 1,323 lines |
| Exported functions                          | 46          |
| `WithFallback` variants (cache-first reads) | 25          |
| `catch` blocks                              | 8           |
| `return null` sites                         | 19          |
| `return []` sites                           | 6           |
| Caller files                                | 13          |

The file documents its own behavior explicitly (line 22): _"Functions ending in `WithFallback` first check the in-memory cache"_ and (line 201) treats a failed write as _"fall back to in-memory only" rather than as an error_.

### Two findings that are worse than the Daily Bread bug

1. **The audit rate limiter is in-memory only** (line 363). A per-isolate counter is not a rate limit — Cloudflare spawns isolates freely, so the ceiling is effectively `limit × isolates`. This is a cost-control and abuse-surface issue, not just a reliability one, and it gates `GENERATION_GATE_LIVE`.
2. **A lock fails open** (line 1080): `if (!supabase) return true` — when Supabase is unreachable the code proceeds as though it holds the lock, relying on an in-memory lock that other isolates cannot see. Fail-open on a concurrency guard risks duplicate generation work (and duplicate LLM spend).

Both should be lifted out of the general migration and fixed first — see Phase 0.

---

## 2. Caller inventory

13 files import this repository. Every one is an API route except the last.

| Caller                                                    | Entities touched                              | Blast radius if reads start throwing                |
| --------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `app/api/soul-audit/submit/route.ts`                      | audit run, options, consent, telemetry, count | Audit cannot start — highest-traffic path           |
| `app/api/soul-audit/select/route.ts`                      | selection, plan instance, plan days           | Selection lock-in — creates the plan                |
| `app/api/soul-audit/manage/route.ts`                      | plan instances, selections                    | Manage/resume surfaces                              |
| `app/api/soul-audit/reset/route.ts`                       | session audit state                           | Reset flow                                          |
| `app/api/devotional-plan/[token]/day/[n]/route.ts`        | plan day, plan instance                       | The AI-plan reader                                  |
| `app/api/devotional-plan/[token]/day/[n]/deepen/route.ts` | plan day content                              | Deepen action (LLM write-back)                      |
| `app/api/daily-bread/active-days/route.ts`                | plan days                                     | Day-nav state                                       |
| `app/api/annotations/route.ts`                            | annotations                                   | Notes/highlights                                    |
| `app/api/bookmarks/route.ts`                              | bookmarks                                     | Save/unsave                                         |
| `app/api/devotionals/saved/route.ts`                      | bookmarks                                     | Saved list                                          |
| `app/api/mock-account/session/route.ts`                   | mock account session                          | Demo/mock account                                   |
| `app/api/mock-account/export/route.ts`                    | mock account session                          | Data export                                         |
| `lib/library/repository.ts`                               | (cross-repo call)                             | **Already migrated** — the reference implementation |

---

## 3. Classification: what must be durable

The migration is not "make everything throw." Each operation is classified by whether losing it silently is acceptable.

### Class A — DURABLE-REQUIRED (must fail loudly)

Losing these silently produces the Daily Bread failure mode: the reader believes something was saved and it evaporates.

- `createPlan`, `saveSelection`, `createAuditRun`, `saveConsent`
- `updatePlanDayContent` (LLM output — expensive to regenerate)
- `addBookmark`, `removeBookmark`, `addAnnotation`, `updateAnnotation`, `removeAnnotation`
- `upsertMockAccountSession`
- All reads backing a render decision: `getPlanInstance`, `getAllPlanDays`, `getPlanDay`, `getSelection`, `getAuditRun`, `getConsent`, `listBookmarks`, `listAnnotations`, and each `listX ForSession`

### Class B — GENUINELY EPHEMERAL (cache is legitimate)

- `getAuditTelemetry` / `saveAuditTelemetry` — analytics; losing a row must never break a user flow
- `isDayStillPending` — advisory only **once the lock is fixed** (Phase 0)

### Class C — MUST BE DURABLE BUT IS CURRENTLY MEMORY-ONLY (net-new work)

- `getSessionAuditCount` / `bumpSessionAuditCount` / `resetSessionAuditCount` — the rate limiter. Needs a real backing store (Supabase table or KV with TTL), not a migration of existing code.

---

## 4. Failure contracts

Mirror the already-shipped library repository so the codebase has ONE vocabulary.

```ts
// Already exist in src/lib/library/repository.ts — promote to a shared module.
class PersistenceError extends Error {} // a write did not land
class ReadError extends Error {} // canonical state could not be read
```

Rules, identical to the migrated repository:

1. A read that errors **throws `ReadError`**. It never returns `null`/`[]`. Absence is only ever a successful query returning no row.
2. A write that does not land **throws `PersistenceError`**, after rolling back any optimistic cache entry so same-isolate reads cannot lie.
3. The isolate cache is **never read-authoritative** for Class A entities. It may serve write-rollback and request-scoped memoization only.
4. Render paths that perform lazy writes log, roll back, and serve un-promoted truth — they never 500 a page (the `promoteScheduledSwapIfDue` precedent).
5. Class B may keep returning empty on failure, but must emit a structured `evt` line so the silence is visible.

### HTTP mapping

| Condition             | Status                          | Body                                                                   |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Write did not land    | `503`                           | `{ code: "PERSISTENCE_FAILED", requestId, error: <reader-safe copy> }` |
| Canonical read failed | `503`                           | `{ code: "STATE_UNAVAILABLE", requestId, ... }`                        |
| Confirmed absence     | `200`/`404` per route semantics | honest empty                                                           |
| Not signed in         | `401`                           | `{ code: "AUTH_REQUIRED" }`                                            |

UI already has the vocabulary for this: `StateUnavailable` ("We couldn't confirm … Your selection has not been changed") and the route-aware error boundary.

---

## 5. Migration phases

Each phase ships independently and is separately revertable. **Do not do this in one pass** — 46 functions across 13 routes is exactly the change that breaks a working product.

### Phase 0 — Correctness bugs (do first, independent of the migration)

- Move the audit rate-limit counter to a real store (Class C). Until then the limit is per-isolate and effectively unbounded.
- Change the fail-open lock (line 1080) to fail-closed, or make it a genuinely advisory best-effort path with a durable idempotency key on the write it guards.
- **Gate:** these must land before `GENERATION_GATE_LIVE`, because both control spend.

### Phase 1 — Shared error vocabulary (no behavior change)

- Extract `PersistenceError` / `ReadError` into `src/lib/persistence/errors.ts`; re-export from the library repository so nothing breaks.
- Add structured `evt` logging at every existing swallow site, still returning today's values.
- **Value:** one deploy later, production tells you how often each fallback actually fires — which converts the rest of this plan from guesswork into data. Ship this and wait a week before Phase 2.

### Phase 2 — Bookmarks + annotations (smallest blast radius)

- 4 routes, self-contained entities, already anonymous-capable (SA-018).
- Convert reads/writes to Class A contracts; routes return 503 honestly; UI uses `StateUnavailable`.
- **Why first:** if this phase is wrong, a reader cannot save a note for a few minutes. Nothing structural breaks.

### Phase 3 — Plan reads (the reader path)

- `getPlanInstance`, `getAllPlanDays`, `getPlanDay` and their `WithFallback` twins.
- Delete the `WithFallback` variants once callers move; do not leave both.
- Coordinate with `resolveCurrentReading`, which already models `unavailable` correctly and will simply start receiving real throws.

### Phase 4 — Plan + selection writes

- `createPlan`, `saveSelection`, `updatePlanDayContent`.
- Highest value (this is where generated content is lost) and highest risk.
- Requires idempotency review first: a 503 the client retries must not create two plans.

### Phase 5 — Audit run / consent / session state

- `createAuditRun`, `saveConsent`, session audit state.
- Touches the funnel entry point — ship last, behind the strongest test coverage.

### Phase 6 — Delete the fallback machinery

- Remove the memory store for Class A entities entirely; keep it for Class B only.
- Update the file header, which currently documents the fallback behavior as intended design.

---

## 6. Tests

Per phase, before the phase ships:

1. **Failure injection** — mock the Supabase client to (a) return `{error}`, (b) throw, (c) return no rows. Assert: (a)+(b) throw the typed error, (c) returns honest absence. This is the test class that would have caught the original bug.
2. **No-lie-on-rollback** — after a failed write, a same-isolate read must not return the optimistic value.
3. **Route contract** — each migrated route returns 503 + the documented code on failure, and never a 200 implying success.
4. **Cross-isolate simulation** — reset the module-level store between calls to prove reads do not depend on it.
5. **Regression** — the existing suite (137 files / 1,765 tests) must stay green at every phase.
6. **Idempotency (Phase 4)** — the same logical write applied twice produces one row.

---

## 7. Risks

| Risk                                                                  | Mitigation                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Errors surface to users who previously saw a degraded-but-working app | Phase order is by blast radius; Phase 1 gives real frequency data before any behavior change    |
| A 503 on a retried write creates duplicates                           | Idempotency review gates Phase 4                                                                |
| Anonymous flows regress                                               | SA-018 contract tests must be in the Phase 2 gate                                               |
| Scope creep into a rewrite                                            | Each phase is a separate commit and separately revertable; no phase may refactor unrelated code |

## 8. Explicitly out of scope

- Rewriting Soul Audit business logic or curation
- Schema changes beyond the Class C rate-limit store
- Touching `src/lib/library/repository.ts`, which is already migrated and is the reference

---

## 9. Recommended first action

Ship **Phase 0 + Phase 1 only**, then wait for a week of production `evt` data before committing to Phases 2-6. Phase 0 fixes two real correctness bugs that gate generation spend; Phase 1 is observability with zero behavior change. Together they are low-risk and they convert the rest of this plan from an assumption into a measurement.
