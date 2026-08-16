# HANDOFF — Reader Transport & Journaling (2026-08-16)

**Purpose:** resume this work from zero context after a shutdown or compaction.
**Read these three first, in order:**

1. This file — session state, rulings, findings, traps.
2. `docs/superpowers/specs/2026-08-16-reader-transport-and-journaling-design.md` — the approved design.
3. `docs/superpowers/plans/2026-08-16-reader-transport-and-journaling.md` — 15 executable tasks with real test code.

**Status:** design approved, plan approved, **Phase 1 COMPLETE** (commits `7f6d64bc`, `db1ee9a6`). Phase 2 (transport) is next. See §7.

---

## 1. What the founder asked for

Verbatim, 2026-08-16, opening message:

> "2 massive edits. I want the audio player to be modeled after the audible audio player, but to still be inline and small footprint. The it needs to have proper play buttons, chapters, etc. I also want people to be able tot listen at 2x speed etc. The current player is too basic. But it has the right amount of footprint (taking up the right amount of on screen space) but the type can be smaller and more finessed, and the player features need to be better thought out and more robust. Secondly- I want to add note taking feature that works similar to the highlight feature- maybe even works with it somehow. I also want reflection questions etc to take user input so users can write journal entries and such. We will need to develop the Library more in relation to these updates, so once all this is sorted, we will jump into developing the library."

A full 18-row trace of every ask to where it is handled is in **spec §7 (Ask inventory)**. Nothing from that message is unhandled.

---

## 2. Founder rulings made this session — ALL BINDING

| #   | Ruling                                                                                                                                                                                                      | Consequence                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| R1  | **Two site states.** "Having an account enables notes, saving features, highlights etc. No account, data should not be retained… The unsigned in state simply is a reader, non-interactive and non saving." | Becomes SA-057. **Reverses SA-018 (as amended), SA-038 §2, SA-039 §5.**                 |
| R2  | Gate line: **reading + Soul Audit stay open; Daily Bread + all saving gated.**                                                                                                                              | SA-026 ("Soul Audit anonymous and free forever") is NOT reversed.                       |
| R3  | **Audio clips approved** — a bookmark at a timestamp, landing in the same Notes list.                                                                                                                       | Spec §4.4, plan Task 11.                                                                |
| R4  | **Cross-device audio resume approved**, including the prod DDL it needs.                                                                                                                                    | This IS the founder-named approval that SA-039 §2 requires for prod DDL. Migration 018. |
| R5  | **Offline download deferred** — "out for now, ship the rest first."                                                                                                                                         | Spec §3.5. Recorded as a deliberate deferral, not an omission.                          |
| R6  | **Account data may be retained** for a future "Spotify-style wrap up… their journey with God."                                                                                                              | Substrate only this session; Wrapped itself is NOT being built.                         |
| R7  | **Library deferred** to its own session, by the founder's own words ("once all this is sorted").                                                                                                            | Spec §5.                                                                                |
| R8  | Founder explicitly invited pushback: "Push back if this doesnt work or is incorrect logic or bad practice."                                                                                                 | Four amendments were made to R1 and accepted — see §3.                                  |

### Founder's own caveat on R6

> "Im not sure what this means for what you are asking. A bit out of my depth."

They were answering a question about **signed-out device preferences** with an answer about **signed-in retention**. Both were resolved (spec §2.5 and §2.8). Do not re-litigate; do not assume the founder has a settled position on data-protection detail — surface it plainly if it comes up again.

---

## 3. The four amendments made to R1, and why

R1 as stated would have broken things. These were put to the founder and accepted:

1. **"Non-interactive" is scoped to "non-saving."** Taken literally it kills the audio player, theme switching, translation, and the comprehension modules — which would kill the shop window that earns the account. Signed-out reading stays fully alive; nothing _authored_ is retained. (Spec §2.4)
2. **Locked, not hidden.** A save control that vanishes signed out never teaches the reader the product does that, and loses the best conversion moment there is. Controls stay visible; activating one opens sign-in **and the action completes after auth**. `onAuthRequired` + `SignInIntentModal` already exist for this. (Spec §2.6)
3. **The gate must not slide down the funnel.** `/today`, `/series`, `/devotional/*` stay open for SEO and sharing. Soul Audit stays anonymous per SA-026. (Spec §2.3)
4. **Accounts must be verified working before the gate flips.** (See §6 below — this is the release blocker.)

---

## 4. Findings — diagnosed this session, all verified against real code or prod

### 4.1 SILENT DATA LOSS in the highlight path — the reason Task 1 exists

`updateAnnotation` (`src/lib/soul-audit/repository.ts:1209`) overwrites `anchor_text` and `body` with whatever the PATCH carried. `persistEdit` in `TextHighlightTrigger` sends only `annotationId` + `style`. `sanitizeOptionalText(undefined, n)` returns `null` (`src/lib/api-security.ts:388`).

