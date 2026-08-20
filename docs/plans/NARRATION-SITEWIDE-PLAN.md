# Narration, site-wide — implementation plan

> ## SUPERSEDED 2026-08-19 (SA-116). Do not execute this document.
>
> Its load-bearing decision — one element, one store — shipped as **SA-115**,
> and the surfaces around it as SA-107 through SA-110. The "do not start until
> asked" line below is spent: it was asked, and it was built.
>
> Current measured state: **`docs/plans/AUDIO-STATE-2026-08-19.md`**.
> Kept below as the historical argument, not as a work list.

**Status:** superseded (see above). Was: proposal, do not start until asked.
**Context:** F-086 / SA-035. The reader-page player and the reading rule are
shipped; this is what it takes to make narration a property of the site rather
than of one route.

---

## 1. The one decision everything else hangs on

Today the `<audio>` element lives inside `NarrationPlayer`, which lives inside
the devotional page. **Navigate away and the audio stops**, because the
component unmounts and takes the element with it.

That is fine for one route. It is fatal site-wide: the entire point of
listening while working is that you keep moving — open another day, check the
series, glance at Library — and the reading keeps going.

So site-wide narration is not "add the player to more pages." It is **one
question**: where does the audio element live?

**Recommendation: lift it to the root layout, behind a store.**

A single `<audio>` mounts once in `app/layout.tsx` (inside `Providers`, beside
`MobileTabBar`). A `narrationStore` (Zustand — the codebase already has eight)
holds what is playing, position, speed, and queue. Every surface becomes a
_view_ onto that store: the reader panel, the reading rule, a Library row, all
rendering the same state and calling the same actions.

Why this and not the alternatives:

| Option                                               | Verdict                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root-level element + store**                       | Survives navigation, one source of truth, Media Session stays attached across routes. The work is real but bounded.                         |
| Element per page, hand off on navigate               | There is no clean hand-off: the old element must pause before the new one starts, so playback audibly gaps on every route change. Rejected. |
| Persist position only, restart audio on the new page | Feels broken — it restarts, re-buffers, and loses the sentence you were on. Rejected.                                                       |

**Consequence to accept up front:** `NarrationPlayer` stops owning state. It
becomes presentational. That is a real refactor of a file that currently works,
and it is where the risk in this plan lives.

## 2. Surface inventory

Which routes get narration, and in what form:

