# Reader Transport & Journaling — Design

**Date:** 2026-08-16
**Status:** Awaiting founder approval
**Decisions proposed:** SA-060 (two-state site model), SA-058 (Audible-modeled transport), SA-059 (unified journaling)
**Feature PRDs:** F-103, F-101, F-102
**Supersedes:** SA-018 (as amended 2026-06-09), SA-038 §2, SA-039 §5
**Prod DDL:** migration 018 (`listening_progress`) — founder-approved 2026-08-16, satisfying SA-039 §2's named-approval requirement

---

## 1. Origin

Founder, 2026-08-16, two asks and one architectural ruling:

1. _"I want the audio player to be modeled after the Audible audio player, but to still be inline and small footprint… proper play buttons, chapters, etc… listen at 2x speed… the type can be smaller and more finessed."_ The footprint is already right; the transport is not.
2. _"Add note taking feature that works similar to the highlight feature — maybe even works with it somehow. I also want reflection questions etc to take user input so users can write journal entries and such."_
3. Ruling, given in response to a question about signed-out persistence: _"Need two site states — one for signed in and one not signed in. Having an account enables notes, saving features, highlights etc. No account, data should not be retained… The unsigned in state simply is a reader, non-interactive and non saving."_

Library development follows this work as its own session, explicitly.

---

## 2. SA-060 — The two-state site model

### 2.1 The rule

There are exactly two states.

**Signed out — a reader.** The full catalog is readable, listenable, and shareable. Nothing the reader authors is written anywhere: not to the database, not to `localStorage`, not to a session-keyed row. There is no third "kept on this device" state.

**Signed in — a practice.** Highlights, notes, journal entries, reflection answers, audio clips, bookmarks, stickies, and an active daily reading all persist to the account and are retained while the account exists.

### 2.2 What this reverses

Three founder-ruled decisions are explicitly reversed and must be recorded as reversals in `docs/production-decisions.yaml` rather than silently overwritten:

| Decision                    | What it said                                                                                                   | Status                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SA-018 (amended 2026-06-09) | Bookmarks allowed anonymously, session-keyed, merged on sign-in                                                | **Reversed** — bookmarks now require an account                                     |
| SA-038 §2                   | "An account decides persistence, not visibility" — signed-out highlights paint and are visible for the session | **Reversed** — the control is locked, not silently inert                            |
| SA-039 §5                   | Anonymous highlights written to `localStorage` and restored on load                                            | **Reversed** — `LOCAL_HIGHLIGHTS_KEY` and its read/write/mutate helpers are deleted |

SA-026 is **not** reversed: Soul Audit submit, the 3-option review, and all curated reading remain anonymous and free.

### 2.3 Where the wall sits

Founder-selected, 2026-08-16:

**Open, signed out**
`/`, `/today`, `/series`, `/series/[slug]`, `/devotional/[slug]`, `/soul-audit`, `/soul-audit/results`, `/about`, `/pricing`, `/privacy`, `/terms`, and every static editorial route.

Fully live on those routes: audio playback (transport, chapters, speed, sleep timer), translation switching, reader theme and font size, video modules, and the interactive comprehension modules (Match / Order / Reveal / Comprehension). These save nothing personal and are what make the catalog function as the shop window that earns the account.

**Gated**
`/daily-bread` (activating and reading a personal plan), `/library`, `/saved`, `/settings`, and every save action anywhere in the product.

**Navigation consequence.** SA-045 made `DAILY BREAD` the single primary nav entry pointing at `/daily-bread`. Gating that route would send every signed-out visitor from the main nav item straight into a wall. So the primary slot is **auth-aware**: signed out it reads `TODAY` and points at `/today` (the open editorial rotation); signed in it reads `DAILY BREAD` and points at `/daily-bread`. One slot, two states — consistent with SA-045's "one name, one destination" intent rather than in conflict with it, since each state still has exactly one.

### 2.4 "Non-interactive" is scoped to "non-saving"

The founder's phrase, read literally, would disable the audio player, theme switching, and the comprehension games. That would kill the shop window and the single most compelling thing on a shared page — narration. The rule is therefore implemented as **non-saving**: the reading experience is fully alive signed out; nothing authored is retained.

### 2.5 Device preferences are not user data

Theme, font size, chosen translation, and audio resume position stay in `localStorage` for signed-out readers. They contain no personal content, are functional/strictly-necessary under GDPR, and are the same class as a browser's zoom level. This is not an exception to §2.1 — §2.1 governs _authored content_.

