# Custom Generation — Phase 1 Pattern Decisions (Mobbin-backed)

**Date:** 2026-07-10 · **Status:** APPROVED BY FOUNDER 2026-07-10 (with the picks in §7 resolved below)
**Decisions:** SA-026 (account gate + 1 free generation), SA-027 (six paths, subscription primary), SA-028 (billing source of truth)
**Method:** Two fresh Mobbin MCP pulls this session (26 searches, iOS + web), synthesized against
`docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md` (Parts 0/3/4/8/9), `docs/copy-specs/pricing-page-spec.md`,
and `docs/feature-prds/F-065.md`. Binding constraints applied to every decision: SA-024 (two bespoke
presentations, never one stretched layout), SA-025 (guilt-free), one primary CTA per page state, every
error/empty state ends in an action, brand owns the skin — Mobbin informs only the patterns.

> Correction applied during synthesis: the research agents assumed the pre-amendment "1 free edition
> per quarter" model. Under SA-026 the free grant is **one-time per verified account**. Paywall states
> below reflect SA-026.

---

## 1. Paywall / plan-picker

Appears at exactly one moment: an un-entitled user requests a custom generation. Framed as
_commissioning an edition_ — the next page of the story, not a gate. The page opens with the user's
own words echoed back ("You asked for an edition on _[their theme]_"); the requested generation is
held and resumes automatically after purchase. (Calm post-quiz unlock reveal — Mobbin flow 38549b00.)

**Page states (SA-026):**