**Therefore:** recolouring a highlight, or saving a note on one, nulls its anchor text. `hydrateSavedHighlights` matches on `anchor_text || body`, finds nothing, and the mark never repaints. The reader's highlight is gone and nothing reported a failure.

Fix is plan Task 1: PATCH becomes a true partial update — absent key means "leave alone", explicit `null` means "clear".

### 4.2 Schema drift — `annotations.style` is live in prod but not in any migration

Probed production directly, 2026-08-16:

| Column                                         | Result                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `id`, `annotation_type`, `anchor_text`, `body` | present                                                                        |
| `style`                                        | **present in prod** (returns `{"kind":"favorite_verse","color":"yellow",...}`) |
| `updated_at`                                   | **absent** — `42703`                                                           |

`database/migrations/009_create_soul_audit_tables.sql:166` declares no `style` column. It was added out-of-band. Nothing is broken; it is drift worth reconciling later. **Consequence for design:** there is no `updated_at`, which is why edit time lives in `style.editedAt` and the journaling work needs no migration at all.

Second drift found the same way: **`annotations.id` is UUID in production** where 009 declares it `TEXT`. Harmless in practice — `addAnnotation` uses `randomUUID()` — but any script that inserts a row with a non-UUID id gets `22P02 invalid input syntax for type uuid`. Worth knowing before you burn ten minutes on it.

### 4.2b Migration 009 was only PARTIALLY applied — open defect

`audit_option_telemetry` is declared at `009_create_soul_audit_tables.sql:47`
and **does not exist in production** (`PGRST205`, verified 2026-08-16).

This is not cosmetic. `account-deletion.ts` still lists it, and
`safeDeleteByColumn` pushes to `partialFailures` on any error — so **every
account deletion running today reports a partial failure**, and that field's own
documentation defines it as "Tables that errored — data MAY persist there." A
reader exercising their right to erasure gets an incomplete-looking result.

Deliberately NOT fixed this session; it is surfaced for a founder call, and the
reasoning is recorded in `__tests__/privacy-table-coverage.test.ts`
(`NOT_IN_PRODUCTION`). Two ways out: apply the missing part of 009, or drop the
table from the code. It is excluded from the export list because adding it
would make every export claim to be incomplete too.

### 4.3 GDPR export gap — pre-existing, unrelated to this work

`src/lib/privacy/account-deletion.ts` deletes 7 user-keyed tables; `src/lib/privacy/data-export.ts` exports 3. These four are deletable but **not** exportable: `soul_audit_sessions`, `active_series`, `scheduled_series_swap`, `archived_series`. That is a complete right to erasure sitting beside an incomplete right of access (Art. 15). Folded into plan Task 2.

### 4.4 Tests CANNOT reach production Supabase — verified empirically

Vitest does not load `.env.local`. Probed 2026-08-16: inside a test, both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **unset**, so `maybeSupabase()` returns `null` and every `safeInsert`/`safeUpdate` is a no-op against the in-memory store.

**This is safe, and it is also a trap:** repository tests exercise the in-memory path ONLY. They cannot catch a Postgres-level failure, and `safeInsert` swallows real errors to `console.error` while the API still returns 200. Never conclude "it persists" from a green repository test — verify against prod or `npm run preview`.

Also note the store is a **module-global** (`global.__euangelionSoulAuditStore__`) that persists across tests in a file. Seed per-test with a unique session token, or clear it.

### 4.5 Catalog sizing — measured, not estimated

| Thing                                                  | Count                                          |
| ------------------------------------------------------ | ---------------------------------------------- |
| Devotional JSON files                                  | 568                                            |
| Narration tracks in the manifest                       | 528, **all 528 with measured chapter timings** |
| Track duration range                                   | 149s – 1690s (2.5 – 28 min)                    |
| Reflection modules                                     | 545                                            |
| `additionalQuestions` inside them                      | 1,517                                          |
| **Total journal prompts already written and shipping** | **2,062**                                      |
| Recap modules with `integration_question`              | 2                                              |
| Prayer modules                                         | 543 — **none pose a question**                 |

The prayer number is why `PrayerModule` gets an _Add your own prayer_ affordance rather than an answer field. An earlier draft of the spec said prayer "gets the same treatment" as reflection; that was wrong and is corrected.

---

## 5. Decisions to be recorded (plan Task 15 — NOT yet written)

`docs/production-decisions.yaml` is canonical for SA ids. **Highest existing is SA-056.** Claimed here:

- **SA-057** — two-state site model. Its note MUST state explicitly that it reverses SA-018 (as amended 2026-06-09), SA-038 §2, SA-039 §5, and that SA-026 is NOT reversed.
- **SA-058** — Audible-modeled transport + cross-device resume.
- **SA-059** — unified journaling on the `annotations` table.