Signed **in**, audio resume is additionally mirrored server-side so it follows the reader across devices (§3.4). `localStorage` stays as the local cache in both states.

### 2.6 Locked, not hidden — the conversion requirement

A save control must never silently vanish when signed out. If Highlight and Note simply are not there, the reader never learns the product does that, and the strongest conversion moment in the product is lost: someone moved by a line, reaching to mark it.

The pattern, using machinery that already exists:

1. The control renders normally and is fully visible.
2. Activating it signed out opens `SignInIntentModal` with the intent recorded.
3. **After successful auth, the pending action completes automatically** — the highlight paints, the note opens, the series saves.

`onAuthRequired` and `SignInIntentModal` already implement steps 2–3 for the Library. This extends the same path to the reader. New work is wiring and intent payloads, not new machinery.

### 2.7 Hard precondition — accounts must actually work

Making the account the gate for everything means the account has to be flawless. The outstanding problems are **Supabase-dashboard-side, not in this repo**:

- the built-in mailer is capped at ~2 emails/hour;
- `{{ .Token }}` is reported missing from the email templates.

The code path (`/api/auth/magic-link`, `/api/auth/verify-code`, `/auth/callback`) is sound and already handles the mail rate limit as "try again shortly."

**Gate flip is blocked on a verified live sign-in.** SA-060 may be built behind the existing flags, but the signed-out wall does not go live until an end-to-end sign-in has been performed against production and the received email shown to the founder.

### 2.8 Data protection

- Religious belief is special-category data under GDPR Art. 9. This is already true of the product; journaling does not newly create the obligation, but it raises the stakes.
- **All new surfaces store to the existing `annotations` table**, which is already enumerated in `src/lib/privacy/data-export.ts`, `account-deletion.ts`, and `retention-cleanup.ts`. Export, delete, and retention therefore work on day one. A new table would silently escape all three.
- `retention-cleanup` purges **anonymous** sessions after 30 days and never touches authenticated rows. Under SA-060 no anonymous annotation rows will exist at all, which simplifies it.
- **Journal content never leaves the account.** Reflection answers, journal entries, and note bodies are never sent to an LLM, never sent to analytics, and are excluded from the chat context builder. Highlighted _scripture and devotional text_ may continue to go to chat (it is published content); the reader's own writing may not.
- Stated retention: kept while the account exists, destroyed on account deletion.

---

## 3. SA-058 — The transport

### 3.1 What exists

`AudioPlayer` delegates to `NarrationPlayer` whenever a pre-rendered track exists, else to `SpeechSynthesisPlayer`. Coverage is **528 tracks, all 528 carrying measured chapter timings**, durations 2.5–28 min.

The current transport is five uppercase word-buttons (`−15 / LISTEN / +15 / CHAPTERS / 1×`), a range scrubber, a chapter sheet, and a mini bar. It is structurally sound and dressed as an editorial widget rather than a transport. Speed cycles 0.8 → 1 → 1.25 → 1.5 only: **2× does not exist**, and reaching any value takes up to four taps.

### 3.2 Target

Same box, same height. Glyphs replace word-buttons, which buys back the space the new controls need.

```
AUDIO EDITION · Word study                         4:12 / 22:31
     ⏮    ⟲15    ( ▶ )    ⟳15    ⏭        1.5×   ☰   ⏱   ✎
     ──────────●───┊────────┊──────────────┊───────────────
```

| Control   | Behavior                                          | Status                                                          |
| --------- | ------------------------------------------------- | --------------------------------------------------------------- |
| ▶ / ⏸     | Filled disc, the visual anchor, ~52px             | Restyled                                                        |
| ⟲15 / ⟳15 | Arc-arrows with the interval set inside the glyph | Restyled                                                        |
| ⏮ / ⏭   | Previous / next **chapter**                       | **New** — chapter data exists, nothing in the transport uses it |
| `1.5×`    | Opens a speed sheet                               | **New sheet**                                                   |
| ☰        | Chapter sheet                                     | Unchanged behavior, new glyph                                   |
| ⏱         | Sleep timer                                       | **New**                                                         |
| ✎         | Drop a clip at the current timestamp              | **New** — see §4.4                                              |