- **State A — free generation unused:** editorial banner "Your first custom edition is free" with
  primary CTA `COMPOSE MY EDITION`. Subscribe card renders below, visually quiet ("When you want
  more than one…"). No countdowns, no urgency — the free edition is a standing fact (anti-pattern:
  Finch's "offer expires when you exit this screen"). (Slopes "first week's on us" framing.)
- **State B — free generation used:** one factual line ("You've used your free edition") and the
  subscribe card becomes primary. No refresh date — the grant is one-time.
- **Already entitled (deep link):** skip the paywall entirely; go straight to generation.
- **Loading:** layout-accurate skeleton of the offer stack, never a bare spinner.
- **Prices fail to load:** covenant line + `Try again` — never placeholder prices (Dev Rule #1/#6).

**Offer stack, top to bottom:**

1. **Subscribe card (large):** two stacked radio cards — Annual `$77/yr — one month free · ~$6.42/mo`
   preselected with a `RECOMMENDED` label (SCMP pill), Monthly `$7/mo` beneath. Selection updates a
   sticky stoic.-style summary that restates the true billed amount beside the single CTA
   (`CONTINUE — $77/YEAR`). Annual framed as "one month free" (Dub's months-free framing; per-month
   math in words, Zero-style). 2yr/$140 and 3yr/$200 live behind a quiet `More durations` disclosure
   (TIDE "View All Plans") — recommendation, founder may move them to /pricing only.
   **Lifecycle timeline** (repurposed Blinkist trial-timeline — Mobbin flow a9e95e3d; dark execution:
   Mimo; combined cards+timeline: Centr): since there is no trial, the vertical rail narrates the
   subscription honestly — "Today: your edition is composed · Before renewal: we email you ·
   [Date]: renews at $77, cancel anytime; everything you've generated stays yours."
2. **Credit-pack card (medium, Phase 2):** headline `A single edition, no subscription`; 2–3 pack
   sizes as big serif numerals with per-edition price; expiry policy stated in one line; ClassPass
   cross-link up to the subscription ("without changing your plan" relationship copy). Editorial
   credit-store aesthetic: Open's Credit Store, Co-Star's stark one-time questions purchase. No
   "POPULAR" badges. Pack sizes/prices need founder numbers before Phase 2 build.
3. **Text-links row (small):** hairline-ruled row in Industry micro-caps —
   `USE YOUR OWN AI KEY · GENERATE WITH YOUR AI PLAN · REDEEM A CODE · ALREADY SUBSCRIBED?`
   (ABY Journal in-paywall redeem link; TIDE text-row block; The Atlantic restore row.)
4. **Dismissal + covenant:** visible `×` plus text decline `Not now — keep reading free`; dismissal
   returns the user exactly where they were. Footer covenant (NYT mission-framing done our way):
   _"The Bible is free. The library is free. The Soul Audit is free. You only pay when you want an
   edition composed for your specific words."_

**Mobile:** full-height sheet over the reader context, offer stack scrolls, sticky footer =
selected-plan summary + single CTA, radio cards ≥44px.
**Desktop:** an editorial two-column spread in the masthead frame — offer stack left; right column a
"specimen" (rendered fragment of a custom edition) + the lifecycle timeline, like a newspaper's own
subscription page (spirit-match: Oku's serif pricing; structure: Spline/Maze). The standalone
`/pricing` page is this spread plus Founding Member, donations, FAQ per the copy spec.

**Banned (with offenders from the pull):** cancel-shame mascots (Duolingo, Blinkist), expiring-offer
urgency (Finch), strikethrough price inflation (Badoo, Moonly lifetime-decoy), weekly-price masking
(TIDE/Moonly "$1.06/week"), legal-wall fine print as the only disclosure (New Yorker, Medium).

---

## 2. Checkout, success, and subscription management

Stripe **hosted Checkout only** (PCI SAQ-A; already wired behind `BILLING_CHECKOUT_LIVE`).

- **Hand-off:** in-place beat before redirect — "Taking you to secure checkout — we'll bring you
  right back to your edition." (DAZN's round-trip promise.) The pending generation request is kept in
  state so nothing is lost.
- **Inside Stripe:** enable Apple Pay + Google Pay so the wallet button leads (Retool anatomy:
  wallet first, "or enter payment details" divider); plan description passed so Stripe's summary
  matches our copy; promo-code field enabled only on the redeem path.
- **Return leg — all three states designed:**
  - _Pending (webhook race):_ "Confirming with Stripe…" beat polling entitlements — the paywall is
    never re-shown in this window. Entitlement flips ONLY via verified webhooks (SA-028/§12.1).
  - _Success:_ The Guardian model — serif thank-you + one mission sentence ("Your subscription keeps
    the library free for everyone — the gospel is never paywalled"), then the **single CTA resumes
    the held generation** (`COMPOSE MY EDITION`). Quiet links: `Manage subscription` · receipt note.
    Founding Member line ("You're Founding Member N of 500") — recommended on success screen +
    /pricing only, keeping the paywall clean. No confetti (SA-025).
  - _Cancelled/failed:_ "Checkout didn't finish. **No charge was made.** Your edition request is
    saved." `Try again` primary, `Back to reading` text.
- **Management:** Settings → Account → `Subscription — Euangelion+ · renews [date]` row (status
  inline, Grok-style). Detail page: plan card with Started→Renewal dot timeline (Vocabulary — tonal
  twin), what's included, `Change plan`, `Update payment` (→ Stripe portal with the round-trip
  sentence), and **`Cancel subscription` visible on the page, one tap, no interrogation** — one
  optional question only _after_ cancellation confirms. Post-cancel: "Paid until [date]; your
  generated editions remain yours forever."
- **Renewal-reminder toggle (Calm's honest affordance):** deferred until transactional-email
  infrastructure exists — a toggle that doesn't send is a fake control (Dev Rule #6). Revisit with
  the daily-email feature.

---

## 3. Settings + BYOK (Phase 3 surface; IA lands with the Phase 1 settings restructure)

- **Settings IA:** groups in order Profile · Reading · Reminders · **Account** (subscription,
  billing) · Appearance · **Advanced** · About. `ADVANCED` is a micro-caps labeled group at the
  bottom with exactly `Use your own AI key` (+ data export if shipped). De-emphasis = position +
  label, not hiding. (Grok's labeled subscription group; ABY Journal's labeled DANGER ZONE proving a
  section label alone signals "not for everyone.")
- **BYOK subpage — a guided worksheet, not a form field:** (1) one-sentence what/why ("your editions
  run on your account — you pay the provider directly; we charge nothing for generation");
  (2) three illustrated numbered steps in riso spot-illustration style, each with exactly one action
  (Loops/OpenAI-Platform numbered-checklist pattern); (3) masked paste field + `VERIFY KEY` with
  three real states — verifying → verified ("Key verified — model responds") → failed with the
  actual reason and fix (LangChain inline prompt pattern, without its plaintext exposure);
  (4) Clerk-style security block in plain sentences: stored client-side encrypted, never in
  analytics/logs, "we will never ask you for it," `Remove key` always visible once saved.
- **Provider order (per brief + RESEARCH_OAUTH.md):** OpenRouter first — and OpenRouter's OAuth PKCE
  ("click to connect, no key pasting") is recommended as the primary mechanic with manual key paste
  (Anthropic/OpenAI) as fallback. Final call at Phase 3 build.
- **Cost estimate:** before first use, one serif line — "A 7-day custom edition typically costs
  about $X–$Y on your key" (range from our real token telemetry). After use, a quiet plain-English
  meter — "3 editions · about $2.10 this month" (Glide's plain rows; Replit per-unit detail available
  on tap; Krea's pack↔subscription↔usage adjacency). No red alarm styling. For subscribers the same
  slot shows allowance status instead — one component, two data sources.
- **Paywall tier-d link** routes here via a one-screen tradeoff explainer that styles neither option
  as the winner (Dev Rule #3): "Most people prefer the subscription — no keys, no console, $7/mo"
  beside "BYOK suits you if you already have a provider account."

---

## 4. Onboarding (post-verification first-run)

Account creation happens mid-journey (after Soul Audit + matches, at the generation gate per
SA-026) — so onboarding is a brief welcome for someone who already told us what they're wrestling
with, never a cold-start quiz.

- **Bookend structure, two capture beats max, one decision per screen:** warm framing screen in
  (Finch "Let's learn a bit about you"; the _why_ precedes the _what_) → (a) time-of-day beat →
  (b) reminders opt-in with equal-dignity "Not now" (Finch notifications pattern) → bridge screen
  out stating what the answers were for, with Matter's honesty line ("We only use your answers to
  personalize your experience"). Matter is the visual twin proof (dark, typographic, quiet).
- **Skip placement:** directly above the Continue button (Ten Percent Happier "Prefer not to
  answer" placement). Skipping everything still lands in content with defaults.
- **Bridge directly into content, never a menu:** final CTA lands inside Day 1 (or the generation
  interstitial if still composing). (Headspace recommendation-card → "Start course" → straight into
  the session.)
- **Progress:** quiet segmented hairline at top; no step numerals shouting.
- **Per-account state, re-showable:** stored per account; "Revisit your welcome" row in Settings →
  reminders/rhythm group (Fable's permanent settings group; Uxcel's reopenable getting-started).
- **Mobile:** full-bleed sequential screens, CTA in thumb zone, native bottom-sheet time control.
  **Desktop:** Superlist model — compact letterpress card, one step at a time, floating over a
  full-viewport editorial canvas. Same beats, bespoke presentation.
- **Banned:** quiz-length inflation (Ten Percent Happier's 43 screens; Calm's mid-flow attribution
  surveys), paywall as the onboarding payoff (Calm), streak pressure at first-run (Calm goal ring —
  SA-025), gating the user's own results (Headway).

---

## 5. Magic-link / one-time-code sign-in

Mechanics shipped (F-065 verify-code route); these decisions lock presentation for the rebuild.

- **Email-first, single field, single verb** (Linear model — audit-verified reference). Google as a
  quiet peer below a hairline "or" divider, stroke-outline button (ChatGPT ordering) — never above
  email (Uxcel inverse declined). Exactly two paths ship: email(+code) and Google (Sora's
  four-provider stack declined).
- **"Check your email" is a working room, not a dead end:** confirmation headline → destination
  email echoed → **inline 6-digit code entry, immediately focused** (grouped 3–3 boxes,
  auto-advance, paste support — Slack) → `Resend code` suppressed 30s with visible countdown
  (Nike) + toast on resend (PlanetScale "An email is on its way") → `Use a different email`.
  Dark quiet twin: Better Stack; editorial-register typography: Qatalog's giant serif headline.
- **Errors inline, specific, ending in action:** wrong code preserves input for correction with
  both recovery paths in one sentence (Instacart "Code didn't match. Try again or request a new
  code"); expired code gets a distinct message with expiry expectation set up front (Netflix's
  "expires 10 minutes" disclosure, Tinder's warm register). Enumeration-safe sent-copy is a brand
  decision, not a borrow: "If that address can receive mail, a code is on its way."
- **Mobile:** full-screen sequence, numeric keyboard raised on mount. **Desktop:** centered
  editorial panel on `/sign-in`, six letterpress code slots, plus desktop-only "Open Gmail / Open
  Outlook" convenience links (Elicit, Better Stack).
- **Banned:** link-only dead ends (Slack's "tap the button in the email" with no in-app code — the
  exact flaw the audit flagged), recovery paths that leave the product (Deepstash "send us an
  email"), alarm-yellow error banners (Netflix).

---

## 6. Generation interstitial (30–60s)

The existing edition-press animation (`GenerationProgress.tsx`) already out-crafts every reference;
this locks the staging, honesty, failure, and arrival around it.

- **Staged checklist over percentage** (Calm Sleep "crafting your sleep plan" checklist; stoic. and
  Alan Mind as minimal/emblem variants), using the approved narration: "Reading what you wrote…
  composing your arc… selecting passages… setting the type."
  **Honesty rule (Dev Rule #1 applied to motion):** a row flips ONLY when the real job stage
  completes (Manus/Perplexity live step status). Long stages may cycle secondary sub-lines
  (Asana-style), but rows never check off ahead of reality. No fake progress (Noom's timer-driven
  bars banned), no testimonials in the wait (stoic.'s social proof banned).
- **Duration expectation set once, up front:** "This takes about a minute. It is being written for
  you, not fetched." (Charma/Asana expectation-setting, in our voice.)
- **Failure mid-generation:** checklist freezes at the failed stage, error named in one human line
  ("We couldn't finish composing your plan"), `Try again` primary (resubmits the same input — no
  retyping), `Start over` quiet secondary. No fabricated success, no degraded plan. (IKEA Kreativ
  in-place failure anatomy; Instacart's action-less "Close" modal is the banned counter-example.)
- **Arrival — a held breath, then the content:** final row checks, a beat of stillness, one arrival
  statement echoing what the user named, one CTA into Day 1 (Breathwrk's dark quiet "plan is
  ready"). No confetti (Ten Percent Happier / Opal / Buddy party-poppers banned — SA-025). The wait
  must never resolve to a paywall (Calm Sleep's "unlock it now" banned) — entitlement was settled
  BEFORE generation started.
- **Mobile:** full-screen, checklist in the lower two-thirds, edition-press emblem above; status
  continues in the resume badge if backgrounded.
- **Desktop:** two candidate treatments — **(recommended)** a full-route editorial "press room"
  spread (checklist as a narrow left column typeset like a print production schedule; edition-press
  animation at broadsheet scale right), or a Workable-style overlay above results. Founder pick
  below.

---

## 7. Founder picks — RESOLVED 2026-07-10

1. **Desktop generation surface: "Press room meets Upper Room."** The full-route press-room spread
   (checklist as a print production schedule, edition-press at broadsheet scale) infused with the
   Upper Room's register — the wait rendered as expectancy and prayer, not production anxiety.
   Waiting is part of the liturgy, and the room should feel like both.
2. **Waiting model: HELD MOMENT.** The wait is deliberate and undismissable — no browse-away, no
   resume badge during composition. Design consequence: the honest-failure state (§6) and true
   staged progress become load-bearing; a held moment that hangs or lies is worse than an escapable
   one, so stage rows bind strictly to real job status and failure always presents `Try again` /
   `Start over` (the hold never becomes a trap).
3. **Reminder time capture:** named windows "Morning / Midday / Evening" (matches "one quiet word
   each morning" and the existing `reminder_window` column) — founder accepted recommendation by
   package approval.
4. **2yr/3yr placement:** collapsed `More durations` in the paywall (accepted recommendation).
5. **Founding Member mention:** success screen + /pricing only (accepted recommendation).
6. **Arrival echo: quote with consent cue, relevance always legible.** Quote the user's own words
   only when they typed them this session (never on return visits or resumed sessions); otherwise
   the echo is abstract but must still make the edition's relevance unmistakable — name the theme
   and the anchor ("Composed for what you named — rest, anchored in Matthew 11") rather than a
   generic "based on your input."
7. **Onboarding re-entry:** Settings row only (accepted recommendation).

Resolved this session (not open): pricing ($7/$77 locked), free grant (one-time per verified
account, SA-026), BYOK/credit-packs/gift-codes/MCP all approved (SA-027), no trial (the free
generation is the taste), renewal-reminder toggle deferred until email infra exists, iOS uses IAP
not Stripe when the wrapped build ships (existing `IOS_IAP_REQUIRED` guard).

---

**Full research reports** (complete citation lists, per-reference URLs) are preserved in the session
transcript; the strongest new references beyond the audit's index: Centr (plan cards + timeline),
ABY Journal (honest paywall + redeem placement), Open Credit Store (editorial packs), DAZN
(round-trip promise), The Guardian (success tone), Vocabulary/GoodRx (manage subscription),
Loops/Clerk/Replit/Krea (BYOK worksheet + cost meter), Matter (onboarding visual twin), Slack/
Instacart/Netflix (code entry + errors), Calm Sleep/stoic./Alan Mind (staged interstitial),
IKEA Kreativ (in-place failure), Breathwrk (quiet arrival).