| Surface                                     | Form                                     | Notes                                                                                                                                     |
| ------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/devotional/[slug]`                        | Full panel + reading rule                | Shipped                                                                                                                                   |
| `/daily-bread`                              | Full panel                               | Already mounts `AudioPlayer`; generated plan days have no pre-rendered track, so it stays on the Web Speech fallback until §5 is answered |
| `/today`                                    | Full panel                               | Same component, global daily                                                                                                              |
| `/series/[slug]`                            | "Listen to the series" → queues all days | The queue's natural home                                                                                                                  |
| `/library`, `/saved`, `/clippings`          | Rule only                                | Playback continues; no panel — these are browsing surfaces                                                                                |
| `/soul-audit`, `/settings`, marketing pages | Rule only, if playing                    | Never initiates                                                                                                                           |
| `/sunday`                                   | Full panel                               | Sabbath day has a track (2.4 min)                                                                                                         |

**Rule for the whole site:** the reading rule appears on any route when audio is
playing and no full panel is present. The panel initiates; the rule persists.
Nothing initiates playback automatically, anywhere.

## 3. UX decisions that need founder answers

These change the build, so they are worth settling before code:

1. **Does the rule follow you off the reader?** Recommendation: yes — that is
   the feature. But it means a narration bar can appear over Soul Audit or
   Settings, which is a tonal call, not a technical one.
2. **What happens at the end of a day?** Options: stop; auto-advance to
   tomorrow; auto-advance only inside a series the reader explicitly queued.
   Recommendation: the third — auto-advance is a gift inside a series and an
   intrusion outside one.
3. **Does the rule show on marketing/legal pages?** Recommendation: yes, for
   consistency; the alternative is audio playing with no visible control, which
   is worse.
4. **One position per devotional, or one global "where I was"?** Today it is
   per-devotional in localStorage. Site-wide wants both: per-devotional resume
   plus a single "continue listening" entry point.
5. **Signed-in sync.** Position is device-local today. Syncing it to Supabase
   is a small table and a real quality-of-life win across phone and desktop —
   but it is a new data contract and should be its own decision.

## 4. Phases

Each phase ships independently and leaves the site working.

**Phase 1 — lift the element (no visible change).**
Create `narrationStore`; move the `<audio>`, Media Session wiring, and position
persistence into it; mount one element in the root layout. `NarrationPlayer`
and `NarrationMiniBar` become views. Success: the devotional page behaves
exactly as it does now, and audio survives a client-side route change.
_This is the risky phase and it is deliberately invisible — nothing new is
promised while the foundation moves._

**Phase 2 — the rule goes global.**
Mount `NarrationMiniBar` in the root layout, driven by the store. Appearance
rule generalizes from "panel scrolled away" to "playing AND no panel mounted on
this route". Success: start on a devotional, navigate to Library, audio and
control both continue.

**Phase 3 — the queue.**
`playSeries(slug)` builds a queue from the series' days that have tracks.
Auto-advance within a queue only. The rule grows a "next" affordance and shows
"3 of 7" rather than a bare title. Success: queue a series, work for an hour,
it moves through days without touching the screen.

**Phase 4 — continue listening.**
A single entry point (Library, and the reader's own panel) offering the most
recent unfinished reading with its position. Cheap once Phase 1 exists.

**Phase 5 — generated plan days.**
`/daily-bread` days are generated per reader, so they have no pre-rendered
track and no slug in the manifest. Either render on demand and cache, or leave
them on Web Speech. This is a cost and architecture question, not a UI one, and
it should be decided separately rather than bundled here.

## 5. Accuracy, and where it can break

The founder asked for as much accuracy as possible. The honest list of what
threatens it:

- **Track-to-devotional binding.** The manifest is keyed by slug. A slug rename
  silently orphans a track and the reader falls back to Web Speech with no
  error. _Mitigation: a verify script that fails when a manifest key has no
  matching devotional, and vice versa, run in the existing `verify:_` chain.\*
- **Stale audio after a re-render.** Solved for cache (`?v=` byte stamp), but
  the manifest and files must be regenerated together — a hand-edited manifest
  would lie. _Mitigation: only ever write the manifest from
  `render_kokoro.py --publish`._
- **Voice drift.** Already guarded by `verify_voice_lock.py`; that guard must
  join the pre-commit chain rather than being run by hand.
- **The reading contract changing under rendered audio.** If
  `segments.ts` changes what gets spoken, every existing track becomes subtly
  wrong — the audio no longer matches the page. _Mitigation: store the
  extraction version in the manifest per track and flag mismatches._ This is
  the subtlest failure mode in the whole system and the one most likely to be
  missed.
- **Word-study pronunciation.** Unverifiable automatically (see F-086 Known
  Limits). Needs founder ear-checks per series, with overrides in
  `pronunciation-overrides.json`.

## 6. What this does not include

- **R2 migration.** Still the blocker for `bible-365` (~1.4 GB). Independent of
  this plan but must land before the catalog is complete.
- **Offline download.** The service worker exists; caching the active plan's
  audio is a natural Phase 6 but is not scoped here.
- **ElevenLabs.** Off the critical path per SA-035. If the voice is ever
  upgraded, only the render pipeline changes — every surface in this plan is
  engine-agnostic.

## 7. Rough shape of the work

| Phase                  | Size | Risk                                                                 |
| ---------------------- | ---- | -------------------------------------------------------------------- |
| 1 — lift the element   | M    | **High** — refactors working code with no visible payoff             |
| 2 — rule goes global   | S    | Low                                                                  |
| 3 — queue              | M    | Medium — auto-advance has edge cases (end of series, missing tracks) |
| 4 — continue listening | S    | Low                                                                  |
| 5 — generated days     | ?    | Blocked on a cost decision                                           |

Phases 1–2 are the ones that deliver the founder's actual sentence: _"I want to
listen to my devotionals as I work."_ Phases 3–4 make it pleasant.