- **Speeds:** 0.75 / 1 / 1.25 / 1.5 / 1.75 / **2** / 2.5 / 3, with `preservesPitch = true` so voices stay in pitch. Chosen from a sheet, not cycled. Persisted per-reader as a device preference.
- **Skip interval stays 15s**, not Audible's 30s: this prose is dense and many readings are under five minutes. 30s is offered as a setting in the speed sheet.
- **Sleep timer:** 5 / 10 / 15 / 30 min and _end of chapter_. Fades out over the last 5s rather than cutting. Apt for a night devotional and roughly 40 lines.
- **Scrubber gains chapter ticks** drawn from the same timings the sheet uses, plus a `−6:42 left in chapter` readout beside the elapsed pair.
- **Typography:** the `AUDIO EDITION` eyebrow drops to the smaller tracking-heavy label size and picks up the active chapter name; all times use oldstyle numerals. No uppercase word-buttons remain in the transport.
- **`NarrationMiniBar` inherits the same glyph set**, so the two surfaces stop disagreeing about what a play button looks like.

### 3.3 Accessibility

Every glyph control keeps a 44px minimum target and an explicit `aria-label`. The scrubber keeps its `<input type="range">` (do not replace with a div). Sheets keep the existing focus-trap idiom from `NarrationChapters`. Reduced-motion suppresses the sleep-timer fade and the scrubber transition.

### 3.4 Cross-device resume — migration 018

**Founder-approved 2026-08-16.** This is the named prod-DDL approval SA-039 §2 requires. Start on your phone, finish on your laptop; and it is the substrate a future Wrapped needs, since without it listening is the one part of the journey that leaves no record.

```sql
-- database/migrations/018_create_listening_progress.sql
CREATE TABLE IF NOT EXISTS listening_progress (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotional_slug   TEXT NOT NULL,
  position_seconds  REAL NOT NULL DEFAULT 0,
  duration_seconds  REAL,
  seconds_listened  REAL NOT NULL DEFAULT 0,
  completed_at      TIMESTAMPTZ,
  first_played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, devotional_slug)
);
CREATE INDEX IF NOT EXISTS idx_listening_progress_user
  ON listening_progress (user_id, last_played_at DESC);
ALTER TABLE listening_progress ENABLE ROW LEVEL SECURITY;
```

Additive and idempotent, consistent with the other migrations. One row per reader per devotional, upserted — **not** an append-only event log, which would be a write firehose for no benefit. `seconds_listened` accumulates actual playback time, so Wrapped can say "you listened for 14 hours across 62 readings" without an events table.

**Write cadence.** A DB write every 5s would be punishing on Workers (10ms CPU per request). Server writes happen on pause, on seek, on ended, on `pagehide`/`visibilitychange` via `sendBeacon`, and at most once per 30s while playing. `localStorage` remains the fast local cache so reload is instant and offline still resumes.

**Conflict resolution.** The local cache stores its position _with a timestamp_. On load, whichever of local and server has the newer timestamp wins — correct last-write-wins across devices. Taking `max(position)` would be wrong: a reader who deliberately restarted a reading on their phone would be dragged back to the laptop's position.

**Signed out** there is no server row and no account; resume falls back to `localStorage` alone, per §2.5.

**Compliance wiring, non-optional.** `listening_progress` is added to `USER_ID_TABLES` in **both** `src/lib/privacy/account-deletion.ts` and `src/lib/privacy/data-export.ts` in the same commit as the migration. A new table that escapes export and deletion is exactly the failure §2.8 warns about.

> **Pre-existing gap found while checking this:** `data-export.ts`'s `USER_ID_TABLES` lists only `bookmarks`, `user_progress`, `soul_audit_responses`, while `account-deletion.ts` also covers `soul_audit_sessions`, `active_series`, `scheduled_series_swap`, `archived_series`. Four tables are deleted on request but never exported — an incomplete right of access under GDPR Art. 15. Four-line fix, folded into this step.

### 3.5 Offline download — deferred (founder-ruled 2026-08-16)

Audible's other signature feature is downloading for offline. This is a PWA with a service worker already, and tracks are ~8 MB each, so it is genuinely buildable. **Founder ruling: out for now, ship the rest first.**

It needs cache-quota management, eviction UI, and a per-series download model — comparable in size to the transport work itself, on top of a session already carrying migration 018 and the auth sweep. Recorded here as a deliberate deferral, not an omission, so it stays cheap to pull in later.

---

## 4. SA-059 — Notes, journal, reflections

### 4.1 The prerequisite bug — silent data loss

`updateAnnotation` in `src/lib/soul-audit/repository.ts` overwrites `anchor_text` and `body` with whatever the PATCH carried. `persistEdit` in `TextHighlightTrigger` sends only `annotationId` and `style`, and `sanitizeOptionalText(undefined, n)` returns `null`.