Feature PRDs claimed: **F-100** (two-state), **F-101** (transport), **F-102** (journaling). Highest existing was F-099.

> **F-numbers and SA-numbers race under parallel sessions.** Re-check `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml` and `production-decisions.yaml` before writing, and renumber if another session took them.

---

## 6. BLOCKED ON THE FOUNDER — two items

### 6.1 Migration 018 must be applied in the Supabase dashboard

`database/migrations/018_create_listening_progress.sql` (written in plan Task 2). Additive and idempotent — safe to apply at any time, cannot break the running site.

**Three billing migrations are still unapplied.** 018 must not silently join that queue. Verify with:

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
fetch(u+'/rest/v1/listening_progress?select=id&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}})
 .then(r=>r.text()).then(t=>console.log(t));"
```

`[]` = applied. `42P01` = still pending; cross-device resume degrades to on-device (by design, and it logs `MIGRATION_018_PENDING` rather than failing silently).

### 6.2 The auth gate CANNOT ship until a live sign-in is verified — RELEASE BLOCKER

Plan Task 14. The known problems are **Supabase-dashboard-side, not in this repo**: the built-in mailer capped at ~2 emails/hour, and `{{ .Token }}` reported missing from the email templates. The code path (`/api/auth/magic-link`, `/api/auth/verify-code`, `/auth/callback`) is sound and already handles the mail rate limit.

Making the account the gate for **everything** on top of a rate-limited mailer would make the product look dead to new users with no signal why. Task 14 requires: a real sign-in against production with the email shown to the founder, **and** three sign-ins inside an hour to test the cap. If that fails, **the gate does not ship** — fixing it is a founder action in the Supabase dashboard (custom SMTP), not a code change.

---

## 7. Progress

| Phase           | Tasks | State                                               |
| --------------- | ----- | --------------------------------------------------- |
| 1 — Foundations | 1–2   | **COMPLETE.** Task 1 `7f6d64bc`, Task 2 `db1ee9a6`. |
| 2 — Transport   | 3–8   | Not started                                         |
| 3 — Journaling  | 9–12  | Not started                                         |
| 4 — Two-state   | 13–15 | Not started                                         |

Phases 1–3 leave the product working under today's auth rules. **Phase 4 changes the rules and is separately revertable** — the founder can have the player and journaling live before the gate flips.

**To resume:** open the plan, find the first unchecked `- [ ]`, continue. Each task ends in its own commit, so `git log` tells you where you are.

---

## 8. Traps for whoever picks this up

- **`npm run build` is not a test** (dev rule #9). Verify in `npm run preview` (workerd) and curl the routes. Any server code reading `public/` off disk is broken on Workers — `fs` reads return `[]` rather than throwing, so it fails ONLY in production.
- **`--color-gold` is COBALT `#1f2a8d` in light mode.** The alias is historical. Never use `bg-gold`/`text-tehom` for a paired background+foreground — this has shipped visible bugs twice (SA-044, SA-047).
- **Do not add to `src/app/globals.css`** (11k lines). Component styles go in styled-jsx, matching `NarrationPlayer`/`NarrationChapters`. Unlayered design-system CSS beats `globals.css` `@layer utilities`.
- **Do not change the mini bar's height.** `globals.css:11075-11123` positions the reader-theme button and chat launcher off `--narration-bar-h`; changing it silently re-collides them.
- **Do not replace the scrubber `<input type="range">`** with a div — it is the keyboard and screen-reader affordance.
- **Never `git add -A`.** Parallel sessions have in-flight files; stage by explicit list. The working tree already carries unrelated modified files and a large untracked `euangelion-voice-prototype/` directory.
- **Husky:** pre-commit runs type-check + all `verify:*`, requires `CHANGELOG.md` staged when any `.ts/.tsx` changes, and requires a `docs/feature-prds/F-xxx.md` staged. commit-msg requires an `SA-###` id AND an `F-###` whose `.md` is staged.
- **`grep -c` returns exit 1 on zero matches** and kills husky scripts under strict mode. Always `|| true`.
- **SA-018/SA-038/SA-039 are being deliberately REVERSED.** If a test or a doc contradicts the new model, that is expected — update it and cite the reversal. Do not "fix" the new behaviour back to the old.
- **`src/middleware.ts` is deliberate legacy.** Do NOT rename it to `proxy.ts`; Next 16's `proxy.ts` is Node-runtime-only and `@opennextjs/cloudflare` hard-fails Node middleware.

---

## 9. Pre-deploy identity gate — every time

```bash
gh auth switch --user creativcreature
gh auth status          # active must be creativcreature
git config user.email   # must be chrisparker21@gmail.com
npx wrangler whoami     # must be chrisparker21@gmail.com
```

If any check fails: **STOP.** This machine has three gh accounts.