**Consequence:** recolouring a highlight, or saving a note on one, nulls out its anchor text. On the next load `hydrateSavedHighlights` finds no snippet to match, the mark never repaints, and the Library row renders blank. The reader's highlight is gone and nothing reported a failure.

**Fix:** PATCH becomes a genuine partial update — a field absent from the request body leaves the column alone; only an explicitly-sent `null` clears it. `updateAnnotation` takes `anchorText?: string | null | undefined` and builds its patch object from present keys. Regression test pins that a style-only PATCH preserves `anchor_text` and `body`.

This lands **first**, on its own, before anything is built on top of the table.

### 4.2 One model

A note is a highlight that has words on it. There is no separate note system.

| Surface                   | `annotation_type` | `style.kind`                    | Anchored?                  |
| ------------------------- | ----------------- | ------------------------------- | -------------------------- |
| Highlight                 | `highlight`       | `favorite_verse`                | to selected text           |
| Note on a passage         | `highlight`       | `favorite_verse` + `style.note` | to selected text           |
| Reflection / recap answer | `note`            | `reflection`                    | to module + question index |
| Own prayer                | `note`            | `prayer`                        | to the prayer module       |
| Free journal entry        | `note`            | `entry`                         | to the devotional          |
| Audio clip                | `note`            | `clip`                          | to a timestamp             |

Notes continue to live in `style.note` rather than `body`, per SA-046 §4: `body` carries anchor text and hydration falls back to `anchor_text || body`, so a note in `body` would be indistinguishable from its anchor on restore.

`style.editedAt` carries edit time. `annotations` has no `updated_at` column and `style` is already the extension point, so **the journaling work needs no schema change** — every writing surface in §4 rides the existing table. Migration 018 (§3.4) exists solely for listening progress, which has no home in `annotations`.

### 4.3 The writing surfaces

**Passage notes.** The selection toolbar becomes `Highlight · Note · Ask`. **Note** marks the passage _and_ opens a proper editor — a small anchored panel, not the current cramped tooltip textarea. Existing marks gain and lose notes through the same panel. Noted passages keep the dotted underline from SA-046.

**Reflection answers.** A field under each question, inline where it is asked, autosaving on blur and on a 2s debounce. `ReflectionModule` renders `prompt` plus `additionalQuestions[]`; each gets its own input, keyed by module index + question index so answers survive re-render and reorder.

Sized against the catalog (568 devotional files): **545 reflection modules carrying 1,517 additional questions — 2,062 journal prompts already written and shipping.** Nothing needs authoring; the prompts exist and have never had anywhere to write an answer.

`RecapModule.integration_question` gets the same field. Only 2 exist today, but it costs nothing and the shape is identical.

**Prayer is different, and gets a different control.** All 543 `PrayerModule`s pose no question — they are prayers to be prayed, with `prayerText` and an optional `breathPrayer`. An answer field under one would misread the form. It gets an _Add your own prayer_ affordance instead: same storage, `style.kind: 'prayer'`, but framed as writing alongside rather than answering.

Modules currently receive only `module` from `ModuleRenderer`, with three call sites (`DevotionalPageClient`, `DailyBreadView`, `CuratedActiveView`). Rather than thread `devotionalSlug` through 30 module components, a **reader context** provides slug and auth state to any module that wants it. `ModuleRenderer`'s signature does not change.

**Free journal entry.** One unanchored entry per devotional, offered at the close of the reading, for what does not belong to any single line.

All three, signed out, render as visible-but-locked per §2.6.

### 4.4 Audio clips — the audio↔notes bridge

Founder-approved. The ✎ control captures `{ currentTime, chapter label, chapter index }` and opens the same note editor. Stored as `annotation_type: 'note'`, `style.kind: 'clip'`, with `style.t` and `style.chapter`. It appears in the Library's Notes list with its timestamp; activating it opens the devotional and seeks the player there.

This gives listeners a way to mark something without stopping to find the text — currently impossible — and it is the answer to "maybe it even works with highlights somehow" for the listening path.

### 4.5 Failure behavior

No silent fallbacks (dev rule #1). Every write reports its outcome on the control that triggered it. A failed save never leaves the reader believing their words were kept. Signed out, the control does not attempt a write at all — it opens sign-in.

---

## 5. Library (not this session)

Everything above writes rows the existing Highlights and Notes tabs in `DevotionalLibraryRail` already read, so the Library grows richer without further work. The real Library session covers: the dead `/daily-bread?tab=…` deep links (5 of 6 are inert), journal-by-date, reflection answers as a readable thread per series, and clip playback from the shelf.

---

## 6. Sequencing

| #   | Work                                                                           | Depends on |
| --- | ------------------------------------------------------------------------------ | ---------- |
| 1   | PATCH partial-update fix + regression test (§4.1)                              | —          |
| 2   | SA-058 transport, sheets, mini-bar parity (§3.1–3.3)                           | —          |
| 3   | Reader context + the writing surfaces (§4.3)                                   | 1          |
| 4   | Migration 018 + privacy-table wiring + export gap fix (§3.4)                   | —          |
| 5   | Cross-device resume wired to the transport (§3.4)                              | 2, 4       |
| 6   | Audio clips (§4.4)                                                             | 2, 3       |
| 7   | SA-060 auth-state sweep, locked-not-hidden, anonymous-persistence removal (§2) | 3, 6       |
| 8   | Live sign-in verification against production (§2.7)                            | 7          |
| 9   | Docs + decision reversals in `production-decisions.yaml`                       | all        |

Steps 2, 3 and 4 are independent and proceed in parallel. Step 8 gates the gate.

**Migration 018 is applied by the founder in the Supabase dashboard**, like every other migration in this repo. It is additive and idempotent, so applying it early is safe and cannot break the running site. Step 5 fails closed until it is applied: resume simply stays on-device, which is the current behavior, rather than erroring. Three billing migrations are still pending — 018 should not be allowed to join that queue unnoticed.

---

## 7. Ask inventory

Every ask in this thread, traced to where it is handled. Founder request, 2026-08-16: _"ensure you captured all asks, going to top of thread."_

| #   | Ask (verbatim or paraphrased)                                             | Where                                                                                       | Status                                  |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | "audio player… modeled after the audible audio player"                    | §3                                                                                          | Scoped                                  |
| 2   | "still be inline and small footprint" / "right amount of on screen space" | §3.2 — same box, same height                                                                | Scoped                                  |
| 3   | "proper play buttons"                                                     | §3.2 — filled disc, glyph transport                                                         | Scoped                                  |
| 4   | "chapters, etc"                                                           | §3.2 — sheet retained, **chapter prev/next added**                                          | Scoped                                  |
| 5   | "listen at 2x speed etc"                                                  | §3.2 — speed sheet 0.75–3×                                                                  | Scoped                                  |
| 6   | "the type can be smaller and more finessed"                               | §3.2 typography                                                                             | Scoped                                  |
| 7   | "player features… better thought out and more robust"                     | §3.2 sleep timer, chapter ticks, time-left-in-chapter; §3.4 cross-device resume; §4.4 clips | Scoped                                  |
| 8   | "note taking feature that works similar to the highlight feature"         | §4.3 passage notes                                                                          | Scoped                                  |
| 9   | "maybe even works with it somehow"                                        | §4.2 — a note _is_ a highlight with words on it                                             | Scoped                                  |
| 10  | "reflection questions etc to take user input"                             | §4.3 — 2,062 existing prompts                                                               | Scoped                                  |
| 11  | "so users can write journal entries and such"                             | §4.3 free entry, own prayer                                                                 | Scoped                                  |
| 12  | "develop the Library more… once all this is sorted"                       | §5                                                                                          | **Deferred by founder**                 |
| 13  | Audio clips at a timestamp                                                | §4.4                                                                                        | Approved, scoped                        |
| 14  | "two site states… no account, data should not be retained"                | §2 (SA-060)                                                                                 | Approved, scoped                        |
| 15  | "ensure accounts are 100% set up"                                         | §2.7 — gate flip blocked on live verification                                               | Scoped, **externally blocked**          |
| 16  | "Spotify style wrap ups… their journey with God"                          | §2.8, §3.4 — substrate built, feature not                                                   | Substrate only                          |
| 17  | Cross-device audio resume                                                 | §3.4, migration 018                                                                         | Approved, scoped                        |
| 18  | Offline download                                                          | §3.5                                                                                        | **Deferred — founder-ruled 2026-08-16** |

All asks are resolved. Wrapped (#16) is substrate-only this session by stated assumption; say otherwise and it becomes its own spec.

## 8. Verification

Per dev rules #9 and #10, `npm run build` is not a test. Before any deploy:

- `npm run type-check`, `verify:production-contracts`, `verify:tracking`, `lint`, `test`
- `npm run preview` (workerd), then curl every affected route and confirm response bodies
- Manual matrix at 375 / 768 / 1024: transport controls, speed sheet at 2×, sleep timer, chapter prev/next, clip capture, note editor, reflection autosave, and every one of those signed out
- Highlight → recolour → reload, confirming the mark survives (the §4.1 regression, tested against production)
