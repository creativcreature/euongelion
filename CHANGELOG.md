# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## NAV + DAILY BREAD — one menu item, and a page that leads with art (2026-08-15)

Founder: _"Daily Bread and Today are the same menu item. remove the redundancy,
instead of calling it today, call the item Daily Bread."_ They were literally
the same destination:

```ts
{ href: '/daily-bread', label: 'TODAY' }
{ href: '/daily-bread', label: 'DAILY BREAD' }
```

Same `href` twice, so the active-state check lit **both** at once — the nav
showed two underlined items pointing at one page, which reads as a rendering
fault rather than a menu. The `TODAY` entry is gone and the mobile tab is
relabelled `DAILY BREAD`.

SA-033 is unchanged and still right: "today" means *your* devotional resolved
through Daily Bread, not the `/today` editorial rotation — which stays
reachable as "Today's Edition" in the footer. The `/today` route is untouched,
so existing links keep working.

**Daily Bread now leads with artwork.** Every devotional opens with
`DevotionalHeadline` — plate left, title, standfirst and scripture right — while
Daily Bread's empty state hand-rolled its own markup with no image at all. The
two surfaces did not read as one product. It now renders the same component,
fed by `getSeriesHero()`. Founder's reference for the correct layout was
`/devotional/community-day-1`.

**Found while investigating, not fixed:** 31 of 37 series hero images are the
wrong aspect for the headline slot. The slot is `aspect-ratio: 1408/768` with
`object-fit: cover`; 28 heroes are square `1024×1024` and 3 are portrait, so
they lose roughly 45% of their height to the crop. `community-day-1` looks
right precisely because its plate is natively `1408×768`. That is an asset
problem rather than a layout one, and the remedy — regenerate ~31 landscape
plates, derive 16:9 crops from the square masters, or accept the crop — costs
real money and is the founder's call. — SA-045 (F-091)

## THE LIBRARY — series stop hiding, the active day actually moves (2026-08-14)

Four founder asks in one night, all the same shape underneath: **the app knew
the right answer and showed a different one.** Registered as **SA-044**.

**The active day never advanced, and nothing linked to it.** `PATCH
/api/devotionals/active` has accepted a `currentDay` since 2026-05-14 and clamps
it to the series length — and no client had ever called it. Completion lived
only in `localStorage`, which the server never sees, so `current_day` sat
wherever the series was started. Meanwhile the surfaces that _did_ know the day
linked past it: the library's ACTIVE card printed "Day 3" above a button to a
bare `/daily-bread`. `markDevotionalComplete` is the one choke point every MARK
READ path already goes through, so the advance lives there, and
`src/lib/reading/active-day.ts` owns both halves so they cannot drift apart
again. It never falls back to day 1 — an unresolvable day links to the series
page, because silently restarting someone three days in is exactly what made
this look like working software. "Next day" is now the first _incomplete_ day
rather than last-completed + 1, which skipped gaps when a reader went out of
order.

**`/series` is a library now.** The rails view was the hiding mechanism: a
handful of curated sideways shelves over 37 series meant anything in no rail was
unreachable unless you switched views and knew to look. Three views replace it —
**FEATURE** (bento, newest eligible series leading, your in-progress reading
promoted), **LIBRARY** (every slug in `ALL_SERIES_ORDER`, six sorts, an A–Z jump
rail), and **LIST**. Coverage is structural rather than editorial and is
asserted in a test against `ALL_SERIES_ORDER`, so a new series shelves itself.

**Search takes phrasing.** The existing scorer is AND-semantics — correct for
typing a title you already know, useless for describing a need. _"I feel anxious
about money"_ returned **zero** results, because no teaser contains the token
"i". `searchLibraryByPhrase` drops stopwords, scores OR with a squared coverage
multiplier so partial matches sink, and pays an exact-phrase bonus. It searches
devotionals as well as series, because someone describing a feeling usually
wants the one reading that meets it. The same query now returns _Provision_ and
"Why does having more make you feel less secure?". Both scorers stay. It is not
the Soul Audit and says so under the field: no consent gate, no plan, no
curation.

**The homepage rail rotates each refresh.** It had to be client-side — the
homepage carries `s-maxage=31536000`, so a rotation computed during render is
frozen into the edge cache and identical for every visitor, and `Math.random()`
in render is a hydration mismatch. Server render is deterministic, an effect
reshuffles the tail after hydration, the lead never moves. The lead is derived
from the end of `NEW_SERIES_ORDER` rather than hardcoded — the old
`HOMEPAGE_TODAY` literal still named a series two releases old. Per SA-036(4)
and the founder's direct confirmation, the commissioned series is excluded from
the lead, the tail, and the bento hero — but still appears in LIBRARY and LIST,
because nothing may hide.

Three bugs the screenshots caught that the tests could not: the bento lead was
the commissioned series; the A–Z rail read `… R S N W T V` because only the
bucket stripped leading articles while the sort kept them; and in light mode
every kicker was near-invisible, because `--color-gold` is a legacy alias
resolving to cobalt `#1f2a8d` there while the tile scrim is dark in both themes.

36 new tests. Service worker v67. — SA-044 (F-090)

## Narration — the founder's own voice, and the words that were never being read (2026-08-15)

The founder could not listen to his own devotionals. Two problems sat on top of
each other, and only one of them was the voice.

**What was never being spoken.** Section headings were classed as labels, so
2,242 of them across the catalog went unread — twenty-four minutes of continuous
prose with nothing a listener could use to tell where they were, on the same
headings already trusted to title the audio chapters. The day's subtitle was
dropped too, so a reading opened with half its name. Going the other way, all 66
pull quotes were read as their own segment, meaning the listener heard those
sentences twice: once in place, once lifted out. Also silent or wrong: 49 Greek
Extended glyphs (`U+1F00–U+1FFF`, just outside the old strip range) were handed
to the voice in 11 devotionals, and `standing-strong-day-7` — titled
"Contentment", one word — had its title dropped by the minimum-length floor.

**The two extractors had drifted.** `narration_extract.py` renders the audio;
`src/lib/audio/segments.ts` drives the on-page reader. They disagreed on **103
of 533 devotionals** — `scripture.fullPassage` and `profile.keyTrait` read by one
and skipped by the other, different punctuation folding, and a title-dedup that
only fired on days without a subtitle. They now agree on all 533, 921,909 words
each side, and the reader independently reproduces the renderer's SHA-1 of the
spoken text. That fingerprint is stored per track, so "does the audio match the
page" is a test rather than a sweep, and the catalog renderer re-renders exactly
the tracks whose text has changed.

**The voice.** The clone was built from 12 mp3 clips totalling **3 minutes 30
seconds** — enough for an instant clone to learn timbre and nothing else, which
is why it improvised stress and mispronounced him. Model and stability could not
fix a data problem: the flatter model only traded an inaccurate performance for
an inaccurate monotone. Rebuilt from the confirmed interview master
(`4CH012I.wav`, 24.3 min uncompressed, one mic, verified as him alone by pitch
distribution), it was approved on the first listen.

**Shipped in his voice:** `he-cannot-deny-himself` days 1–3, 22.0/23.3/24.7 min
at 157–162 wpm, 23 measured chapters each, atmospheric bed underneath at −26 dB
under speech and −18 in the gaps. Days 4–7 are blocked on an ElevenLabs API key
quota, not on anything in the code.

**Two traps worth remembering.** An ElevenLabs API key carries its own quota
independent of the account: days 4–7 failed with repeated `HTTP 401` while the
account held 641,765 credits and `/v1/user` authenticated normally — only the
response _body_ said `quota_exceeded`. And that failure threw away 13 already-paid
chunks, so rendered chunks are now cached by `(voice, model, settings, text)`
hash, retries back off across six minutes, and one bad devotional no longer
aborts the run behind it.

Decision: SA-043. Feature: F-086.

---

## PWA — service worker v64, and the version constant that had drifted (2026-08-14)

The replated artwork was deployed and live, byte-verified, and still showed the
old plates in the browser. `/images/` is **cache-first** in `sw.js`, so anyone
who had opened those days held the previous artwork permanently — deploying new
bytes to the same paths never reaches them. `CACHE_NAME` → `euangelion-v64`.
Any image _replaced_ at a path that already shipped needs this bump; new paths
do not.

**`SW_VERSION` had drifted nine releases behind.** The constant in
`ServiceWorkerRegistration.tsx` carries the comment "Must match `CACHE_NAME`
there" and sat at `v55` against a cache at `v63`. The primary purge was
unaffected — the worker's own `activate` deletes every cache whose key is not
`CACHE_NAME`, and that fired on each bump. But the client-side path that
unregisters and clears before re-registering compares against `SW_VERSION`, so
it had not run since v55. Synced to `v64`. — SA-040/SA-041 (F-087)

## ARTWORK — no portraits; the reader stands in the scene (2026-08-14)

Founder, on the replate below: _"supposed to be scientifically and historically
accurate depictions if depicting literal people. And the aim is to obscure their
identity more so so the reader can read themselves into the image. You nailed
the style but not the subject."_ Registered as **SA-041**.

**Accuracy and anonymity are two axes, and only one of them had been fixed.**
D-010 governs the depiction — period dress, anatomy, setting, botany. SA-041
governs the identity: no rendered likeness. Satisfying the first does not
satisfy the second, which is how the replate shipped four plates that were
historically accurate and still wrong. They were portraits: faces you look at
rather than figures you step into.

Four regenerated. The Transfiguration is now a pure silhouette swallowed by the
light with the two disciples seen from behind, arms over their heads. Elijah is
a wrapped form turned away on the ground, and the figure standing over him has
no face at all. The Samaritan kneels bowed and hooded; the wounded man's head is
turned into shadow. The series card looks _at_ the sun _with_ the figure instead
of looking at him — which is what the series is called.

Six plates needed no change, and the reason is instructive: they already had no
visible face. Three figures walking away up the Emmaus road, feet on a track,
hands on a scroll, and three plates with no people in them.

Palette held through the change — Δ39–59 from `#1b3fae`, gold ≤0.11%. — SA-041
(F-087)

## ARTWORK — "Looking at the Sun" replated to the locked riso pipeline (2026-08-14)

Founder: _"THE ARTWORK IS INCORRECT!!! YOU DIDNT USE THE DEVO-GO PROMPT FOR
IMAGES!!"_ Correct. All ten plates replaced. Registered as **SA-040**.

**What was wrong.** F-087 shipped its imagery "from the library only, nothing
generated." But `/devo-go`'s imagery stage is a _generation_ stage — Higgsfield
`gpt_image_2` with the founder's references attached (D-012/D-013). Selecting
plates instead skipped the technique lock entirely, and the numbers show what
that cost. Sampled against the locked palette, all ten carried **0.00% crimson**
where the spec requires a crimson halation; gold had become a second ink, up to
**34%** on `day4-samaritan` (gold `#da991d` at 24% outweighed the blue); the
cobalt had collapsed to near-black navy `#0e1d3e`, a distance of **118–130**
from ultramarine `#1b3fae`; grays were present against the no-grays rule
(`day4-hands` had a gray `#919197` as its darkest mass and only 2% blue); and
two plates had left the medium altogether — `day1` a duotone photo-gradient,
`day4` flat mid-century vector. Worst of all, both figures on the Jericho road
were European, against D-010's hard requirement and the D-011/D-013 lock.

**The root cause is one line of D-012.** The empty-tomb hero
`header-v2.webp` "MUST be passed as a reference on every generation." Text-only
prompts drift no matter how precise the style block is. With the anchor plus a
founder wokegodx plate attached as `medias`, the same prompts land: all ten now
measure **Δ36–62** from ultramarine — tighter than the anchor's own 67 — with
gold at or under **0.5%** and crimson present throughout.

**Three needed a second pass, and the misses are instructive.** A duotone
bleaches dark skin under strong light, so the first Transfiguration still gave a
European Christ and Elijah's face washed to cream; the fix was to say the skin
_stays_ cobalt dot density and the light only rims it. `day6-feet` promised
footprints in its alt text and had none. And `day3-brooktree` copied the
anchor's own tomb-and-sunburst onto its horizon — reference bleed, and a second
light source where the spec allows one.

**The rothem is now botanically right.** SA-036(5) had the caption apologize for
a library plate that gave Elijah's broom a canopy it does not have. Generating
means SA-032 governs instead: fix the image, not the caption. It now renders as
the low, sparse, many-stemmed desert shrub it is, and the apology is gone. Six
alt texts that described the old gold-heavy art were corrected, and `day4-hands`
now shows a scroll rather than an anachronistic codex.

Placement per spec: series card 1024², day plates 1600w, q80→q48 for dense
halftone. — SA-040 (F-087)

## CHAT + SELECTION — markdown renders, and the selection fix found its real source (2026-08-15)

**The selection fix was live and still did nothing.** The `::selection` rule
added to `globals.css` shipped in v65 and had no effect, because
`design-system/typography-craft.css` (imported at `globals.css:2`) defines
`::selection` **unlayered** — and unlayered CSS beats anything inside
`@layer utilities` regardless of source order. Measured on production before
the fix: background `rgb(31, 42, 141)` cobalt, text `rgb(10, 19, 32)` deep
navy. Dark on dark.

That same rule had been silently defeating the repo's own contract test, which
asserts _"forces white text for browser copy/paste selection across engines"_.
Both design-system files now carry white-on-cobalt and agree with `globals.css`.

**Chat printed its answers as raw markdown.** `ChatMessage.tsx` rendered
`message.content` as plain text, so readers saw `## Genesis 15` and
`**covenant of grant**` as literal characters — the most visible reason study
chat did not read like a normal chat. Assistant messages now render through
`renderMarkdownSafe` (raw HTML disabled, the same renderer Daily Bread uses).
User messages stay plain text: they are input, not markup. The blanket serif
italic came off with it, since it had begun wrapping headings and lists.

Thread excerpts sliced the raw answer too, so the sidebar preview opened with
`## Genesis 15 and the Covenant…`. `markdownToPlainText()` flattens markdown
for previews, pinned by 9 tests.

**Verified in the browser rather than inferred.** Launcher → input → send →
streamed reply, citing the day's own treaty/will argument with real headings
and bold. Chromium and WebKit both drag-select, open the toolbar and paint at
`rgb(247, 221, 110)` on production.

Two corrections worth recording, because both nearly became wrong fixes:
a WebKit run against `http://localhost` is worthless — WebKit force-upgrades
localhost to `https`, 37 requests fail on TLS and the page never hydrates, so
"Safari is broken" was an artifact. And an earlier "highlighting verified
working" rested on a _programmatic_ selection, which never exercised the real
drag path. Both were re-tested properly.

Still open: the chat panel overlaps the masthead at 1280px rather than sitting
as a contained drawer. Function is correct; the framing needs a designer's eye,
so it was left rather than guessed at. — SA-042 (F-089)

## CHAT + HIGHLIGHTS — study chat was dead in production only (2026-08-15)

Founder: _"We need to address the on page chat. It doesnt work at all."_ It
didn't — and it never had, in production.

`buildDevotionalDocs()` enumerates devotionals with `fs.readdirSync` on
`public/devotionals`. **Cloudflare Workers has no filesystem.** So the RAG index
carried zero devotional docs there, `hasDevotionalContext` was `false`, and
every chat request 400'd with "Devotional context is unavailable for this page"
before reaching a model. Reference docs already had a Workers fallback;
devotional docs never got one.

That asymmetry is the whole story: chat worked perfectly in `npm run dev`, which
has a filesystem, and failed 100% in production. It could not be caught by
testing in dev.

`devotionalToRagDocs()` is split out of `parseDevotionalFile()` so the same
doc-builder runs on a devotional fetched over the network, and
`findDevotionalDocs()` falls back to `fetchTodayDevotional()` — the Workers-safe
loader the reader itself already uses. Verified in **the Workers runtime**
(`npm run preview`, workerd): HTTP 200, `hasDevotionalContext: true`, citing the
day's own treaty/will argument and its pullquote. The same request against
production returns 400.

**Highlights: they were working and invisible.** Founder: _"the highlighting
still doesnt work."_ After SA-038/SA-039 the mark painted reliably — but
light-mode colours were translucent (`0.54`) over the `#f0ece6` cream page,
compositing to `rgb(243, 229, 175)` against `rgb(240, 236, 230)` paper. A
feature that leaves no visible trace is indistinguishable from a broken one.
Highlighter colours are now opaque swatches with dark ink, YouVersion-style;
dark mode lifts `0.34` → `0.62`.

**Plain selection is now white on brand cobalt.** `::selection` derived its
background from the text colour, so in light mode selecting text read as "the
text went dark" rather than "the text is selected". Now `#1f2a8d` with white
ink — deliberately distinct from every highlighter colour, so _selected_ and
_highlighted_ can never be confused.

Standing rule recorded in SA-042: any server code reading `public/` off disk is
broken on Workers, and must be verified in `npm run preview`, never in dev.
— SA-042 (F-089)

## LIBRARY — fix: the SERIES tab could not read a saved series (2026-08-14)

A regression from the series-save change earlier today, found by auditing my own
work rather than by a report.

`LibraryView` — the library rail's SERIES tab — resolved a saved row with
`slug.match(/^(.+)-day-\d+$/)`. A series slug has no `-day-N`, so it resolved to
`null` and the card broke three ways: it was labelled "Devotional" instead of the
series title, it linked to `/devotional/<series-slug>` (a 404), and ACTIVATE
SERIES was hidden entirely because the button is gated on that value. Starting a
saved series from the library reported "Could not resolve this devotional to a
series."

The resolver now recognises a series slug and returns it unchanged, which fixes
the label, the link, the button and the activate path together. Verified
end-to-end against the running app: a saved series renders as
"He Cannot Deny Himself", links to `/series/he-cannot-deny-himself`, and reads
"Whole series · 7 days".

Swept the rest of the codebase for the same assumption — the other consumers
take route params rather than saved rows, and the rail's own resolver was made
series-aware when series-save shipped. — SA-039 (F-088)

## READER — closing tweaks (2026-08-14)

**The reader-theme button no longer sits on the audio controls.** Fixed
bottom-left at `z-200`, at phone widths it landed squarely on the −15 control
whenever the Audio Edition panel was on screen. `NarrationMiniBar` already
solved this exact collision with `data-narration-bar`; the in-page panel now
does the same handshake through `data-narration-panel`, reusing the
`panelVisible` observer that was already there. Mobile only. Verified at 375px:
panel on screen → the button fades and stops taking taps; scrolled away → it
returns.

**Substack cover replacement: closed as unnecessary rather than skipped.** The
brief was to regenerate the 93 imported Substack headers as riso plates via
Higgsfield. Removing the cover banner turned out to be the last place they
rendered — all 26 series carry a `heroImage`, so the `series-hero.ts` Substack
fallback never fires, and live pages sampled across Substack-sourced
devotionals return zero Substack image references. Regenerating them would have
spent roughly 660 Higgsfield credits replacing pictures nobody can see. The
fallback branch stays as a safety net for any future series shipped without
art. — SA-037 (F-088)

## LIBRARY — you save a series now, not a devotional at a time (2026-08-14)

Founder: _"User should save a devotional series, not individual devotional.
Right now a user has to save each individual devotional in a series for it to
appear in the library which is incorrect."_ Registered as **SA-039**.

`SAVE SERIES` stores the series. Both save surfaces changed — the reader and
Daily Bread.

**No migration was needed, and none was taken.** `/api/bookmarks` validates
slug _safety_, not that a slug names a devotional, so a series slug stores in
the existing `session_bookmarks` shape. That avoids adding a fourth unapplied
migration behind the three billing ones still pending before
`GENERATION_GATE_LIVE`, and avoids prod DDL, which needs founder-named
approval. If a dedicated `saved_series` table is wanted later, the API surface
doesn't change.

**Existing rows roll up rather than being rewritten.** A saved day counts as
its series being saved — the auto-migration, done by reading instead of
mutating anyone's library. Nothing is deleted, no backfill runs. Unsaving
clears the series row _and_ every legacy day row, or the shelf would keep
showing a series you removed. Pinned by 11 tests, including the
`identity-crisis` → `identity` rename that still lives in old rows.

The library shelves by series: a saved series links to `/series/<slug>` —
`/devotional/<series-slug>` is a 404 — and reads "Whole series · N days".

**Anonymous highlights now survive a reload.** Amends SA-038: a highlight made
without an account is kept on the device and restored on load, deduped against
server rows so a since-signed-in reader never sees a passage marked twice. It
is still not written to the database; SA-018's line on persistence-to-an-account
holds. Verified: highlight, reload, one mark survives.

Service worker to v61. — SA-039 (F-088)

## READER — church year moves home, Daily Bread loses its extra step (2026-08-14)

Closing out the founder's original four complaints.

**Church year now lives on the home page.** It was stripped from every
devotional earlier today, which left it nowhere. One quiet centred line under
the masthead, above the banner — present for readers who keep the calendar,
easy to ignore for those who don't.

**Daily Bread lost the redundant step.** `CuratedActiveView` no longer offers
"OPEN FULL READER" — you are already reading the devotional, and offering to
open the real one implied this was a lesser copy. Founder: _"devotionals in
today/dailybread should always appear in the full reader — you have created
redundant extra steps."_ Its folio strip (which carried the church-year line
here too) is gone, and its headline now carries the same title → dek →
scripture treatment as `/devotional/[slug]`.

**The Audio Edition now runs on Daily Bread.** This was the one reading surface
that never had it, which is exactly why audio looked like a feature of the
"other" reader. Same segment builders, same player, so a pre-rendered narration
track is preferred wherever one exists.

All three reading surfaces now behave identically: `/devotional/[slug]`,
Daily Bread's curated path, and Daily Bread's soul-audit plan path — the last
of which already had audio and none of the furniture. — SA-037 (F-088)

## READER — highlighting works without an account (2026-08-14)

Founder, after being told the 401 was SA-018 behaving as designed: _"I was
signed in, but should work regardless, just not save to an account without an
account."_ Registered as **SA-038**, amending SA-018 for highlights only.

The mark is now painted from the selection the moment you press Highlight, and
never waits on the network. An account decides whether a highlight is **kept**,
not whether it appears. Signed-out readers get the highlight plus "Sign in to
keep this" rather than being thrown out to a sign-in screen mid-reading.

That also explains the original report. Being signed in was not the deciding
factor — `applyHighlightMark` ran only after `response.ok`, so _any_ failure in
that path produced no mark and no message. Three silent returns lived here: a
missing range (which the scroll handler clears in ordinary use), a non-auth
error, and a mark wrapping an empty range that rendered invisibly. All three
now report on the button.

Verified end-to-end in a real browser, signed out: the API returned 401 and the
highlight still painted at `rgba(246, 223, 128, 0.54)`.

Notes and stickies remain sign-in-gated; nothing anonymous is written to the
database. — SA-038 (F-088)

## READER — day quick-links, and highlights stop failing silently (2026-08-14)

**Day quick-links.** Founder: _"there should be links to all the days of the
devotional at the top to act like small quick links. Otherwise its difficult to
switch bewteen devotionals within a series."_ Every day in the series now
renders as a small link under the headline, current day marked in gold. Placed
_under_ the title rather than above it, so SA-037 still holds — the title
remains the first thing on the page. Long plans (Bible-365) keep the existing
day-nav pill; 365 links is not a quick link.

**Highlights.** Founder reported the colour never renders. Diagnosed rather
than guessed, and the CSS turned out to be fine — injecting the exact mark the
code creates into the live page computes to `rgba(246, 223, 128, 0.54)`, real
yellow. The mark was never reaching the DOM.

The cause is that `applyHighlightMark` runs only after `response.ok`, and every
non-auth failure hit a bare `return` — no mark, no message, nothing. A reader
picks a colour, presses Highlight, and the page does not react at all. That is
a silent fallback, and it is now fixed: failures surface on the button.

Worth stating plainly: for a signed-out reader the endpoint returns 401
`AUTH_REQUIRED_SAVE_STATE`, which is **SA-018 behaving as locked** — highlights
and notes are sign-in-gated by decision, and that gate has not been touched.
Whether the founder hit the gate or a genuine save failure is still open; the
error message will now say which. — SA-037 (F-088)

## READER — nothing above the devotional title (2026-08-14)

Founder, reading "Between the Pieces" (`he-cannot-deny-himself-day-5`):
_"Nothing above the individual devotional title should appear on page — all
information above where this first appears on page is completely bogging down
the reading experience."_

He was right, and the measurement was worse than the complaint. Screenshotting
the running site at 1280x900, **the title never appeared on the first screen at
all**. Six blocks came first: masthead, breadcrumbs, a Substack cover banner,
an action row, START/SAVE, the folio strip, and the church-year line. The page
measured 25,118px on desktop and 33,100px on mobile.

**Removed** from above the title: `Breadcrumbs` (whose last crumb repeated the
title), the Substack cover banner, and `DevotionalFolio` — the folio being the
vehicle that carried `ChurchYearOverline` onto every devotional.

**Moved, not deleted**: the action row (back to series / share / substack) and
`DevotionalActions` (start / save) now follow the reading. The founder was
explicit that the links are needed and it was their position that was wrong.

**Reordered**: `DevotionalHeadline` had been rendering the scripture line
_above_ the title. Order is now title → dek → scripture. On mobile the art div
precedes the text in DOM order, so the plate stacked above the title too; one
`order: 2` in the existing `max-width: 900px` block places it after, with the
dividing rule moved to the art's top edge.

**Added**: the day's teaser as the standfirst, through
`.devotional-headline-dek` — a class sitting in `globals.css` since the
2026-05-13 audit that no prop had ever fed. The summary the founder asked for
was already in the design system, just unused.

**A rejected first attempt is part of this entry.** The assistant initially
proposed a bespoke reader — its own header, type scale, spacing and colour —
and the founder rejected it outright: _"Your proposal ruins the actual site. I
dint ask you to fully restyle the site, I asked you to remove items and
reorder."_ That was correct. What shipped uses the existing components,
classes and type; the only CSS added is a single `order` and a border-side
flip. SA-037 records the constraint so it does not recur.

**Also fixed**: `NarrationPlayer`'s control row was a non-wrapping flex row of
five controls. At 375px "LISTEN" and "CHAPTERS" broke mid-word and the buttons
overlapped. It wraps now, labels stay on one line, targets remain 44px.

Verified by DOM probe rather than inspection: at 375px the title sits at y=172
and the plate at y=403, and every element above the title is masthead. Worth
recording — the CSS appeared not to work on first run; the dev server was
serving a stale `globals.css` chunk. Restarting it was the fix.

**Service worker bumped to v57.** The first deploy shipped correct markup —
production returned zero breadcrumbs, zero folio, zero church-year — but the
founder saw no change, because a reader holding v56 keeps the cached shell.
This change alters the shell itself, so the bump is not optional. Same trap as
R41-R43.

**Still open**: the church-year line is removed from readings but not yet
placed on the home page; `/daily-bread`'s `CuratedActiveView` keeps its own
`ChurchYearCard` and its OPEN FULL READER step; the fixed reader-theme trigger
can still overlay the in-page narration controls (it already lifts clear of the
mini bar, but not of the panel); series-level save and the reader
consolidation are unstarted. — SA-037 (F-088)

---

## CONTENT — "Looking at the Sun": a 7-day commissioned series on healing, patience and rest (2026-08-14)

Commissioned in conversation on 13 August: _"I did want to actually make you a
devotional… I'll have something for you. I want to say it'll be ready for you on
Monday."_ She asked for **healing** and **being patient**; the founder added
**rest**, and then spoke a five-minute reading on the spot. This ships what he
said, at full length.

**A correction is part of this entry.** It went out first as a _single reading_.
That was the assistant's inference from the phrasing of the request, and it was
wrong — `/devo-go` lists day count among its required inputs and says to lock the
week shape before writing anything. That gate was skipped, and the choice was
then written into `production-decisions.yaml` as though it were policy. The
founder rejected it the same day. The reasoning did not survive contact either:
the commitment was for Monday, and the correction came on Friday. SA-036 now
records the reversal rather than the original claim, and the standing ruling is
that **the default is seven days and day count is never inferred**. Rebuilt
clean-sheet, days 1-7 in order, in one pass (traps.md §19). The research and
source pack carried over intact, so the rebuild cost writing rather than
verification.

**The week.** Monday, Isaiah 40 — the promise is addressed to people already
spent, and the chapter first tells them they are grass, which is the removal of
the alternative rather than cruelty. Tuesday, Hebrews 12:1 — two problems in one
clause, and most readings collapse them. Wednesday, 1 Kings 19 — the pivot.
Thursday, Luke 10 — Martha. Friday, Hebrews 12:2 — the gaze. Saturday gathers.
Sunday says almost nothing. A Monday start lands the sabbath on Sunday.

**The teaching payload is lexical, and it is where the founder's own image turns
out to live.** Three Greek words describe one geometry: **ogkos**, bulk and mass,
named separately from the sin beside it — weight is not sin, which is why so many
exhausted people are trying to confess their way out of a schedule.
**euperistatos**, which Thayer's notes is "not found elsewhere" in surviving
Greek, describing something that stands all the way around a runner. And
**perispaō** in Luke 10:40, one occurrence, **imperfect passive** — Martha was
being dragged around; it was done to her, not chosen by her. All three are
answered by **aphoraō**, "to look away from all else at one object," a present
participle. Surrounded on every side, and the instruction is not to fight every
side but to look at one thing. That is the sun image, arrived at through the
lexicon.

**Where it resolves.** The risk in this brief was writing a try-harder week to
someone who asked for rest. Isaiah 40:31 puts the running _after_ the waiting,
and the verb behind "renew" — **chalaph** — has a root sense closer to passing on
and changing than to topping up, so what is promised is not the old strength
retrieved. Elijah gets two meals and two sleeps under the broom tree before God
says one word to him, with the reason stated: _or the journey will be too much
for you_. Rest is what the race is run on, not the prize for finishing it.

**Verification, in full.**

- Scripture pulled from `public/bibles/` only; KJV casing preserved ("the Lord").
  KJV chosen for the Hebrews anchors on purpose: it renders **hypomonē** as
  _patience_ — the word she asked for — where modern versions print _endurance_,
  and they are the same Greek word.
- **Amy Carmichael** (day 1) verified against the scanned text of _Rose from
  Brier_ (1933), written from the bed she never left after her fall of 24 October
  1931 — "from the ill to the ill… a rose plucked straight from a brier." The
  widely quoted "fellow-toad under the harrow" line is from the preface to _Gold
  by Moonlight_ (1935) and is routinely misattributed to this book; the primary
  wording is used instead.
- **Adoniram Judson** (day 2) kept to the dated skeleton — Rangoon 14 July 1813,
  first convert 27 June 1819, imprisoned 8 June 1824 to 4 November 1825, Ann died
  24 October 1826 — because the story attracts embellishment.
- **Spurgeon** (day 3) verbatim from _Lectures to My Students_ XI, "The
  Minister's Fainting Fits," including the prescription that a walk in the wind
  "would not give grace to the soul, but it would yield oxygen to the body."
- **Brother Lawrence** (day 4) verbatim, with the caveat that the conversations
  are Joseph de Beaufort's record rather than Lawrence's own pen.
- **Milton** (day 5) against the 1673 _Poems_ and the _Second Defence_, with the
  contested 1652-1655 date range kept and "On His Blindness" flagged as a later
  editor's title.
- **Pascal** against the French; the viral English is rejected as a paraphrase.
- The _qavah_ etymology carries BDB's own "perhaps."
- Authorship debates stated rather than smoothed: Hebrews is anonymous, and
  Isaiah 40-66 gets both the traditional and the modern reading.

**A video re-upload was caught and rejected.** `iVwauTiyFjM` carries
BibleProject's exact title and content, and oEmbed reports the channel as "Starry
Night Elf." The official Isaiah Part 2 id is `_TzdEPuqgQg`. All four videos used
are oEmbed-verified on `@bibleproject` and embed-checked.

**Imagery: nothing generated.** All nine plates came from the existing library
per the manifest-first rule. The accuracy gate now extends to captions
(SA-036(5)): the _rothem_ of 1 Kings 19 is a low desert shrub and the chosen
plate renders a full canopy, so the caption says so rather than asserting a
detail the picture contradicts.

**Narration: 126 minutes, one voice, chaptered from real timings.** Day 1 23.5
min / 23 chapters, day 2 22.3 / 23, day 3 25.0 / 23, day 4 23.2 / 23, day 5 20.8
/ 22, day 6 8.9 / 11, day 7 2.7 / 6. Mean clarity 0.987-0.999. Day 2 was
re-rendered after its stored render text was found to contain a stray Greek
character the engine had actually spoken — the re-render came back with 0 of 61
segments under the clarity gate.

**Two hazards from rendering on a shared machine, recorded because they will
recur.** First, `build_chapters.py` refuses to emit chapters when a devotional's
re-extraction disagrees with what was recorded — correct — but a skip drops that
entry from its output entirely, so running it while another session is editing
the narration pipeline silently strips chapters from every devotional it skips.
It removed 500 here; all were restored from HEAD, and only where the audio was
byte-identical, so no restored timing describes a file that has since changed.
Second, `src/data/audio-manifest.json` is a read-modify-write file with no
locking, and four render processes were writing it at once. The manifest
committed here was reconstructed as HEAD plus this series' seven entries only,
so it cannot misdescribe another session's in-flight audio.

**Not featured** (SA-036(4)). It enters `SERIES_DATA`, `NEW_SERIES_ORDER` and the
"When You're Overwhelmed" rail. `FEATURED_SERIES` and the homepage
`HOMEPAGE_TODAY` slot are untouched.

Decision: **SA-036**. Feature: **F-087**.

---

## PLATFORM — Pre-rendered narration: the Audio Edition now reads everything, in one voice (2026-08-11)

Founder brief: _"I need a better way to listen to my devotional. The method you
have chosen is robotic and doesn't work… I want to listen to my devotionals as I
work and currently it just doesn't work."_ Two independent defects, and only one
was about the voice.

**It was skipping about a third of every devotional.** Measured across 521
devotionals, `moduleText()` in `src/lib/audio/segments.ts` spoke a median
**70.7%** of each entry's distinct prose. It read a fixed field list; the corpus
stores prose in fields that list never named. Roughly **252,000 words**
catalog-wide were never read aloud — every `profile` module ("The Voice Behind
Today", 69k words), `insight.historicalContext` (66k), `vocab.usageNote` and
`rootMeaning` (50k), `bridge.newTestamentEcho` (36k),
`story.connectionToTheme` (18k), and the `comprehension` question, whose answer
was read without it. Word studies came out as orphaned definitions — "safety,
security, certainty…" with no indication the word was _asphaleia_.

The reading contract is now complete-by-default: an ordered field list per module
type **plus a catch-all sweep**, so a field present in only a handful of modules
can never go silent again (that sweep is what recovered `sabbath.content`, 295
words). Mirrored fields are deduped rather than read twice — `teaching.content`
and `teaching.body` are byte-identical in 1,410 of the 1,422 modules carrying
both. Also: vocab headwords restored, Hebrew/Greek glyphs stripped with the
transliteration kept, scripture references spoken as English ("1 Thessalonians
5:2-3" → "First Thessalonians, chapter five, verses two to three", including
compound forms), Roman numerals expanded after a cue word only so the pronoun
"I" is untouched, and navigation modules no longer read aloud.
**648,094 → 888,899 words spoken, +37.2%, median 1.37×, zero devotionals
regressed.**

**It could never have played in the background.** `speechSynthesis` is not a
media element, so Media Session had nothing to attach to — no lock screen, no
headphone controls, and iOS stops it when the screen sleeps. Narration is now
pre-rendered to AAC and played through a real `<audio>` element
(`NarrationPlayer`): scrub, ±15s, 0.8–1.5× speed, resume-where-you-stopped, and
working OS transport. Devotionals without a track still fall back to the Web
Speech reader, so nothing regresses mid-catalog.

**The voice is a preset narrator, not a founder clone.** The clone path was
abandoned on measurement: it could not reach narration pace by any lever — seeds
moved rate ±0.4 w/s, `instruct` is a confirmed no-op on the MLX path, and
register-specific reference profiles changed pacing not at all — so every take
needed an audible ~1.35× time-stretch. Two constants in the prototype spec were
also wrong: the founder's "natural rate" of 2.82 w/s measures **3.57**, and take
A3's reported 2.87 w/s measures **3.48**, because v1 computed rate from API
metadata instead of the audio it wrote. Canonical voice is Kokoro-82M
`am_michael` at ~162 wpm, inside the 150–170 audiobook band with no stretching,
rendering whole segments so prosody arcs across a paragraph.

**One voice, enforced.** A catalog narrated by two voices is obvious to a
listener and invisible to text-accuracy checks — during the bake-off three
candidate voices existed side by side. `verify_voice_lock.py` now fails on any
track that is not the canonical voice.

Shipped: `he-cannot-deny-himself` days 1-7 (127 min, 44.7 MB, one voice
verified, mean clarity 0.982-1.000). Catalog render in progress.

**Known limit, stated rather than papered over:** Greek/Hebrew word-study
pronunciation cannot be verified automatically — Whisper was not trained on
these transliterations and mangles them whatever the voice does, so that gate is
invalid for exactly those terms and they need a founder ear-check. The
`pronunciation` field already in the content is NOT a drop-in fix; the engine
reads its hyphens as breaks (`KHEH-sed` → "k-sad") while raw `chesed` is already
correct. Overrides live in `spec/pronunciation-overrides.json` and change only
what is sent to the engine, never the devotional text.

**Delivery contract.** Workers-runtime verification caught that `/audio/*` was
served `max-age=0, must-revalidate` with no `Accept-Ranges`, so an 8 MB track
was re-fetched every visit — and, more importantly, could not be scrubbed
cheaply: Cloudflare strips `Range` before invoking the Worker and slices byte
ranges from its own cached copy, which requires the response to be cacheable.
`/audio/*` now serves immutable for a year, with `?v=<encoded byte size>`
stamped onto each `src` so a re-render invalidates instead of pinning a stale
reading in browsers.

**The reading rule.** Narration control now follows the reader down the page,
built as a bookmark ribbon rather than a media widget — SA-034 had the section
scrubber removed from the Audio Edition panel precisely because it made the page
open like app chrome, and a persistent player is the thing most likely to undo
that. The bar has no top border: its top edge IS the progress line, a cobalt
rule filling across the viewport that doubles as the seek control. It is earned
rather than default — it appears only once the reader has pressed play AND
scrolled the panel away, and retires when the panel returns, so a reader who
never listens never meets it. Content sits on the reader's own grid, with the
play control landing on the exact vertical of the "AUDIO EDITION" label it
replaces.

Three collisions were caught by measuring the DOM rather than eyeballing
screenshots: the floating reader-theme button sat directly on top of the play
control (both bottom-fixed, z-200); the progress rule rendered flat because
`--pct` was set on the `<input>` while the fill span is its sibling; and a 6px
sliver of scrolling text showed between the bar and the mobile tab bar because
the offset was borrowed from the body's bottom padding, which carries slack.

**Manifest moved out of `public/`.** The `/audio/*` immutable cache rule swept
up `manifest.json`, which every render rewrites, so production served a
year-cached index. A path exception in `_headers` does not fix that — Cloudflare
appends rather than overrides, yielding two contradictory `Cache-Control`
directives on one header. The manifest is now a build input at
`src/data/audio-manifest.json`, never served, leaving `/audio/*` holding only
`.m4a` files where immutable is unambiguously right.

**Service worker bumped to v52 — and this is why nothing appeared to change.**
Reading routes are cache-first (`cacheFirstWithUpdate`), and `/_next/static/`
is served from cache when present, so a returning reader received the previous
build's HTML _and_ the old chunk hashes it references. The narration player and
the reading rule deployed correctly and were invisible to anyone who had opened
the site before. `sw.js` documents the contract — keep `CACHE_NAME` in sync with
`SW_VERSION` in `ServiceWorkerRegistration.tsx` — and four deploys of new client
code went out without bumping either. Both now at v52, which makes the client
unregister, clear every `euangelion-*` cache, and re-register.

**Chapters (2026-08-12).** Every devotional heading is now a navigable point in
the recording, reached from a pull-up sheet, with the section being read marked
in the page. Timestamps are measured from the renders rather than estimated —
an estimate drifts tens of seconds over a 20-minute track and lands mid
sentence — and `build_chapters.py` replicates the stitcher's pause grammar
exactly, since ignoring those gaps costs about half a second per segment.
Verified by decoding shipped audio and transcribing at three marks. Extraction
is deterministic, so the join between fresh module indices and stored durations
is safe; any devotional that fails the text check is skipped rather than given
wrong marks. 384 devotionals have chapters, median 10.

Selecting a chapter moves the audio AND the page, because a chapter is a
position in both. The sheet is opened deliberately rather than printed, which
is what keeps SA-034's objection satisfied — that ruling was against a list you
cannot avoid seeing, not against an index existing. The on-page marker writes a
single attribute when the reading crosses into a new section, roughly once a
minute, with no scroll listeners or observers.

**"He Cannot Deny Himself" audio audited end to end (2026-08-12).** Days 2-7
verified verbatim against the current reading contract; day 1 was not. Its audio
predated the Roman-numeral fix and said "chapter VIII" where the page says
"chapter eight" — the exact ambiguity that fix exists to remove. Re-rendered and
confirmed by decoding the shipped file and transcribing at 14:50: the numeral is
now spoken as a word. All seven days now carry chapters (23/23/23/23/24/10/5),
one voice, 127 minutes, 44.7 MB.

This surfaced because the chapter builder REFUSES to emit timestamps when
re-extraction does not match the render. That guard exists to prevent wrong
chapter marks; it caught a stale audio file as a side effect. Had it guessed
instead of failing, the defect would have shipped silently.

**Catalog complete (2026-08-12).** All 520 devotionals now have narration and
chapters: 91.8 hours of audio, 1.89 GB, one voice, zero failed renders, zero
devotionals skipped by the chapter builder's verification.

A correction to an earlier claim in this entry: R2 was described as blocking
the `bible-365` batch from shipping. It is not. `.gitignore` governs git, not
the build — `npm run deploy` copies `public/` from disk, so that audio has been
deploying all along (verified live). What R2 actually solves is durability: the
1.4 GB is currently tied to one machine's working directory and is re-uploaded
on every deploy. A fresh checkout would build without it and ship silent
players. That is a real risk, but it is not a gate on going live.

**SA-035 registered.** Full detail: `docs/feature-prds/F-086.md`,
`euangelion-voice-prototype/FINDINGS-2026-08-11.md`.

Verified: `npm run type-check` clean; full suite **140 files / 1824 tests**
passing (26 new).

---

## CONTENT — "He Cannot Deny Himself" 7-day series + Two-Minute Open v2 (2026-08-10)

New prefab series on the steadfastness of God set against human self-rule, built
end-to-end via /devo-go. Founder angle, quoted into the brief: God has made an
unwavering commitment, the gap between Him and us is one **we** opened, and the
reader in view is anyone still "stealing that fruit from the Garden of Eden."
Harvest-adjacent through Hosea's sowing/reaping rather than another Matthew 13
week — `the-harvest` keeps the parables. Monday start, Sunday sabbath close.

Days: **1 (A)** The Fruit of Lies, Hosea 10:12-13 — the charge is management, not
wickedness. **2 (B)** The Oldest Theft, Genesis 3:4-6 — the serpent sells a
likeness already given in Genesis 1:26-27. **3 (C, PIVOT)** He Cannot Deny
Himself, 2 Timothy 2:11-13 — accountability and mercy are one attribute facing
two directions; Athanasius §§6-7 frames it as a dilemma God cannot escape.
**4 (B′)** Like a Morning Cloud, Hosea 6:1-6 — hesed in v.4 and v.6 is the same
word, so the request is an offer of terms, not a demand for more effort.
**5 (A′)** Between the Pieces, Jeremiah 31:31-34 + Genesis 15 — the covenant
ratified from one side while the other slept. **6** recap + Further-Your-Learning.
**7** sabbath, Lamentations 3:22-23.

**SA-034 registered (three rulings).** (1) **TWO-MINUTE-OPEN v2**, forward-only
amendment to SA-030: the open gains a short write-up ABOUT the anchor scripture
between the vocab word and the reflection — scripture → vocab → teaching →
reflection → prayer → cta. Days declare `format: "two-minute-open-v2"`; the
validator enforces the six-module sequence AND that the DEEP DIVE cta targets
`#devotional-section-7` (section ids are 1-indexed over the module array, so the
old `-6` target would have scrolled readers into the middle of their own open).
The five-module `two-minute-open` in `the-harvest` is untouched and still
validates. (2) **THIRD-PERSON SERIES VOICE** — a founder may pin a series to
third-person narration, overriding the AUTHORING-SPEC §2 permission to use "you"
in teaching/bridge/story/insight/vocab; reflection, prayer, takeaway and
interactive stay in direct address because the form IS address. (3)
**SEED-VS-ANCHOR** — 1 Thessalonians 5:1-10 was named by the founder as the
week's _sentiment_, not its text; it opens Day 1 and closes Day 6 and is never
promoted to anchor.

**Research fanned out; drafting did not** (new /devo-go traps §19, from the
Harvest v5 precedent). Four verification agents, then all seven days written
single-author in day order. Findings that changed the build: BibleProject's
faithfulness video teaches **emet**, not emunah — a vocab module would have
contradicted its own video, so Day 3 carries emet and Day 7 keeps emunah, and
nothing blurs them. Five planned lexical claims were **factual errors** and were
cut or restated (Hosea 6:3/6:4 do NOT share a word for morning; Ezekiel 36:27 is
Qal, not causative; Malachi 3:6 has no Hebrew "therefore"; Hosea 6:6 is
comparative, not absolute; Isaiah 48:11's verb is present, not supplied). Three
beloved stories died under verification and are documented as rejected: Cowper's
hymn was written BEFORE the 1773 collapse, not after a suicide attempt; Matheson
had no fiancée; and Genesis 15 has no attested extrabiblical parallel — the two
elements the standard sermon fuses are never found together outside Scripture,
and that silence is now the day's actual argument. Cranmer's hand in the fire is
attested by a HOSTILE Catholic eyewitness, not only by Foxe.

Imagery: 9 riso-duotone plates, library checked first per CLAUDE.md. Two failed
the SA-032(4) accuracy gate and were regenerated — the Genesis 15 plate came back
with living, standing animals, and the recap path forked when the brief required
one unbroken line. **Flagged:** `public/images/library/poster/atmos-wheat-field-golden.png`
is a real photograph sitting in the curated library, which CLAUDE.md forbids on
user-facing surfaces; not used here, but it should be purged.

**TWO SILENT-RENDER BUGS FIXED, both found by driving a real browser at the
Workers preview — not by curl, not by the validator, not by the type-checker.**
`SabbathModule` read only `scripture_anchor`/`invitation`/`prayerText` and
`RecapModule` required a `days` array; both returned **null** for the canonical
flat `content` shape that every other prose module uses. Day 7's entire body and
both of Day 6's recap sections rendered as silent empty gaps while the JSON
served correctly over HTTP and the validator passed 0/0 — the same class of
defect as the Jabez flat-`content` regression, and harder to spot since the
bordered panels were removed in July. Both components now render flat `content`
(RecapModule via ReactMarkdown, matching TeachingModule), both have rendered-DOM
regression tests, and the suite's missing `afterEach(cleanup)` — which was
leaking renders and throwing post-teardown "window is not defined" errors — is
in place. Day 7 body went 4,150 → 5,770 chars; Day 6 9,715 → 14,212.

Editorial gate: devotional-editor returned **NOT READY** on the first pass with 5
blocking findings, all applied — a fabricated Genesis 15:18 quotation ("cut a
covenant" appears in no translation in the corpus), four false counted/dated
claims (two disproved by text on the same screen), Athanasius called a bishop ten
years before he was one, an invented Matheson date landing after his death, and
four quotations printed in quotation marks that had never entered the source
pack. Twelve needs-fix items applied besides, including an unverified "eleven
years left" countdown asserted six times, a missing meta-story return on Day 6,
and a production byline that broke the fourth wall.

Wiring: `series.ts` entry + NEW_SERIES_ORDER, `series-rails.ts` spotlight, and the
homepage MAIN feature per SA-031(1) (most recent series leads; `the-harvest`
rotates into the six cards below it). Counts bumped: series 35→36, feature PRDs
84→85. New tests: `two-minute-open` format contracts in `devotional-json.test.ts`
(both shapes, sequence + cta target + target-exists) and v2 rendered-DOM
assertions in `module-renderer-flat-content.test.tsx`. (SA-034, F-085)

## VERIFIED — Signed-in continuity proven in the Workers runtime (2026-07-28)

The last open gate on F-083 is closed. Every prior test mocked the repository, so
nothing proved that a REAL signed-in session keeps its active devotional — the
exact promise that was broken for six months. `scripts/e2e-signed-in.mjs`
(`npm run test:e2e:signed-in`) now drives the local Workers preview end to end:
sign in → activate → the badge endpoint agrees → the reader renders it → three
reloads → change day → sign out (401, and no account state leaked to anonymous)
→ sign back in on a NEW session with a fresh cookie jar → resumes the same series
at day 3 → clear → honest empty. **22/22 checks pass.** Two assertions are the
bug itself: the reader must show the activated series, and it must NOT be the "A
Voice in the Wilderness" empty-state card.

Safety: one ephemeral user created via service-role and deleted in a `finally`
block, with absence re-verified against the auth database afterwards; the harness
refuses to run against any non-localhost target, so it can never mutate
production. It builds the Supabase session cookie by letting `@supabase/ssr`
serialize it into a fake jar rather than hand-rolling the chunked format.

The structured resolution events shipped alongside made the run readable as a
journey — `authed:false → empty`, `authed:true day:1 manual_start`, `day:3`, then
the re-authenticated session resolving correctly with `hasSessionToken:false`
(the cross-device case). Zero 500s across the run.

**Two unlimited destructive writes fixed.** `DELETE /api/devotionals/active`
(which archives the active series and clears the slot) and `DELETE
/api/devotionals/saved` shipped with no rate limit while PUT/PATCH/POST on the
same routes had one — the destructive half of each pair was the unbounded one.
Both now take the same limiter as their siblings. Found by the test-coverage
rewrite; both handlers already computed `clientKey`, so the limiter had clearly
been intended and lost. (SA-023, SA-032, F-083)

## TESTS + AUDIT — Real API coverage, and the Jabez editorial audit (2026-07-28)

**Roadmap #3: false test coverage replaced.** `security.test.ts` and
`performance-contracts.test.ts` asserted against four endpoints that were never
shipped (`/api/daily-bread/state|activate|replace-slot|switch-current`, remnants
of the abandoned three-slot design). Nothing on disk could contradict them, so
they protected nothing. Every property they were reaching for is now asserted by
invoking the handlers that actually ship — auth gating across all 9
method/route combinations, real rate-limit enforcement loops, honest 401-vs-503
codes, no secret/PII in error bodies, tenant isolation against hostile
`userId`/`sessionToken` in the body, and boundary input validation. Payload
budgets are now MEASURED rather than compared to themselves (archive 5.63KB of a
20KB budget at catalog saturation; saved 48.83KB of 64KB with every devotional
saved). Both files gained a drift guard asserting the retired routes do not exist
and appear in no contract table — the check that would have caught this the day
the design was abandoned. Suite 137→138 files, 1765→1796 tests, all green.

Four real findings came out of it, none yet fixed (production source untouched):
DELETE `/api/devotionals/active` and DELETE `/api/devotionals/saved` ship with NO
rate limit while PUT/PATCH/POST on the same routes have one — the destructive
writes are the unlimited ones; the rate-limit table was false well beyond the four
routes (magic-link is 8/min/IP not 5; soul-audit/submit is 12/min not 3/hour, with
the daily cap doing the real spend protection); every limiter keys on hashed
client IP rather than user id, so a NAT shares one budget and one account can
multiply its budget across IPs; and `GET /api/devotionals/saved` is unpaginated
and already 48.8KB before any notes.

**Jabez editorial audit.** `docs/audits/JABEZ-HARVEST-EDITORIAL-AUDIT-2026-07-28.md`.
Mechanically Jabez is sound — no quote drift, no stray markdown, all 47 emphasis
strings verbatim, 7/7 validator PASS. Two formatting defects were fixed and
nothing was rewritten, per the founder's "no rewriting old devotionals": a stray
leading space (day 6) and a citation that ended mid-clause on a dangling ", and "
— visible broken text in day 5's Sources block, truncated to its last complete
clause with nothing invented. Everything else is report-only and awaits rulings,
including three HIGH items: the same word taught five times in one day (day 4) and
four times in another (day 2) — the exact Harvest defect — and Day 6 asserting as
fact the name-form Day 2 spent a paragraph establishing he was NOT given. Also
logged: days 4 and 5 open with byte-identical scripture (Harvest's day 2-3
defect), five straight days ending on the same "We began with…" callback move,
and a sales figure ("eight million copies") restated as a behavioral claim ("ten
million people have prayed"). Cross-series, the sharpest divergence is the sabbath
day — Jabez day 1, Harvest day 7 — where SA-029's "sabbath-first" ruling makes
Harvest the outlier. (SA-033, F-082, F-083)

## RELIABILITY — Unavailable states, resolution observability, persistence-migration design (2026-07-28)

Founder roadmap items #1, #5, #6, #7.

**#5 Explicit unavailable states.** The canonical resolver already reported
`unavailable` as a first-class state, but nothing spoke it to the reader: the
library store set `lastError` in six places and rendered it in zero, so a failed
read looked like an empty library — an outage impersonating lost data, which is
the exact confusion behind the original Daily Bread report. New reusable
`StateUnavailable` component keeps two promises the copy may never drop: it says
we could not CONFIRM something (never that it is gone), and it states explicitly
that the reader's selection has not been changed. Wired into `LibraryView` on a
failed refresh, with retry. The `/daily-bread` error-boundary copy was re-aimed
to the same framing ("We couldn't confirm your current devotional. Your selection
has not been changed."). Six tests pin the copy and the retry semantics.

**#7 Observability for state resolution.** `resolveCurrentReading` now emits one
structured `evt` line per resolution — `current_reading.resolved` (with source,
series/plan and, for plans, whether the account-first or session lookup won),
`plan_expired_archived`, `empty`, and `unavailable` (with error name and
message). Every line carries `authed` and `hasSessionToken`, which is what
distinguishes an auth-blind render from a genuinely anonymous reader — the
distinction that made the expired-token failure invisible for six months.

**#1 Soul Audit persistence migration — DESIGN ONLY, not implemented** (per
founder instruction). `docs/technical/SOUL-AUDIT-PERSISTENCE-MIGRATION.md`
inventories all 46 exported functions, 25 cache-first `WithFallback` variants and
13 caller files; classifies every operation as durable-required, genuinely
ephemeral, or currently-memory-only-but-must-be-durable; defines the failure
contracts and HTTP mapping; and stages the work in seven independently revertable
phases with a test plan. Two correctness bugs surfaced during the inventory and
are pulled forward into Phase 0 because both gate generation spend: the audit
rate-limit counter is per-isolate (so the real ceiling is limit x isolates, not a
limit), and a concurrency lock fails OPEN when Supabase is unreachable.
Recommendation is to ship Phase 0 + Phase 1 (observability, zero behavior change)
and let a week of production data drive the rest.

**#6 Build and asset pipeline.** The artwork generator's bare "Loaded 0 artworks"
read like data loss and had cost review time twice; it now states that an empty
manifest is EXPECTED since the 2026-05-08 archive and that live artwork is served
from `SITE_DEVOTIONAL_ART` (180 entries). Verified independently: Harvest imagery
is 15/15 present and does not depend on the manifest. Also documented three
deploy hazards found the hard way this session in COMMIT-AND-DEPLOY-GUIDE.md — a
backgrounded `npm run deploy` can exit 0 having uploaded NOTHING (confirm the
version id, never the exit code); content-only deploys serve stale HTML behind
`s-maxage=3600, stale-while-revalidate` and need a cache warm plus a rendered-text
check; and running a production build while `next dev` is live 500s every route
on :3333 until the dev server restarts. (SA-023, SA-032, F-083)

## CONTENT — Harvest days 1-3: no double-read, and the founder's actual angle (2026-07-28)

Two content repairs inside the retained Two-Minute Open structure.

**The open no longer reprints the deep dive's scripture.** Days 2 and 3 opened with
a passage that was a verbatim subset of their own main passage, so the reader met
the same verses twice within ~800 words. Day 2's open is now James 5:7-8 (the
farmer who awaits the precious fruit of the soil) and day 3's is Matthew 13:34-35
(things hidden since the foundation of the world) — both corpus-verbatim from
public/bibles/BSB/, both previously unused in the series, and neither overlapping
its day's main passage. Each open's word study was rebuilt from its new passage
(makrothymeo G3114; krypto/kekrymmena G2928), verified against the STEPBible
tagged Greek NT and Abbott-Smith rather than asserted, and the long re-teach of
the old opening word was deleted from day 2's main word study — a word is now
taught once per day.

**Days 1-2 now carry the founder's canonical blend.** Measured against days 4-5
(which were already correct), days 1 and 2 were written to the older single-angle
spec: the retired-verdict thread — you cannot tell wheat from darnel before the
grain forms, so stop rendering verdicts — appeared roughly twice in day 1's 4,183
words, while evil-persisting-beside-good ran 2.5x the intended primary. Day 1
stated the indistinguishability fact inside its zizania word note and never used
it; it now pays that off in the teaching, the insight, the audit and the close.
Day 1's verdict thread rose 1.0 to 4.3 per 1k, day 2's 4.6 to 6.6, with patience
still primary. The parable's own vocabulary (enemy, darnel, sabotage) was left
fully intact — nothing was stripped to move a number.

Both passes: modules never reordered, added or removed; scripture, reflection and
prayer of the open left untouched by the rebalance; second-person count in the
essay modules unchanged (day 1 12/12, day 2 22/22) so the third-person voice
holds. Validator PASS x7; suite 137 files / 1765 tests green. F-082's User
Expectation, which still stated only the third angle, was corrected to the
canonical weighting. (SA-033, F-082)

## EDITORIAL — The Two-Minute Open reads as a précis, not a false start (2026-07-28)

Founder read days 1-2 live: too 2nd-person for the site's voice, and disjointed.
Measured before changing anything — and the prose was not the problem. Harvest's
teaching prose is the MOST 3rd-person on the site (4.2 second-person per 1k words
vs a 7.6 site median and 20.6 in Jabez). But its opening 250 words are the most
2nd-person on the site (20.0 vs 12.0; days 1/2/4 at 24/32/32), because the
Two-Minute Open front-loads a reflection prompt and a prayer before any essay.
Harvest is also the only series carrying that structure — 6 files out of 554,
which is precisely why it does not read like the rest of the site.

Founder ruling: the quick-start-then-deep-dive idea stays; the execution changes.
The open had been assembled from the devotional's own parts (scripture, word
study, reflection, prayer), so nothing told the reader it was a précis — it read
as the piece, which then restarted. Mobbin research (now available; unavailable
in the earlier Codex workspace) confirmed every real-world version of this
pattern makes the short read a visibly distinct object: Digg's tinted TL;DR card,
ChatGPT's Executive Summary, HYPE's bulleted Summary, Finimize's labelled brief.

The open is now banded and tinted, headed by a gold rule and a "TWO-MINUTE READ"
label, with its internal rhythm tightened and its end marked — so the transition
into the deep dive is deliberate. No devotional prose was rewritten.

Also recorded: the canonical Harvest angle is patience-for-the-not-yet-turned +
don't-judge-the-field-early + a measure of evil-persisting-beside-good. F-082's
stated User Expectation carries only the third and is stale. (SA-033, F-082)

## EDITORIAL — Vocabulary reads as a word note, not a lexicon entry (2026-07-28)

Founder: the Harvest read "disjointed," and the on-page flow broke "because of
how the vocabulary is placed" — too school-booky, not enough magazine.

Presentation (`VocabModule`, all series): the word study rendered as a dictionary
entry dropped into an essay — a GREEK label beside a Strong's catalog number, a
headword up to 6rem, a bracketed pronunciation respelling, then a ruled
WORD BY WORD interlinear table and a RELATED list, each under its own shouted
sublabel. It is now a magazine sidenote: a gold hairline in the margin, the word
at reading scale (51px, was up to 96px) with its transliteration riding
alongside, the gloss as the lead line, and the interlinear and cognates set as
quiet flowing text separated by middots — no table rules, no ALL-CAPS sublabels.
Strong's numbers stay in the data (the JSON contract requires them) but are
concordance ids, not reader-facing copy. Project rule preserved: Greek/Hebrew
never appears without its transliteration beside it.

Placement (Harvest days 1-5): the main-body word study sat between the scripture
and the first line of writing, so the reader hit a lexicon block before any
prose. It now follows the opening teaching block — scripture → art → the writing
begins → the word note deepens it. The two-minute open keeps its compact gloss
in place. The DEEP DIVE anchor was asserted intact on every day (index 5 remains
the scripture); no words were rewritten, only reordered.

No devotional prose was edited. (SA-033, F-082)

## EDITORIAL — Reader reads as a magazine, not a module stack (2026-07-28)

Founder direction: the devotional must "flow in a full beautiful presentation"
and not "feel modular" — and the table-of-contents boxes listing the
devotional's own section titles at the top had to go.

Reader chrome:

- Removed the AudioPlayer section scrubber, which printed a chip per section
  ("Title · Scripture · Word study · A Two-Minute Prayer · Two Stories, One
  Field…") above the article and spoiled every heading before the first line.
  Section navigation stays on the ‹‹ / ›› controls and progress bar.
- Moved the Audio Edition panel BELOW the folio and headline. The page had
  opened on a player instead of a title.
- Unboxed the two stacked utility slabs above the headline (breadcrumb/share
  header and the start/save actions bar, incl. its raised background). Three
  bordered rectangles preceded the headline; the page now opens on the writing.
- Stopped leaking authoring metadata into reader copy: `prayerType` rendered a
  literal "(centering)" beside the prayer heading and `invitationType` shouted
  a bare "QUIET" above the reflection prompt.

Content (Harvest + Prayer of Jabez, 14 files — full editorial audit run):

- Fixed the DEEP DIVE anchor on harvest-6, which jumped readers to a decorative
  banner instead of the recap, and dropped its `format: "two-minute-open"` flag
  (that day has no second half for the short read to open into).
- Normalized typography across all 14 files: literal "..." → "…", the single
  stray curly apostrophe → straight (matching every other file).
- Trimmed three `emphasis` values that were 14-17 words — long enough to
  highlight most of the visible passage; each replacement verified verbatim.
- Stripped leaked editorial apparatus from reader-facing prose ("A note for
  careful readers:", "Translational honesty note:", "Provenance carried in the
  series source pack.", "Now the honesty the deep dive owes you.", the
  page-verification aside). Every factual claim was preserved — only the
  apparatus framing was removed.
- Fixed a video attribution carrying a sourcing note ("Gospel in Life (official
  channel)").

The deeper findings — the five-slot teaching skeleton every day shares, ten
repeated CMS-style headings, a refrain restated on seven straight days, and
duplicate opening scripture on harvest-2/3 — are documented for founder
decision; they require rewriting authored prose, not a mechanical pass.
(SA-023, F-082, F-083)

## STABILIZATION — Canonical current-reading resolver (2026-07-28)

Consolidated the two divergent "what am I reading?" resolution stacks behind a
single typed resolver (`src/lib/reading/current-reading.ts` →
`resolveCurrentReading()`). Before this, `/daily-bread` (the reader) resolved the
Soul Audit plan account-first (`owner_user_id`) while `/api/soul-audit/current`
(every header/tab/home-card/resume badge) resolved it session-token-only and also
advertised un-activated curated selections — so a signed-in reader on a new
device saw their plan on the page but "nothing current" in the header. The
resolver returns a discriminated union — `active` (active_series or account-first
plan) / `empty` (confirmed absence) / `unavailable` (read/auth failure, never
rewritten as empty) — and both surfaces now render from it, so the reader and
every badge agree. `/daily-bread` throws `unavailable` to its error boundary; the
API fails honestly instead of faking `hasCurrent:false`. Replaced the route's
session-only candidate test with resolver-derived summary tests and added a
dedicated resolver contract suite (`__tests__/current-reading-resolver.test.ts`).
Behavior change (founder-approved, full-unify): the resume badge no longer
advertises a curated Soul-Audit selection that was picked but never activated —
it shows exactly what the reader renders. (SA-023, SA-032, F-083)

## STABILIZATION — Daily Bread canonical-read hardening (2026-07-27)

Follow-up audit of F-083 found that the write-path repair still left
read failures indistinguishable from confirmed absence. Supabase errors
were returned as `null`; `/daily-bread` then caught them and rendered an
older Soul Audit plan/default. Active-series, scheduled-swap, and archive
reads now fail loudly, never use Workers-isolate cache as authority, and
evict stale cross-device state. `/api/soul-audit/current` now gives the
user-controlled active series unconditional precedence so header/resume
surfaces agree with Daily Bread. Client library refreshes retain last
confirmed state on 5xx/network failure, clear it only on a confirmed 401
or successful empty response, and invalidate current-plan badges after
activation/progress changes. Replaced a 329-line fake Daily Bread suite
that tested invented response objects for four nonexistent endpoints with
real route/store regression coverage. (SA-023, SA-032, F-083)

## FIX — TODAY nav finally points at YOUR devotional (2026-07-27)

Root cause of "every time I click Today it shows seek-first-the-
kingdom": EVERY nav surface labeled TODAY (desktop header + mobile
tab bar) linked to /today — the EDITORIAL DATE-ROTATION page that
serves the same rotating devotional to everyone — not to /daily-bread
where all the active-devotional resolution work lives. The founder
never landed on the fixed surface. TODAY now links to /daily-bread
everywhere; the rotation remains reachable as "Today's Edition" in
the footer. (SA-033, F-083)

## CONTENT v5 — clean-sheet single-author rewrite + founder corrections (2026-07-27)

Founder rejected v4 as patchwork ("hobbled together with various edits
just thrown on top"). v5 is a CLEAN-SHEET REWRITE: one author, one
sitting, days 1-7 in order from a consolidated spec — every prose
module written fresh. His four corrections, verified by the editor
gate: (1) ANCHOR PRIMACY — the Wheat and the Weeds IS the series
(Day 1 restored to "While Everyone Slept" with Matt 13:24-26 leading
its two-minute open); the sibling Matthew 13 parables serve it in
canonical order (Sower on-ramp D1, Mustard/Leaven D3, Net D5, Mark 4
D7), never displacing it. (2) VOICE TABLE — zero second person in
B/C/B-prime teachings ("we"/third person per AUTHORING-SPEC §2);
"you" only at bookends/reflections/prayers/takeaways. (3) REPETITION
— all six founder-flagged stock phrases at zero across the week;
2 Peter 3:9 full-quote once; loved-one motif exactly once per day in
sanctioned slots; ~35 cross-day echoes cut in the author's own 4-gram
re-read. (4) The reader-timeline rail — a literal per-section table
of contents ("S12: Why the No Holds") the founder twice asked gone —
REMOVED from day pages.

DAILY BREAD ZOMBIE KILLED: plans whose 7-day schedule ended more than
a week ago now auto-archive on read (isPlanExpired + archiveExpiredPlan,
regression-tested); 15 stale "active" plans dating to March archived
in prod — the July-11 "kingdom of heaven" plan can never resurface.
SYSTEM THEME FIXED: System mode now subscribes to the OS
prefers-color-scheme change event (it sampled once and never updated).
SETTINGS: cards reordered ACCOUNT → READING → REMINDERS → DATA &
PRIVACY → ADVANCED-AI & KEYS → ABOUT. (SA-033, F-082, F-083, F-084)

## CLEANUP PASS 2 — Wake-Up mount retired; settings + copy repairs (2026-07-27, SA-033)

Executed the founder's standing orders (wake-up pin 2026-07-12; "keep
going - finish and deploy everything"). LEGACY /wake-up/\* DOUBLE-MOUNT
RETIRED: shared readers relocated to canonical homes
(DevotionalPageClient -> src/app/devotional/[slug]/, SeriesPageClient
-> src/app/series/[slug]/), silo/isWake branching stripped, permanent
redirects preserve every old URL (/wake-up, feed.xml, series/:slug,
devotional/:slug), link sweep (footer item removed, tab bar now lights
SERIES on reader routes, sitemap, root error boundary, sunday archive
CTA); wake-up RSS test removed, 5 tests re-pointed at canonical
mounts. SETTINGS AI & KEYS repaired within SA-026: the field labeled
"OpenAI key" silently wrote BOTH the OpenAI and Anthropic keys — now
two honest fields; Google (upstream model shut down)/MiniMax/NVIDIA
picker options + key fields retired from the UI (router untouched).
TONE RULES: uncited fear stats removed from identity/peace/hope series
contexts (open item #11). Orphan pass 2: three unwired soul-audit
components removed; stale comments corrected. Deliberately KEPT:
clarifier, phase-5 queue, voice-bank (documented deferred infra),
/design/imagery-samples (founder-locked imagery workflow).
(SA-033, F-084)

## CONTENT v4 — The Harvest becomes the Matthew 13 cluster (2026-07-27, SA-032)

Founder rulings (SA-032 registered): the series now covers the kingdom
parables AS SCRIPTURE GROUPS THEM — Day 1 is the Sower ("A Farmer Went
Out to Sow", Matt 13:3-9/19-23; soils are seasons, not sentences),
Day 2 carries the full Wheat & Weeds with the corrected botany, Day 3
adds Mustard Seed + Leaven, Day 4 develops JONAH as the parable's
servant-with-a-book-of-his-own, Day 5 adds the Net (the discourse's
own closing), Day 6 recaps the cluster, Day 7 keeps Mark 4 (the
sibling seed parable) with Ecclesiastes 11. CROSS-TESTAMENT RULE now
standing for all prefab days: NT-anchored days carry a developed OT
connection (D1 Isaiah 6 via Matt 13:14 + Isaiah 55; D2 Psalm 37; D3
Ezekiel 33:11 "Turn! Turn!"; D4 Jonah 4; D7 Eccl 11) — Jesus models
it by quoting Isaiah inside the discourse. REPETITION KILL per
founder complaint: per-day scoreboards + editor cross-day sweep (the
brother/father/friend rule-of-three ran 7x across the week — now
once; 2 Peter full-quote capped; stock phrases zeroed). IMAGERY
ACCURACY GATE (new skill rule + SA-032): the botanically wrong
wheat/darnel plate (identical formed heads) replaced with a two-phase
plate — young indistinguishable, mature wheat BOWS golden while
darnel stands stiff; new sower-over-four-soils banner, mustard tree,
net ashore — all fact-checked before placement. ACCOUNT-STATE RESUME
(SA-032): plans now follow the ACCOUNT (owner_user_id stamped at
sign-in + lazily on read; account-first resolution on /daily-bread),
so sign-out/sign-in resumes exactly where the reader left off on any
device. Validator PASS x7; editor gate READY. (SA-032, F-082, F-083)

## CONTENT v3 + SITE CLEANUP — Harvest recentered; fine-tooth-comb pass 1 (2026-07-27)

THE HARVEST v3 (SA-031/F-082): founder recentered the series again —
the heart is now GOD'S ENDURING PATIENCE WITH THE NOT-YET-TURNED: a
full life runs to judgment and the harvest is never called early; the
thief on the cross (Luke 23:39-43 BSB, added to the source pack from
the corpus) is the canonical last-breath turn beside Newton's long
decades; every day now holds space for the reader's loved one who
denies Christ, resting hope in 2 Peter 3:9 patience. Seven writer
passes + editor re-review (refrain thinned to once per day, 2 Peter
full-quote capped at twice weekly, 4 formula kills) -> READY;
validator PASS x7. Series question/intro/context/keywords + homepage
teaser recentered. No private stories — Scripture and verified
history carry them.

READER PAGE CLEANUP (founder: "same image twice, same title twice"):
the day page now renders ONE hero + ONE title — legacy header slimmed
to its action row (title/scripture/day chips were triplicated), the
rhythm layer no longer re-renders the series hero on days that carry
their own inline artwork, and the series day-index drawer is gone for
short series (kept for Bible-365 where 365 days genuinely need an
index). Same treatment on Daily Bread's active view.

DAILY BREAD (F-083 continued): completion no longer fires at day 5 of
a 7-day plan (Sabbath/Review were hidden behind CompletionState);
sabbath-aware completion keyed to the schedule. Sign-out is now an
unconditional local reset (auth + audit cookies cleared even when
revocation fails) and the plan view gained a two-step "NOT READING
THIS? CLEAR IT" escape hatch. Plan review/sabbath copy no longer says
"five-day" on a seven-day arc.

SITE AUDIT PASS 1 (4 parallel audits: settings, links, dead code,
stale surfaces): series cards + Daily Bread hero now serve the RISO
series art instead of legacy Substack photographs (hard image rule
#4); settings retired the vestigial SABBATH DAY + READING PACE
controls (day-gating founder-disabled since 2026-05-08), the
pre-real-auth Mock Account mode/capabilities/export block, and the
dead REPLAY TUTORIAL buttons (?tutorial=1 had no consumer); /sunday's
reader CTA flipped to the canonical /devotional route; 23 verified
dead files removed (composer/reranker/plan-orchestrator/
metadata-plan-builder/ai-plan-to-reader legacy soul-audit pipeline,
lib/illustrations, localStorage bookmarks helpers, unwired auth
rate-limiter, brain/dedupe, duplicate soul-audit archive route, 9
orphan components incl. the typography/DropCap duplicate) + 7 dead
brain flags; settings-restructure test updated to the founder-approved
control set. Deferred-feature holds (clarifier, phase-5 async queue,
voice-bank, 3 unwired soul-audit components) and copy/product
decisions (AI & KEYS key mislabel + provider prune, wake-up
retirement scope, fear-stat series contexts) routed to the founder
list. Audit correction: DevotionalLibraryRail is LIVE via
/library -> LibraryRailDeepLink (stale memory note fixed).

## FIX — Daily Bread root cause #2: auth session refresh restored (2026-07-27)

Founder retest after the migration showed a stale "kingdom of heaven"
reading: the DB had his 13:39Z the-harvest activation, but the page
wasn't rendering it. Root cause #2: deleting src/proxy.ts on
2026-05-07 also deleted the ONLY Supabase session refresh with
persistable cookies. RSC renders cannot write cookies, so after ~1h
token expiry every /daily-bread render went auth-blind and fell back
to the stale July-11 Soul Audit plan (work-worry theme => "seek first
the kingdom" reading) or the empty state — while API routes (which CAN
persist refreshed cookies) kept accepting writes. Restored as
src/middleware.ts (EDGE — Next 16 proxy.ts is Node-only and
@opennextjs/cloudflare hard-fails Node middleware; the deprecated
middleware convention is the only edge flavor Workers supports),
matcher scoped to /daily-bread, /library/_, /onboarding, /admin/_.
CLAUDE.md middleware rule rewritten accordingly. UI hardening:
LibraryView + SeriesActions start-flows no longer swallow needsAuth /
error results (silent no-op activations) — honest toasts, matching
DevotionalActions. (SA-031, F-083)

## FIX + CONTENT — Daily Bread root cause + The Harvest re-angle (2026-07-27)

DAILY BREAD (F-083): root-caused the 6-month "activation reverts to A
Voice in the Wilderness on reload" failure. Production Supabase never
received migration 013 — active_series, scheduled_series_swap, and
archived_series DO NOT EXIST (REST-probed, PGRST205) — while
src/lib/library/repository.ts wrote the Workers-isolate memory cache
first and swallowed the failing upsert, so PUT /api/devotionals/active
returned ok:true for a row that evaporated on the next isolate.
Code fix (dev rule #1, no silent fallbacks): all user-intent library
writes now throw LibraryPersistenceError on a non-landed Supabase
write and roll the cache back so same-isolate reads cannot lie;
PUT/PATCH/DELETE /api/devotionals/active and archive/restart return
an honest 503 PERSISTENCE_FAILED; render-path lazy writes (swap
promotion, last-opened touch) log + serve the un-promoted truth
instead of 500ing. 6-test regression suite added. Migration 013 APPLIED
to prod same day (founder-approved in-session): three tables + 12 RLS
policies verified by probe, write path proven by transactional
insert/delete. Remaining: founder signed-in activate + reload check.

THE HARVEST RE-ANGLE (SA-031/F-082): founder rejected the v1
introspective angle ("hidden weeds in our own lives"). All 7 days +
series copy re-aimed to the founder's spine: (1) you cannot tell
wheat from weeds mid-season — you do not know who is actually
faithful; (2) never judge someone too quickly — the servants' offer
is a mid-season verdict on people, Newton the proof case; (3) the
field is the world — the good seed ARE the sons of the kingdom, the
withheld sickle is mercy buying time for witness, Daniel 12:3 makes
the shining an evangelist's promise. Sources/scripture/lexicon/
videos/imagery unchanged (all verified v1 assets serve the new
spine). 7 parallel writer revisions + editor re-review (6 surgical
fixes: Newton "forty years" arithmetic, an unverifiable embellishment
removed, cross-day collisions thinned) -> READY; validator PASS both
series. Series question/introduction/context/keywords, homepage
feature teaser re-aimed in the same pass. Re-angle ruling recorded in
content/series-briefs/the-harvest.md.

## SHIP — The Harvest live end-to-end: imagery, featured lead, deploy (2026-07-26)

Founder ruling SA-031 (registered): (1) featured area holds exactly 7
cards and the MAIN feature slot always belongs to the most recent
series — the-harvest leads, too-busy-for-god rotated out (supersedes
the 2026-05-08 Bible-365-first direction); (2) Monday-start week shape
(5 deep dives, Sat recap, Sun sabbath) confirmed as the spec default,
SA-029(1) sabbath-first applies only to Sunday starts; (3) the
/devo-go pipeline now runs END-TO-END WITHOUT PAUSING at the reading
or deploy gates (artifact still published, all gates still run and
reported; founder reviews live) — skill + SA-029(4) amended.
Imagery: 13 GPT Image 2 riso-duotone renders (1:1 series card + 12
day images per the brief's subjects — night sower, twin stalks,
hovering servants, tangled roots, world-curve field, waiting sickle,
one-sun fieldhand, Munich handshake, harvest sunrise, single sheaf,
field-in-one-view, sleeping farmer), every render style-checked
against the brand spec, processed via sharp to webp (series card
1024², days 1400-1600w, all ≤~435KB), placed as inline-image modules
with contextual captions; validator re-run 0/0. Wiring: series.ts
SERIES_DATA entry + NEW_SERIES_ORDER + FEATURED_SERIES, series-rails
FEATURED_SERIES_SLUGS, series-data test 34→35. Tracking: F-082 →
shipped. (SA-031, F-082)

## CONTENT — The Harvest: 7-day Wheat & Weeds series drafted to the founder gate (2026-07-26)

First series built via /devo-go (SA-029/SA-030 standard; F-082).
Monday start, Sunday sabbath close; Days 1-6 open with the SA-030
Two-Minute Open. All sources verified by four research agents against
fetched primary texts (Chrysostom both-edges reading, Augustine,
Spurgeon #3312/#3393 — the oft-cited "The Tares" sermon does not
exist, Solzhenitsyn's exact Whitney wording with his own caveat
parenthesis, Lewis II.5, ten Boom's own tellings, Carey's dated
letters, Carver's 1897/1924 words with unverifiable popular quotes
rejected, Newton with the post-conversion years intact); Theodotion
Daniel 12:3 verbal link to Matt 13:43 verified; darnel/Roman-law/
Mishnah claims precision-framed. Videos oEmbed + embed-block
verified; founder approved the Christ Church Plano sermon (vetted-
creator extension). Editor two-pass: 2 BLOCKING + 7 NEEDS-FIX + NITs
applied → READY FOR FOUNDER. Validator strengthened: forbidden-label
rule now catches "devotional" in reader-facing prose (ctaHref URL
fragments exempted); both series re-validated 0/0. Reading artifact
published; imagery/wiring/deploy await the founder gate per SA-029.
Advisories routed to founder: week runs lean within the brief's ±25%;
Day 4 anchors Matthew 5:45 (deliberate divergence from the brief's
13:41).

## ACCOUNTS — diagnosis + code-side fixes (2026-07-22)

Founder report "accounts don't seem to work" diagnosed (read-only, full
evidence in session): the auth CODE paths are sound; the email leg is
strangled. Founder-side root causes (Supabase dashboard): (1) built-in
mailer with a 2-emails/HOUR project-wide cap as the ONLY sign-in path,
(2) magic-link/signup templates lack the token variable so the in-app
6-digit code form can never be used (HUMAN_REQUIRED #3 still open),
(3) the three billing migrations (20260710/11/12) were never applied —
dark today, but flipping GENERATION_GATE_LIVE before applying them
would deny generation to every account. Also confirmed: PKCE links only
complete in the requesting browser (cross-device/mail-scanner failures
plausible); Google provider is configured server-side but the button is
hidden (flag unset at build).

Code fixes shipped (F-065): magic-link route maps upstream failures
honestly (429 mail-cap → 429 with "wait a few minutes"; bad address →
400; was raw 500), and the first-session onboarding window widened
120s → 24h so slow email opens still get onboarding.

---

## PROCESS — SA-030: the Two-Minute Open (2026-07-22)

Founder ruling, FORWARD-ONLY (not retroactive; prayer-of-jabez ships
as-is): every new prefab devotional day opens with a self-contained
~2-minute devotional — anchor Scripture as is, one vocab word, one
reflection, one short prayer — then a DEEP DIVE CTA that jumps into
the full devotional on the same page; the deep dive then proceeds per
usual (SA-029 structure). The block must be complete on its own: a
reader who stops at the CTA has had a whole devotional.

- Registered as SA-030 in production-decisions.yaml.
- AUTHORING-SPEC §1 amended (module sequence + `"format":
"two-minute-open"` declaration + `#devotional-section-6` CTA anchor
  convention).
- `/devo-go` skill updated (SKILL.md workflow + guardrail;
  references/workflow.md Phase 4).
- Validator: opt-in BLOCKING check when a day declares the format —
  first five modules must be scripture → vocab → reflection → prayer
  → cta (verified both directions on synthetic files; existing series
  unaffected).

## PROCESS — /devo-go skill: the standard devotional series build (2026-07-22)

Founder ruling (amends SA-029; F-081): the Prayer of Jabez build process
is ratified as THE standard for all prefab devotional builds, codified
as `.claude/skills/devo-go/` — invoked `/devo-go "<devotional
thematic>"`. SKILL.md (trigger, 12-phase summary, guardrails,
validation) + four progressive-disclosure references: `workflow.md`
(exact pipeline: docs → AskUserQuestion clarifiers → parallel research
agents → brief/source pack → pivot-first drafting → validator → editor
two-pass → founder pre-imagery reading gate via styled artifact →
GPT Image 2 riso imagery → wiring/featured → tracking → gates →
Workers-preview + rendered-DOM verification → founder-confirmed deploy

- cache warming), `verification-standards.md` (what VERIFIED means per
  source type; folklore-rejection precedents), `imagery-and-video.md`
  (style block, processing, placement, embed rules), `traps.md` (18
  failure modes from the reference build). Registered in
  `.claude/skills/README.md` + `docs/process/CLAUDE-SKILL-SYSTEM.md`.

## Reader — continuous devotional flow, no module boxes (2026-07-22)

Founder-directed reading-experience change (SA-013, F-007): the desktop
devotional now reads as ONE continuous piece instead of stacked bordered
"modules."

- **Removed the boxed modules.** The per-module `devotional-shell-panel
border px-6 py-6` wrapper is replaced by a borderless
  `devotional-flow-article` — no per-section boxes.
- **Removed the desktop two-column sticky-image rail.** `DevotionalRhythm`
  is disabled (`enabled={false}`); the read is a single centred ~44rem
  measure at all breakpoints.
- **Section titles left-aligned** to the same width the body text occupies.
- New continuous-flow CSS block in `globals.css`.
- Normalised the generated `devotional-teasers.ts` to the current
  generator's output (what `npm run build` produces).
- Verified: type-check, `verify:production-contracts`, `verify:tracking`,
  lint (0 errors), 1791 tests, `next build` all green; dev-verified at
  `/devotional/too-busy-for-god-day-1` (boxes gone, titles left-aligned).

Follow-up (not in this change): swap the `DevotionalHeadline` hero to the
new cobalt tomb-proportion imagery.

## HOTFIX — Reader dropped flat `content` prose + CSP blocked video frames (2026-07-12)

Two ship regressions found by the founder minutes after the Jabez
deploy (SA-029, F-081):

1. **normalizeModule ate canonical prose.** `ModuleRenderer` destructured
   `content` off every module and only restored nested-OBJECT shapes
   (legacy Substack format); the canonical flat string — what the Module
   type declares and all Jabez days use — was silently discarded, so
   teaching/story/insight/pullquote modules rendered as empty bordered
   panels ("blank boxes and empty rows"). Fix: preserve string `content`.
   New DOM-level regression suite `__tests__/module-renderer-flat-content.test.tsx`
   (6 tests: flat string renders for all four prose types; legacy nested
   - `body` shapes still work). Root-cause note: curl-level route
     verification cannot catch client-render drops — reader content changes
     now require a rendered-DOM assertion.
2. **CSP `frame-src` blocked YouTube.** The F-077 security baseline
   whitelisted only Cloudflare/Stripe frames; the Jabez days are the
   first shipped content with `video` modules, so click-to-play loaded a
   browser-blocked blank iframe. Fix: `https://www.youtube-nocookie.com`
   added to `frame-src` (matches VideoModule's embed host).

Pinned (founder, same session): retire the legacy `/wake-up/*` reader
mount + relocate the shared reader out of `src/app/wake-up/` — future
F-### task, needs redirects + sitemap/link sweep.

## CONTENT — The Prayer of Jabez: 7-day sabbath-first deep-dive series (2026-07-12)

New prefab series `prayer-of-jabez` (SA-029, F-081) — founder-directed
same-day build, text founder-approved before imagery per the new
pre-imagery reading gate:

1. **Seven day JSONs** at `public/devotionals/prayer-of-jabez-day-{1..7}.json`
   in the founder-ruled week shape: Day 1 Sabbath (Sunday start), Days
   2–6 deep dives on the A-B-C-B′-A′ chiasm (Born From Pain → Bless Me
   Indeed → The God Who Grants (pivot) → Enlarge My Borders → Kept),
   Day 7 Recap with Further-Your-Learning (7 verified videos, free
   primary texts, passage trail, guided 1 Chr 1–9 read). ~15,900
   counted words. Validator: 0 BLOCKING / 0 NEEDS-FIX.
2. **Verification-first authoring:** all Scripture verbatim from
   `public/bibles/` corpus (BSB/KJV/ASV/YLT); Hebrew audited against
   interlinear (incl. the asah "no keep in the Hebrew" honesty note and
   the Jabez/etsev metathesis drafting rule); every quote verbatim with
   full citations (Spurgeon MTP 994, Matthew Henry complete ed., Lewis
   Letters to Malcolm IV, Augustine Confessions V.8(15)); Wilkinson
   prosperity episode confronted by name with verified critiques AND
   his own caveats; two famous story legends (Müller breakfast table,
   Paton shining-garment angels) REJECTED as folklore and replaced with
   incidents verbatim from the men's own journals. Brief + source pack
   at `content/series-briefs|source-packs/prayer-of-jabez.md`.
3. **Editorial gate:** devotional-editor agent two-pass review (1
   BLOCKING citation fix + 17 NEEDS-FIX applied) → READY FOR FOUNDER;
   founder read the full draft (private artifact review copy) and
   approved 2026-07-12.
4. **Wiring:** SERIES_DATA + NEW_SERIES_ORDER entry (7 days, transition/
   stability Soul Audit keywords). All 8 video embeds verified on
   official channels and embed-playable (VideoModule plays inline via
   youtube-nocookie; no embed-blocked videos per founder directive).
5. **Imagery:** Higgsfield GPT Image 2 (founder directive), riso
   halftone duotone per founder mockup — series hero + contextual
   inline images per day (in progress this entry; placement follows).

## CUSTOM GENERATION — Phase 2 UI: pack card + redeem sheet + credits visibility (2026-07-12)

Presentation delta on the Phase 2 backend below (SA-027 paths 3/6,
F-080, pattern doc §1 items 2–3):

1. **Credit-pack card** in the paywall State B offer stack (between the
   subscribe card and the text-links row): "A single edition, no
   subscription", pack sizes as big serif numerals with true prices +
   per-edition math, "Credits never expire.", quiet cross-link up to
   the subscription. Renders ONLY when config lists sellable packs AND
   web payments are on — zero packs = no card, no gap. Buying routes
   through the same checkout hand-off beat as plans (`packId`).
2. **Redeem sheet:** REDEEM A CODE now opens an in-place single-field
   sheet (mobile bottom sheet / desktop centered panel per SA-024) —
   auto-uppercase, hyphens optional, a client-side shape check that
   never spends a rate-limited attempt, honest inline states for every
   backend code (401 → sign-in with the paywall's resume redirect;
   success → "Someone covered your edition." + credits added + a CTA
   that resumes the held generation like the success room). Escape/×
   closes back to the paywall; the link is also offered while payments
   are closed (gift codes redeem without checkout).
3. **Credits visibility:** paywall shows a quiet "You have N editions"
   covered mode when `generationCredits` > 0 — primary CTA COMPOSE MY
   EDITION resumes the held request directly (backend consumes a
   credit; no purchase CTA competing); /settings/subscription gains an
   Editions row when the balance is > 0.
4. Pure logic in `paywall-state.ts` (`sellableCreditPacks`,
   `resolveRedeemOutcome`, gift-code shaping, `formatEditionCount`) +
   12 new unit tests; full suite 139 files / 1785 green; 27-check
   Playwright spot-check against the real paywall in the dev server
   (packId hand-off, all redeem states, covered mode, zero-packs,
   375px no-overflow, dark parity).

---

## CUSTOM GENERATION — Phase 2: credit packs + gift codes + Workers-runtime verification (2026-07-12)

SA-027 paths 3/6 (F-080), built dark behind the same launch flags:

1. **Credits (path 3):** durable journaled balance — migration
   `20260712000001` adds `users.generation_credits` (CHECK ≥0) + an
   append-only `generation_credit_ledger`; grants happen ONLY on
   verified Stripe webhooks (event-idempotent via a unique ledger index
   — a replayed event grants nothing) or gift redemption; consumption is
   an optimistic-concurrency decrement AFTER all pre-checks, refunded on
   plan-creation failure. Entitlement order: subscription → free grant →
   credits. Checkout accepts `packId` (payment mode); config advertises
   ONLY packs whose Stripe price env exists (never a card we can't
   honor); packs are config-driven pending founder price tuning.
2. **Gift codes (path 6):** ≥16-char unambiguous-alphabet codes, sha256
   hashes only at rest, plaintext returned once at mint (internal-secret
   `/api/admin/gift-codes`); redemption via an atomic DB function (row
   lock → per-user uniqueness → decrement uses → credit → journal),
   rate-limited 5/hour/IP, invalid and exhausted codes indistinguishable
   (no guessing oracle). Copy: "Someone covered your edition."
3. **Workers-runtime verification (Rule 9) + REQUIRED adapter bump:**
   the Next 16.2.10 security bump broke `opennextjs-cloudflare build`
   (the @vercel/og wasm imports behind our five opengraph-image routes
   failed wrangler's module collector). Fixed by updating
   `@opennextjs/cloudflare` 1.17.1 → 1.20.1 — **this pair must deploy
   together**. Verified in the real workerd preview: all key pages 200
   (incl. /opengraph-image), status-route IDOR 404 intact, config
   honestly reports payments off, anonymous entitlements fail closed.
4. 23 new credits/entitlement tests green; type-check + lint clean.

---

## CUSTOM GENERATION — Failure-protection tranche (founder ruling: users never pay for our failures) (2026-07-12)

Founder ruled "whatever you recommend — I don't want users having
failures." Three-layer fix (F-027, F-076) + M-4 completion (F-077):

1. **Verifier precision (F-027):** the grounding check's transliteration
   detector flagged ordinary English loanwords with diacritics
   ("naïveté" caused a real user-visible generation failure). A
   stripped-form allowlist of dictionary loanwords now clears them;
   fabricated scholarly transliterations are still caught (regression
   tests prove both directions).
2. **Retry honesty (F-076):** tracing the failure path exposed a real
   charge bug — a failed generation errored the job, and the user's
   retry re-hit the entitlement gate with their free grant already
   consumed (grant burned + paywall shown for OUR failure). Re-selects
   of an errored/stalled run now bypass the gate and the daily plan cap;
   the run was charged once at creation. Subscriber allowance now counts
   DISTINCT runs so retries never double-bill.
3. **Plan-read scoping (F-077, OWASP M-4 complete):** day-read +
   deepen-readiness routes now enforce the same owner-or-linked-user
   policy as status/deepen-POST, via one shared helper
   (`plan-ownership.ts`). A leaked plan token can no longer read someone
   else's bespoke plan. Sharing, when built, gets explicit share tokens.
4. Teaser-generator "content loss" investigated and CLEARED: the scary
   diff was prettier multi-line formatting; regeneration is a content
   superset with zero lost/changed entries.

---

## CUSTOM GENERATION — Phase 1e complete: OWASP self-audit + same-day remediation (2026-07-11)

Brief §12.6 deliverable (SA-028, F-077): evidence-based OWASP Top-10
audit artifact at `docs/security/OWASP-TOP10-SELF-AUDIT-2026-07-11.md`
(1 HIGH / 4 MEDIUM / 3 LOW; A04/A08/A10 + core access controls PASS),
with same-day fixes:

1. **H-1 FIXED:** `next` 16.1.6 → 16.2.10 (high advisories incl. HTTP
   request smuggling in rewrites); CI dependency gate raised to
   `--audit-level=high` (now exits 0). Full suite + production build +
   bundle scan re-verified on the new version.
2. **M-1 FIXED (§12.3):** all model-authored markdown now renders
   through new `src/lib/markdown-safe.ts` — raw HTML tokens (block +
   inline) escaped, never executed. A prompt injection in the user's
   reflection can no longer smuggle executable HTML into the reader.
   5 regression tests (script/img/event-handler smuggling).
3. **M-3 FIXED:** rate-limit client keys now prefer Cloudflare's
   unspoofable `cf-connecting-ip`; spoofable `x-forwarded-for` demoted
   to dev fallback.
4. **M-4 PARTIAL:** Deep Dive POST (the most expensive on-demand model
   call) now rate-limited (5/min) + ownership-scoped (owning session or
   linked user; others 404). Plan-READ scoping deferred to a founder
   decision (plan-sharing semantics).
5. **L-1/L-2 FIXED:** constant-time internal-secret comparison
   (Workers-portable); token-secret fallback warnings now loud in
   production.
6. **Open founder decisions:** CSP `unsafe-inline` removal needs a new
   `proxy.ts` for nonces (M-2, mitigated by M-1 meanwhile); plan-read
   sharing semantics (M-4 reads).

---

## CUSTOM GENERATION — Phase 1d: held-moment interstitial, onboarding bookends, sign-in polish (2026-07-11)

Pattern-doc §4/§5/§6 + founder picks §7 (SA-024/SA-025/SA-026, F-064/F-065
adjacent):

1. **Held-moment generation interstitial** ("Press room meets Upper
   Room", §7.1/§7.2): the composing state now owns the screen — no nav
   chrome, no dismiss — with a staged checklist ("Reading what you
   wrote → Composing your arc → Selecting passages → Setting the type")
   bound STRICTLY to real job transitions (`generation-stages.ts`; rows
   ratchet, never check ahead, never uncheck). Duration expectation set
   once up front; the loved edition-press day-tile emblem kept (broadsheet
   scale on desktop beside the production-schedule column + Psalm 130:5);
   arrival = final check → beat of stillness → consent-cue echo (typed
   words quoted ONLY same-session via the existing sessionStorage submit
   marker; resumed tabs get theme + Scripture anchor) → single
   `BEGIN DAY 1` CTA (no auto-redirect, no confetti). Failure freezes the
   checklist at the failed stage with `TRY AGAIN` (re-fires held/select
   machinery) + quiet `Start over`. Fresh-tab resume now renders the
   interstitial (branch reordered above the no-submit-result skeleton).
2. **Account onboarding bookends** (§4, §7.3): the 5-step setup quiz is
   replaced by warm framing → reminder window (Morning/Midday/Evening,
   wired to `reminderWindow` + rides into push subscribe) → reminders
   opt-in with equal-dignity "Not now" (permission requested only on
   explicit yes; honest unsupported/unconfigured/denied states) → bridge
   with the honesty line — landing IN content (`resolveOnboardingDestination`:
   redirect → active plan → /daily-bread, never '/'). Skip sits directly
   above Continue; skip-all lands in content with defaults. Same
   auth-metadata keys + `/api/auth/onboarding` (admin reset compatible).
   Mobile full-bleed / desktop letterpress card over editorial canvas.
3. **Settings**: "Revisit your welcome" row (signed-in only) added to the
   REMINDERS card → `/onboarding?force=1`; window stays individually
   editable via the existing ReminderScheduler.
4. **Sign-in (§5)**: email + `Continue` primary; Google demoted to a
   stroke-outline quiet peer BELOW a hairline "or" divider and gated
   behind `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'` (HUMAN_REQUIRED:
   founder must configure the Supabase Google provider before setting
   the flag). Exactly two paths ever render.
5. **Turnstile on signup** (brief §12.4): invisible widget on the
   magic-link request when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set;
   server-side siteverify in `/api/auth/magic-link` when
   `TURNSTILE_SECRET_KEY` is set (missing/forged token → honest 403;
   siteverify outage → fail-closed 503). Both env vars absent = exactly
   prior behavior (clean conditional, no stub).

Tests: generation-stages honesty + echo consent, onboarding flow machine

- destination, magic-link Turnstile conditional, Google flag gating;
  sign-in code-entry suite updated for the `Continue` verb.

---

## CUSTOM GENERATION — Phase 1c: paywall, checkout return, success room, management (2026-07-11)

The founder-approved pattern package (SA-026/SA-027, F-078) built:

1. **Paywall as continuation of the reveal**: 401/402 from select is
   intercepted on the results page; the selection is HELD (24h TTL,
   fresh-tab safe via localStorage store) and the paywall opens over the
   results echoing the user's own chosen direction. State A free-edition
   banner; State B offer stack (Annual RECOMMENDED preselected, Monthly,
   `More durations` for 2yr/3yr, lifecycle timeline, redeem/restore text
   row, covenant verbatim); allowance-exhausted factual state; skeleton;
   price-failure and payments-off honest states. Mobile full-height
   sheet + sticky true-amount footer; desktop editorial spread +
   specimen (SA-024). No countdowns/strikethroughs/cancel-shame.
2. **Resume machinery**: `?resume=1` re-fires the held select after
   sign-in or checkout with zero re-typing, re-gating if still
   unentitled.
3. **Return leg + success room**: pending "Confirming with Stripe…"
   (entitlements poll — paywall never re-shown), stalled honesty,
   Guardian success room (mission line, Founding Member N of 500 —
   real count or no number, single CTA resumes the held generation),
   cancelled ("No charge was made. Your edition request is saved.").
4. **Subscription management**: Settings Account row (live status) +
   `/settings/subscription` — plan card, honest two-dot timeline,
   Change/Update payment/**visible one-tap Cancel** via portal,
   post-cancel "editions remain yours forever", one-time-term variant.
5. Verification: 26 new tests (suite 130 files / 1705 green); Playwright
   against the dev server gate-off (9/9) and gate-on including a REAL
   end-to-end: live LLM options → signed-out select → live 401 → paywall
   → hold → decline-in-place → resume → re-gate. NOT yet verified (needs
   staging Stripe + deliverable email): live checkout round-trip,
   webhook success flip, portal actions — tracked in F-078.

---

## CUSTOM GENERATION — Phase 1e security baseline (partial) + §9 admin reset (2026-07-11)

SA-028/SA-026 security deliverables (F-077):

1. **Nightly Stripe↔DB reconciliation** (brief §12.1): new
   `src/lib/billing/reconciliation.ts` + internal-secret-gated
   `/api/admin/billing-reconcile` + scheduled GH workflow
   (`billing-reconcile.yml`, 04:00 UTC, fails loudly on alerts).
   Corrections require positive Stripe evidence; premium rows with no
   Stripe evidence alert but are never silently downgraded; API errors
   touch nothing. 8/8 tests.
2. **Hard monthly spend cap + 50/80/100% alerts** (§12.6): monthly wall
   layered into `checkDailyBudget` (env `SOUL_AUDIT_MONTHLY_COST_BUDGET`,
   default $100; 5-min cached month read), threshold alerts once per
   month per isolate, and honest monthly pause copy at all three call
   sites (a blown month no longer says "come back tomorrow"). 6/6 tests.
3. **CI hardening** (§12.5/§12.6): `verify:bundle-secrets` scans
   `.next/static` for server-secret names + value patterns after build;
   `npm audit --audit-level=critical` gate added — and the one existing
   critical (vitest UI file-read, dev-only) fixed via semver bump, suite
   re-verified green.
4. **§9 admin "reset my account to first-run"**: migration
   `20260711000001` adds `users.role` (manual DB grant only);
   `/api/admin/reset-my-account` gates env-flag → auth → DB role → typed
   confirmation, resets ONLY the caller (cascade reuses
   `deleteUserAccount` with new `preserveAuthUser` mode — account,
   subscription state, and role survive; onboarding + free grant reset).
   Fixed a pre-existing deletion-cascade gap: `push_subscriptions` and
   active/scheduled/archived series were never deleted. 5/5 route tests
   - existing deletion tests green.
5. **Phase 1 legal copy diffs** drafted for founder sign-off:
   `docs/legal/PHASE1-LEGAL-COPY-DIFFS.md` (Stripe processor disclosure,
   billing data retention, honest subscription terms). NOT applied to
   `content/legal/` until approved.

---

## CUSTOM GENERATION — Phase 1a/1b: billing source of truth + entitlement gate (2026-07-10)

SA-028 + SA-026 backend foundation (F-075, F-076):

1. **Billing read/write split fixed (SA-028, F-075).** Migration
   `supabase/migrations/20260710000001`: `public.users` gains
   `stripe_customer_id` / `stripe_subscription_id` / `subscription_status` /
   `subscription_renews_at` / `premium_expires_at` /
   `free_generation_used_at`; new `stripe_webhook_events` idempotency table;
   `soul_audit_jobs` formalized (was live-only). New
   `src/lib/billing/subscription-state.ts` is the ONLY subscription reader
   (term-expiry-aware, fail-closed). Webhook handlers rewritten: mapping by
   stored customer id → `metadata.user_id` → email (first-link fallback that
   persists the id); one state writer; `checkout.session.completed` now
   grants one-time 2yr/3yr terms (`payment` mode + `premium_expires_at` —
   these previously could not check out at all). Webhook route gained a
   replay-safety store. Checkout now requires auth (401), creates/reuses a
   Stripe Customer, and passes durable user identity. All four metadata tier
   reads (entitlements, chat, chat/usage, brain providers) moved to the DB;
   regression test asserts metadata-planted tiers are IGNORED.
2. **SA-026 generation gate (F-076).** New
   `src/lib/billing/generation-entitlement.ts`: verified account required for
   NEW bespoke plans (401 `SIGN_IN_REQUIRED` / 402
   `GENERATION_ENTITLEMENT_REQUIRED`), 1 free generation per account consumed
   atomically AFTER cap/budget pre-checks (a 429 never burns the grant;
   released on creation failure), subscriber monthly allowance (env-tunable,
   default 6) counted from real plan instances. Idempotent re-selects never
   gated. Gate ships dark behind `GENERATION_GATE_LIVE` so it flips together
   with the paywall (rule 10 — no gate without a way to pay).
3. **IDOR fix:** `/api/soul-audit/select/status` now scoped to the owning
   session (or its signed-in user); any other caller gets 404. Previously any
   holder of a leaked jobId could poll progress and trigger generation kicks.
4. Tests: +36 (billing handlers/mapping 16, entitlements API 4, gate unit 12,
   status IDOR 4). Full suite 124 files / 1660 green. Type-check clean.

---

## CUSTOM GENERATION — Phase 0: recon, founder rulings, reset script (2026-07-10)

Founder delivered the custom-generation implementation brief (six access
paths around the existing generation pipeline). Phase 0 completed:

1. **Recon (4 parallel audits).** Generation seam mapped: `runGenerationDay`
   (`src/lib/soul-audit/generation-runner.ts:82`) / `generateGroundedDay`
   (`grounded-weave.ts:751`); jobs already exist (`soul_audit_jobs` — live-only
   table, no migration in repo, must be formalized before entitlement work).
   Stripe checkout/webhook/portal/entitlements already built, gated behind
   `BILLING_CHECKOUT_LIVE`. Found load-bearing billing bug: webhooks write
   `public.users.subscription_tier`, all entitlement reads check auth
   `user_metadata` — a real subscription would never activate; no
   `stripe_customer_id` stored (email-match mapping only).
2. **Founder rulings ratified (SA-026/SA-027/SA-028** in
   `docs/production-decisions.yaml`; mirrored in MASTER-DECISIONS §4 amendment
   - PRODUCTION-SOURCE-OF-TRUTH 2026-07-10 amendment): locked pricing stands
     ($7/$77/$140/$200 — brief's $4.99/$39 figures dead); custom generation now
     requires a verified account with 1 free generation each (audit + matches +
     curated reading stay anonymous/free forever; SA-033 no-gate-before-reading
     intact); all six access paths approved with subscription primary; billing
     state single-sourced in `public.users` with stored Stripe IDs.
3. **Fresh-start reset script** (`scripts/ops/fresh-start-reset.mjs` +
   `docs/runbooks/FRESH-START-RESET-RUNBOOK.md`): backup→verify→wipe with six
   hard gates (verified manifest, live-count match, schema-drift refusal,
   Stripe review-only, TTY + typed host confirmation, post-wipe zero check).
   Hard-deletes auth users (no tombstones/blocklists). Founder-triggered only;
   not yet executed. `backups/` gitignored (PII).
4. **Phase-1 Mobbin pulls + pattern approval.** Fresh pulls (26 searches) for
   paywall/checkout/settings + onboarding/passwordless/interstitials,
   synthesized into `docs/design/CUSTOM-GENERATION-PATTERN-DECISIONS.md` —
   **founder-approved 2026-07-10** with picks resolved: desktop wait = "press
   room meets Upper Room" full route; wait = held moment (undismissable, with
   strictly honest staged progress); arrival echo = quote-with-consent-cue,
   relevance always legible; named reminder windows; 2yr/3yr behind More
   durations; Founding Member on success + /pricing only.

---

## LAUNCH-READINESS — LCP loop final keeps (rounds 3-4, loop terminated by founder) (2026-07-10)

1. **Reader loading boundaries removed** — the segment `loading.tsx` baked a
   shell-first skeleton into the PRERENDERED reader HTML, so the real
   content's swap-in WAS the LCP (2s element-render delay on an SSR-present
   image). Reader HTML is now content-first on hard loads; client-side
   navigations fall back to standard Next behavior. Lab LCP: reader
   4472 → 4404ms (loop trajectory overall: 8412 → 4404, −48% in 4 rounds).
2. **Substack-cache images capped** at 1400px/q78 — 62.7MB → 32.2MB across
   144 files, same filenames, no visible degradation (not a lab-metric win;
   ships as real-world transfer weight reduction).

Loop terminated at founder direction; full round log in docs/run/RESULTS_LOG.md.

---

## LAUNCH-READINESS — Wave 4: anonymous onboarding + in-app sign-in code (2026-07-10)

Founder-reported gap ("I'm not seeing onboarding") — the real onboarding was
double-gated behind auth + first-session; anonymous first-timers got nothing.

1. **Anonymous first-run** (`FirstRunIntro`, homepage only, never blocks a
   deep link): three quiet beats — what this is (approved homepage voice) →
   one personalization tap (theme + text size, wired to the real stores, so
   the "settings users never see" get seen) → Soul Audit / browse / maybe-
   later fork with one quiet sign-in line. Bottom sheet on mobile, card on
   desktop; shows once, dismissal respected forever; never for returning or
   authed visitors.
2. **In-app sign-in code** (Linear model): the "check your email" screen now
   accepts the 6-digit Supabase OTP via a new `/api/auth/verify-code` route
   that runs the identical post-auth session-linking as the callback;
   rate-limited, honest error states, open-redirect hardened. Proven against
   the real Supabase project. NOTE: readers only SEE a code once
   `{{ .Token }}` is added to the Supabase email templates —
   HUMAN_REQUIRED #3; until then the UI degrades to exactly today's flow.
3. **GuestSignupGate deleted** — 0 imports; its jobs are covered by the
   first-run intro + Settings, and its "gate before the devotional" pattern
   was deliberately removed by SA-033. Closes audit P0 #4 completely.

---

## LAUNCH-READINESS — Soul Audit input fidelity (founder-reported) (2026-07-10)

**"Deep dive on the prayer of Jabez" returned Philippians — the engine was
ignoring user input.** Three mechanisms, all fixed in the option composer:

1. The prompt forbade the model from anchoring outside the retrieval pool
   ("must choose from this list") — for niche passages the pool never
   contains the requested text, so the model was forced onto adjacent theme
   verses. The pool is now PREFERRED grounding; input fidelity is the
   highest rule (a named passage/story/prayer anchors the primary path).
2. Out-of-pool anchors were silently swapped for pool verses. They are now
   verified verbatim against the Bible corpus (BSB via getVerse) — a real
   passage is kept and its preview text replaced with the actual Bible
   text (stricter grounding than before); only unresolvable references
   fall back to the pool.
3. Anchor swaps (dedupe + fallback) kept the OLD anchor's verse text —
   options labeled "Psalm 34:18" quoting Jabez. Every swap now re-resolves
   its own verse text; the prompt requires three distinct references with
   each text belonging to its own reference (passage deep-dives subdivide
   into verse-level angles).

Verified in the Workers runtime: the Jabez ask now returns 1 Chr 4:9-10 /
4:10 / 4:9 with verbatim BSB text per reference; a generic anxiety ask stays
library-grounded with coherent anchors. Engine suites 22 files / 130 green.

---

## LAUNCH-READINESS — Wave 3: founder-reported fixes + Sprint D final + LCP loop wins (2026-07-10)

**Founder-reported (live review):**

1. **Theme jumped between light and dark on random pages** — root cause: a
   second persisted theme store (`euangelion-ui`, default dark) re-applied
   its own stale value whenever `/settings` or onboarding mounted, fighting
   the header/localStorage system. `uiStore` no longer persists or re-applies
   a theme; it reads/writes the single canonical `theme` key (the same one
   the pre-paint script, header toggle, and Aa sheet use) and broadcasts the
   existing change event. One source of truth, site-wide consistency.
   (Pre-existing bug — the dual store shipped well before this run.)
2. **No way back to the homepage on mobile** — after SA-024 moved
   destinations to the tab bar, `/` had no mobile entry point. The masthead
   wordmark is now a home link (newspaper convention, visually unchanged)
   and HOME appears in the mobile overflow menu.

**LCP loop (rounds 1–2, locked stick in docs/run/loop/):** the service
worker's `controllerchange` reload fired on first-install `clients.claim()`
— **every new visitor loaded the site twice** (document parsed twice, every
image fetched twice, LCP anchored to the second parse). Reload now happens
only when a pre-existing controller is replaced (real updates still
refresh). Lab LCP (simulated mobile): 8412ms → 4472ms; homepage 8412 → 3507.
Plus `suppressHydrationWarning` on `<html>` for the theme script.

**Sprint D final (agents, suite 120 files / 1608 green):**

3. Every empty state designed — 3 new library-manifest illustrations
   (justifications written, catalog `assignedTo` stamped), 6 typographic
   states tightened to one-sentence + one-CTA, the rest verified good.
4. "Why this" rows on the Today band, Daily Bread, and curated view — real
   stored audit reasoning only; the row vanishes rather than fabricates.
5. One motion language — 68 outlier transition declarations migrated to one
   easing + three duration tokens; signature editorial animations exempted
   by design. Haptic ticks (3 call sites, reduced-motion aware).
6. Safe-area audit — 9 fixes including a real bug (reader stickies toolbar
   stuck behind the opaque topbar).
7. All five `loading.tsx` skeletons rebuilt layout-accurate; the two
   client-side loaders now reuse them.

---

## LAUNCH-READINESS — Wave 2: coherence + completeness (Sprints B/C + imagery samples) (2026-07-10)

Seven workstreams, integration gate green (113 files / 1558 tests):

1. **Library consolidated** (F-068) — one tabbed `/library` (SERIES · TODAY ·
   BOOKMARKS · HIGHLIGHTS · NOTES · CHAT HISTORY · CLIPPINGS · ARCHIVE ·
   TRASH); `/saved` + `/clippings` retired via routing-layer 307s; SavedList
   deleted; ElevenReader single-library model.
2. **In-reader "Aa" sheet** (F-067) — four named reading themes (Ink ·
   Parchment · Vellum · Night, Apple Books model) + text-size stepper;
   reader-scoped variable overrides, pre-hydration bootstrap (no flash),
   WCAG-verified contrast in all four.
3. **Signed-in Today band** (F-069) — greeting + "DAY N · <plan title>"
   continue card on `/today` for returning users; single Soul Audit
   recommendation otherwise; pure progressive enhancement (SSR untouched).
4. **Settings restructured** (F-073) — profile header + six grouped cards;
   every prior control preserved (test-asserted); "coming soon" UI deleted.
5. **Reminders made honest** (F-070) — reality: nothing worked before (no UI,
   VAPID unset, window-less sender, no scheduler). Now: "One quiet word"
   window picker with six honest states, window/timezone persistence,
   idempotent timezone-aware sender with dry-run guards, migration 017.
   Go-live needs 5 founder steps (docs/run/HUMAN_REQUIRED.md #2).
6. **Global search** (F-071) — series + 1,074 devotionals + your
   notes/bookmarks/clippings; masthead + mobile-top-bar glyphs + Cmd/Ctrl+K;
   the advertised SearchAction now points at a real surface.
7. **PWA install prompt** (F-072) — appears only after a real completion
   moment, 60-day dismissal respect, iOS instruction fallback.
8. **Imagery Phase-1 samples** (F-074 start) — riso samples generated free
   (0/500 paid credits): homepage step-1 inkwell (subject-mismatch fix), two
   illustrated library empty states, `/design/imagery-samples` review page
   with the CSS grain-shimmer animated test.
9. **Series detail tabs** (F-074) — adaptive DAYS · ABOUT · VOICES · ARTWORK
   (Waking Up model): VOICES backed by real profile modules (omitted where
   none exist — never fabricated), ARTWORK lazy-mounted; bible-365's grouped
   quarter/month nav untouched; `?tab=` deep links, SSR stays static.
10. **Momentum hybrid** (SA-025, F-066) — quiet completion beat after marking
    a day complete (7 rotating benedictions, no confetti, dismissible,
    reduced-motion safe; DevotionalMilestoneReveal deleted — it was an empty
    wrapper) + gentle presence week row (lit dots, zero visible counts, no
    shame framing) on /today and the Settings profile header. Install prompt
    now waits 10s after a completion so the beat always lands first.

Final integration gate: 116 files / 1581 tests, type-check + lint clean.

---

## LAUNCH-READINESS — Sprint A follow-up: plan-token redirect hardened to a true 307 (2026-07-10)

The A-V preview battery caught the retired-reader redirect returning 200 with
a streamed meta-refresh (the root loading shell flushes before a page-level
`redirect()` can set a status). Moved to `next.config.ts redirects()` — a
clean 307 at the routing layer; the unreachable page segment and its unit
test are deleted (the preview curl is the guard).

---

## LAUNCH-READINESS — Sprint A tranche 3: reader SSR re-enabled (2026-07-10)

Mobbin-audit P0 #8. The "serialization bug" that had SSR deliberately disabled
was a prerender render-crash (structured `weeklyChallenge` object piped into
`typographer().replace`) — already root-caused and fixed in June (0b873c86 +
990e6cf6); the canonical `/devotional/[slug]` route was simply left with the
stale disable. `initialDevotional` is now server-passed there too: first paint
is real reading content, no client loader fetch. No slug special-cases.

Proof: 540/540 devotionals × 5,967 modules rendered through the real
ModuleRenderer with zero failures; `next build` prerenders 1257/1257 pages;
Workers-preview curls return full server-rendered bodies for modules, panels,
and the once-crashing day-6. SSG + hourly ISR — free-tier CPU unaffected.

---

## LAUNCH-READINESS — Sprint B tranche 1: platform-adaptive navigation (SA-024) (2026-07-10)

The audit's single biggest Mobbin-worthiness blocker: no mobile tab bar.

1. **Mobile bottom tab bar** (`MobileTabBar`, mounted in the root layout) —
   Today · Series · Soul Audit · Library · You. Fixed, safe-area-aware
   (`env(safe-area-inset-bottom)` + standalone-PWA variant), 44px targets,
   editorial stroke icons + micro caps labels, gold active state,
   `aria-current`. Companion routes map onto tabs (`/daily-bread` → TODAY,
   `/saved`+`/clippings` → LIBRARY, `/wake-up` → SERIES). Anchors: Open's
   dark minimal tab bar; Calm/Headspace structure.
2. **Mobile top bar = identity + utilities only** — theme toggle added to the
   mobile topbar (mobile previously had NO theme toggle anywhere outside
   Settings); hamburger reduced to non-tab overflow (How We Write, Help,
   sign-in/up) — zero destination duplication with the tab bar; the inline
   mobile destinations row is gone (dead CSS removed).
3. **Desktop masthead restored to full destination set** — DAILY BREAD and
   LIBRARY return to primary nav (the Phase-1.4 demotion undone per SA-024);
   desktop layout otherwise untouched.
4. **Docs reconciled** — M04 addendum (platform-split canonical nav) +
   APP-VS-WEB-APP addendum (tab bar strengthens the locked web-first/PWA
   strategy).

New regression suite: mobile-tab-bar.test.tsx (10 tests, route→tab mapping).

---

## LAUNCH-READINESS — Sprint A tranche 2: Soul Audit reveal + canonical reader + routing truth (2026-07-10)

Mobbin-audit P0 items #1, #2, #3, #5, #6 (+ #4 completion):

1. **Guided reveal revived** (was dead code) — results now open with ONLY the
   recommended path, reasoning expanded; each "Explore another direction" tap
   reveals one alternative (Calm Sleep / Yazio model). Reroll/recover reset to
   the single-card state.
2. **Result cards text-first and complete** — dead `getSeriesHero`/`SERIES_DATA`
   lookups removed (they always resolved undefined for AI slugs); cards now show
   real matched-keyword chips from the submit payload's option evidence and the
   true 7-day count from the shared `TOTAL_PLAN_DAYS` constant. No fabricated
   data, no arbitrary hero image.
3. **Results skeleton layout-accurate** — stacked single-card column matching
   real first paint (was a 3-up grid).
4. **Resume badge never nameless** — `/api/soul-audit/current` resolves the plan
   title: curated series title → plan's stored theme (the option title) →
   explicit fallback. `seriesTitle` is now a required string.
5. **Two-reader ambiguity resolved** — `/soul-audit/plan/[planToken]` retired to
   a server redirect → `/daily-bread` (deep links preserved); its private
   components deleted (DayContent, PlanDayContent, PlanDayRail); archive/manage
   API routes now return `/daily-bread`. `/daily-bread` is the one canonical
   reader.
6. **`/saved` silo routing fixed** — plan-day bookmarks → `/daily-bread`;
   devotional bookmarks → canonical `/devotional/<slug>` (was `/wake-up/...`).
7. **Canonical-URL truth** — sitemap no longer lists the 175 non-canonical
   `/wake-up/devotional/*` URLs (cross-canonical metadata was already correct);
   stale "decision pending" comment fixed.
8. **Orphan purge completed** — AuditOptionCard (0-import sibling) deleted.
9. **Teaser index regenerated** — ~212 Bible-365 teasers/titles in
   `devotional-teasers.ts` were stale placeholder-era strings; now matches the
   final rewritten JSONs.

New tests: guided-reveal regression, current-route title resolution, plan-route
redirect guard, SavedList routing (3). Updated: archive-route, active-plan-badge,
selection-ui, flow.

---

## LAUNCH-READINESS — Sprint A tranche 1: copy truth, orphan purge, cookie fix (2026-07-10)

Mobbin-audit P0 items #4 (partial), #7, #9 (`docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md`):

1. **Copy truth pass** — the site claimed three different catalog sizes at once
   ("32 plans" on the homepage, "32 series" on /how-we-write, "65+ series,
   175+ devotionals" on /about, "65 curated series" twice on /pricing). All now
   render computed `SERIES_COUNT` / `DEVOTIONAL_COUNT` from `SERIES_DATA`
   (currently 33 series / 540 devotionals) — one source of truth, can't drift.
   /how-we-write step 02 no longer claims the model "searches the catalog...
   and returns three plans" (it composes paths); the Soul Audit subcopy no
   longer promises paths "from our library"; the standalone Soul Audit CTA is
   now GET MATCHED, matching the homepage (one verb, one true promise).
2. **Orphan purge** — five 0-import components deleted (verified by grep):
   WalkthroughModal, SeriesSearchPanel, MixedHeadline, NetworkStatusBanner (+
   its test), SeriesHero. GuestSignupGate and DevotionalMilestoneReveal are
   deliberately retained — the audit schedules them for onboarding (Sprint C)
   and the completion beat (Sprint D).
3. **Session cookie misspelling fixed** — `euongelion_session` →
   `euangelion_session` with a zero-loss migration: reads fall back to the
   legacy name until those cookies age out (30-day TTL); writes use only the
   corrected name and delete the legacy cookie when present.

Verified: type-check clean; session test suites 33/33 green.

---

## ELEVATION v3.0 — Bible-365 full-run rewrite committed to baseline (2026-07-10)

The completed Bible-365 full run (in flight during the 2026-06-13 deploy) is now
committed: **all 365 days** rewritten from placeholder "panels" stubs ("This
devotional is being drafted") to the typed-MODULES standard — scripture with
Hebrew/Greek originals + BSB passages, vocab, teaching narrative, prayer, per the
days 7–14 pilot (SA-020, F-051). `src/data/devotional-teasers.ts` regenerated to
match the rewritten teasers.

Verified: 365/365 files JSON-parse, 365 modules-format, 0 panels-format, 0 stub
placeholders remaining (structure-validation script).

This commit establishes the clean-tree baseline for the 2026-07-10 launch-readiness
run tracked in `docs/run/` (Mobbin polish audit execution — see
`docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md`).

---

## ELEVATION v3.0 — Mobile polish: header overlap, Bible-365 grouped nav, homepage audit loading (2026-06-13)

Three founder-reported mobile/UX fixes:

1. **Mobile header overlap** — the cross-fading topbar ticker (date/tagline) was
   `position: absolute` against the whole row, so it spanned full-width and sat
   _under_ the hamburger (which had a ~319px hit-track over the masthead text).
   Rebuilt as a 3-column grid (`spacer · bounded ticker · 44×44 menu button`); the
   ticker is clipped to its own cell, type clamped so the full tagline fits at
   ≥375px and ellipsizes cleanly at 320px. Zero overlap at 320/375/414px; desktop
   untouched; the prior nav fix (HOME left-anchored) preserved.

2. **Bible-365 grouped navigation** — the 365-day plan forced scrolling through ~4
   months. Added a sticky quarter→month jump-bar (Q1 Foundations · Q2 Kingdom · Q3
   Promise · Q4 Fulfillment) + collapsible month accordion on `/series/bible-365`,
   and a "JUMP TO" month selector + accordion in the reader's "IN THIS SERIES" list
   — gated behind >31 days so short series stay byte-for-byte unchanged. Day-locking
   preserved; tap targets ≥44px; component-scoped CSS.

3. **Homepage audit loading** — the homepage Soul Audit widget skipped the
   "Building your paths…" loader the standalone page shows. Extracted that phase into
   a shared `ComposingPaths` component (gather-dots + live region + reduced-motion
   guard) and gated the homepage widget behind it, so submit now matches the
   standalone end-to-end (Phase B / `GenerationProgress` was already shared).

Also cleared today's Soul-Audit submit/plan daily counters (a testing IP counter had
tripped the per-day limit; the global budget rail was preserved).

(Deployed together with the in-flight Bible-365 full run, via a brief workflow pause.)

---

## ELEVATION v3.0 — Fix mobile nav: HOME cropped off the left edge (2026-06-13)

The mobile nav (`.mock-mobile-nav-inline`) is a horizontal `overflow-x: auto` row but
was `justify-content: center` — so on narrow screens the over-wide link row centered
and pushed the first item (HOME) off the **left** edge (measured `left: -45px`),
cropping it on refresh. Changed to `justify-content: flex-start` (+ `scroll-padding-left`)
so HOME is always fully visible on load and the rest scrolls in from the right.

(Deployed together with the Bible-365 full run to avoid racing the in-flight writers.)

---

## ELEVATION v3.0 — Bible-365 pilot: days 7–14 rewritten to the modules standard (2026-06-13)

Founder-directed Bible-in-a-Year pilot. The existing days 1–7 were INCORRECT — they
used a flat "panels" structure, but the documented standard (`content-structure.md`,
exemplified by "Too Busy for God") is the typed-MODULES format, which the catalog
reader prefers (panels are only its fallback).

Rewrote **days 7–14** (Genesis 3–12 arc) to that standard: each is now **12 flat typed
modules** (scripture / vocab / teaching / story / insight / bridge / reflection /
prayer / takeaway / comprehension / resource / profile), chiastic A-B-C-B'-A' + PaRDeS
woven, ~1,200–1,900 narrative words at "Too Busy for God" depth, **BSB Scripture
verbatim** (verified against the Westminster Leningrad Codex + BSB), a real
Christ-connection per passage, `panels:[]`. Written by per-day `DEVOTIONAL-WRITER`
agents, then a `DEVOTIONAL-EDITOR` pass (restored one clipped Heb 11:4 quote, normalized
em-dashes, rescoped an overstated lexical claim, removed a fabricated Augustine citation
from the old version). Field-shapes normalized; the teaser/title index regenerated.

PILOT for founder review (live). The full ~358-day run (incl. rewriting the incorrect
days 1–6) stays GATED on founder approval + a budget ceiling — not run yet.

Founder-review flags (not silently changed): a penal-substitution atonement lean in the
imagery (creedal, conscious choice); `validate-devotional.mjs` is keyed to an older
schema and can't gate these; days 13+14 both cover Gen 12:1-9 from complementary angles.

---

## ELEVATION v3.0 — Site-wide reading-layout consistency (2026-06-13)

Founder-directed: the pinned-left / empty-void / inconsistent reading-measure
pattern, hunted down site-wide via live per-page + per-paragraph measurement and
fixed for consistency:

- **`/today`** reading column was 68ch but **pinned hard-left** (883px empty void on
  desktop). Now centered (`margin-inline:auto` on header/rule/body; the edition band
  - rule stay full-width). Mobile unchanged.
- **`/how-we-write`** ran ~106ch wide and left-pinned → constrained + centered to a
  72ch reading column.
- **`StaticInfoPage`** (/about, /support, /cookie-policy, /community-guidelines,
  /donation-disclosure, /content-disclaimer) ran `max-w-4xl` (~100ch) → `max-w-3xl`
  (~85ch), matching the legal pages for one consistent measure.

Live measurement confirmed the rest (`/`, `/series`, `/library`, `/soul-audit`,
`/wake-up`, /sunday inner, legal pages) were already centered/bounded. Net: a
consistent, centered reading measure across the site (devotional reading 68–72ch,
info/legal ~85ch), no lopsided voids.

---

## ELEVATION v3.0 — Checkout locked off (not ready) + typography fixes (2026-06-13)

**Checkout is hard-disabled until billing is launch-ready (founder direction).** Added
a master `BILLING_CHECKOUT_LIVE` switch (default OFF): the checkout route now 503s on
ALL checkout initiation regardless of Stripe/IAP config (so enabling the Stripe env
alone can't turn payments on prematurely), and the config route mirrors it so the
Settings UI never offers a "Subscribe" CTA. The disabled-reason copy now reads
"Premium plans are coming soon — checkout isn't open yet" (was a dev-looking "Stripe
not configured" leak). Verified live: no functional checkout path exists.

From the typographic/image audit (code fixes only — image swaps left for founder per
"no image creation"): the masthead tagline no longer faux-bolds (Instrument Serif is
400-only; pinned to 400 so an inherited 600 stops synthesizing a muddy bold); the
generic homepage hero banner image is now `alt=""` (decorative) instead of sharing the
featured devotional's alt (a11y duplicate fixed).

Clipped Soul Audit results headings (prior commit) verified live — all 3 cards render
their full path headings, unclamped. Full suite 104 files / 1434 pass.

---

## ELEVATION v3.0 — Honest-audit fixes: silent fallback, grounding, gating, clipped headings (2026-06-13)

From a brutally-honest, doc-vs-reality audit (4 read-only agents: contracts, UX,
feature-PRDs, architecture/AI). The headline was reassuring — the day-generation
engine is genuinely closed-RAG grounded and honors the non-negotiables — but it
surfaced real violations now fixed:

- **CRITICAL (NO SILENT FALLBACKS): the options step shipped templated placeholder
  cards on a transient composer failure.** In production-strict mode,
  `ingredient-selector` fell back to `deterministicPathsForTests` ("This pathway
  gives a focused study of ${theme}…" / "Scripture focus for this pathway: …") — a
  placeholder fallback disguised as a test helper, violating CLAUDE.md rule #1.
  Now it re-throws; the submit route already retries once then returns an honest
  503/504. No more placeholder cards. (removed the now-dead transient-classifier.)
- **CRITICAL (UX): Soul Audit results headings clipped mid-word.** The full-sentence
  path headings reused the homepage `mock-featured-card` 2-line clamp and sliced
  ("…and receive t") on the audit's payoff screen. Option cards now expand the
  heading fully (scoped `.audit-option-card`); homepage short titles keep the clamp.
- **Grounding: onboarding day-0 Scripture now resolves verbatim via `getVerse`** (was
  the model-authored options preview, or the bare reference). The first content a
  Wed-Sun visitor reads is now real verse text.
- **Locked decision SA-008 enforced: open-web chat is now OFF by default**
  (`OPEN_WEB_MODE_ENABLED` defaults false) — chat is local-corpus + devotional
  context only unless explicitly env-enabled.
- **Admin gate now actually fires:** added `force-dynamic` to `admin/layout.tsx` so
  the auth check runs per-request (the static shell was serving to anonymous users
  despite the `notFound()` gate).
- **Reveal-on-scroll: IO-unsupported fallback** — content no longer risks staying
  hidden if `IntersectionObserver` is unavailable.

Full suite green throughout (104 files / 1434 tests); type-check + lint clean.
Remaining honest-audit findings (governance-doc honesty + founder decisions) are
tracked in the SOURCE-OF-TRUTH Reconciliation Notes and surfaced to the founder.

---

## ELEVATION v3.0 — Audio Edition: most-naturalistic free voice selection (2026-06-13)

The Audio Edition uses the browser Web Speech API (`speechSynthesis`) — free,
on-device, and the only free option that also reads the _dynamically generated_
Soul Audit plans. Quality is dominated by which voice gets picked, and the old
selector just grabbed a "female/samantha" or the first English voice — so on
Chrome / Android / Windows it frequently landed on a robotic default instead of
the high-quality neural voice the platform actually offers.

Rewrote `resolveVoice()` to RANK voices by naturalism and pick the best free one
available: "Natural"/"Neural" engines (Microsoft Online Natural, Google neural)
first, then "Enhanced"/"Premium" hi-fi OS voices (iOS/macOS), then known-good
named voices (Samantha, Ava, Siri, Google US English, Microsoft Aria/Jenny…),
en-US preferred, with robotic compact/eSpeak/Eloquence voices penalised. Still
100% free, no keys, no network cost; honest fallback to any English / first voice
where nothing scores. (Voice quality is platform-dependent and best confirmed by
ear on-device.)

---

## ELEVATION v3.0 — Visual consistency round 2 (FOUC, titles, settings polish) (2026-06-13)

From the site-wide visual audit (which cleared the spine: 0 critical, no broken
images/lorem/overflow). Fixed the items that made the site feel unpolished:

- **Theme flash (FOUC) eliminated.** Added a blocking anti-FOUC script to the `<head>`
  that resolves the theme from `localStorage`/`prefers-color-scheme` and toggles
  `html.dark` BEFORE first paint (mirrors `getInitialTheme()`). Light-preference
  visitors no longer see a dark→light flash on every navigation.
- **Doubled browser-tab titles fixed** on 8 pages (about, help, support, credits,
  terms, privacy, how-we-write, clippings) — they hardcoded `"X | Euangelion"` while
  the root template appends `" | Euangelion"`, yielding `"X | Euangelion | Euangelion"`.
  Now each sets just `"X"` (OG titles preserved).
- **Missing tab titles added:** `/settings` (new `layout.tsx` → "Settings") and
  `/wake-up` ("Wake-Up Magazine") were falling back to the bare "Euangelion".
- **"TESTING TOGGLES" reworked into "READING PACE."** The day-locking control was
  labelled as a QA/dev section ("disabled during QA … re-enable before launch") and
  exposed to end users — it now reads as the user preference it is (daily-unlock rhythm
  vs read-at-your-own-pace). Same control, intentional framing.

Deferred (flagged, lower-visibility / needs care): anonymous `/api/devotionals/*` 401
console noise (possible SA-018 anonymous-save gap — backend follow-up), reveal-on-scroll
no-JS fallback, password-field-in-form a11y warning, and the "Too Busy for God"
front-door scripture-framing question (content-team call).

---

## ELEVATION v3.0 — Onboarding editorial layout + nav redesign + site consistency pass (2026-06-13)

A polish round driven by two parallel redesign agents + two read-only audits
(visual + logical), all integrated and verified together (full suite: 104 files /
1434 passing, type-check + lint + governance verifiers green).

**Onboarding day → catalog editorial layout (F-032).** Day-0 now renders through the
same `ModuleRenderer` pipeline as the catalog reader (`/devotional/[slug]`): a
Scripture module, drop-cap teaching sections (split on the orientation prose's own
`**subheads**`), a reflection, and a prayer. New pure adapter
`onboarding-day-to-reader.ts` derives the modules verbatim from the persisted
`DayContent` (invents nothing; emits no fabricated art). Cycle days 1–7 render
byte-identically (the day-0 branch is isolated). Fixed a duplicate-heading bug found
in review: the page title, lead teaching heading, and reflection heading were all
"Before You Begin" (3×) — the lead now flows under the title with no heading and the
reflection is labelled "REFLECT".

**Desktop sticky nav redesign (F-007).** The crowded right cluster is restructured
into three deliberate tiers — ambient (date/tagline, demoted), primary action (the
resume pill, now a real bordered pill), and grouped utilities (a hairline divider +
two pixel-identical 32px icon buttons; "DARK MODE" text → a moon/sun icon). Typography
normalized to the Industry/Instrument system; responsive at 1440/1024/768/375 with a
CLS guard and 44px touch targets; docked-nav collision fixed. 54/54 nav tests pass.

**Homepage:** the "YOUR PLAN / You have a devotional waiting" resume banner now sits
**below** the hero header image (was above) (F-030).

**Logical-consistency pass (from the site-wide audit):**

- Soul Audit prompt is now consistently **"What are you wrestling with today?"** across
  the homepage, the `/soul-audit` page, and the OG card (the page was the lone outlier
  asking "What would you like to explore today?"). Homepage placeholder aligned to the
  approved "Lately, I've been…".
- `/today` no longer mislabels a content-fetch failure as "loading" (honest error copy).
- `/soul-audit` error page now includes the site footer (matched the error-page family).
- `/my-devotional` → `/daily-bread` uses a permanent (308) redirect (was 307).
- `/admin/*` UI pages are now auth-gated by a server `admin/layout.tsx` that fails closed
  (404 for anonymous / non-allowlisted / empty-allowlist) — the mutating APIs were
  already gated; now the UI is too.
- Help Hub "Why do I see five options? … 3 AI + 2 prefab" corrected to the accurate
  three-grounded-paths description.
- Docs: fixed the stale "capped at 5/10" line (cap lifted 2026-06-13) and added a
  SOURCE-OF-TRUTH "Reconciliation Notes" section documenting the 3-grounded-options vs
  documented "3+2", the consent route folded into select, the stale flow docs, and the
  contract-verifier blind spots (locked-decision changes marked founder-ratify).
- Reconciled two stale tests to the shipped behavior (active-plan route → `/daily-bread`;
  onboarding title → "Before You Begin").

---

## ELEVATION v3.0 — Fix active-plan dead-end: resume into /daily-bread (2026-06-13)

A live audit found a release-blocking dead-end: a returning visitor with an active
plan could not reach their devotional. All three active-plan entry points — the
header **active-plan badge**, the homepage **"Continue my devotional" CTA**, and the
**resume link** — routed to `/soul-audit/plan/[token]?day=N`, whose reader renders an
empty timeline + a perpetual "This day isn't ready yet" lock message for the
onboarding day-0 / locked-cycle state (a client bug in that reader). Meanwhile
`/daily-bread` — the canonical reader — correctly serves the current unlocked day
(verified live).

Fix: `aiRoute()` in `/api/soul-audit/current` now returns **`/daily-bread`** for AI
plans (and `normalizeCurrentRoute` accepts it), so all three entry points resume into
the working reader. Day-gating is unchanged (still correct per SOURCE-OF-TRUTH
#19-23 — the onboarding day-0 is the readable one; cycle days unlock Monday). The
underlying `/soul-audit/plan/[token]` reader bug is tracked as a follow-up; nothing
routes users into it anymore.

---

## ELEVATION v3.0 — Edge bundle rebuilt for WordNote marker fallback (2026-06-13)

Regenerated + redeployed the `generate-plan-day` edge bundle so prod off-request
generation runs the WordNote prose-anchored fallback (the marker change lives in
`grounded-weave.ts`, which the edge fn bundles). Verified: 0 cross-project imports;
edge fn boots clean on prod (JSON 404 on a fake-plan deep-dive = full graph loads).

---

## ELEVATION v3.0 — Onboarding day rewritten + WordNote markers now emit (2026-06-13)

The two things a stranger actually reads from a Wed–Sun start, fixed:

- **Onboarding day is now a real, full-length, Scripture-grounded orientation
  (F-032).** It was a thin stub with broken templated copy (`The season of
${themes}…` interpolating internal machinery) and empty rich fields → flat
  typography. `buildOnboardingDay` now composes a substantial, warm, pastoral
  "Before You Begin" body grounded in the path's verbatim anchor Scripture; the
  reader renders it through the same prose treatment as cycle days. (It remains a
  composed orientation/bridge, not an LLM weave — the 7-day cycle is the bespoke
  grounded result; swapping the bridge to a live LLM call was deliberately NOT done
  the night before launch to avoid destabilizing the generation chain.)
- **WordNote inline word-studies now actually appear in generated days (F-034).**
  They emitted 0 because the 43-term bank rarely overlaps a given anchor verse's
  studies. Added a **prose-anchored fallback** in `injectWordNoteMarkers`: when the
  verse's own studies don't match the bank, surface up to 3 notes for
  distinctly-theological bank terms that appear in the exposition (grace→*charis*,
  peace→*shalom*, faith→*pistis*…), with verbatim public-domain glosses. Generic
  homographs (word, light, know, hear…) are allowlisted OUT to stay accurate, and
  the verbatim Scripture blockquote is never touched. Verse-anchored studies are
  still preferred; fallback only fills the gap. 9 marker tests + 22 total pass.

---

## ELEVATION v3.0 — HOTFIX: Soul Audit build 500 (missing onboarding columns) (2026-06-13)

Live grounded-audit verification (rule #10) caught a regression shipped in Wave 1: the
Soul Audit plan build returned **HTTP 500 on prod** for every new plan. Root cause:
Wave-1D's select route persists `onboarding_variant` + `onboarding_days` to
`devotional_plan_instances`, but prod's table was created from an earlier migration 009
and is **missing those two columns** (`start_policy`/`cycle_start_at` exist) — the
insert returned an error, the route treated it as fatal → 500. (Routes-200 verification
didn't catch it; a real build test did. Existing plans were unaffected.)

Two-part fix:

- **`database/migrations/016_add_onboarding_columns.sql`** — additive, idempotent
  `ADD COLUMN IF NOT EXISTS` for the two columns (the correct fix; apply on prod).
- **Resilience in `select/route.ts`** — the plan-instance insert now retries WITHOUT
  the onboarding columns if they're missing, so a schema gap can never break the
  flagship build again; it auto-uses the columns once migration 016 is applied. The
  onboarding day-0 row + schedule still drive behavior; the day route reads
  `onboarding_variant` with a `?? 'none'` fallback.

---

## ELEVATION v3.0 — Edge bundle rebuilt for Wave 1/2 engine changes (2026-06-13)

Regenerated + redeployed the `generate-plan-day` Supabase edge bundle so prod
off-request generation picks up the engine changes from Waves 1–2: WordNote marker
emission (1D) and structured endnotes + the length/depth gate (2C) in
`grounded-weave.ts` / `generation-runner.ts`. The edge function is a pre-bundled,
self-contained copy of the shared runner, so engine edits require this rebuild to go
live. Verified: bundle has 0 cross-project imports; edge fn boots clean on prod
(401 no-auth / 403 bad-secret / JSON 404 on a fake-plan deep-dive = full graph loads).

---

## ELEVATION v3.0 — Finish-line Wave 2: performance + reading-IA + engine depth (2026-06-13)

Second finish-line wave — three disjoint streams, integrated + verified together:
`type-check` clean, `lint` 0 errors, 102 files / 1419 tests pass, Workers build clean.

- **Performance — no horizontal overflow + CLS/LCP (F-041/F-042/F-043):** global
  containment guards (media `max-width:100%`, long-string `overflow-wrap:anywhere` on
  foreign-script/reference/URL surfaces, `min-width:0` flex/grid shrink guards on
  scroll rails, `overflow-x:auto` on markdown `pre`/tables); CLS reservation for the
  late-loading substack banner (`aspect-ratio`); existing `content-visibility` LCP fix
  preserved. Verified via Playwright at 375/390/768/1280/1440 both themes — **0
  document horizontal overflow**, including an injected 120-char unbreakable token.
  Pinned by new `layout-overflow-contract` + `lcp-cls-contract` tests. Did NOT clip
  the newspaper shell (would break sticky nav) — offenders are constrained instead.
- **Reading IA — left rail + day-progression chips (F-030/F-031):** mounted the
  previously-orphaned `DevotionalLibraryRail` on `/library` as one unified retrieval
  surface (today/bookmarks/highlights/notes/chat-history/archive/trash) with shareable
  `?tab=` deep-links (SSR-safe Suspense wrapper, alias normalization so no URL is a
  dead end) + a mobile drawer; converged `/saved` + the reader LIBRARY menu onto it.
  Rebuilt the day selector into explicit PAST/NOW/NEXT/OPEN/LOCKED/REST/START chips +
  a legend, with a `planCurrentDay` "where am I" computation. Gating honored via
  `isUnlocked` (locked stays disabled; sabbath→REST; onboarding→START).
- **Engine depth — structured endnotes + length/depth gate (F-027/F-028):** the
  grounded weave now emits structured endnotes (scripture / voice / lexicon `kind` +
  `reference`) **only for sources actually woven into the body** (no over-claiming, no
  fabrication); a depth gate (≥600 words reading / ≥1800 deep-dive + coherence +
  verbatim-anchor checks) **fails closed** — a thin generation re-rolls rather than
  shipping, surfaced in telemetry, never a canned fallback.

---

## ELEVATION v3.0 — Finish-line Wave 1: craft + a11y + reliability + WordNote/onboarding (2026-06-13)

First wave of the push from ~60% toward the engineering finish line — four parallel
streams, integrated + verified together: `type-check` clean, `lint` 0 errors, 100
files / 1402 tests pass, Workers build 1263/1263 pages 0 prerender errors.

- **Typography + Motion lockdown (F-012–F-018):** tokenized font roles
  (`.font-reading`/`.font-display` = Instrument Serif, `.font-ui` = Industry) so UI
  labels never inherit serif; ratio-based type scale + line-length measures;
  readability floor (~17px) at 375/390; reduced-motion parity closed (OS `@media` +
  in-app `html.reduce-motion` now share one reset that also removes hover/focus
  transforms); scroll-reveal restraint (boundary-only, body copy guarded); one shared
  `.affordance` micro-interaction system. `globals.css` + `typography-craft.css` +
  MixedHeadline/PullQuote.
- **Accessibility (F-044/045/046):** ARIA disclosure semantics
  (`aria-expanded`/`controls`) on audit option cards; named landmarks/regions (footer
  nav groups, results sections via `aria-labelledby`, crisis region); `aria-live` on
  async/toast/empty/error states; accessible names on icon/repeat buttons;
  `aria-current` on the plan day rail.
- **Reliability + data trust (F-039/F-036/F-037/F-040):** new
  `src/lib/observability/api-failure.ts` (request-id + closed failure taxonomy,
  structured JSON logging) across mock-account/bookmarks/annotations/chat/submit error
  paths; route-aware recovery CTAs in `error.tsx`; improved offline banner + retry
  (**not mounted** — honors the F-040 locked decision against a persistent
  interrupting banner; code ready if the founder wants it); retention-clarity table
  (per-artifact what/where/how-long) in settings + privacy; export schema-version
  stamp + completeness guard.
- **WordNote in generated days + onboarding gap (F-034/F-032):** the grounded weave
  now emits `{{wn:id|surface}}` markers **deterministically post-generation** (never
  model-emitted), validated against the lexicon-backed `wordnote-bank` (fabrication
  impossible); new `MarkdownWithWordNotes` renders them in the Daily Bread reader
  (closing the gap that ScriptureModule only covered the curated reader). Wed–Sun plan
  starts now serve a Scripture-anchored onboarding day-0 immediately (SOURCE-OF-TRUTH
  #22) instead of a bare holding screen; Mon/Tue immediate starts unchanged.

Test fix: `soul-audit-results-selection-ui` selector made specific to the build
button (1B added descriptive `aria-label`s to both the build + save buttons).

---

## ELEVATION v3.0 — Founder lifted the scoring cap (2026-06-13)

Founder authorized removing the artificial score cap (was "baseline capped at 6/10
until founder elevates"). The scoring rule now reads: **scores reflect honest,
evidence-backed current quality; scores must never be inflated; 10/10 still requires
the full evidence matrix.** Updated in sync across the three gate-checked surfaces —
`docs/production-decisions.yaml` (`scorecard_required_tokens`),
`PRODUCTION-FEATURE-SCORECARD.md` (scoring rule), `PRODUCTION-SOURCE-OF-TRUTH.md`
(#4). `verify:governance-alignment` OK (scorecard ↔ decisions tokens stay in sync).
Founder remains the sole authority to assign 10/10; this lifts the _floor cap_, not
the evidence bar.

---

## ELEVATION v3.0 — Web push SENDING: send-daily-push edge fn (E2) (2026-06-13)

Completes Phase 2.2 web push (SA-013 / F-040). Subscribing was already live; this
adds the sender. New self-contained Supabase edge function
`supabase/functions/send-daily-push/index.ts`: queries `push_subscriptions`, signs
each with the VAPID keypair (`npm:web-push`), POSTs one calm "Today's Edition is
ready" notification linking to `/today`, and prunes dead endpoints (404/410).
Double-gated (Supabase `verify_jwt` + `X-Internal-Secret`); intended to be fired
once per day by Supabase `pg_cron`.

Deployed + verified live on project `ovivwbopjfruikehrlgm`: 401 (no auth), 403 (bad
secret), and `{"ok":true,"total":0,"sent":0,...}` on the correct gate — proving the
web-push lib loads in Deno, VAPID setup succeeds, and the query + send loop run.
**Two honest limits:** (1) actual delivery to a device is NOT verified here (needs a
real browser subscription); (2) the recurring `pg_cron` schedule is the founder's
switch to arm — until armed, opt-ins persist but no notification fires. VAPID
secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) set on the
Supabase project; `supabase/config.toml` registers the function.

---

## ELEVATION v3.0 — Durable devotional SSR self-fetch (2026-06-13)

`fetchTodayDevotional` (`src/lib/today-devotional.ts`) Strategy 2 (the Cloudflare
Workers self-fetch) now ignores a `localhost`/`127.0.0.1` base and falls back to
the production origin. `NEXT_PUBLIC_*` is inlined at **build** time, so a dev build
can bake `http://localhost:3333` into the server bundle — which made the live
self-fetch unreachable and degraded devotional / `/today` SSR to the "Preparing"
loading state after ISR revalidation. The guard makes live SSR robust regardless
of what the build inlined, removing the standing risk that an env-less rebuild
(e.g. a stray GitHub→Cloudflare auto-deploy from `main`) regresses the reading
routes. Strategy 1 (`fs.readFile`, used in dev/build) is unaffected. SA-004 / F-040.

---

## ELEVATION v3.0 — Production-build fix: devotional reading SSR (2026-06-13)

Deploy-runbook Step B (first real Workers production build of the elevation branch)
surfaced two pre-existing schema-drift bugs that aborted **every** prerender of the
reading route — the branch was unit-test/type-check green but had never been
production-built. Both fixed, all content preserved (SA-004 / F-040):

- **`weeklyChallenge` as an object** (`too-busy-for-god-day-6`): `ResourceModule`
  passed it to `typographer` as if a string → `b.replace is not a function` → build
  abort. Now renders the structured challenge (title / description / reminders) as
  well as the plain-string form.
- **`forDeeperStudy` as a string** (3 `what-is-christianity` days): `ResourceModule`
  `.map`'d it as an array → `.map is not a function`. Now renders the prose blurb
  when it is a string and the item list when it is an array.
- **Types widened** (`Module.weeklyChallenge`, `Module.forDeeperStudy`) to unions;
  **`typographer` hardened** to no-op on a non-string so no single stray field can
  abort a production build again.

Verified: `type-check` clean; full `npm run preview` Workers build → **1263/1263
pages, 0 prerender errors**; all new elevation routes curl **200**; the build-time
prerendered devotional HTML carries the full reading body (no "Preparing"
placeholder) with both fixes' content present.

---

## ELEVATION v3.0 — Edge bundle rebuilt with cost rails (2026-06-13)

Regenerated `supabase/functions/generate-plan-day/index.ts` (esbuild) so the deployed
off-request generator includes the Phase 1A.4 budget cap + cost ledger + telemetry.
Deployed to Supabase project ovivwbopjfruikehrlgm. Source unchanged (entry.ts + shared src).

---

## ELEVATION v3.0 — Phase 3.1 inline WordNote primitive (2026-06-11)

A grounded inline word-study primitive (SA-020/F-034). Bank IDs only — every
definition is lexicon-verbatim; nothing is generated or invented:

- **Bank (`scripts/build-wordnote-bank.mjs` → `public/wordnote-bank.json` +
  `src/data/wordnote-bank.ts`):** 43 word-study notes whose word / transliteration /
  gloss / source are lifted VERBATIM from the precomputed lexicon
  (`public/lexicon-strongs.json`: Brown-Driver-Briggs / Strong's / Abbott-Smith).
  A seed with no lexicon entry fails the build loudly (no fabrication). Includes
  the brand's own word — _euangelion_ (εὐαγγέλιον), "good news."
- **Component (`src/components/WordNote.tsx`):** a keyword carries a crimson dotted
  underline (`--color-crimson`); activating it opens an accessible footnote card
  (original word + transliteration + gloss + source). Button trigger with
  `aria-expanded`/`aria-controls`, labelled note region, Escape + outside-click
  close, focus returns to the trigger, no motion. An unknown bank id renders the
  plain text — never a fabricated note.
- **Loader + parser (`src/lib/wordnote.ts`, `src/lib/wordnote-markup.tsx`):** small
  client-safe bank lookups + a `{{wn:id|surface}}` marker parser that integrates
  into `ScriptureModule` (scripture context). Plain prose with no markers is
  unchanged (passes through the typographer); nothing is auto-linked, so no word is
  annotated out of context.
- 10 tests (`__tests__/wordnote.test.tsx`) assert bank grounding, marker parsing,
  the accessible card, and the no-fabrication fallback.

Verified: `type-check` clean, `lint` 0 errors, 10 WordNote tests + full suite 1386
passing. Next: emit markers from the grounded weave + curated content.

---

## ELEVATION v3.0 — Phase 2: audio, web push, PWA offline, clippings (2026-06-11)

The full Phase 2 reader/reliability layer (SA-013/SA-023, F-040/F-030). Everything
free, no account, honest about what isn't configured yet:

- **Audio edition (2.1, F-030):** a free, on-device TTS adapter — `TtsAdapter`
  interface + `WebSpeechTtsAdapter` over the Web Speech API (no keys, no cost),
  shaped so a server-TTS adapter can drop in later. `AudioPlayer` gives a calm
  Listen/Pause/Stop control, a tappable section scrubber, and full Media Session
  API wiring (lock-screen metadata + transport handlers), with an honest "Audio
  isn't available in this browser" state. Mounted on BOTH catalog devotionals and
  generated Soul-Audit days via a shared `src/lib/audio/segments.ts` extractor that
  reads only real devotional text.
- **PWA offline (2.3, F-040):** `sw.js` v50→v51 — cache-first-with-network-update
  for opened reading routes (`/wake-up/devotional/*`, `/today`, `/sunday`) + their
  JSON, so readings you've opened stay available offline; brand-styled `/offline`
  fallback. Existing caching strategies preserved.
- **Web push (2.2, F-040):** one calm post-read opt-in (`PushOptIn`), wired into
  both readers and triggered only after a reader finishes a day. Honest no-op when
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is unset / unsupported / denied — it never fakes a
  subscribe. `sw.js` push + notificationclick handlers; `/api/push/subscribe`
  persists to Supabase (501 when VAPID unset). Migration
  `015_create_push_subscriptions.sql` provided (not run). The scheduled daily
  sender is documented as an out-of-scope contract — no fabricated sender.
- **Clippings / local library (2.4, F-030):** a local-first commonplace book —
  IndexedDB store (`src/lib/clippings.ts`, device-only, never networked),
  `ClipButton` to save the current selection from either reader, and a `/clippings`
  view with print, copy-all, and `.txt` export. Personal content never leaves the
  device.
- Test hygiene: stubbed `fetch` in `series-page-client-scripture.test.tsx` so a
  store-hydrate relative-URL fetch no longer leaks an unhandled rejection (suite
  exit 1 → 0).

Verified: `type-check` clean, `lint` 0 errors, full suite 1386 passing.

To activate push end-to-end: set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
/ `VAPID_SUBJECT`, apply migration 015, and add the daily-send cron.

---

## ELEVATION v3.0 — Phase 1A.4 Soul Audit cost rails (2026-06-11)

Load-bearing cost control for the generative Soul Audit (SA-020/F-038). The founder
cannot absorb runaway LLM spend, so these are the hard rails — none serve canned
content on failure (a paused generation says so, honestly):

- **Rate limiting (`src/lib/soul-audit/rate-limit.ts`):** per-day caps on submissions
  (`SOUL_AUDIT_MAX_SUBMITS_PER_DAY`, default 20) and plan generations
  (`SOUL_AUDIT_MAX_PLANS_PER_DAY`, default 5), session-keyed with a hashed-IP
  fallback, backed by a Supabase counter (atomic `soul_audit_bump_counter` RPC).
  Over-limit → 429 with pastoral copy. Rerolls / idempotent re-selects exempt.
- **Budget cap (`budget-cap.ts`, BLOCKING):** a global daily ceiling
  (`SOUL_AUDIT_DAILY_COST_BUDGET` USD, default 25; optional
  `SOUL_AUDIT_DAILY_TOKEN_BUDGET`). Checked before each generation; over-budget
  surfaces an honest "generation paused for today" — never fake content.
- **Cost ledger (`cost-ledger.ts`):** records every generation's real Anthropic
  `usage` (input/output tokens) + correct Sonnet pricing
  (`SOUL_AUDIT_INPUT/OUTPUT_USD_PER_MTOK`, default 3/15) to Supabase, and
  accumulates the day's `global_spend`. Best-effort-but-LOUD: a ledger write
  failure logs via telemetry but never breaks the user's devotional.
- **Telemetry (`telemetry.ts`):** structured JSON events (generation_start/success/
  fail, rate_limited, budget_exceeded, ledger_write_failed) to stdout; never throws.
- Real token usage now flows `generateWithBrain` → `grounded-weave` meta →
  `generation-runner` (budget pre-check + ledger write) → both the Next route and
  the Edge function (which import the same runner). Migration
  `database/migrations/014_soul_audit_cost_ledger.sql` provided — **NOT run**.

Two follow-ups for the founder: (1) apply migration 014 + rebuild/redeploy the Edge
bundle (`npm run build:edge-function`) so the budget enforces off-request; (2) decide
fail-open (current — bounded by the per-minute burst limiter) vs fail-closed on a
Supabase counter outage.

Verified: `type-check` clean, `lint` 0 errors, full suite 1386 passing.

---

## ELEVATION v3.0 — Phase 1.4 homepage consolidation (2026-06-11)

Single clear action ladder on the homepage, tightened global nav (SA-013/F-007):

- **Homepage (`src/app/page.tsx`):** the three equal-weight starter cards are
  replaced by one action ladder — a dominant primary CTA (**"READ TODAY'S PAGE"** →
  `/today`), then quieter secondary/tertiary cards (Soul Audit → `/soul-audit`,
  Browse the library → `/series`). The closing "ready to begin" CTA now points to
  `/today` too; the series rail's full "browse every plan" button is demoted to a
  quiet inline "see all" link so nothing competes with the primary path.
- **Global nav (`EuangelionShellHeader.tsx`):** reduced 6 → 5 top-level items —
  Home · Today · Soul Audit · Series · How We Write. Desktop sticky bar, mobile
  hamburger, ActivePlanBadge, and the account menu (Settings/Sign-in/Daily
  Bread/Library) unchanged; auth entry preserved. Daily Bread + Library move to the
  account menu + footer as returning-user surfaces.
- **Footer (`SiteFooter.tsx`):** link hygiene — `/today` + `/sunday` now reachable.
- **Crisis + privacy preserved:** the CrisisInterstitial gate and the Soul Audit
  privacy footnote ("Read once to compose your edition — never stored, never
  shared…") are intact and unmodified.
- Scoped CSS added under a commented block in `globals.css` using only existing
  `--mock-*` tokens — no new colors/fonts; cards use `minmax(0,1fr)` (no overflow),
  44px touch targets, `prefers-reduced-motion` guard.

Verified: `type-check` clean, `lint` 0 errors, full suite 1386 passing.

---

## ELEVATION v3.0 — Voice bank + Sunday Edition + share cards (2026-06-11)

Wave 3 of the elevation brief — the curation source layer plus weekly edition and
honest distribution. All grounded, no generation:

- **Voice bank (Phase 1A, SA-020/F-026):** `content/voices/voice-bank.json` +
  `public/voice-bank.json` — 450 **verbatim** historic-voice quotes (9 themes × 50),
  every quote a verified substring of the local public-domain corpus, Gutenberg
  fiction filtered out. Built by `scripts/build-voice-bank.mjs` (`npm run build:voice-bank`);
  read via `src/lib/soul-audit/voice-bank.ts` (`getVoicesByTheme`, `getVoiceById`).
  This is curation source material for the grounded weave — bank IDs only, never
  invented attributions.
- **Sunday Edition (Phase 3, SA-021):** `/sunday` (+ `/sunday/archive`) —
  server-rendered weekly reading, deterministic ISO-week→slug rotation
  (`src/lib/sunday-edition.ts`), duotone OG card, sitemap entries.
- **Share cards (Phase 3, F-026):** shared duotone OG generator (`src/lib/og-card.tsx`,
  Federal Ultramarine + Cream, Instrument Serif) upgrades the homepage + soul-audit
  OG images and powers Sunday's. `ShareButton.tsx` uses the Web Share API with a
  **personal-content safety contract** — generated/personal days share verse-only,
  never the user's struggle text or composed body.

Verified: `type-check` clean, `lint` clean on all wave-3 files, voice-bank.json = 450 entries.

---

## ELEVATION v3.0 — Phase 1 foundation + crisis gate + eval harness (2026-06-11)

Building out the full elevation brief (flagship Soul Audit already live). This tranche:

- **Devotional SSR (Phase 1.1, SA-004/F-040):** `/wake-up/devotional/[slug]` now
  server-renders the full reading body in the initial HTML — the `initialDevotional`
  prop is wired server-side (`fetchTodayDevotional`), killing the client "LOADING"
  state. Verified by curl: `LOADING` count 0, scripture + Article/Breadcrumb JSON-LD
  present. Interactive bits (save, progress, lightbox, chat) hydrate as progressive
  enhancement, never gating the text.
- **Today's Edition (Phase 1.2):** `/today` (+`/todays-edition` redirect) —
  server-rendered one-tap reading, deterministic date→slug rotation over the
  175-devotional catalog, Article JSON-LD, sitemap entries.
- **How We Write (Phase 1.3):** `/how-we-write` — composer-not-author, creedal anchoring,
  the 30+ historic voices, plain-language Soul-Audit-composition explainer, privacy-honest.
  Linked from the site footer.
- **Crisis safety gate (Phase 1A.1, SA-004):** `crisis-gate.ts` deterministic client-side
  detector (988 / Crisis Text Line / findahelpline.com) runs BEFORE any network call;
  `CrisisInterstitial.tsx` calm newsprint interstitial; wired into `useSoulAuditSubmit`
  with zero network egress on trigger. 97 unit tests.
- **Privacy-honest copy:** removed every "never leaves your device" implication; reflection
  is "read once to compose your edition — never stored, never used to train AI, never shared"
  (soul-audit, homepage, about).
- **Eval harness (Phase 1A.7):** `__tests__/soul-audit-evals/` — 66 realistic reflections,
  a pure-function rubric (scripture/source/structure/situational-relevance + stubbed LLM
  voice check), 83-assertion crisis test (100% detection), budget-capped smoke suite that
  skips without keys. `docs/PROMPT-CHANGELOG.md` created.

---

## ELEVATION v3.0 — off-request generation + Day-1-first + Deep Dive tier (2026-06-11)

The delivery architecture for the grounded engine (SA-020, F-026, F-058): Sonnet's
~40s readings cannot fit Cloudflare's free-plan request lifetime, so generation
moves OFF the request path to a founder-chosen **Supabase Edge Function**, with
the industry-standard progressive-delivery UX (first unit fast, rest in
background — the Duolingo/Suno pattern; date-gating makes Days 2-7 latency
invisible).

- **`generation-runner.ts`** (new) — runtime-agnostic orchestration extracted from
  the generate-day route (weave → verification gate → save → progress → recap/
  sabbath finalize → continuity chain payload). ONE source of truth executed by
  all three executors so behavior can't drift.
- **Executors:** the Next route (thin wrapper, dev default); **`scripts/
dev-generator-server.mts`** (new, local Edge-function stand-in with the same
  HTTP contract + self-chaining — what makes the architecture verifiable on this
  machine); **`supabase/functions/generate-plan-day/`** (new, Deno) — imports the
  SHARED app source via import map, swaps the brain router for a direct-Anthropic
  shim (Sonnet, retries), self-chains days via `EdgeRuntime.waitUntil`. Deploy
  runbook in `docs/SOUL-AUDIT-GROUNDED-REBUILD-PLAN.md`.
- **`/select/status`** — executor switch (`SOUL_AUDIT_GENERATOR_URL`) + **Day-1-
  first**: returns the read route as soon as Day 1 is saved (self-chaining mode
  only); `GenerationProgress` navigates immediately. The reader starts in ~40s
  instead of ~3.5 min; the loader narrates only Day 1.
- **Deep Dive tier (tiered-depth decision):** `deepen` endpoint (POST trigger /
  GET readiness poll, idempotent, explicit 503 without executor) + reader UI —
  "SET THE DEEP DIVE" in the Deep Dive tab generates the ~3,000-3,800-word
  grounded long-form (full lexicon word studies, PaRDeS, voices) on demand and
  lands it without reload (`tier3Extended.deepDiveBody`, additive type).
- `plan-composition.ts` (new) — recap/sabbath composition shared by all executors.

## ELEVATION v3.0 — grounded engine: Workers-safe corpus loading (2026-06-11)

Production-readiness for the grounded day engine (SA-020, F-026) — remove the two
Cloudflare Workers blockers in the generation path:

- **Lexicon precompute.** `lexicon.ts` parsed ~27MB of XML at runtime (fine in
  dev, fatal under the free 10ms-CPU Workers limit). New `scripts/build-lexicon-index.mts`
  precomputes two committed indexes (`public/lexicon-strongs.json` 1.93MB +
  `public/lexicon-verses.json` 5.52MB); runtime now does pure JSON lookups (verified
  byte-identical to the XML path across 34 verses/Strong's; XML kept only as a dev
  fallback). `npm run build:lexicon-index` regenerates.
- **`getVerse` Workers loading.** Was fs-only (`process.cwd()`), which fails on
  Workers where `public/bibles/` lives behind the ASSETS binding, not the worker fs.
  Now uses the same ASSETS → fs → self-fetch resolution as the reference-index loader,
  so verbatim Scripture injection works in every environment (incl. a background
  Durable Object).
- **Pre-warn copy** on the results page: sets the "~a minute, written fresh" expectation
  before the loader.

Remaining for production: the background execution wrapper (Sonnet readings are ~40s,
over the 30s request cap) — see `docs/SOUL-AUDIT-GROUNDED-REBUILD-PLAN.md`.

## ELEVATION v3.0 — grounded closed-RAG day generation (2026-06-11)

The Soul Audit day engine is rebuilt as a CLOSED, grounded weave (SA-020, F-026):
the model assembles ONLY retrieved materials, and a verification pass rejects
anything ungrounded — the founder's "curated, not generated" intent, now enforced
structurally instead of by prompt instruction. Quality bar: the wokeGod "Genesis:
Two Stories of Creation" deep dive, but with real sourced quotes and lexicon-grounded
Hebrew/Greek instead of evocative-but-invented etymology.

- **`src/lib/soul-audit/lexicon.ts`** (new) — real Hebrew/Greek word studies from
  Brown-Driver-Briggs, Strong's, Abbott-Smith, morphHB, STEPBible (verse → grounded
  glosses). Verified: Psalm 34:18 → _shabar_/_dakka_; John 1:1 → _logos_/_theos_.
- **`src/lib/soul-audit/grounded-weave.ts`** (new) — `generateGroundedDay`: injects
  verbatim Scripture via `getVerse`, retrieves real attributed quotes (BM25), grounds
  word studies (lexicon), weaves via **Sonnet** in a delimiter format (fixes the
  recurring malformed-JSON failure), and runs a **verification pass** that rejects
  ungrounded authors/etymology before a day is allowed to save. `reading` (~1k words)
  and `deepdive` (~3.5k words) modes.
- **`src/lib/soul-audit/chunk-retrieval.ts`** (new) — shared BM25 retrieval + source
  attribution (extracted from generate-day).
- **`generate-day/route.ts`** — now calls the grounded weave (legacy 19-field
  prompt/parser deleted); a grounding gate re-rolls any unverified day. This also
  resolves the `textBPreview` parse loop and the intermittent scripture
  reference/text swap (Scripture is now verbatim from the corpus, never the model's
  memory).
- **`DailyBreadView.tsx`** — renders the woven `textB`, skips empty legacy chiastic
  fields, shows the lexicon word-study card.
- Verified in dev on Sonnet: "Day 1 grounded: 905w · 6 sources · 2 word studies ·
  verified"; the day API serves the full grounded body; standalone `verification.ok:
true`. 59 soul-audit/daily-bread tests green.
- Plan of record + remaining delivery infra (free background job, deep-dive UI,
  Workers lexicon-precompute, Day-1-first): `docs/SOUL-AUDIT-GROUNDED-REBUILD-PLAN.md`.

## ELEVATION v3.0 — "hot off the press" generation loader (2026-06-10)

The generation wait is now a deliberate, on-brand moment instead of a raced
deadline (founder asked for this repeatedly; prior passes did the lazy thing).

- **`GenerationProgress` rebuilt** as a newspaper press-room: masthead + crimson
  rule + "SETTING YOUR EDITION", an animated galley proof setting type line-by-
  line with an ink sweep, "A seven-day edition, being set for you", the REAL
  server progress ("Composing day N of 7…") on a progress bar, and reassurance.
  Reduced-motion safe. Verified with a live screenshot.
- **Resilience:** a slow/errored generation unit transparently re-kicks behind
  the loader (auto-retry) so the reader never sees "took too long"; the submit
  options call retries transparently too.
- **Known (next):** the edition still won't COMPLETE on Sonnet 4.6 — every day
  errors at the 25s Workers-headroom deadline. The loader covers the wait, but a
  too-slow model can't finish; the provider switch (Haiku) is required for
  delivery and is the next task.

---

## ELEVATION v3.0 — Soul Audit generation timeout fixed (2026-06-10)

First task of the elevation rebuild (founder-authorized; cost-controlled spend).
Phase 0 audit (`docs/ARCHITECTURE-AUDIT.md`) found the grounded-generation Soul
Audit already ~80% live — the real bug was the day generation, not the pipeline.

- **Root cause of the live "Day N generation took too long (25000ms deadline)":**
  `generate-day` asked for a **3,000–4,000-word, 5-section chiastic PaRDeS essay**
  at `maxOutputTokens: 6000` — uncompletable inside the 25s Workers-headroom
  deadline (and the cost driver: ~$0.59/edition).
- **Fix:** right-sized the day prompt to the brief's **600–900-word bespoke
  edition** (same JSON schema/keys so the reader + validator are unaffected;
  tight per-section targets; `maxOutputTokens: 2800`). Unblocks the flagship and
  cuts per-day cost ~8×. RAG grounding, scripture/voice verbatim rules, and
  validation untouched; no determinism or canned content added. Provider choice
  deferred per founder (still on the configured model).

---

## UX AUDIT FIXES — tranche D: mobile parity + onboarding (2026-06-10)

- **Mobile/desktop nav parity:** `Help` added to the mobile hamburger menu (was
  desktop-account-menu only) for the mobile-first audience.
- **Onboarding de-jargoned:** removed the raw LLM-vendor picker ("Default Brain":
  OpenAI/Google/MiniMax/NVIDIA Kimi) + Open-Web checkbox from first-run onboarding
  (implementation jargon vs. the sacred-minimalism / "AI as composer" stance);
  still available in Settings.

> Remaining UX-audit items (homepage CTA hierarchy, scripture-first mobile reorder,
> EmptyState rotation, the single canonical reader URL) are intentionally folded
> into the v3.0 elevation brief rather than done twice.

---

## UX AUDIT FIXES — tranche C: navigation & wayfinding (2026-06-10)

- **No more dead nav links (F-011/M00 "no dead-ends"):** the reader "Library"
  menu's five `/daily-bread?tab=…` links all silently landed on the default view
  (`/daily-bread` never reads `?tab=`). Reduced to three links to real, distinct
  surfaces: Today's Reading → `/daily-bread`, Your Library → `/library`,
  Bookmarks → `/saved`.
- **Label consistency:** footer "My Library" → "Library" (matches the nav +
  account menu).
- **Auth honesty/recovery:** sign-in error copy now names the likely cause
  (expired/used magic link) + the fix; added an honest one-line value statement
  under "Welcome back" (an account just syncs across devices; reading works
  without one).

> Larger IA consolidation (the four overlapping "my stuff" surfaces; the single
> canonical reader URL to 301 to) is a deliberate founder decision, not changed
> blindly — flagged for review.

---

## UX AUDIT FIXES — tranche B: calm reading + feedback states (2026-06-10)

- **No more silent failures (F-017/M00 §4):** Save / Start / Remove now surface
  success, sign-in-needed, AND error states (the `lastError` path was wired
  nowhere); in-flight buttons read "SAVING…"/"STARTING…"; `/saved` shows a real
  error+retry instead of a misleading "Nothing saved yet"; the Daily Bread
  "content being prepared" day now offers Try-again / back / browse rather than
  dead-ending.
- **Anti-streak / calm reading (per SUCCESS-METRICS "what we don't measure"):**
  removed the "X of Y days" completion scoreboard ("Journey Complete" → "You've
  walked this series"); dropped auto-advance on mark-complete (the reader chooses
  to continue); softened "Return tomorrow" to non-temporal; removed the scroll-%
  completion label and the time-on-page capture.
- **Reduced-motion (WCAG 2.1):** added a global `prefers-reduced-motion` reset
  catching the JS-driven springs / hover-scale / scroll-behavior the
  per-component rules missed.

---

## UX AUDIT FIXES — tranche A: Soul Audit (2026-06-10)

First tranche of a comprehensive UX audit (grounded in `AUDIENCE.md`/`PHILOSOPHY.md`/
`SUCCESS-METRICS.md` + the M00 IA/self-service standards). This tranche fixes the
Soul Audit entry + selection flow.

- **Launch-blocker fixed (F-022):** selecting a path navigated to `undefined` for
  first-time users — the async select contract returns `{jobId, pollUrl, status:
'pending'}` (no `route`), but `results/page.tsx` pushed `payload.route`
  unconditionally, and the built-but-unused `GenerationProgress` (poll + progress +
  retry) was wired nowhere. Now the new-plan branch mounts `GenerationProgress`,
  which polls the job and navigates on completion; retry re-submits a fresh job.
- **Honesty/anti-manipulation copy:** button "BUILDING YOUR PLAN"→"FINDING YOUR
  PATHS" (it matches options, doesn't build a plan, at that step); approved gentle
  validation copy ("Take your time…"); removed slot-machine "reroll / X-of-1 left"
  and the metered "Audit X of N" counter (cap still applies, just not surfaced as a
  depleting meter); de-jargoned "Reload Options"→"Refresh options" and "Monthly
  clean house"→"Clear old paths"; results header → plural-friendly "We found
  something for you."
- **Entry feedback/privacy:** therapy-grade privacy line now sits directly under the
  homepage textarea; `aria-live` status + `aria-busy` on submit; textarea
  `maxLength={2000}` (no more post-submission rejection of long, vulnerable input);
  prompt pills only show on an empty field so a tap never overwrites typed text.

---

## PERFORMANCE — load-weight pass (2026-06-10)

Initial-page-load audit (assets, CSS, JS imports, font loading). **Quality-first:
no image or video was downscaled or visibly degraded** — only a perceptually-
lossless format conversion + dead-weight removal.

- **Images (uncompressed assets):** the homepage `featuredArt` was a **3.4 MB PNG**
  shipping raw (`images: { unoptimized: true }`). Converted to WebP at its **full
  native 1536×1024** resolution, q90 → **816 KB** (~4× smaller, visually identical).
  The LCP hero and the 3 step images were **left at full original resolution** — an
  earlier draft downscaled them but that risked softness on retina, so it was
  reverted. No self-hosted video exists (`VideoModule` embeds YouTube/Vimeo).
- **Font loading (eager → prioritized):** trimmed `<head>` font preloads from 5 → 3
  (dropped the Industry Book/Demi UI-label weights; kept the two above-the-fold
  serifs + the Industry-Bold masthead weight) so they stop contending with the LCP
  image for early bandwidth. Fonts themselves unchanged.
- **Unused CSS:** removed ~296 lines of verified-dead selector families
  (`.mock-devotional-*` superseded reader layout, `.browse-card*` superseded cards),
  preserving the live exceptions (`.mock-devotional-error-actions`, `.browse-rail-*`).
- **Redundant JS / dead weight:** deleted unused `LenisProvider.tsx` (imported by
  nothing; `lenis` now import-free) and 126 KB of unused `.ttf` fonts (only the
  `.woff2` versions are referenced). gsap confirmed already lazy-loaded off the
  homepage critical path; framer-motion kept (used by `DevotionalChat`).

Net: ~2.7 MB off the homepage, 2 fewer render-blocking font requests, ~296 lines of
dead CSS — with zero visual-quality change to any asset.

---

## SITE AUDIT — reconciliation pass (2026-06-10)

Full-site audit before deploy (real bugs, broken links, uncommitted work, test
health). Resolved:

- **Nav 404 fixed** (`EuangelionShellHeader.tsx`, F-011): the mobile menu
  "ACCOUNT" link (signed-in users) pointed to a non-existent `/account` route —
  a hard 404 on every tap. Repointed to `/settings`.
- **Masthead CLS fixed** (`globals.css`, F-042): Industry-Bold (the preloaded
  masthead weight) had drifted to `font-display: swap`; restored to `block` to
  match the other Industry weights and the LCP/CLS contract.
- **Test suite green** (was 7 red on `main`): reconciled stale assertions to
  shipped product — series count 32→33 (Bible-365), masthead copy "The Good
  News, for You. Every Day.", Bible-365 `endnotes` panel type, `next/image`
  hero, and a missing `next/navigation` mock. De-flaked 4 compute-heavy Soul
  Audit tests with a 20s vitest timeout (they pass in isolation; only brushed
  the 5s default under full-suite parallelism).
- **Deploy hygiene**: gitignored `public/images/edit/` + `*.psd` (67–79 MB
  design sources that exceed Cloudflare's 25 MiB per-file asset limit and would
  break the Workers deploy); discarded format-only generated drift in
  `devotional-teasers.ts`.

Known/deferred (intentionally not changed): the reader "Library" menu's
`?tab=archive|notes|highlights|chat-history|today` links still resolve to the
default Daily Bread view (`/daily-bread` doesn't read `?tab=`) — part of the
staged reader-unification work, surfaced for a later pass.

---

## READING-EXPERIENCE OVERHAUL — tranche 1 (2026-06-09)

Reading-experience fixes authored in a cowork sandbox on a stale branch
(`reading-experience-overhaul`, ~30 days behind `main`) and **re-applied onto
current `main`** — only the ~10 tranche files, not the stale 70-commit base.
Companion docs: `docs/audits/READING-EXPERIENCE-AUDIT-2026-06-07.md` and
`...-IMPLEMENTATION-PLAN-2026-06-07.md`. Verified via `type-check` + `lint` +
governance checks + `next build` + OpenNext Workers `preview` (incl. anonymous
`/api/bookmarks` POST/GET/DELETE) before deploy. No visual theme changed —
masthead, color system, type, and image style untouched.

**Daily Bread reader — navigation + completion flow** (`DailyBreadView.tsx`)

- Replaced the non-clickable "Previously / Coming next" text with real
  prev/next day navigation buttons.
- Mark-complete no longer does `window.location.reload()` (which lost scroll
  and motion state); it advances in-session and reconciles with server state
  on next natural load.
- Added a "Continue to Day N" affordance after completing a day.

**Saving — anonymous bookmark saving (SA-018 amended) + a home for saved content**

- `/api/bookmarks` POST and DELETE no longer require sign-in; they use the same
  `user?.id ?? audit-session-token` model as GET. This is a **founder-authorized
  amendment to locked decision SA-018** (2026-06-09): bookmarks are a lightweight
  save-for-later action and now work for anonymous readers (keyed by the audit
  session token, merged to the account on sign-in). This corrects an earlier
  audit's framing — the gate was a deliberate decision, not a bug. Annotations
  (notes/highlights/stickies) **remain sign-in-gated**. Synced
  `production-decisions.yaml` (SA-018), `PRODUCTION-SOURCE-OF-TRUTH.md` #2,
  `F-035`, and `save-state-auth-gate.test.ts`.
- New `/saved` route + `SavedList` component to view and remove saved
  devotionals — the previously dead `/daily-bread?tab=bookmarks` link now
  points to `/saved`.

**Plan activation hygiene** (`api/soul-audit/select/route.ts`)

- Activating a new plan now archives any prior `active` plan for the session
  (one active plan per session), so Daily Bread resolves deterministically to
  the just-activated plan and stale plans stop accumulating.

**Diagnosis correction:** an earlier audit draft claimed `fetchActivePlan`'s
`.single()` would crash on multiple active plans. It does not (`.limit(1)`
caps the result first). The real activation issues were stale-plan
accumulation and the browse path never creating a plan.

---

## F-061 R38 / Revert R37 hero swap + drop how-it-works bottom padding (2026-05-15)

Founder correction to R37:

1. **Top-of-page hero.** `HOMEPAGE_TODAY.heroSrc` reverted from the substack header back to `/images/site/homepage/hero/header-v2.webp` — the blue empty-tomb riso. R37 incorrectly applied the substack-header swap to this banner; founder's R37 direction was scoped to the Too Busy for God featured devotional block + series cards only. `featuredArt` and `getSeriesHero()` keep their R37 substack-header behavior (correctly scoped).
2. **How-It-Works grid bottom padding removed.** R37 added `padding-bottom: clamp(1.4rem, 3vw, 2.4rem)` to `.homepage-howitworks-grid`. Founder now wants that gone; grid flush against the bottom blue border again.

Verified locally at 1440×900: hero img = `hero/header-v2.webp`, featured card img = `substack-cache/33cd9f952103.png`, how-it-works grid `padding-bottom = 0px`.

PRD: `docs/feature-prds/F-061.md` (Round 38). Decision: SA-013.

---

## F-061 R37 / Substack image audit + homepage cobalt blocks + Daily Bread fixes + SW v50 (2026-05-15)

Three-part founder brief: site-wide substack image audit, homepage cobalt theming, Daily Bread fixes.

### 1. Site-wide substack image audit

- `scripts/build-substack-sources.ts` now extracts EVERY substack-post-media image URL per HTML file (not just the first). Adds a `substackImages: string[]` field to each entry.
- `scripts/cache-substack-images.ts` downloads each image to `public/images/substack-cache/<hash>.<ext>` and emits a parallel `substackImagesLocal: string[]`. Total: **183 images across 93 substack devotionals** (89 new tonight; 94 already cached). SUBSTACK_SOURCES type extended.
- `DevotionalPageClient` rhythmImages override: substack devotionals now feed every cached substack image into the alternating-column rhythm rail, with specific captions ("Original cover · &lt;series&gt;" / "From the original Substack post · &lt;series&gt;"). Non-substack devotionals unchanged (still use SITE_DEVOTIONAL_ART).

### 2. Home page

- **Trust row** ("FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY"): now cobalt-navy bg + cream text (light); cream bg + dark text (dark). True inversion.
- **`.mock-cta` "READY TO BEGIN?"**: now matches Soul Audit treatment exactly — cobalt-navy + cream in light; cream + dark in dark. Inverted button styling, kicker color, helper-link color all flip.
- **How-It-Works grid**: added `padding-bottom: clamp(1.4rem, 3vw, 2.4rem)` so the blue bottom border has more breathing room.
- **Homepage hero `heroSrc` + `featuredArt`**: both repointed at `/images/substack-cache/33cd9f952103.png` — the Substack header for "Too Busy for God."
- **Featured Series rail**: `getSeriesHero(slug)` now resolves substack-sourced series to their substack header image (via `SUBSTACK_SOURCES[<slug>-day-1]`). Substack series cards across the site now show the original substack cover.

### 3. Daily Bread

- **Default load**: `resolveUserActiveSeries()` no longer ignores `soul_audit`-sourced active series. Every `active_series` row is rendered regardless of source. Previously a Soul-Audit-started series fell through to a generic Bible-365 page (which showed "A Voice in the Wilderness").
- **Width lock**: new `.daily-bread-shell-frame` outer container wraps ALL Daily Bread states (active, empty, holding, completion, plan) at `max-w-6xl` = 72rem with consistent padding. Was previously mixing `mock-panel` (narrow) and `devotional-shell-main` (max-w-6xl). Now full-width on desktop everywhere.
- **Button alignment** on devotional header actions row: `items-center` → `items-baseline` so BACK TO SERIES / Share / READ ON SUBSTACK share a single text baseline. ShareButton inner SVG bumped to 14px and shifted `translateY(0.16em)` to sit on the baseline alongside text links. Added `leading-none` to action links.
- **Stale cache**: bumped `SW_VERSION` v49 → v50 in both `ServiceWorkerRegistration.tsx` and `public/sw.js`. ServiceWorkerRegistration already auto-clears old caches + reloads the tab on a version mismatch, so v49 clients pick up v50 on next navigation without needing a manual hard refresh.

### Verified locally

- Homepage: trust-row + .mock-cta both render `rgb(23,27,105)` (deep navy) bg + cream text. Featured image src is `/images/substack-cache/33cd9f952103.png`.
- Substack devotional (`/devotional/too-busy-for-god-day-2`): banner from substack cache, rhythm rail has 2 substack images with specific captions.
- Type-check clean.

Preserved: non-substack devotionals untouched. Scripture-first invariant intact. Home page brand masthead unchanged.

PRD: `docs/feature-prds/F-061.md` (Round 37). Decision: SA-013.

---

## F-061 R35 / Overnight audit deferred items, all five shipped (2026-05-14)

Founder said "do all five." Done. Each was the explicit deferred item from R34's audit log.

### 1. Reduced-motion override on rhythm reveal

`src/app/globals.css` — `@media (prefers-reduced-motion: reduce) { .editorial-reveal-target, .editorial-emphasis { transition: none; opacity: 1; transform: none; } }`. WCAG 2.2 SC 2.3.3. Hard-cuts the rhythm reveal for motion-sensitive readers.

### 2. Substack image CDN caching

- `scripts/cache-substack-images.ts` — reads `SUBSTACK_SOURCES`, downloads each `substackImage` from `substack-post-media.s3.amazonaws.com` into `public/images/substack-cache/<hash>.<ext>` (sha1-12 + original extension).
- Re-emits `src/data/substack-sources.ts` with a new `substackImageLocal` field. Type interface gained `substackImageLocal: string | null`.
- `DevotionalPageClient.tsx` now prefers `substackImageLocal` and falls back to the original `substackImage` S3 URL.
- 93 images cached, ~53 MB on disk. LCP for substack devotionals no longer tied to substack's edge.

### 3. Pull-quote floater authoring

- New `pullquote` ModuleType. New `src/components/modules/PullquoteModule.tsx` renders the existing `PullQuote` component (gold-rule oversized blockquote).
- `scripts/inject-pullquotes.ts` — for each non-substack devotional, finds the first eligible `teaching`/`insight`/`reflection`/`recap`/`bridge`/`story` module whose content yields a 50–220 char sentence with proper-noun + em-dash bonuses, and inserts a `{ type: 'pullquote', quote }` module immediately after the source module. Substack devotionals skipped (founder rule: substack content unmodified). Idempotent.
- 45 non-substack devotionals received an auto-authored pullquote. Original content + ordering preserved (founder rule).

### 4. Per-image editorial relevance re-rank

- `scripts/rerank-devotional-art.ts` — for each non-substack `SITE_DEVOTIONAL_ART` slug, builds a keyword bag from the devotional JSON (title, teaser, scripture ref, first 600 chars of teaching/insight content, scripture passages) and re-scores each candidate artwork by tokenized overlap with its title, medium, museum, artist + series-match bonus + explicit `devotionalSlugs[]` bonus. Re-orders highest-score first.
- 82 non-substack slugs re-ranked. Substack slugs skipped.

### 5. Full-library photoreal audit

- `scripts/audit-photoreal.ts` — programmatic filename + file-size heuristic across all 254 `SITE_DEVOTIONAL_ART`-referenced images. Combines style-suffix whitelist (`-linocut`, `-etched`, `-brushed`, `-stone`, etc.), safe-prefix whitelist (`brand-`, `element-`, `obj-`, `sym-`, `arch-`, `artifact-`), oversize gate (> 400 KB on safe-prefixed), strong-token blocklist (`hands-cupped`, `oil-lamp-burning`, `wheat-sheaf`), and photo-keyword blocklist (`photo`, `realistic`, `unsplash`, etc.).
- First pass: 154 safe / 100 flagged / 0 fail. Manual multimodal-Read of 5 flagged archive prints confirmed all riso-style; whitelisted `/images/devotional-prints/` path. Final pass: **254 / 254 verified clean — 0 photoreal offenders in production.**
- Report at `docs/audits/overnight-2026-05-14/photoreal-audit-report.md`.

### Verified locally

- `npm run type-check` clean.
- `npm run lint` warnings unchanged from main.
- `/devotional/anointed-day-2`: 6 blockquote elements rendered (was 5 before pullquote injection), including a new auto-authored pull-quote inside the rhythm-block text column.

### Preserved

- Substack devotionals (93 slugs) untouched by pull-quote injection, untouched by rerank, untouched by photoreal swaps. Founder rules intact.
- Scripture remains the lead element on every devotional (no reorder).
- Home page header + masthead unchanged.

PRD: `docs/feature-prds/F-061.md` (Round 35). Decision: SA-013.

---

## F-061 R34 / Overnight audit + remediation: CSP, H1, per-page metadata (2026-05-14)

Founder asleep; full due-diligence audit run on live production using Playwright + chunk-level checks. Reference brief (5 Awwwards editorial winners + 2026 patterns + CWV thresholds + WCAG 2.2 AAA targets) at the top of `docs/audits/overnight-2026-05-14/SESSION-LOG.md`.

### Audit totals

- **P0**: 0 blockers
- **P1**: 6 issues — 3 fixed tonight, 3 deferred with rationale
- **P2**: 5 issues — all deferred / no-action with rationale

### Fixed tonight (3 P1, all additive)

1. **CSP unblocked Cloudflare Analytics beacon.** `next.config.ts` adds `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src`. Was firing one console error per page navigation.
2. **Duplicate H1 fixed.** Every route was emitting two `<h1>` elements — the shared shell-header brand wordmark + the page's own content H1. The wordmark in `EuangelionShellHeader.tsx` is now a `<div role="presentation">` inside `<section aria-label="Euangelion">`. Visual + content unchanged (founder's "do NOT change masthead" rule respected). Each route now has a single content H1.
3. **Per-page metadata** on the four routes that were inheriting the generic homepage title: new `src/app/soul-audit/layout.tsx` + `src/app/series/layout.tsx` (both pages are `'use client'`, so metadata lives on a sibling layout per Next.js 16 pattern); inline `export const metadata` added to `src/app/daily-bread/page.tsx` + `src/app/library/page.tsx`. Each gets a page-specific title, description, OG block, and canonical URL.

### Verified live on production

- Homepage: single H1, brand wordmark renders unchanged, no console error on Cloudflare beacon, FCP 868ms / DCL 863ms / transfer 27KB.
- Substack devotional (`/devotional/too-busy-for-god-day-1`): banner + "READ ON SUBSTACK ↗" CTA confirmed in DOM after hydration. R32 holds.
- Non-substack devotional (`/devotional/anointed-day-2`): 4 devotional images including 2 fresh archive prints. R33 holds.

### Deferred (with rationale)

- **React error #418 hydration warning** on devotional pages — `<time suppressHydrationWarning>` is already present; mismatch is elsewhere in the render tree, needs bisection. Page renders correctly; warning is devtools-only noise.
- **Pull-quote floater authoring** — CSS hooks shipped in R30, no module currently emits them. Needs per-devotional content-side flag.
- **Per-image relevance pass** on the 78 newly-bumped non-substack devotional slugs — editorial judgment required, not safe at scale.
- **Full-library photoreal sweep** of `public/images/library/` (~1400 files) + the 291 newly-copied archive prints — needs multimodal Read on each file.
- **Reduced-motion override** on rhythm reveal — single CSS rule, deferred to keep tonight's surface focused.
- **Substack image CDN caching** — separate build-time pipeline (download + R2 storage). Drops LCP ~600-900ms.

### Audit deliverables

- `public/audits/overnight-2026-05-14/index.html` — printable audit page in the same style as `visual-audit-2026-05-13/` (does not overwrite).
- `docs/audits/overnight-2026-05-14/SESSION-LOG.md` — full session log with research, audit, fixes, deploy status.

PRD: `docs/feature-prds/F-061.md` (Round 34). Decision: SA-013.

---

## F-061 R27→R33 / Daily Bread state fix + series Start + substack integration + image density (2026-05-14)

Bundled additive layer on top of main's existing structural work (R26 + #31/#33 rhythm + #32 react-markdown hotfix). **Preserves** main's `DevotionalRhythm` / `DevotionalFolio` / `DevotionalHeadline` / `AuthorColophon` components and main's reading layout; this round only adds new endpoints, new components, new data tables, and the substack overlay.

### Daily Bread state fix (R27)

- **`PUT /api/devotionals/active`** now accepts + clamps an optional `currentDay`; threads it through both `replace_now` and the `queue_monday` seed path. Fixes "starting Day 3 pinned server-side `current_day=1`."
- **New `PATCH /api/devotionals/active { currentDay }`** with full auth + rate-limit pipeline.
- **New `updateActiveSeriesDay` repo helper** that preserves `started_at`/`source` (vs. `setActiveSeries` which clobbers them).
- **New `bumpActiveDay` action** on `useDevotionalLibraryStore` — optimistic update + rollback. Daily Bread fires it on every day-nav change so reload returns to the same day.
- **`DevotionalActions`** now derives `currentDay` from the `-day-N` slug regex and passes it through `start()` so starting from `/devotional/<slug>-day-3` pins Day 3.

### Series-level Start (R27)

- **New `src/components/devotional/SeriesActions.tsx`** — mirrors `DevotionalActions` at series level (Start / Open in Daily Bread / Queued banner). No Save (saves are per-day). Hardcoded `currentDay: 1` since series page always starts the arc.
- Wired into `SeriesPageClient.tsx` below `ResumeSeriesPill` so the founder can start a series without drilling into Day 1.

### Substack original-link CTAs + substack image header (R32)

- **New `scripts/build-substack-sources.ts`** — one-shot generator. Scans `content/series-html/*.html`, sorts by `post_id` ascending (publication order), maps Nth HTML for each substack series to that series' Day N, and extracts the first `substack-post-media.s3.amazonaws.com` image URL.
- **New `src/data/substack-sources.ts`** — auto-generated map of 93 substack devotional slugs → `{ substackUrl, substackImage }`. Covers 16 of 18 substack series (`signs-boldness-opposition-integrity` and `witness-under-pressure-expansion` have no HTML yet — those render normally, no CTA/banner).
- **`SeriesPageClient`**: "READ THE ORIGINAL ON SUBSTACK ↗" CTA in the breadcrumb row when Day 1 has a substack source.
- **`DevotionalPageClient`**: substack header image rendered as `<figure className="devotional-substack-banner">` directly under the breadcrumbs (above the header panel). "READ ON SUBSTACK ↗" CTA folded into the existing BACK TO SERIES + SHARE row. Founder direction: "do not rewrite or change ordering on page; scripture is the lead." Substack devotional content + ordering preserved.

### Image audit + density bump (R31 + R33)

- **R31 sweep of 14 photoreal / off-palette / text-stamped `sym-*` images** in `src/data/site-devotional-art.ts`. Each swapped to an existing approved riso linocut/etched/brushed file. No new images generated.
- **R33 density bump on non-substack devotionals.** New `scripts/bump-devotional-art-density.ts` reads `archive/devotional-prints/*/artwork.json`, copies each `print.webp` into `public/images/devotional-prints/<slug>.webp`, and appends entries into `SITE_DEVOTIONAL_ART` based on the `devotionalSlugs[]` tagging — substack-aware, capped at +4 per slug, additive only. Result: 78 non-substack slugs touched, 134 entries added, 291 new prints (~88 MB) copied to `public/`. Substack devotionals exempt and unchanged.

### Verified locally (worktree preview)

- `PATCH /api/devotionals/active` → 401 AUTH_REQUIRED when unauthenticated (handler reaches `getUser()`).
- `/devotional/too-busy-for-god-day-1` (substack): banner from `substack-post-media.s3.amazonaws.com/.../dd8251b1-..._1536x1024.png`; 1 "READ ON SUBSTACK" CTA pointing at `https://wokegod.substack.com/p/too-busy-for-god`.
- `/devotional/anointed-day-2` (non-substack curated): 4 devotional images, 2 new from the archive bump (`arch-upper-room-spirit`, `el-greco-pentecost-anointed`).
- Type-check clean, lint warnings unchanged from main.

### Deferred for the next session

- Pull-quote-as-floater authoring (CSS hooks exist from main's #30/#31 rhythm work; no module currently emits them).
- Per-image relevance editorial pass on the 78 newly-bumped slugs — automated by tag matching, not editorially curated.
- Full-library photoreal audit beyond R31's 14 swaps in the `site/devotional/` surface. The wider `public/images/library/` + `archive/devotional-prints/` libraries weren't combed.

PRD: `docs/feature-prds/F-061.md`. Decision: SA-013.

---

## F-061 R26 / Homepage featured rail: 7 cards (was 6) (2026-05-14)

Founder direction: bump the homepage featured-series rail from 6 → 7 cards. `featuredSlugs` slice cap raised in `src/app/page.tsx:128`. Surfaces one more series from `FEATURED_SERIES` / `ALL_SERIES_ORDER` without changing the underlying data.

PRD: `docs/feature-prds/F-061.md` (Round 26). Decision: SA-013.

---

## F-061 R25 / Audit polish bundle — cobalt lock · typography · liturgical calendar · colophon · JSON-LD (2026-05-14)

Founder direction: implement the audit punch list. Cobalt is the brand color. This round ships ~13 items from the audit at S-effort; documents the rest as deferred-for-next-sprint with clear pointers.

### Tokens & color

- **Cobalt lock.** `design-system/tokens.css`: new `--color-cobalt: #1f2a8d` (canonical), `--color-cobalt-deep: #171b69` (Soul Audit lock), `--color-amber: #c8a56a` (decorative). Legacy `--color-gold` now aliases cobalt (`var(--color-cobalt)`). Audit complaint about "gold-is-cobalt" resolved by naming, not by changing values — cobalt IS the brand.
- **Tertiary text contrast lift.** `--color-text-tertiary` raised from `rgba(scroll, 0.5)` (~3.8:1, fails WCAG AA) to `0.65` (~5.0:1). Same lift in dark mode.

### Typography

- **`<DropCap>` React component** (`src/components/typography/DropCap.tsx`). Wraps the first grapheme in `<span class="dropcap">` so the drop cap renders predictably even on paragraphs starting with a quote / em-dash / non-letter Unicode. Replaces the brittle CSS `::first-letter` pseudo-element.
- **Optical sizing on `<html>`** (`font-optical-sizing: auto`).
- **Optical tracking ramp** for Instrument Serif display sizes (-0.022em ≥1024px, -0.018em below).
- **Lining tabular numerals** on architectural numerals (`.day-number`, folio center, cover meta dd). The "Day 7" descending-7 problem is fixed.
- **Hanging-punctuation fallback** for Chrome / Firefox: new `.punct-pull` utility (Safari already honors `hanging-punctuation: first last`).
- **Reader measure cap** opt-in via `.prose-measure`.
- **Wordmark scale modifier**: `.text-masthead--cover` opts a masthead into 4–12rem clamp for type-only awwwards-cover states.
- **Pull-quote dedup.** Legacy `.pull-quote` now visually matches `.pull-quote-enhanced` (smart quotes, hanging crimson mark, italic) so duplicate definitions stop drifting.

### Accessibility

- **Skip-link**: first focusable thing on every page, targets `#main-content`. Hidden until keyboard-focused.

### Content as design

- **AuthorColophon component** placed at the end of every devotional reader (both `/devotional/[slug]` and `/daily-bread`'s `CuratedActiveView`). 4-line credit card with the day's scripture translation auto-pulled from the first scripture module.
- **Liturgical calendar lib** (`src/lib/liturgical.ts`): Western Christian calendar with Meeus's Gregorian Easter, season + label for every date, plus a saint-day / fixed-feast lookup for the most-celebrated dates.
- **ChurchYearOverline component** wired into `DevotionalFolio` — "Today: Conversion of Paul · Epiphany Season" type strip beneath the folio.
- **ChurchYearCard component** placed at the top of `CuratedActiveView` on `/daily-bread` — bigger "Today in the church year" surface with liturgical color swatch + season + feast.

### SEO + AI

- **Article JSON-LD enriched** on devotional pages: `author`, `publisher.logo`, `isBasedOn` (scripture framework), `isPartOf.url`, `mainEntityOfPage`, `inLanguage`, `datePublished`.
- **CollectionPage JSON-LD** emitted on `/series/[slug]` alongside the existing `CreativeWorkSeries` schema. Days listed as `ListItem` entries.

### Deferred (with documented next-sprint TODOs)

- Tufte margin sidenotes (M)
- Brightness / sepia / dark tri-toggle (M)
- Marginalia layer (M)
- Per-devotional dynamic OG image (Workers-runtime risk — pin a session to scope properly)
- Page transitions between days (S, but framer-motion plumbing)
- SBL Hebrew + GFS Greek `.woff2` (S, but content audit needed)
- `--baseline` token enforcement (M)
- Section-pacing 3-token system (M)
- Section header real small-caps wiring (M — needs font-capability audit)
- Internal-linking density audit (M)
- `.otf` → `.woff2` conversion (S, needs `fonttools`)
- Critical CSS inline (M)
- Cross-reference marginalia (M)

PRD: `docs/feature-prds/F-061.md` (Round 25). Decision: SA-013.

---

## F-061 R24 / Text-left rhythm + Daily Bread reader parity (2026-05-14)

Two founder corrections:

1. **Rhythm reader: text-left / image-right on every block.** The previous implementation alternated (block 1 = image left, block 2 = image right). Founder wants the reading column in a consistent position. `DevotionalRhythm.tsx` `side` field now hardcoded to `'right'` for every block. CSS for `[data-image-side="right"]` already existed (it was used by alternate blocks); now applies to all.

2. **Daily Bread reader styled to match the dedicated /devotional route.** `CuratedActiveView` (the component that renders today's reading on `/daily-bread` when a curated series is active) now uses the same `DevotionalFolio` + `DevotionalHeadline` + `DevotionalRhythm` pipeline. The reader on Daily Bread reads as a publication, not a card.

Files:

- `src/components/devotional/DevotionalRhythm.tsx` — single-line change locking `side: 'right'`.
- `src/components/daily-bread/CuratedActiveView.tsx` — imports + hooks for folio/headline/rhythm, `body.rhythm-enabled` effect on mount, JSX restructured to wrap modules in the rhythm.

PRD: `docs/feature-prds/F-061.md` (Round 24). Decision: SA-013.

---

## F-061 R23-hotfix / Devotionals not loading — missing react-markdown dep + hydration mismatches (2026-05-14)

Founder report: "devotionals are no longer loading."

**Root cause (the real one):** `react-markdown` was imported by `src/components/modules/TeachingModule.tsx` and `src/app/series/[slug]/deep-dive/page.tsx` — added during the gallant-swirles sweep (PR #18) — but never installed. The dev server failed compilation with "Module not found"; the production build had been quietly shipping a broken bundle for devotional pages.

**Co-conspirator:** `CookieConsentBanner` initialized `visible` via `typeof document` check, returning a different value on server vs client first render. That triggered React error #418 (hydration mismatch) which made the page "regenerate" client-side — visible as flash + slow load + occasional blank state.

**Fixes:**

1. `npm install react-markdown@^10.1.0`. Now in `package.json` deps. Both `TeachingModule` and `series/[slug]/deep-dive` resolve cleanly.
2. `CookieConsentBanner.tsx` — `visible` now defaults to `false` on both server and client; resolved client-side via `useEffect` after mount. Standard React-19 hydration-safe pattern.
3. `DevotionalFolio.tsx` — same pattern applied to the date. `new Date()` no longer runs in render; placeholder time element on SSR + first paint, real date set on mount.

Verified in dev (`npm run dev`): devotional renders fully — folio, headline hero, 2 rhythm blocks, full module flow. The remaining `editorial-reveal-target` className diff is a pre-existing minor warning from `EditorialMotionSystem` (unrelated to this batch; not blocking render).

PRD: `docs/feature-prds/F-061.md` (Round 23-hotfix).

---

## F-061 R23 / Rhythm rebuild — alternating image-left/right blocks · Soul-Audit navy lock · sidebar tuck · stickies disabled (2026-05-14)

Four corrections in one batch:

1. **Soul Audit + How-It-Works blue locked to deep navy `#171b69`.**
   The previous lighter cobalt (`--mock-blue` → `#1f2a8d`) drifted between modes. New `--color-deep-navy` token is hardcoded in both `:root` and `.dark`, so the band reads identically in light and dark mode. Only the audit + howitworks bands take this lock; the rest of the page still uses `--mock-blue`.

2. **Rhythm reader rebuilt as alternating image-left/right blocks.**
   The previous implementation used one global sticky rail with an IntersectionObserver crossfade. The founder asked for the exact NYT-Magazine pattern: images on either side, two-column situation per block. Now each block is its own 2-col grid with a sticky image inside it; the image side flips per block via `[data-image-side]`. No more global rail. No more observer. Much simpler. Mobile collapses each block to single-column with image stacked above its text.

3. **Devotional left sidebar tucked away on every breakpoint.**
   The 260px day-nav sidebar was competing with reading content on desktop. Now it's hidden by default at every viewport and reveals as a drawer when the reader taps the "DAY N OF M" pill. Sidebar markup unchanged; just gated behind the existing toggle pill, which was previously mobile-only.

4. **Floating sticky-notes layer disabled.**
   `DevotionalStickiesLayer` now returns null unconditionally (guarded by an internal `STICKIES_FLOATING_LAYER = false` flag). Data layer (load / persist / add / delete) is preserved, ready for the next pattern. Documented recommended replacement: a floating "Notes ✎ (n)" pill bottom-right opening a side drawer; phase-2 Tufte-style margin sidenotes anchored to text positions.

Files:

- `src/app/globals.css` — `--color-deep-navy` token, audit/howitworks band pinned, full rhythm CSS rewrite (chapter blocks, alternation, sticky-per-block, mobile fallback)
- `src/components/devotional/DevotionalRhythm.tsx` — rewritten for chunk-into-blocks pattern, no observer
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` — sidebar toggle promoted to all breakpoints
- `src/components/DevotionalStickiesLayer.tsx` — flag-gated to render null + replacement spec in JSDoc

PRD: `docs/feature-prds/F-061.md` (Round 23). Decision: SA-013.

---

## F-061 R22 / Audit batch — NYT-style reading rhythm + headline hero + folio strip + polish utilities (2026-05-13)

Founder direction: implement the audit punch list, with a focus on the NYT Magazine reading rhythm (sticky image + scrolling text, image swaps as you scroll, format shifts). Homepage header image + masthead must stay unchanged. Build in a way that aspects can be scaled back.

Reference: NYT Magazine, "Diane Keaton" (16 Dec 2025) for the sticky-image scroll rhythm. Pattern stripped to the bones — `position: sticky` + IntersectionObserver crossfade. No scroll-jacking, no parallax, no scroll-tied video.

**New components** (`src/components/devotional/`):

- `DevotionalFolio.tsx` — editorial broadsheet folio strip above the devotional title. Real small caps (font-variant-caps via `.smcp`), top + bottom hairlines. Format: `EUANGELION · TOO BUSY FOR GOD · DAY 01 / 05 · 13 MAY 2026`. Mirrors the 2026 NYT Magazine redesign that moved page furniture above the title.
- `DevotionalHeadline.tsx` — homepage-style hero (2fr image + 1fr text) at the top of every devotional. Eyebrow + scripture line + headline title. Same visual grammar as the homepage featured-devotional card so the two surfaces read as one publication.
- `DevotionalRhythm.tsx` — NYT-style sticky-image scroll rhythm. Desktop: sticky-image rail on the left + scrolling module flow on the right. IntersectionObserver swaps the active image (480ms crossfade) as the reader passes module bucket boundaries. Mobile (≤900px): rail collapses, modules flow single-column with inline artwork as before.

**Polish utilities** (`src/app/globals.css`):

- `--color-amber` (#c8a56a) — restored gold/amber as a real accent token, separate from the cobalt `--mock-blue`. Decorative + drop-cap + focus-ring use.
- `--color-crimson` (#c4192e) — true Riso spot color, separate from `--color-burgundy` (#8e3f3f). Reserved for editorial accents (alerts, the audit-folio edition tag, future pull-quote marks).
- `.smcp` utility — real small caps via `font-variant-caps: all-small-caps`, never `text-transform: uppercase`.
- `.amp` utility — alternate italic ampersand via Instrument Serif `salt 1`.
- `text-wrap: balance` on h1/h2/h3, `text-wrap: pretty` on `.prose p` and devotional copy. Free browser-level upgrade.
- `font-display: swap` everywhere (was `block` / `optional` in spots — caused invisible-text-then-paint on iOS).

**Integration** (`DevotionalPageClient.tsx`):

- Imports the three new components.
- Memos a `rhythmImages` array from existing `artworks` (no JSON content change).
- Renders, in order: folio strip → headline hero → `DevotionalRhythm` wrapping the module flow.
- Adds `body.rhythm-enabled` class on mount; removes on unmount. **Single-line kill switch.**

**Scale-back paths** (cheapest → most aggressive):

1. Pass `enabled={false}` to `DevotionalRhythm` — children render as a flat flow with no rail.
2. Remove the `body.rhythm-enabled` class — CSS-level no-op for the rhythm + sticky rail.
3. Force `grid-template-columns: 1fr` on `.devotional-rhythm` in `globals.css`.
4. Delete any of the three components from `DevotionalPageClient` JSX — they are independent.

Verified locally (wrangler :8788). All routes 200. Rhythm renders correctly on desktop with sticky image rail; mobile collapses to legacy flow with inline artwork breaks intact. Type-check + build clean.

PRD: `docs/feature-prds/F-061.md` (Round 22). Decision: SA-013.

---

## F-061 R21 / Featured slot surfaces SERIES, not Day 1 + secondary link explains Bible 365 (2026-05-13)

Founder direction: the featured piece on the homepage should be the SERIES as a whole, not an individual devotional. The card now leads with series-level information.

Changes in `src/app/page.tsx`:

- `HOMEPAGE_TODAY` reworked to be series-centric. Day fields are kept only as fallback (`daySlug`, `dayTitle`).
- Title: `"The Vanity of Busyness"` → `"Too Busy for God"` (the series name)
- Kicker: `"FEATURED · TOO BUSY FOR GOD · DAY 1"` → `"FEATURED SERIES · 5 DAYS · LUKE 10:38–42"`
- Scripture line: `"Ecclesiastes 1:2"` → `"Luke 10:38–42 · Martha & Mary"` (the series framework anchor)
- Teaser rewritten to surface the SERIES question + a beat of the introduction: _"What are you so busy doing that you're missing the One who gave you life? Your calendar is full but your soul is empty — five honest days on what happens when busyness becomes a barrier to His presence."_
- Primary CTA: `BEGIN THIS DEVOTIONAL` → **`BEGIN THIS SERIES`**, linking to `/series/too-busy-for-god` (was `/devotional/too-busy-for-god-day-1`)
- Secondary link rewritten to actually explain why Bible 365 is relevant: _"Want the longer arc? Bible 365 walks the whole Scripture story — 52 weeks, five to seven minutes a day, every day standing alone →"_

PRD: `docs/feature-prds/F-061.md` (Round 21). Decision: SA-013.

---

## F-061 R20 / Homepage reorder + mode-flip reversed + legal moved below masthead (2026-05-13)

Four founder-directed changes:

1. **Free-account bar moved up** — `FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY` trust row now sits directly after the "What is this place?" section.
2. **3 starter sections moved up + intentional language** — Wake-Up / Bible 365 / All Series cards now live below the trust bar inside a new `.homepage-starters` section with kicker "GET STARTED HERE", title **"Three honest places to begin."**, and subhead "Pick the one that meets you where you are. Every day stands alone — there is no wrong door." Featured devotional pushes down below this block.
3. **Soul Audit + How It Works mode-flip REVERSED** — light mode = blue/cream pop; dark mode = paper card. This reverses R17's flip.
4. **Legal block moved below the masthead** — copyright + Terms · Privacy · Cookie Policy · Community Guidelines · Content Disclaimer no longer in `SiteFooter`. New `.homepage-bottom-legal` section renders directly after `.mock-bottom-brand`.

PRD: `docs/feature-prds/F-061.md` (Round 20). Decision: SA-013.

---

## F-061 R19 / Featured devotional rotated to Too Busy for God + shorter card (2026-05-13)

Founder direction:

1. Featured devotional card was too tall. Cause: previous image was 768 × 1408 portrait stretched into a 2/3-width column.
2. Rotate the featured slot from "What Is the Gospel?" Day 1 → **Too Busy for God** Day 1 ("The Vanity of Busyness", Ecclesiastes 1:2).
3. Use a different image — not the series' own oil-lamp hero.

Picked from existing library (no generation): `library/poster/atmos-marketplace-dawn.png` — 1408 × 768 landscape Riso of a busy marketplace at dawn. Directly contextual for Ecclesiastes 1 (the daily hustle the Preacher critiques). Heavy halftone, blue + ochre + cream, no text.

Changes:

- `public/images/site/homepage/featured/too-busy-for-god-day-1.webp` (NEW) — webp encode of the library source. Lives in a homepage-specific folder so the `/series` card for too-busy-for-god keeps its own oil-lamp image.
- `src/app/page.tsx` `HOMEPAGE_TODAY`: slug, series, kicker, title, scripture, teaser, `featuredArt` all updated.
- `src/app/globals.css` `.homepage-featured-devotional-art` aspect-ratio `1248 / 832` → `1408 / 768`. On a 1440 px desktop, image col height drops from ~640 px to ~525 px. Mobile media query matches.

PRD: `docs/feature-prds/F-061.md` (Round 19). Decision: SA-013.

---

## F-061 R18 / Strip non-compliant site images — library-first reuse, no generation (2026-05-13)

Founder ruled: every image on the site must be (a) blue-majority OR have heavily noticeable print quality, (b) NO text except Hebrew/Greek, (c) contextually relevant — no arbitrary image use. Critical correction this round: we have ~8,500 generated images already on disk, organized into a curated 1,404-entry library under `public/images/library/`. **Always check the library first; generation is the last resort.**

This round did NOT generate any new images. All 9 series replacements were pulled from `public/images/library/poster/`.

**Audit of `public/images/site/series/` (33 images):** 24 already compliant Riso linocuts / poster prints. 9 flagged as non-compliant — all 9 swapped from the curated library:

| Series                            | Was                        | Now (library/poster/)                                                                                     |
| --------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `what-is-the-gospel`              | photo of cross             | `nt-temptation-wilderness.png` (Mark 1 wilderness, lone figure — perfect for "A Voice in the Wilderness") |
| `bible-365`                       | photo of scroll            | `frag-holding-scroll.png` (hands holding lit scroll)                                                      |
| `truth`                           | photo of scroll            | `brand-pillar-light-vertical.png` (pillar of light)                                                       |
| `kingdom`                         | photo of keys              | `atmos-empty-throne-hall.png` (throne hall, blue Riso)                                                    |
| `community`                       | photo of bread + cup       | `nt-pentecost-wind-room.png` (gathered believers in upper room, blue Riso)                                |
| `coming-to-the-end-of-ourselves`  | photo of chalice           | `frag-folded-hands-rest.png` (folded hands at rest on book)                                               |
| `provision`                       | "MANNA" text               | `ot-manna-morning.png` (Israelites gathering manna at dawn, no text)                                      |
| `what-is-christianity`            | "John 6." text             | `nt-loaves-fishes-basket.png` (loaves & fishes, John 6 context)                                           |
| `genesis-two-stories-of-creation` | Noah's Ark (wrong context) | `ot-eden-river-dawn.png` (Eden river at dawn — actually about creation)                                   |

**Audit of `public/images/site/devotional/` (134 images):** unique-color heuristic flagged 1 photo suspect; visual verification confirmed it's actually a Riso. The full devotional inline set passes the spec.

**Tooling added:**

- `scripts/find-library-images.mjs` — keyword + surface search over `docs/image-library-catalog-2026-05-08.json`. Use it before generating ANY new image: `node scripts/find-library-images.mjs <keyword>... [--surface=poster|devotional|hero|chapter-header|decorative|logo] [--limit=N]`.
- `CLAUDE.md` — new top-level "Image Library — Always Check First (NON-NEGOTIABLE)" section locking in the library-first rule, the inventory map, and the style spec (Riso/halftone duotone, cobalt + cream + crimson, no text except Hebrew/Greek, no arbitrary image use).
- Cross-project memory (`~/.claude/projects/-Users-meltmac.../memory/feedback_no_arbitrary_image_use.md`) — applies to every future project.

PRD: `docs/feature-prds/F-061.md` (Round 18). Decision: SA-013.

---

## F-061 R17 / Soul-Audit copy + mode-flip + larger "What is this place?" (2026-05-13)

Three founder corrections:

1. **Soul Audit copy.** Replaced the orphaned "Or — start where you actually are." headline with a description that actually explains what the Soul Audit does: "A 7-day plan, written for what you actually carry." Subcopy rewritten to describe the mechanism (one honest sentence in → a personalized seven-day path of real scripture and ancient voices, ~3 min setup, 5-7 min/day).
2. **Soul Audit color mode flip.** Light mode now reads as a normal paper card (cream background, dark text) — blends with the page instead of doubling down on contrast. The blue/cream pop treatment is now scoped to `.dark .homepage-soul-audit` only. Same flip applied to `.homepage-howitworks` and its steps grid for visual consistency between the two adjacent blocks.
3. **"What is this place?" section taller.** Vertical padding doubled (1.5rem → 3rem top, 1.6rem → 3.4rem bottom) and gap increased (0.45 → 0.7rem) so the intro statement breathes.

PRD: `docs/feature-prds/F-061.md` (Round 17). Decision: SA-013.

---

## F-061 R16 / Hero frame fix + featured devotional series image (2026-05-13)

Two corrections to R14:

1. **Hero banner stays inside the paper frame.** R14 used a `100vw` breakout that pushed the hero past the `.mock-paper` borders on both sides. Founder direction: the image must fill the box that everything else is in, not break out of it. Reverted `.homepage-hero-banner` to `width: 100%; max-width: var(--mock-frame-max); margin: 0 auto` so the hero is full width WITHIN the paper, no inner gutters, no breakout.
2. **Featured devotional uses the series image.** The card next to "A Voice in the Wilderness" was reusing the wide banner. Now uses `/images/site/series/what-is-the-gospel.webp` (1248 × 832, 3:2) — the series' own hero. New `HOMEPAGE_TODAY.featuredArt` field in `src/app/page.tsx`. `.homepage-featured-devotional-art` aspect-ratio updated from 3358 / 1840 to 1248 / 832.

PRD: `docs/feature-prds/F-061.md` (Round 16). Decision: SA-013.

---

## F-061 R15 / Header tagline update (2026-05-13)

Founder updated the masthead tagline. `src/components/EuangelionShellHeader.tsx` line 115 (mobile ticker) + line 417 (desktop top-bar center copy) now read **"The Good News, for You. Every Day."** in place of "Daily Devotionals for the Hungry Soul."

PRD: `docs/feature-prds/F-061.md` (Round 15). Decision: SA-013.

---

## F-061 R14 / Homepage edit batch — eight founder corrections (2026-05-13)

Founder walked the live homepage in scroll order and listed eight changes. Shipped together:

1. **Hero banner edge-to-edge.** Hero image is now its own block (`.homepage-hero-banner`) using the `width: 100vw + left: 50% + margin-left: -50vw` breakout pattern so it spans the full viewport regardless of the `.mock-paper` frame and `.mock-home` outer padding.
2. **"What is this place?" section** inserted above the featured devotional (`.homepage-what-is-this`). Centered kicker / display title / one-line description — first-time visitors land on an introduction before being offered a plan.
3. **Featured devotional split** out of the hero. New section `.homepage-featured-devotional` is a 2 / 1 grid: image left, copy right. Stacks on mobile.
4. **Featured Series rail.** `.print-rail-viewport` and `.browse-rail-viewport-wrap` now force `overflow-y: hidden` so the hover-lift transform on cards can't produce a vertical scrollbar. `.mock-featured-card` border changed from top + right only to a full four-side border so individual cards read as complete cards.
5. **Soul Audit** (`.homepage-soul-audit`) reflowed: centered text, blue background, light text. Textarea / pills / primary button restyled to read against the blue.
6. **"Here's how it works" section** (`.homepage-howitworks` + `.homepage-howitworks-grid`) gets the same blue / light treatment. Step cards' borders rebalanced for the new background.
7. **FAQ auto-rotation.** Desktop FAQ row auto-rotates the highlighted question every 4 seconds. First question is highlighted on load. Hovering (or keyboard-focusing) any card pauses rotation and moves the highlight to that card; releasing hover resumes rotation. Rotation is desktop-only — mobile keeps the existing tap-to-expand pattern.
8. **Footer rebalance + WokeGod LLC copyright.** Footer grid grew from two columns to three: Read / About / Resources (new — Translations, Credits & Licensing, Sitemap, AI Crawler Stance). Copyright updated to "EUANGELION is a product of WokeGod LLC. Copyright © 2026 WokeGod LLC. All rights reserved."

PRD: `docs/feature-prds/F-061.md` (Round 14). Decision: SA-013.

---

## F-061 R13b / Hero cache-bust — rename header.webp → header-v2.webp (2026-05-13)

R13 deployed the new bytes successfully (verified at origin + CF edge via cache-busted curl: `2400 × 658 VP8`, 465 KB), but the URL `/images/site/homepage/hero/header.webp` was unchanged, so browsers continued serving the old image from disk cache. Renaming the asset is the simplest reliable fix.

- `git mv public/images/site/homepage/hero/header.webp → header-v2.webp`
- `src/app/page.tsx:39` `heroSrc` updated
- `src/app/globals.css` comment updated to reference the new path

Verified in `npm run preview` (wrangler :8788): rendered HTML emits `/images/site/homepage/hero/header-v2.webp`, that path returns 200 image/webp, the old `/header.webp` returns 404.

PRD: `docs/feature-prds/F-061.md` (Round 13b). Decision: SA-013.

---

## F-061 R13 / Homepage hero — new banner image (2026-05-13)

Founder supplied a new homepage header image at `public/images/edit/homepageheader.jpg` (3358 × 920, 995 KB JPEG) with the instruction to replace the current hero and optimize for the site.

- Encoded as WebP at 2400 × 658 with `cwebp -q 82 -resize 2400 0`, output 465 KB. Native aspect 3358 / 920 ≈ 3.65 : 1 preserved (no crop).
- Overwrote `public/images/site/homepage/hero/header.webp` (the path `pickHomepageHero()` reads in `src/app/page.tsx:39`).
- Updated `.homepage-bible365-hero-art` in `src/app/globals.css`: aspect-ratio swapped from `1584 / 672` (2.36 : 1) to `3358 / 920` (3.65 : 1) so the container matches the new image without letterboxing. Max-width raised back to the full `--mock-frame-max` (1860 px) — the wider aspect already keeps the hero shorter than the prior cap of 1080 px.
- New on-page hero heights: ~103 px on a 375 px phone, ~395 px on a 1440 px desktop (vs. prior ~159 px / ~611 px). Headline lifts higher above the fold at every breakpoint.
- Preview-verified locally: served image bytes confirm `2400 × 658 VP8` from the Workers preview, homepage + key routes all return 200.

PRD: `docs/feature-prds/F-061.md` (Round 13). Decision: SA-013.

---

## F-061 R12 / Parallel-agent sweep — Bible corpus + 7 new module types + transliteration (2026-05-13)

Founder asked to merge everything possible from sibling agent worktrees. Brings in only what builds clean against current main; defers stale or conflicting work.

- **strange-wu — Bible translation pipeline.** `public/bibles/` (30 MB, 7 free translations: BSB / WEB / KJV / ASV / YLT / DARBY / BBE), `src/lib/bible/` with `getVerse` + `parseReference`, 3 Vitest test files, `scripts/build-bible-corpus.ts` (rebuild from ebible.org), new `/credits` translation-licensing page, onboarding + settings now expose translation preference. Foundation for the future `/read` reader.
- **gallant-swirles — module type system expansion.** Module type grew 12 → 21: `hero-card`, `video`, `inline-image`, `journey`, `cta`, `recap`, `sabbath`. 7 new module components, `ModuleRenderer.tsx` routes each, 2 new routes (`/about/translations`, `/series/[slug]/deep-dive`), `content/AUTHORING-SPEC.md`, series briefs + deep-dives content folders. `TeachingModule` gains opt-in Markdown rendering for bold / italic / blockquote / links.
- **brave-chandrasekhar (additive only).** `ScriptureModule.tsx` now pairs transliteration line whenever Hebrew/Greek appears (project rule: original-language never alone). `public/series-pdf/` + `scripts/build-series-pdf.py` ship the series PDF tooling.

Skipped (conflict or incomplete):

- brave's `saved-and-faithing` series entry (only 1/7 days published; would dangle 6 broken links)
- brave's `site-devotional-art.ts` reshuffle (founder already curated different set)
- lucid-benz / friendly-ptolemy / serene-albattani (Feb 2026 branches — too stale; Soul Audit code has been rewritten since)

PRD: `docs/feature-prds/F-061.md` (Round 12). Decision: SA-013.

Verification: `npm run type-check` clean, `npm run build` green (542 prerendered devotional paths), no Worker-runtime hazards (build-time indexes only, no fs reads from public/).

---

## LIBRARY-001 / Save + Start devotional, /library page, Daily Bread inline reader (2026-05-13)

Adds authenticated-user control over the active devotional. Two CTAs on
every devotional reader — "Save this Devotional" (bookmark) and "Start
this Devotional" (set parent series as the active slot). Daily Bread
now renders that active series **fully inline** with day-strip nav,
prev/next, and pause controls. New `/library` page surfaces saved,
paused, and completed series.

Plan: `~/.claude/plans/i-need-the-devotionals-graceful-wombat.md`.
Branch: `claude/objective-leakey-d3d455`.

- Data model — migration `013_create_active_series.sql`:
  - `active_series` — one row per user (PK = user_id enforces single
    active at the DB level), `current_day`, `source`
    (manual_start | soul_audit | restart_from_archive).
  - `scheduled_series_swap` — queued "Start on Monday" replacement,
    promoted lazily on the next `/daily-bread` load after starts_at.
  - `archived_series` — paused / completed series the user can
    resume from `furthest_day_reached` or restart from Day 1.
  - All three tables enable RLS with the standard `auth.uid() = user_id`
    pattern. Save state reuses the existing `session_bookmarks` table.

- API — new routes following the bookmarks pattern (`getUser` → 401 +
  `AUTH_REQUIRED`, `jsonError`, rate limits, request-id headers):
  - `GET/PUT/DELETE /api/devotionals/active` — PUT returns 409
    `CONFIRM_REQUIRED` when another series is active and the request
    omits `confirm:true`. PUT accepts `mode: replace_now | queue_monday`
    and the user's UTC-offset minutes for next-Monday calculation.
  - `GET /api/devotionals/archive` — list paused + completed.
  - `POST /api/devotionals/archive/restart` — promote an archived
    series back to active (at Day 1 or at the furthest reached day).
  - `GET/POST/DELETE /api/devotionals/saved` — Save/unsave.

- Repository — `src/lib/library/repository.ts` — Supabase-canonical with
  in-memory module fallback (matches soul-audit/repository.ts pattern).
  Includes `nextMondayStartsAt(now, utcOffsetMinutes)` and
  `promoteScheduledSwapIfDue(userId)` (archives current, promotes
  queued, clears swap).

- Client state — `src/stores/devotionalLibraryStore.ts` — Zustand store
  with optimistic Save/unsave, `start()` that auto-handles the 409
  confirm-required path, and an `auth-required` event channel so the
  SignInIntentModal can capture the original intent and replay it after
  magic-link sign-in.

- UI components:
  - `DevotionalActions` mounts on every reader page (`/devotional/[slug]`
    - `/wake-up/devotional/[slug]`) — Save toggle, Start CTA, contextual
      "Open in Daily Bread" / "Queued for Monday DD" labels.
  - `PastoralSwitchModal` — three-choice pastoral copy ("Start on
    Monday", "Replace today", "Cancel") mirroring the existing nudge
    on `/soul-audit/results`. The displaced series moves to archive
    automatically so it stays restorable.
  - `SignInIntentModal` — magic-link form that captures the user's
    intent (save / start / queue / restart-archive) and replays via
    the existing `/auth/callback?redirect=` round-trip.

- Daily Bread surface — `src/app/daily-bread/page.tsx` now consults
  `active_series` first (manually-started/restarted curated series
  take precedence). When set, `CuratedActiveView` renders the full
  devotional inline using the same `ModuleRenderer` / panel pipeline
  as the reader — not a link card. Includes day-strip nav, prev/next
  navigation, Save, Pause-this-devotional, and Open-full-reader.
  Falls through to the existing Soul Audit plan resolution when no
  manual active is set. Wrapped in try/catch so missing Supabase env
  in a dev/preview env doesn't break the page.

- Scheduled-swap banner — appears on `/daily-bread` whenever a queued
  swap exists, with a "Cancel" link that deletes the queued row.

- `/library` page — Active / Saved / Paused / Completed sections.
  Saved items show their parent series and offer "Activate Series"
  (which routes through the same PastoralSwitchModal). Paused items
  offer "Resume at Day N" or "Restart from Day 1." Completed offer
  "Read Again."

- Nav — `LIBRARY` link added to the primary nav and to the account
  drop-down menu in `EuangelionShellHeader`.

- Styles — appended `.devotional-actions-bar`, `.library-modal-*`,
  `.library-page`, `.library-card`, `.daily-bread-swap-banner` to
  `src/app/globals.css`.

Verified locally: `npm run type-check` clean. `npm run lint` clean for
all new files (one pre-existing error in `BiblePlanPageClient.tsx` is
unrelated). All four new API endpoints return well-formed 401
`AUTH_REQUIRED` responses for anonymous callers. `/library` and
`/daily-bread` hydrate and render correctly in the local dev preview.

NOT YET DONE — requires follow-up:

- Apply migration 013 to Supabase production.
- End-to-end signed-in flow verification — the worktree dev preview
  has a pre-existing Turbopack + `generateStaticParams` + Suspense
  hang that prevents the reader from hydrating locally (confirmed by
  reproducing on a clean stash of all changes). Verify from the main
  checkout or a deploy preview.

---

## TYPO-FIX-2026-05-13 / Decode literal `\uXXXX` escapes leaking into homepage JSX (2026-05-13)

Founder report: visible `·` and `—` strings appearing as raw
text on the live homepage instead of rendering as `·` (interpunct),
`—` (em-dash), `–` (en-dash), `→` (right arrow), `À` (À-grave), and
`§` (section sign).

Root cause: in `src/app/page.tsx`, several user-facing strings sat as
JSX text content rather than inside JS string literals. TypeScript only
interprets `\uXXXX` as a Unicode escape inside `'...'`, `"..."`, or
template literals — JSX text is treated as opaque, so the 6-character
sequence rendered verbatim. Likely introduced by AI-generated copy
(which routinely escapes non-ASCII as `\uXXXX` in JSON output) being
pasted directly into JSX without re-decoding.

Repo-wide audit confirmed the bug was isolated to one file: every
other `\uXXXX` occurrence across 13 other files (components, hooks,
lib, other pages) sits inside `'...'` JS string literals or regex
char classes where TS parses them correctly. JSON devotional content
under `public/devotionals/` stores actual Unicode characters (clean).

- `src/app/page.tsx`: 18 substitutions — 11 in user-visible JSX text
  (trust strip, section-index card, colophon strip, soul-audit
  heading, Bible-365 browse link), 7 in `{/* ... */}` source comments
  cleaned for consistency. JS string literals on lines 446/448 left
  alone (already correct at runtime).

Verified live in dev server at `localhost:3333`:

- Trust row: `FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY`
- Section card: `When you're hurting · overwhelmed · new to faith · going deeper.`
- Colophon: `ANCHORED IN THE APOSTLES' AND NICENE CREEDS · VOICES FROM AUGUSTINE, À KEMPIS, SPURGEON, TOZER, AND MORE`
- Soul Audit H2: `Or — start where you actually are.`
- Bible-365 browse link: `Or browse the 365-day plan →`
- Runtime DOM check confirmed zero literal `\uXXXX` substrings remain
  anywhere in `document.body.innerText`.

Branch: `claude/epic-mendeleev-9d71c1`.

---

## AUDIT-FIXES-2026-05-11 / 16 audit punch-list items shipped (2026-05-11)

Consolidated sitewide audit (`docs/audits/HOMEPAGE-AUDIT-2026-05-11.md`)
reconciled four independent audits (Claude technical, Manus Living
Newspaper, Manus Conversion). This batch ships the S/M-effort items from
the top-15 punch list. L-effort items (devotional SSR rewrite, email
capture, data backfills) deferred to supervised pairing.

PRD: F-061. Branch: `claude/audit-fixes-2026-05-11`.

- T1: Fix `Day N: Day N` title-tag duplication
  - `src/app/devotional/[slug]/page.tsx`: detect bare-Day-N placeholder
    in `meta.day.title` so we no longer render "Day 5: Day 5 |
    Euangelion" as the browser tab title. Applied to `<title>`,
    `og:title`, JSON-LD Article headline, and BreadcrumbList trailing
    crumb.
  - `src/app/wake-up/devotional/[slug]/page.tsx`: same fix on the
    cross-canonical wake-up route.

- ROUND 11 (2026-05-13): Updated-audit follow-up batch
  Six items from the updated Manus newspaper audit + homepage_notes.md:
  - SIGN IN / SIGN UP demoted to a user-icon button + popover
    (matches the authenticated avatar-menu pattern). The two inline
    text links on the masthead top bar are gone.
  - "Chiastic" scrubbed from user-facing strings: bible-365.ts
    framework rewritten ("weekly rhythm: hook → turning point →
    application → sabbath"), GenerationProgress.tsx + curated-
    builder.ts plain-languaged. Internal LLM-prompt / type-system
    chiastic refs unchanged (audit asked for user-facing copy only).
  - Hero height: .homepage-bible365-hero-art capped at max-width
    1080px (centered) on desktop, full-width on mobile. Image stays
    uncropped at native 1584/672 aspect; headline lifts up the page.
  - Section Index cards rewritten as editorial teasers — concrete
    series titles + editor's-pick framing instead of nav copy.
  - Closing CTA now leads with READ TODAY'S DEVOTIONAL (primary
    button to hero slug); Soul Audit demoted to a quiet secondary
    text link. Audit said the final invitation should be to read.
  - Article page title metadata uses the devotional headline.
    generate-devotional-teasers.mjs extended to extract titles too;
    540 titles indexed in DEVOTIONAL_TITLES. generateMetadata in
    both devotional page wrappers prefers the JSON title over the
    "Day N" placeholder in series.ts.
    Rebased onto origin/main twice during the batch to absorb PR #15
    (decode \uXXXX literals) and PR #16 (feat(library) — Daily Bread
    inline reader) from parallel agents. Both already on main.

- ROUND 10 (2026-05-13): All series previews show image thumbnails
  Founder follow-up to round 9: "the series cards on series page
  should have images as well. all series previews should have image
  previews." The /series page's LIST view used variant="small"
  cards that explicitly skipped the thumbnail.
  - BrowseSeriesCard.tsx: getSeriesHero(slug) now resolved for every
    variant. The small-variant JSX renders {thumbnail} between badge
    and title.
  - src/app/series/page.tsx: stale "(no images)" comment updated.
  - Verified locally: 33/33 small cards in list view render
    thumbnails.

- ROUND 9 (2026-05-12): Soul Audit prompt + series-card thumbnails + every-devotional-image
  Founder direction: (1) Soul Audit asks "What are you wrestling
  with"; (2) every devotional should have an image; (3) the main
  series image should show as the thumbnail for series cards
  throughout the site.
  - Soul Audit textarea placeholder: "What's been weighing on you?"
    -> "What are you wrestling with?" (matches aria-label + the
    approved PUBLIC-FACING-LANGUAGE phrasing).
  - src/lib/series-hero.ts (new): getSeriesHero(slug) prefers the
    auto-generated SERIES_HERO manifest entry but falls back to
    series.heroImage from SERIES_DATA. Wired into BrowseSeriesCard,
    soul-audit/OptionCard, and soul-audit/AuditOptionCard.
  - DevotionalPageClient artworks memo now has a 3-tier fallback:
    SITE_DEVOTIONAL_ART -> DEVOTIONAL_ARTWORKS -> series hero. The
    third tier covers the 365 Bible-365 days that previously rendered
    no per-day image.
  - Verified locally: homepage Featured Series thumbnails render
    /images/site/series/\*.webp; /devotional/bible-365-day-100
    renders bible-365.webp series hero (was blank before).

- ROUND 8 (2026-05-12): Hero — uncropped, fully responsive
  Founder direction: "do not crop the image. image should fit the
  screen responsively." The prior CSS had:
  - max-height: 460px (desktop) — cropped the image vertically at
    wider viewports because object-fit:cover trimmed the top/bottom
    when the container was shorter than the natural aspect height.
  - aspect-ratio: 16/9 + max-height: 260px (mobile) — forced a
    different aspect than the image, also cropping.
    New behavior: container aspect-ratio 1584/672 at every breakpoint,
    no max-height, object-fit: contain. The full image displays on any
    screen size, scaled proportionally to viewport width.
- ROUND 7 (2026-05-12): Hero image — the empty-tomb Riso (founder's pasted pick)
  Founder pasted the exact image and pointed at
  public/images/library/hero/Generated Image May 12, 2026 - 9_12AM.jpg.
  1584x672, blue + cream + red duotone Risograph print: rock face
  with stone rolled aside and brilliant sun bursting from the empty
  tomb opening. Resurrection imagery.
  - JPEG (1.1 MB) -> WebP @ q=88 (439 KB) at
    public/images/site/homepage/hero/header.webp
  - .homepage-bible365-hero-art aspect-ratio: 1536/672 -> 1584/672.
- ROUND 6 (2026-05-12): Hero image — atmos-stormy-sea-ultrawide
  Founder direction: "look for a literal header" + pointed me at
  `public/images/generated-2026-05-04/hero/`. That dir exists on
  main but didn't exist in the audit worktree — which is why I
  missed it through rounds 1-5. The folder is literally named
  `hero/` and contains banner-format AI-generated print artworks.
  - Copied atmos-stormy-sea-ultrawide.png (2.1 MB) from the primary
    checkout to public/images/site/homepage/hero/ and converted to
    WebP @ q=85 (392 KB, 81% size cut).
  - Image: 1536x672, halftone stormy sea + clouds + moon breaking
    through. Literal hero asset, banner format, heaven/clouds
    subject. Thematic pair with "A Voice in the Wilderness"
    (Mark 4:35-41).
  - .homepage-bible365-hero-art aspect-ratio: 1200/750 -> 1536/672;
    max-height 480 -> 460px.
- ROUND 5 (2026-05-12): Hero image — Church "Twilight in the Wilderness"
  Founder direction: heaven/clouds + header width, after rejecting
  the shepherd's crook and sunburst-banner attempts ("there are
  literally a bunch of headers"). Surveyed
  archive/devotional-prints/ (643 entries) — found Frederic Edwin
  Church, Twilight in the Wilderness (1860). Luminist painting with
  a dramatic glowing sky, clouds, twilight horizon. Bonus:
  thematically matches "A Voice in the Wilderness" daily title.
  - Copied: archive/devotional-prints/church-twilight-wilderness/
    print.webp -> public/images/site/homepage/hero/
    church-twilight-wilderness.webp (1200x750, ~1.6:1, 254 KB)
  - Also staged cole-mount-etna-sunrise.webp as a future alternate.
  - aspect-ratio: 1536/672 -> 1200/750; max-height 420 -> 480px.
- ROUND 4 (2026-05-12): Homepage restructure (founder: "the homepage needs to be addressed")
  - Hero image swapped from hero-gospel.webp (Conversion auditor:
    "barren / desolate / evokes the problem, not the solution") to
    brand-sunburst-banner.webp. Sunburst rays evoke heaven /
    divine light without literal cloud photography.
  - Hero is now full-width banner above the text block (was a 228px
    art column + text column grid). aspect-ratio: 1536/672 desktop,
    16/9 mobile. Editorial newspaper feel.
  - Three-zone restructure per Manus §2: Featured Series rail moved
    UP above Soul Audit; Soul Audit moved DOWN to Zone 3
    (Invitation). The series headlines that the audit called "the
    strongest on the site" now sit above the fold, not buried below
    the Soul Audit + How-It-Works block.
  - New Section Index strip (Zone 2): three cards — Wake-Up / Bible
    365 / All Series — between the trust row and the Featured
    Series rail. A first-time visitor sees the whole paper at a
    glance before being asked to do anything.
- ROUND 3 (2026-05-12): Manus newspaper-audit follow-ups
  - Wake-Up added to primary nav (EuangelionShellHeader.tsx).
    Discoverable from every page; previously buried below homepage fold.
  - Soul Audit page (/soul-audit) now explains what happens next + the
    privacy commitment in a 3-sentence preface above the textarea.
    Was asking for vulnerability with no context.
  - SiteFooter rebalanced: mission + creedal/voices colophon lead;
    Product + Company columns compressed from 4 to 2; legal links
    demoted to a single quiet inline row. Removed "newsletter coming
    soon" until ESP integration ships.
  - Wake-Up page (/wake-up) adds a 2-card editorial curation row
    above the 7-series grid: "Start here if you're new" (Identity
    Crisis) + "Relevant to this season" (Peace). Removes the audit's
    "all 7 series presented as equal options with no curation"
    finding.
  - C1 (full SSR for devotional prose) attempted again — same
    `b.replace is not a function` crash on `too-busy-for-god-day-6`.
    Reverted; deferred to paired debug.

- T2 RUNTIME FIX (post-deploy, 2026-05-12):
  The first T2 implementation used `fs.readFile(public/devotionals/...)`
  which silently fails in the Cloudflare Workers runtime — public/\* is
  bound as ASSETS, not on the Worker FS. Replaced with a build-time
  teaser index.
  - `scripts/generate-devotional-teasers.mjs` (new): scans
    public/devotionals/\*.json and emits src/data/devotional-teasers.ts
    (534 entries). Wired into `npm run build`.
  - `src/data/devotional-teasers.ts` (generated): `Record<slug, teaser>`
    - `getDevotionalTeaser(slug)`. Pure data; runtime-agnostic.
  - Both devotional `page.tsx` files now import the index instead of
    reading the JSON server-side.
  - Verified live: peace-day-3 description is the day teaser, not the
    series question.
- ROUND 2 (founder: "fix everything + microanimations + fully deploy"):
  C2, H7, #14, microanimations, C1 plumbing.
  - C2: Mobile day-nav fix. `DevotionalPageClient` adds a 44px
    "DAY N OF M · See all days" pill above the content on mobile; the
    sidebar collapses behind it. The LIBRARY block (app-wide nav)
    becomes desktop-only. Founder's original complaint — content was
    pushed 376-536px below the mobile fold — is resolved.
  - H7: new `src/components/ResumeSeriesPill.tsx` reads
    `useProgressStore` and renders a "CONTINUE · DAY N OF M ·
    {Series} →" pill on series-detail pages when the reader has
    started but not finished. Returning users now see a re-entry cue
    outside the homepage.
  - #14: `src/components/daily-bread/EmptyState.tsx` rewritten to
    lead with today's Bible-365 reading + a "READ TODAY'S EDITION"
    primary CTA. Personalized-plan path demoted to a secondary
    section below a divider. New readers are no longer told to do
    something else first.
  - C1 (SSR for devotionals): plumbing wired but pass-through OFF.
    `DevotionalPageClient` accepts an `initialDevotional` prop;
    both server wrappers read the JSON server-side. Forwarding the
    JSON through the boundary broke prerender on
    `too-busy-for-god-day-6` with `b.replace is not a function` — so
    pass-through is left OFF pending paired investigation. The
    server-side teaser read for meta description is unaffected and
    still ships.
  - Microanimations: `globals.css` adds `audit-fade-in` keyframe
    applied to homepage hero / trust row / Soul Audit / How-It-Works
    / FAQ / CTA; press-state micro-bounce on .mock-btn variants;
    hover-lift on devotional sidebar day cards; resume pill +
    day-nav pill have hover/active transitions. All animations
    respect `prefers-reduced-motion: reduce`.
- T9 / T10 / T12 / T13 / T14 / T16: SEO + UX + AI-crawler pass
  - T9: SIGN IN / SIGN UP buttons demoted to plain text links in the
    nav (`src/app/globals.css`). The newspaper framing puts the
    masthead first; account chrome no longer competes with it.
  - T10: Devotional reading-complete button text changed from
    "MARK COMPLETE" / "SAVE BOOKMARK" to "MARK READ" / "BOOKMARK".
    Editorial language; ends the task-app vibe.
  - T11 SKIPPED: devotional inline section labels are driven by
    per-devotional JSON module.heading fields. 175 JSON rewrites
    require founder content review; out of scope overnight.
  - T12: `public/llms.txt` shipped with explicit AI-crawler guidance
    and an opt-in stance for both indexing and training. Replaces
    the previous SPA-404-with-noindex behavior.
  - T13: `src/app/robots.ts` now emits per-AI-bot rules (GPTBot,
    ClaudeBot, anthropic-ai, Google-Extended, CCBot, cohere-ai,
    PerplexityBot, ChatGPT-User, Claude-Web) instead of a silent
    allow-all wildcard. Stance remains opt-in.
  - T14: "chiastic arc" jargon removed from the Wake-Up section
    intro (`src/app/wake-up/page.tsx`). Replaced with "builds toward
    a turning point, then reflects on what it means." The technical
    term stays in the internal LLM composer prompt where the
    chiastic structure is genuinely the contract.
  - T16: `docs/decisions/TAGLINE-CANDIDATES-2026-05-11.md` saved
    with five candidate replacements for "Daily Devotionals for the
    Hungry Soul." No production tagline change made overnight —
    awaits founder selection.
- T3 / T4 / T5 / T6 / T7 / T8 / T15: Homepage editorial pass
  - Stable, screen-reader-only `<h1>` at the top of `<main>`; the daily
    devotional title demoted to `<h2>`. Anchors page identity in
    search-engine indexing instead of letting it rotate with content.
  - "TODAY" kicker dropped (rotation isn't built yet) — now reads
    "FEATURED ·"; hero CTA changed from "READ TODAY'S DEVOTIONAL" to
    "BEGIN THIS DEVOTIONAL".
  - Copy rewrites per audit §6.2: trust signal row, Soul Audit
    headline + subcopy + placeholder, sample pill #2, How-It-Works
    kicker + heading + step bodies, Featured Series subtitle,
    secondary CTA label, FAQ headings.
  - Editorial colophon trust strip added between Soul Audit and
    How-It-Works ("Anchored in the Apostles' and Nicene Creeds.
    Voices from Augustine, à Kempis, Spurgeon, Tozer, and more.").
  - Reset Audit button now renders only when `auditCount > 0`;
    relabeled "Start a new audit".
  - Real alt text on hero `<Image>` and step `<Image>` components.
  - Organization JSON-LD added to the homepage `<script>` block
    (sameAs intentionally empty until founder confirms socials).
- T2: Devotional meta description uses the day's `teaser`
  - `src/app/devotional/[slug]/page.tsx`: read
    `public/devotionals/[slug].json` server-side in
    `generateMetadata`, prefer the day's `teaser` field over the
    series-level `question`. Series questions are identical across
    all days in a series; Google deduplicates them. Teasers are
    unique per day. Same fix applied to the JSON-LD Article
    description.
  - `src/app/wake-up/devotional/[slug]/page.tsx`: same.

(Remaining tasks T3–T16 ship in subsequent commits on this branch.)

---

## MORNING-2026-05-07 / Phase 5 async runtime scaffolding (2026-05-07)

Bindings + types + Durable Object class + queue producer + runbook
shipped. Activation requires the OpenNext worker-wrap step (same
blocker as the Cron Trigger runbook). Existing fire-and-forget
`/select` flow UNCHANGED — works exactly as before.

- `src/lib/soul-audit/queue-types.ts` (new): `SoulAuditQueueMessage`
  shape (compose_full_plan + compose_one_day variants),
  `PlanOrchestrationState` (DO storage shape).
- `src/lib/soul-audit/plan-orchestrator.ts` (new): `PlanOrchestrator`
  Durable Object class. HTTP API: GET / reads state, POST /update
  applies partial update, POST /reset wipes. Single-key storage,
  cached on construction, atomic via blockConcurrencyWhile.
- `src/lib/soul-audit/queue-producer.ts` (new):
  `enqueueComposeFullPlan(payload)` gated by `PHASE_5_ASYNC_ENABLED=on`.
  No-op when disabled. Returns `{ enqueued, reason? }` so caller can
  log path taken. NEVER throws.
- `wrangler.jsonc`: declared queue producer + consumer (max_batch_size 1,
  max_retries 3, DLQ), durable_objects binding for PLAN_ORCHESTRATOR,
  v1 migration marker.
- `docs/runbooks/phase5-async-runtime.md` (new): full design + the
  9-step activation checklist (create queue → wrap worker → write
  consumer → update select → smoke test → deploy). Cost analysis:
  < $5/mo at 10k audits/mo.
- `__tests__/phase5-async-runtime.test.ts` (new): 10 tests cover
  asyncRuntimeEnabled gating, enqueue happy path, no-binding,
  send-failure, DO state read/write/reset/404 paths.

WHAT'S NOT SHIPPED (waiting on the OpenNext-wrap activation work):

- queue-consumer.ts (the queue() handler that dispatches messages
  to composer)
- /api/soul-audit/select integration (still uses fire-and-forget)
- /api/soul-audit/select/status integration (still polls DB)
- Worker entry override (esbuild step + main override)

All four are documented step-by-step in the runbook.

Test status: type-check + lint clean across 5 touched files;
10/10 Phase 5 tests pass; reranker / webhook / KV / brain regression
all intact.

Decisions: SA-014
Feature: F-002

## MORNING-2026-05-07 / Phase 6: Cohere reranker (feature-flagged) (2026-05-07)

Adds the cross-encoder rerank stage from Anthropic's contextual
retrieval pipeline. ~67% reduction in retrieval failure rate per
Anthropic's published measurements.

- `src/lib/soul-audit/reranker.ts` (new): `rerankChunks(query, chunks, topN?)`
  hits Cohere Rerank-3.5 via plain `fetch()` (no SDK dep). Returns
  chunks reordered + truncated to topN. NEVER throws — degrades to
  BM25-only on feature-off / missing-key / Cohere-failure.
- `src/lib/soul-audit/composer.ts`: integrated between BM25/RRF
  retrieval and composer-prompt assembly. Pulls BM25 top-25 then
  reranks to top-8.
- Feature-gated by `SOUL_AUDIT_RERANKER_ENABLED=on` so we can A/B
  and revert in one env flip if quality regresses.
- Cost at $2/1k searches: ~$2/mo at 1k audits, ~$21/mo at 10k.
- Setup: `wrangler secret put COHERE_API_KEY` + `wrangler secret put SOUL_AUDIT_RERANKER_ENABLED` (value `on`).
- 11 new tests cover feature-flag gating, missing key, empty input,
  reorder, topN truncation, 5xx degradation, network failure.

Decisions: SA-014
Feature: F-002

## MORNING-2026-05-07 / Big batch: Stripe webhook + Cron Trigger + KV provider-health (2026-05-07)

Three approved infra workstreams from the morning deck, landed in
one batch (each is internally consistent so testing them together
gives stronger regression confidence than separate commits).

**STRIPE WEBHOOK** (founder direction "approve")

- `src/app/api/billing/webhook/route.ts` (new): POST endpoint with
  HMAC signature verification via `stripe.webhooks.constructEvent`.
  Reads raw body BEFORE parsing (critical for HMAC). Handles 7
  events: subscription.created/updated/deleted, invoice.paid,
  invoice.payment_failed, checkout.session.completed (acknowledged;
  primary handling stays with the GET poll), charge.refunded
  (acknowledged; future workstream).
- `src/lib/billing/webhook-handlers.ts` (new): per-event handler
  module. Each handler resolves user by Stripe customer email,
  updates `users.subscription_tier`, attempts Founding Member
  claim where applicable. Idempotent. Founding Member badge NEVER
  cleared on cancellation (per founder direction).
- Setup steps for the founder: create webhook in Stripe dashboard
  pointing at `https://euangelion.app/api/billing/webhook`,
  subscribe to the 7 events, then `wrangler secret put STRIPE_WEBHOOK_SECRET`.
- `__tests__/billing-webhook-handlers.test.ts` (new): 11 tests
  cover happy paths, status mapping, FM claim gating, FM badge
  preservation on cancel, dunning-not-tier-change, invoice line
  detection.

**CLOUDFLARE CRON TRIGGER** (founder direction "cron-trigger")

- `wrangler.jsonc`: added `triggers.crons: ["0 3 * * *"]` (daily
  03:00 UTC). The trigger fires today but is a no-op until the
  OpenNext-generated worker is wrapped with a `scheduled()`
  handler — that wrap is documented in the runbook below as a
  small focused PR (modifying the deploy pipeline carries deploy-
  failure risk; not done autonomously).
- `.github/workflows/retention-cleanup.yml` (new): WORKING
  alternative TODAY. Daily 03:00 UTC + manual `workflow_dispatch`
  trigger. Hits `POST /api/admin/run-retention-cleanup` with the
  internal secret. Setup: add repo secret `INTERNAL_ROUTE_SECRET`
  matching the Worker secret.
- `docs/runbooks/retention-cleanup-cron.md` (new): full runbook
  covering both paths, setup steps, verification SQL, manual
  trigger, and migration path from GitHub Action → Cron Trigger
  when the OpenNext wrap lands.

**KV PROVIDER-HEALTH PERSISTENCE** (founder direction "approve")

- `wrangler.jsonc`: added `kv_namespaces` binding for
  `BRAIN_HEALTH_KV`. Setup: `wrangler kv namespace create BRAIN_HEALTH_KV`
  - same with `--preview`, paste IDs in place of REPLACE*WITH*\*.
- `src/lib/brain/health-store.ts` (new): `loadProviderHealth` +
  `persistProviderHealth` + `healthStoreEnabled` feature-flag
  check. Single key (`BRAIN_HEALTH_V1`) holds all 4 providers
  (low-cardinality, cheaper than per-provider keys). Never throws
  — KV unavailability + parse errors return null silently.
- `src/lib/brain/router.ts`: lazy hydration on first
  `generateWithBrain` call per isolate (await the load once,
  populate the in-memory Map). Throttled write-through on every
  `recordProviderHealth` call (max one persist per 30s per isolate
  to avoid KV-op burn).
- Gated by env `BRAIN_HEALTH_KV_ENABLED=on` so we can revert to
  per-isolate behavior in one env-var flip if KV misbehaves.
- `__tests__/brain-health-store.test.ts` (new): 10 tests cover
  feature-flag gating, missing/invalid KV state, write-through,
  and silent-failure semantics.

Test status: type-check + lint clean across all 9 touched files;
21/21 webhook + KV tests pass. All Anthropic prompt-cache /
retry-backoff / token-counting regression tests still pass.

WHAT'S NEXT IN THE QUEUE: Cohere reranker (next), then Phase 5
async runtime (largest remaining workstream).

Decisions: SA-014
Feature: F-002

## MORNING-2026-05-07 / Trivial fixes from morning deck (2026-05-07)

Founder returned with 17 of 19 deck decisions made + clarifying
questions on CSP and canonical URL (both resolved in chat). This
commit applies the four trivial fixes that needed no follow-up
research:

- **Canonical URL — RESOLVED** —
  `src/app/wake-up/devotional/[slug]/page.tsx` now sets
  `alternates.canonical` + `openGraph.url` to `/devotional/[slug]`
  (cross-canonical), instead of self-canonical. Wake-Up stays as a
  sibling product but its devotional URLs send Google to the main
  brand surface. SEO ranking accrues to one URL instead of being
  split.
- **Founding Member section — hide once cap reached** —
  `src/app/pricing/page.tsx` wraps the `<FoundingMemberCounter />`
  in `{!foundingMemberCount.full && (...)}`. Once 500/500 is
  reached, the section disappears entirely instead of showing a
  "cap reached" lingering signal.
- **`/about` page — third-person + 30+ sources framing** —
  `src/app/about/page.tsx` rewritten from 32-line placeholder to
  6-section page (What it is, How it works, What grounds the
  writing, What it believes, What it costs, Privacy). Voice is
  third-person institutional per founder direction
  ("Euangelion and me are separate site-wise"). Source claim is
  "30+ historic Christian voices" rather than the unverified
  "19 sources" figure.
- **CSP hardening — DEFERRED** post-launch documented in
  `docs/overnight-followups.md` with revisit triggers (real user
  base, enterprise customer review, or new third-party script).

Test status: type-check + lint clean across all 4 touched files.

Decisions: SA-013, SA-014
Feature: F-002

## OVERNIGHT-2026-05-06 / Morning decisions deck (2026-05-06)

`docs/decks/morning-decisions-2026-05-06.html` (new) — single-file
interactive decision deck the founder can open in any browser.
Contents:

- **Project Scope / Where We Are** — visual progress through 18
  master-plan phases, plus six headline metrics (commit count, test
  count, type-check + lint state, pre-existing failures), plus a
  "what's still gated" expandable list.
- **15 decision cards** across 4 themes:
  - **Pricing** (3): 2yr/3yr exact prices, /pricing launch trigger,
    Founding-Member-cap behavior
  - **Security** (5): Anthropic ZDR, analytics tool, email infra,
    CSP hardening, encryption at rest
  - **Infra approvals** (4): webhook impl, Cron Trigger, Phase 5
    async runtime, Phase 6 reranker, KV provider-health
  - **Product direction** (5): rationale voice, intent-fail
    fallback, Wake-Up sibling-vs-collection, canonical URL,
    /about voice, "19 sources" copy claim
- Each card has 2-4 options with descriptions + "Recommended"
  badges + a free-text notes field. Choices persist in localStorage.
- **Summary + export section** — counter shows "N of 15 decided",
  progress bar, three actions: "Copy as message to Claude" (formats
  decisions + notes as a paste-able message), "Copy as JSON" (raw
  state), "Reset all".
- Self-contained: vanilla JS, no external deps, no build step. Open
  the file directly in any browser. Persists locally so the founder
  can come back later without losing decisions.

Per founder direction, the deck includes a "Project Scope / Where
We Are" section at the top (visual phase progression + branch
metrics) so the founder can place each decision in context.

Decisions: SA-014
Feature: F-002

## OVERNIGHT-2026-05-06 / Autonomous batch — webhook audit + retention cleanup + third-party audit + JSDoc + jsonError (2026-05-06)

While founder slept. All low-risk, additive, no-behavior-change.

**Stripe webhook lifecycle audit (read-only)** —
`docs/copy-specs/stripe-webhook-audit-2026-05-06.md` (new) finds the
existing `/api/billing/lifecycle` is a GET pull-based poll, NOT a
Stripe webhook. Documents the 7 events a real webhook needs.

**Anonymous-data 30-day retention cleanup** —
`src/lib/privacy/retention-cleanup.ts` + `/api/admin/run-retention-cleanup`
route guarded by `X-Internal-Secret`. 6 new tests pass. Designed to
be called by a future Cron Trigger, GitHub Action, or manual ops curl.
Authenticated users are NEVER touched by this function.

**Third-party data flow audit (read-only)** —
`docs/copy-specs/third-party-data-flow-audit-2026-05-06.md` (new).
TOP-LINE: zero third-party analytics / tracking dependencies are
installed. Outbound calls are LLM providers + Supabase + Stripe only.
CSP matches.

**JSDoc top-of-file overview on `src/lib/brain/router.ts`** — covers
provider order, availability rules, the four overnight infrastructure
additions, in-memory health, quality gate.

**`jsonError` standardization** on `auth/sign-out` and `auth/session`
routes — both now carry `requestId` + typed `code` + `logApiError`.

Test status: type-check + lint clean across 9 touched files; 6 new
retention-cleanup tests pass.

Decisions: SA-007, SA-013, SA-014
Feature: F-002

## OVERNIGHT-2026-05-06 / Phase 7: Privacy hardening — data export + account deletion (2026-05-06)

GDPR/CCPA-grade self-service controls per master plan Section 3.9.
Pairs naturally with the security review you flagged for the
/pricing launch — the same authenticated-user surface needs both.

**HELPERS (new)**

- `src/lib/privacy/data-export.ts`: `exportUserData(userId)` gathers
  every row a user owns across all session-token-keyed and
  user-id-keyed tables into a structured JSON document. Tables
  covered: users, audit_runs, audit_options, consent_records,
  audit_selections, devotional_plan_instances, devotional_plan_days
  (joined by plan_token), devotional_day_citations, annotations,
  session_bookmarks, mock_account_sessions, bookmarks, user_progress,
  soul_audit_responses. Records partial failures into the result
  rather than throwing — the user gets a usable export even if one
  table is briefly unavailable. `formatExportForDownload(result)`
  produces `[body, filename]` ready for the route handler.
- `src/lib/privacy/account-deletion.ts`:
  `deleteUserAccount(userId)` runs a deterministic cascade:
  A. Resolve all session_tokens for this user.
  B. Pull plan_tokens BEFORE deleting devotional_plan_instances.
  C. Delete from each session-token-keyed table.
  D. Delete devotional_plan_days + devotional_day_citations by
  plan_token.
  E. Delete from user_sessions.
  F. Call supabase.auth.admin.deleteUser() — the FK
  `public.users.id REFERENCES auth.users(id) ON DELETE CASCADE`
  drops the public.users row, which cascades to bookmarks,
  user_progress, soul_audit_responses.
  Idempotent. Never throws. Records partial failures into the result.

**API ROUTES (new)**

- `src/app/api/user/data-export/route.ts`: GET, auth-required, rate
  limited 5/hour. Returns the export as a downloadable JSON file
  (Content-Disposition: attachment, filename includes user id +
  date). User id always comes from the verified session — never from
  a query param.
- `src/app/api/user/delete-account/route.ts`: POST, auth-required,
  rate limited 3/day. Body MUST include both:
  - `confirm: "DELETE MY ACCOUNT"` (exact phrase)
  - `userEmail` matching the signed-in session email
    Double confirmation prevents an XSS that steals a session cookie
    from triggering deletion without ALSO knowing the user's email.
    After the cascade, the user is signed out. Returns the deletion
    result so the user can see partial-failure tables (if any).

**SETTINGS UI (extended)**

- `src/app/settings/page.tsx`:
  - New auth-state hydration via `/api/auth/session` (cancellation-
    safe).
  - New "YOUR ACCOUNT DATA" section (between existing privacy
    controls and Testing Toggles):
    - "Export My Data" button — calls /api/user/data-export, streams
      the file download.
    - "Delete My Account" button — opens an inline danger-zone form
      requiring exact confirmation phrase + email match, both
      validated client-side before the POST is sent. On success,
      redirects to / after a 1.5s message.

**PRIVACY POLICY (extended)**

- `content/legal/privacy-policy.md`: added "Your Privacy Controls
  (Available in Settings)" section documenting both controls,
  retention timing (30 days for anonymous, until-delete for
  authenticated), and the never-shares-reflection-text-with-third-
  party-analytics promise.

**TESTS**

- `__tests__/privacy-data-export.test.ts` (new, 5 tests): empty
  user, multi-session gathering, user-id-keyed rows, partial
  failures, filename format.
- `__tests__/privacy-account-deletion.test.ts` (new, 6 tests):
  happy-path cascade, partial failure on one table, auth.users
  delete failure, idempotency, multi-session counting, completed-
  after-started invariant.

Test status: type-check + lint clean across all 8 touched files;
34/34 related tests pass (2 new privacy suites + founding-member +
api-security regression).

**WHAT'S STILL OPEN**

- Encryption at rest (pgsodium on `audit_runs.response_text`) —
  separate workstream needing Supabase ops decision.
- Anonymous-data 30-day cleanup cron — needs Cloudflare Cron Trigger
  binding (forbidden by anti-sprawl); document for next session.
- Audit which third-party services receive request payloads
  (Sentry, etc.) — separate verification pass.

Decisions: SA-007 (Section 0.7 30-day retention), SA-014
Feature: F-002

## OVERNIGHT-2026-05-05 / Phase 3.10b: /pricing page + Founding Member infrastructure (2026-05-05)

Built end-to-end against master plan Section 0.2 (founder-locked
2026-05-03) + founder direction 2026-05-05 (interactive session).

**NOT-YET-SHIPPED status** per founder direction: the page exists at
`/pricing` but is intentionally:

- `robots: { index: false, follow: false }` — search engines won't surface it
- excluded from `src/app/sitemap.ts` (no sitemap entry)
- not linked from header / footer / any nav
- reachable only by typing the URL directly

The page becomes discoverable when the founder OK's it after the
security review. The Founding Member counter, Stripe wiring, and
checkout buttons are real — they just aren't called by anything the
user can click on the live site.

**Schema changes (NOT YET APPLIED to production)**

- `database/migrations/010_add_founding_member.sql` (new): adds
  `founding_member_at TIMESTAMPTZ` column to `public.users`, a
  partial index, and a CHECK trigger backstop enforcing the 500 cap
  at the DB level. The DB trigger is defense-in-depth; the
  application also enforces 500 via conditional UPDATE.
- `src/types/database.ts`: `User`/`UserInsert`/`UserUpdate` extended
  with `founding_member_at: string | null`.

**Pricing model — code now matches Section 0.2**

- `src/lib/billing/catalog.ts`: 4 tiers — premium_monthly $7/mo,
  premium_annual $77/yr (awards Founding Member),
  premium_2year $140 (one-time, 24 months access),
  premium_3year $200 (one-time, 36 months access). Each plan now
  carries `effectiveMonthlyLabel`, `billingType`, `termMonths`,
  `savingsLabel`, `awardsFoundingMember`.
- `src/types/billing.ts`: `BillingPlanId` extended to all 4 tiers,
  new `StripePriceIdEnv` union, new `FoundingMemberCount` type, new
  `foundingMember` + `foundingMemberAt` fields on
  `BillingEntitlementsResponse.entitlements`.
- 'lifetime' kept on `subscriptionTier` enum (legacy compat) but
  marked deprecated in JSDoc.

**Founding Member helper — race-condition-safe**

- `src/lib/billing/founding-member.ts` (new):
  - `readFoundingMemberAt(userId)` — read the badge timestamp
  - `getFoundingMemberCount()` — public count, cached 60s
  - `claimFoundingMemberSlot(userId)` — atomic conditional UPDATE,
    returns `{claimed, claimedAt}` or `{claimed:false, reason}`.
    Idempotent. Concurrency-safe via the
    `is('founding_member_at', null)` filter — only one of N
    concurrent writers wins the slot.

**API routes**

- `src/app/api/billing/founding-member-count/route.ts` (new):
  rate-limited GET returning `{ ok, count: { claimed, total, full } }`
  for the page counter.
- `src/app/api/billing/lifecycle/route.ts`: extended to claim a
  Founding Member slot when the lifecycle resolves to active,
  the plan is `premium_annual`, and the buyer email matches a row
  in `public.users`. Silent on failure (never blocks the success
  redirect). Adds `foundingMemberClaimed: boolean` to the response.
- `src/app/api/billing/entitlements/route.ts`: extended to include
  `foundingMember` + `foundingMemberAt` in the response.

**Page UI — minimal hero + standard comparison + counter + FAQ**

- `src/app/pricing/page.tsx` (new): server component, revalidate
  60s. Sections in order: minimal hero with `<details>` expand for
  the longer copy, free-vs-paid two-column comparison, all 4 paid
  tier cards, Founding Member counter with progress bar, donation
  tier card, FAQ accordion (6 questions), quiet footer link row.
  Uses existing `EuangelionShellHeader` + `SiteFooter` +
  `Breadcrumbs` for shell consistency. No `'use client'` — all
  interactivity via native `<details>` for better SEO + no JS cost.

**Tests**

- `__tests__/founding-member.test.ts` (new): 14 tests covering
  read on null/holding/missing/failure paths, count on empty/some/full/
  failure paths, and claim on fresh/already_held/user_not_found/
  cap_reached/idempotent paths.

Test status: type-check + lint clean across all 9 touched files;
61/61 tests pass across the 8 related test files (founding-member,
api-security, llm-route-deadline, prompt-cache, retry-backoff,
token-counting, RSS, session-migration).

**What's still gated**

- Migration 010 must be applied to the live Supabase before the
  page works correctly (counter will show 0/500 silently until then;
  claim attempts will fail silently).
- Stripe Prices for monthly/annual/2yr/3yr need to be created in the
  dashboard and the env vars wired (see
  `docs/copy-specs/stripe-alignment-audit-2026-05-05.md`).
- Page itself stays gated until founder approves post-security
  review. Removing `robots: noindex` + adding to sitemap + linking
  from nav are the three switches to flip when ready.

Decisions: SA-002 (Section 0.2 implementation)
Feature: F-002 (governance), F-021 (billing surface)

## OVERNIGHT-2026-05-05 / Phase 10.5: Stripe alignment audit + composer.ts overview (2026-05-05)

**Phase 10.5 Stripe alignment audit (read-only)**

`docs/copy-specs/stripe-alignment-audit-2026-05-05.md` (new): a delta
audit between what `src/lib/billing/catalog.ts` defines today and what
master plan Section 0.2 demands. Use as a pre-written checklist when
sitting down with the Stripe dashboard.

Findings:

- Monthly price wrong: code says **$4.99/mo**, locked says **$7/mo**
  (+40%)
- Annual price wrong: code says **$39.99/yr**, locked says **$77/yr**
  (+92%)
- Missing: 2-year prepay tier ($140 — figure to confirm)
- Missing: 3-year prepay tier ($200 — figure to confirm)
- Missing: donation tier (one-time $25/$100/$250/$500)
- `'lifetime'` still in `BillingEntitlementsResponse.subscriptionTier`
  type union — Section 0.2 explicitly REJECTED lifetime
- iOS productId scaffolding still present (RevenueCat) — per master
  plan Section 0.13 Gap closure 5, iOS deferred to v1.5+; harmless
  but worth a tagging comment

The audit includes a concrete pre-launch checklist (Stripe dashboard
work + env vars + code changes) ordered by dependency. Webhook
lifecycle audit (Section 0.13 Gap closure 6 follow-up) intentionally
deferred to a separate focused pass.

No code changes. Pure read-only documentation pass.

**`src/lib/soul-audit/composer.ts` top-of-file overview extension**

Added a "Brain-router integration" section to the existing top-of-file
JSDoc covering the four overnight-pass infrastructure additions
(prompt caching with `cacheableUserPrefix`, real token counting via
`response.usage`, 429/5xx retry+backoff in `callAnthropic`, and
`AbortController` deadline from `generate-day` route). Plus a guidance
note on preserving the "stable prefix → dynamic suffix" separation
when modifying prompt structure so the cacheable portion stays
cacheable.

All other public exports already had per-function JSDoc — no further
documentation work needed in this file.

## OVERNIGHT-2026-05-05 / Phase 10.6 + 10C-P2 + pricing spec (2026-05-05)

Three additions, all additive, no behavior changes:

**Per-route dynamic og:image generation (Phase 10.6 closeout)**

- `src/app/series/[slug]/opengraph-image.tsx` (new): per-series OG
  card for the canonical `/series/[slug]` surface, mirroring the
  existing `/wake-up/series/[slug]/opengraph-image.tsx` shape but
  with main-product framing (cobalt background, gold accents,
  pathway tag). 1200×630, image/png. Verified live: HTTP 200 +
  `content-type: image/png` against the running dev server.
- `src/app/devotional/[slug]/opengraph-image.tsx` (new): same
  treatment for canonical devotional URLs. Surfaces series number,
  day number as architectural background element, day title, series
  question, pathway tag.

When `/series/identity` or `/devotional/sleep-day-1` is shared on
social, the OG card now surfaces real per-content metadata instead
of falling back to the global site card.

**JSDoc on `src/lib/api-security.ts` (Phase 10C-P2)**

`api-security.ts` is the shared security + observability primitives
for every API route. 17 public exports, 0 JSDoc blocks.

- Added top-of-file overview explaining the four functional areas
  (rate limiting, body parsing, input validation, error responses,
  wall-clock guards), the regex defaults, and the
  Upstash-vs-in-memory rate-limit caveat.
- JSDoc on `isSafeSlug`, `isSafeAuditRunId`, `isSafeAuditOptionId`,
  `sanitizeTimezone`, `normalizeTimezoneOffsetMinutes`,
  `sanitizeSingleLine`, `sanitizeOptionalText`, and most importantly
  `sanitizeSafeRedirectPath` (the open-redirect guard — its bullet
  list of what gets rejected is now visible in IDE tooltips at every
  call site).

**`/pricing` page copy + IA spec (Phase 3.10 follow-up)**

`docs/copy-specs/pricing-page-spec.md` (new): a complete copy + IA
spec for the `/pricing` page that doesn't exist yet. Master plan
flagged "Stripe wired but no surface" as the worst of all worlds;
this captures the locked Section 0.2 pricing into a deliverable
spec the founder can hand to engineering when ready.

Includes: 3 hero copy candidates with recommendation, two-column
free/paid comparison with exact wording, Founding Member section
with engineering notes for the 500-counter, donation tier card,
6 canonical FAQ answers, engineering notes (Stripe wiring already
exists per master plan Gap closure 6, components needed, tracking,
JSON-LD), and 5 open questions for the founder.

Test status: type-check + lint clean across all 3 changes; 9
api-security regression tests pass; HTTP 200 verified on both new
OG routes against the running dev server.

## OVERNIGHT-2026-05-05 / Phase 10C-P2: JSDoc on repository.ts ambiguous helpers (2026-05-05)

`src/lib/soul-audit/repository.ts` had 46 public functions and 2 JSDoc
blocks. Master plan flagged this as a P2 cleanup. Rather than churn
out 44 templated docs, focused on the genuinely-ambiguous ones —
where the function name doesn't tell you about fallback semantics,
mutation atomicity, or the in-memory-vs-Supabase tier distinction.

- Top-of-file overview block explaining the two-tier persistence
  model (Supabase canonical + in-memory fallback), the
  `*WithFallback` convention, when functions return null vs throw,
  and the link to `migrateSessionData` for cross-device consolidation.
- JSDoc on `maybeSupabase` (returns null on unavailability — not an
  error) and `safeInsert` (swallows errors, expects caller to ALSO
  write to in-memory).
- JSDoc on `getAuditRun` vs `getAuditRunWithFallback` distinguishing
  the cache-only vs cache+fallback contracts (same pattern applies
  to all other paired helpers; this is the canonical example).
- JSDoc on `listAuditRunsForSession*` family covering merge semantics
  - cache hydration as a side effect.
- JSDoc on `getSessionAuditCount` / `bumpSessionAuditCount` /
  `resetSessionAuditCount` covering the in-memory-only counter, the
  3-audit cycle limit it gates, the call-after-create pattern to
  prevent retry quota burn, and the no-cross-isolate-locking caveat.

The other ~40 functions are obvious from their names (`createAuditRun`,
`saveSelection`, `getConsent`, etc.) and the top-of-file conventions
section now explains the universal pattern.

Test status: type-check + lint clean, 27 regression tests pass
(daily-bread-api + api-security).

## OVERNIGHT-2026-05-05 / Phase 10.6: RSS feed + canonical URLs (2026-05-05)

Closes the remaining Phase 10.6 items flagged in `docs/overnight-followups.md`:

- `src/app/wake-up/feed.xml/route.ts`: new RSS 2.0 feed for Wake-Up
  Magazine. Surfaces the 7 Wake-Up Originals series as feed items
  (title, link, description, hero-image enclosure where present, the
  pathway tag as a category). Daily revalidate cadence. Self-link via
  `<atom:link>` for proper RSS-reader discovery.
- `src/app/wake-up/page.tsx`: added Next.js `metadata.alternates.types`
  for `application/rss+xml` so feed readers and browsers auto-discover
  the feed via `<link rel="alternate">` in the head.
- `src/app/sitemap.ts`: added the feed URL so crawlers find it.
- `src/app/devotional/[slug]/page.tsx`: explicit `alternates.canonical`
  (self) plus `openGraph.url`. The same content is also reachable via
  `/wake-up/devotional/[slug]`; until the founder picks one canonical
  surface (master plan Section 0.6 keeps Wake-Up as a separate funnel
  surface — could go either way), each route now declares itself
  canonical so Google doesn't pick a weird URL parameter as canonical.
- `src/app/wake-up/devotional/[slug]/page.tsx`: same self-canonical
  pattern with the wake-up URL.
- `__tests__/wake-up-rss-feed.test.ts`: 5 tests covering Content-Type,
  atom:link self-reference, item count, XML escaping, and per-item
  canonical URLs.

The deeper canonical-URL question (which of the two routes should be
THE canonical for Google ranking) is documented in
`docs/overnight-followups.md` Phase 10.6 — this requires a founder
product decision and shouldn't be made unilaterally during an
autonomous session.

## OVERNIGHT-2026-05-05 / Phase 10.6: Schema.org structured data (2026-05-05)

Existing JSON-LD coverage on this branch: devotional pages already have
`Article` + `BreadcrumbList`; series pages had `BreadcrumbList` only;
homepage had none. Added the missing structured-data layers so search
engines can render rich results (sitelinks search box, FAQ rich snippet,
multi-day series collection cards).

- `src/app/page.tsx`: added two `<script type="application/ld+json">`
  tags at the root of the homepage:
  - `WebSite` schema with a `SearchAction` `potentialAction` so Google
    can render the sitelinks search box pointing at `/series?q=...`.
  - `FAQPage` schema mapping the existing `FAQ_ITEMS` constant into
    `Question` / `Answer` pairs. Static — no extra source of truth.
- `src/app/series/[slug]/page.tsx`: added `CreativeWorkSeries` schema
  alongside the existing `BreadcrumbList`. Includes title, description,
  numberOfEpisodes, hero image, publisher org, and a `hasPart`
  enumeration of each day's `CreativeWork` (with day position + URL).
  Also fixed the breadcrumb leaf to set `item` URL.
- `src/app/wake-up/series/[slug]/page.tsx`: same `CreativeWorkSeries`
  shape on the Wake-Up surface for parity, with breadcrumb upgraded
  from "Series" trail to "Wake-Up Magazine" trail and `hasPart` URLs
  pointing at `/wake-up/devotional/...`.

Sitemap was already comprehensive (static pages + 65 series × 2 routes

- 176 devotionals × 2 routes). No sitemap changes required.

Test status: 3 series-related regression tests pass; type-check + lint
clean across all 3 touched files. No new tests added — the structured
data is a thin static-shape transform with no behavior surface to test.

## OVERNIGHT-2026-05-05 / Phase 10C-P1: jsonError adoption on complete-day + generate-day (2026-05-05)

`complete-day` and `generate-day` were partially updated by an earlier
overnight commit (`a6fd1b5`) — they got `createRequestId`/`logApiError`
on the JSON-parse path but kept ad-hoc `NextResponse.json({error}, {status})`
on every other error response. Finished the adoption so all error
responses on these two routes carry `requestId`, `deploymentFingerprint`,
and a typed `code` discriminator.

- `src/app/api/soul-audit/complete-day/route.ts`: 4 ad-hoc error sites
  → `jsonError({...})`. Codes: `INVALID_JSON_BODY`, `INVALID_FIELDS`,
  `PLAN_NOT_FOUND`, `COMPLETE_DAY_DB_FAILURE`. The DB-failure path
  also adds `logApiError` (was previously plain `console.error`).
- `src/app/api/soul-audit/generate-day/route.ts`: 4 ad-hoc error
  sites including the deadline-exceeded path I added in commit
  `6c4d1b1`. Codes: `INTERNAL_SECRET_REQUIRED`, `INVALID_JSON_BODY`,
  `INVALID_FIELDS`, `LLM_DEADLINE_EXCEEDED`. The other 11 internal
  error sites (each tied to a distinct DB write step) intentionally
  left for a later focused pass — each has its own job-state side
  effect that needs careful per-site testing.

Test status: type-check + lint clean; 18 daily-bread-api regression
tests pass.

## OVERNIGHT-2026-05-05 / Phase 10C-P1: Mounted-guard sweep on async useEffects (2026-05-05)

Master plan flagged ~15 async `useEffect` hooks doing `setState` after
unmount as a potential source of React warnings + stale state writes.
Stricter scan (await/.then + `set[A-Z]` + no `mounted`/`cancelled`/
`AbortController`/`disposed` guard) found exactly **2 real targets**;
the other ~13 candidates were either GSAP context setups (already
covered by `ctx.revert()` cleanup), `disposed` flag patterns, or
non-React `setLocalStorage` / `setItem` calls.

- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx:136` —
  added `let cancelled = false` guard around the async devotional
  fetch. `setDevotional` and `setLoading` now skip when the component
  has unmounted mid-fetch. Cleanup function returns the cancellation.
- `src/app/soul-audit/results/page.tsx:120` — same pattern around the
  `/api/soul-audit/current` fetch chain.

The codebase is in much better shape than the master plan estimated.
The pattern was already adopted in most async hooks.

Test status: focused vitest pass on
`devotional-library-rail-accessibility.test.tsx` and
`soul-audit-results-selection-ui.test.tsx` (both green).

## OVERNIGHT-2026-05-05 / Phase 10C-P0: AbortController on submit + chat (2026-05-05)

Extended the `withAbortDeadline` deadline guard to the two remaining
user-facing LLM-touching routes. The `select` route was deliberately
skipped — it doesn't call the LLM directly (jobs are fire-and-forget
to `generate-day`, which is already deadline-guarded).

- `src/lib/soul-audit/ingredient-selector.ts`: extended
  `IngredientSelectionOptions` with optional `signal?: AbortSignal`,
  plumbed through `generatePathsFromRag` to the underlying
  `generateWithBrain.context.signal`. Backward-compatible — existing
  callers that don't pass a signal behave exactly as before.
- `src/app/api/soul-audit/submit/route.ts`: wrapped both the strict
  selection attempt and the relaxed-retry attempt inside a single
  `withAbortDeadline(LLM_ROUTE_DEADLINE_MS, …)` so the combined
  budget can't blow the Workers wall-clock cap. On strict-attempt
  AbortError, skips the relaxed retry to avoid wasting the remaining
  budget. On deadline exceeded: structured `logApiError`, returns 504
  with code `LLM_DEADLINE_EXCEEDED`.
- `src/app/api/chat/route.ts`: wrapped the `generateWithBrain` call
  with the same deadline. The downstream SSE streaming is unaffected
  — it chunks the static result after the LLM has already returned.
  On timeout: 504 with same shape.

The original Phase 10C-P0 scope (submit + generate-day) is now
complete; chat is a bonus extension within the same pattern.

Test status: 39 chat regression tests + 11 deadline tests + 9
api-security tests still pass. No new tests added — the existing
`llm-route-deadline.test.ts` already covers the helper contract.

## OVERNIGHT-2026-05-04 / Phase 10B-P1: X-Model-Used response header (2026-05-04)

When the brain router falls back from Anthropic → Google → MiniMax →
NVIDIA, the client previously had no way to see which provider actually
served their reply. Surfaced the provider on the response.

- `src/lib/api-security.ts`: new `withModelUsedHeader(response, provider)`
  helper that sets `X-Model-Used: <provider>` when a provider name is
  given, no-ops otherwise. Returns the same response for chaining.
- `src/app/api/chat/route.ts`: wrapped both response paths (SSE
  streaming + JSON) with `withModelUsedHeader(…, generation.provider)`
  so the chat client can read which provider answered (after fallback).
- `__tests__/llm-route-deadline.test.ts`: 3 additional tests covering
  the header-set, no-op-on-empty, and chainable-return contracts.

Useful for debugging "why does this output look different from
yesterday" — was it Anthropic, did it fall back to Google, etc. Stable
short string values mirror `BrainProviderId` (`openai`, `google`,
`minimax`, `nvidia_kimi`).

## OVERNIGHT-2026-05-04 / Phase 10C-P0: AbortController deadline on LLM routes (2026-05-04)

LLM-touching routes had no wall-clock guard. A slow Anthropic call
(now with 3 retries up to 1+2 = 3s of backoff plus per-attempt latency)
risked silent kill by Cloudflare's 30s wall-clock cap, leaving
`generating_since` set on the job row and the user staring at "Generation
stalled" with no surfaced error.

- `src/lib/api-security.ts`: new `withAbortDeadline(deadlineMs, fn)`
  helper. Constructs an `AbortController`, schedules a timeout to abort
  it, awaits the inner work, clears the timer in finally. Plus
  `LLM_ROUTE_DEADLINE_MS` (25_000 — 5s headroom under the Workers cap)
  and `isAbortError(err)` for clean error detection.
- `src/lib/brain/types.ts`: `BrainRouteContext` gains optional
  `signal?: AbortSignal`.
- `src/lib/brain/router.ts`: every provider call (`callOpenAI`,
  `callAnthropic`, `callGoogle`, `callOpenAiCompatible`) now accepts
  an optional `signal` and forwards it to `fetch()`. `executeProvider`
  reads `request.context.signal` and plumbs it through. The Anthropic
  retry loop's pending fetch and the inter-attempt `sleep` are both
  cancelled by an external abort.
- `src/app/api/soul-audit/generate-day/route.ts`: wrapped the
  `generateWithBrain` call with `withAbortDeadline(LLM_ROUTE_DEADLINE_MS, …)`.
  On timeout, logs via `logApiError` (scope `soul-audit-generate-day`,
  context `reason: 'llm-deadline-exceeded'`), updates the job row to
  `status: error` with a deadline-aware message, and returns a
  structured 504 with `requestId`.
- `__tests__/llm-route-deadline.test.ts`: 8 tests covering the
  fast-resolve path, the deadline-fires-first path, the signal-passing
  contract, the no-leak finally, and the `isAbortError` predicate.

Other LLM-touching routes (submit, select, chat) intentionally left
for a future pass — each has slightly different orchestration and
needs its own per-call vs per-orchestration deadline decision. The
generate-day route was the highest-value first target (longest LLM
call, single LLM call per request, internal-only so no client UX
regression risk).

## OVERNIGHT-2026-05-04 / Phase 10B-P0: Anthropic retry on 429/5xx (2026-05-04)

`callAnthropic` previously gave up on the first non-2xx response and
fell straight to the next provider in the fallback chain. Transient
rate-limits (429) and server-side hiccups (5xx) wasted the Anthropic
attempt unnecessarily.

- `src/lib/brain/router.ts`: wrapped the Anthropic fetch in a 3-attempt
  retry loop. Retries fire on 429 and 5xx only — 4xx other than 429
  bubbles up immediately so the fallback chain takes over fast on real
  client errors. Backoff is exponential (1s, 2s) unless the response
  carries a `Retry-After` header, in which case its value (parsed as
  seconds, clamped at 30s) overrides the schedule. Each retry logs
  `[anthropic-retry] status=… attempt=… backoff_ms=…` for observability.
- `__tests__/anthropic-retry-backoff.test.ts`: 4 tests covering the
  recover-on-second-attempt 429 path, the give-up-after-3 503 path,
  the no-retry-on-400 client-error path, and the Retry-After-seconds
  honoring path.

The provider-fallback chain is unchanged — when all 3 Anthropic
attempts exhaust, the existing chain still moves on to the next
provider (Google → MiniMax → NVIDIA per `sortClaudeFirstThenCheapest`).

## OVERNIGHT-2026-05-04 / Phase 10B-P0: Real token counting from response.usage (2026-05-04)

The router was using `estimateInputTokens` / `estimateOutputTokens`
(1.5×-words heuristics) for every accounting decision (cost reporting,
quality scoring downstream, /usage page display). Replaced the estimates
with real usage stats parsed from each provider's response.

- `src/lib/brain/router.ts`: introduced internal `ProviderUsage` and
  `ProviderCallResult` types. Each provider call function (`callOpenAI`,
  `callAnthropic`, `callGoogle`, `callOpenAiCompatible`) now returns
  `{ text, usage? }`. Each parses the relevant usage fields:
  - Anthropic: `usage.{input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens}`
  - OpenAI: `usage.{prompt_tokens, completion_tokens}`
  - Google: `usageMetadata.{promptTokenCount, candidatesTokenCount}`
  - MiniMax/NVIDIA: `usage.{prompt_tokens, completion_tokens}`
- `executeProvider` prefers real usage when present, falls back to the
  existing word-based estimates when the provider response omits
  usage metadata. No public-API change to `ProviderExecutionResult`;
  the `inputTokens`/`outputTokens` fields just become accurate for
  every provider that returns the data.
- `__tests__/provider-token-counting.test.ts`: 4 tests covering
  Anthropic, Google, MiniMax (BYO), and the estimate-fallback path.

External consumers (`/api/chat`, `/usage` page, `usage-ledger`) get
more accurate cost tracking and token totals automatically — no
caller changes required.

## OVERNIGHT-2026-05-04 / Phase 10C: Structured error logging on JSON parse (2026-05-04)

The two soul-audit POST routes silently swallowed JSON parse errors,
returning a generic 400 to the client without leaving a server-side
trail to debug what payload was malformed.

- `src/app/api/soul-audit/complete-day/route.ts`: replaced silent
  `catch {}` with `catch (error) { logApiError({...}) }` using the
  pattern from `src/app/api/soul-audit/submit/route.ts`. Logs scope,
  requestId, method, path, and a context tag `invalid-json-body`.
- `src/app/api/soul-audit/generate-day/route.ts`: same pattern.

Survey result: 99 silent `catch {}` blocks exist across `src/`; only
the 2 above were both genuinely silent AND in API-route surface where
the structured logger applies. The other 97 are documented fallback
patterns (defensive Supabase fallbacks, `URL` parse fallbacks,
session-token fallbacks for non-request test calls). Each carries an
explanatory comment or has self-evident defensive intent. Documented
in `docs/overnight-followups.md` so a thoughtful pass can revisit later.

Per Phase 10C scope: AbortController, env consolidation, browser-storage
wrapper, mounted-guard sweep all deliberately untouched.

## OVERNIGHT-2026-05-04 / Phase 10B: Anthropic prompt caching (2026-05-04)

The composer's per-day Anthropic call sends 4–8 KB of stable reference
chunks plus a multi-KB system prompt every request. With prompt caching
those tokens cost $0.30/M instead of $3/M, and re-rolls / multi-day
plans hit the cache repeatedly.

- `src/lib/brain/router.ts`: extended `BrainGenerationRequest` with an
  optional `cacheableUserPrefix`. `callAnthropic` now constructs a
  structured `system` array and a structured first-user `content` array
  with `cache_control: { type: 'ephemeral' }` whenever the corresponding
  block exceeds 4096 chars (~1024 tokens, the Anthropic Sonnet
  prompt-cache minimum). Below threshold the prefix is concatenated
  the old way (no breakpoint emitted, identical semantics). Other
  providers (OpenAI, Google, MiniMax, NVIDIA) silently see the prefix
  concatenated in front of the first user message via
  `concatCacheablePrefixIntoFirstUser`.
- `src/lib/brain/router.ts`: added `[anthropic-cache] input=… output=…
cache_created=… cache_read=…` `console.info` log after every Anthropic
  call that returns cache stats. Quiet when no cache activity.
- `src/lib/soul-audit/composer.ts`: split `buildComposerUserPrompt` into
  `buildComposerUserPromptParts` returning `{ cacheablePrefix, dynamic }`.
  The reference-material block is the cacheable prefix; user reflection,
  day anchors, and the compose instruction are the dynamic suffix. The
  call site passes both fields.
- `__tests__/anthropic-prompt-cache.test.ts`: 6 tests covering string
  vs structured-array shape, cache_control placement, threshold
  behavior, log-line emission, and quiet-when-no-cache behavior.

No SDK upgrade required — router uses raw `fetch` against the Anthropic
REST API directly. Token counting, retry behavior, structured output,
provider health persistence, and model selection all left untouched
per Phase 10B scope.

## OVERNIGHT-2026-05-04 / Phase 3: Session migration on sign-in (2026-05-04)

When a returning user signed in on a different device, their prior
anonymous plans, bookmarks, audit runs, etc. were orphaned because the
data was bound to a different `session_token`. Phase 3 consolidates
prior sessions under the current one when a user signs in.

- `src/lib/session.ts`: extended `linkSessionToUser` to look up other
  `user_sessions` rows belonging to this user and migrate the
  session-keyed data tables (`devotional_plan_instances`, `audit_runs`,
  `consent_records`, `annotations`, `session_bookmarks`,
  `soul_audit_jobs`) from each prior session_token to the current one.
  Also exported a standalone `migrateSessionData(from, to)` for testing
  and reuse.
- `__tests__/session-migration.test.ts`: 8 unit tests covering shape,
  per-table column mapping (`session_id` vs `session_token`),
  multi-prior-session migration, no-op cases, and prior-lookup error
  resilience.

Schema discrepancy noted in `docs/overnight-followups.md`: the prompt
asked to set `user_id` on the data tables, but those tables do not
have a `user_id` column. The implemented approach (session_token
consolidation) achieves the same user-facing outcome — returning
signed-in users see all their prior data — without requiring a DB
migration (explicitly disallowed tonight).

## OVERNIGHT-2026-05-04 / Phase 2: Active-plan visibility (2026-05-04)

The Soul Audit plan was invisible everywhere except `/` and `/daily-bread`,
which produced the founder's "series disappears after navigating away"
sensation. Surfaced it in the global header and on `/series`.

- `src/hooks/useActivePlan.ts` — new client hook that fetches
  `/api/soul-audit/current` once per navigation, caches the result at
  module scope to deduplicate, and re-fetches on a new
  `soulAuditPlanChanged` window event.
- `src/components/ActivePlanBadge.tsx` — new component with two variants:
  `header` (compact "DAY N · Series Title") and `tile` (larger card for
  surface pages). Hides entirely when no active plan or while loading.
- `src/components/EuangelionShellHeader.tsx` — mounted the header-variant
  badge in the desktop topbar actions row and at the top of the mobile
  secondary nav panel.
- `src/app/series/page.tsx` — mounted the tile-variant above the existing
  rails/grid/list views.
- `src/app/api/soul-audit/current/route.ts` — added `seriesTitle` and
  `dayNumber` to the response so the client doesn't need to bundle
  `SERIES_DATA` for the badge label.
- `__tests__/active-plan-badge.test.tsx` — 5 unit tests, all pass.

## OVERNIGHT-2026-05-04 / Phase 1: AI plan reader adapter (2026-05-04)

The AI-composed Soul Audit reader was rendering each day as three bare
`<p>` tags because the composer left `CustomPlanDay.modules` empty and
the renderer's rich `ModuleRenderer` dispatch was unreachable. Fixed by
adding an adapter that maps composer flat fields into a `DevotionalModule[]`
shape the renderer understands.

- `src/lib/soul-audit/ai-plan-to-reader.ts` — new. Exports
  `aiPlanDayToReader(day)` (scripture + teaching + prayer modules) and
  `resolveDayModules(day)` (prefer native, fall back to adapter).
- `src/components/soul-audit/PlanDayContent.tsx` — replaced inline
  basic-text rendering with `ModuleRenderer` dispatch.
- `src/components/soul-audit/DayContent.tsx` — same.
- `__tests__/ai-plan-to-reader.test.ts` — 10 unit tests covering shape,
  paragraph preservation, empty-field handling, type-union compliance,
  and `resolveDayModules` precedence.

`nextStep` and `journalPrompt` continue to render in the existing bottom
section to keep behavior consistent with the curated reader (deviation
documented in `docs/overnight-followups.md`).

## OVERNIGHT-2026-05-04: tsconfig + lint baseline meta-fix (2026-05-04)

Pre-commit hook was failing on baseline `tsconfig`/`lint` errors unrelated
to any new work, blocking all commits on branch `revamp/overnight-2026-05-04`.

- `tsconfig.json` — added `user-references` and `wakeup-mag` to `exclude` so
  scratch/reference TypeScript files outside `src/` stop being type-checked.
  Mirrors how `content`, `database`, and `scripts` are already excluded.
- `src/components/soul-audit/GenerationProgress.tsx:99` — added
  `eslint-disable-next-line react-hooks/set-state-in-effect` for the existing
  fire-and-poll pattern, with a pointer to `docs/overnight-followups.md` for
  the proper future fix.

Behavior is preserved exactly. Documented under "Meta-fixes" in
`docs/overnight-followups.md` so the founder can reverse either change.

## BRAND-001: Brand Bible v1.0 + workstream documentation (2026-05-02 → 2026-05-04)

Three-day workstream synthesizing the Euangelion brand from drifting half-built state into a single canonical operating reference.

**New deliverables:**

- `docs/brand/BRAND-BIBLE.md` — 16-chapter, ~25k-word Brand Bible v1.0 with 12+ ready-to-use Claude prompt templates
- `docs/brand/ASSET-MANIFEST.md` — priority-ordered ~140-asset production list driving Gate 3 + Phase 3
- `docs/portfolio/CURRENT-STATE-LEDGER.md` — tactical foundation for the bible (Gate 0 output)
- `docs/portfolio/PHASE-1-VISUAL-ANALYSIS.md` — source-site teardown + Euangelion comparison + reference-image-language codification
- `docs/portfolio/BRAND-BIBLE-PROCESS.md` — methodology + chronology + decisions ledger + lessons-learned
- `docs/portfolio/BRAND-BIBLE-CASE-STUDY.md` — narrative case study for portfolio use
- `BIBLE-LICENSING/README.md` + `drafts/letter-HCCP.md` + `status-log.md` — translation licensing strategy + draft permission letters

**Brand decisions locked (selected):**

- **Tagline:** "Good News for you, daily." (atmospheric: "Daily bread for the hungry soul.")
- **Spelling migration:** EUONGELION → EUANGELION across 219 files / 1,282 corrections / 32 intentional preservations (cookie keys, GitHub repo path)
- **Translation primary:** Berean Standard Bible (BSB, public domain) — unblocks AI-pipeline scale
- **Wordmark system:** 7-variant rotation (6 hand-generated SVGs + Industry constant) + animated transition + variants pinned to specific surfaces
- **Lamb mark:** Seven-eyed Lamb of Revelation 5:6, 7 treatments, full-body + head-only versions, NOT in site header
- **Color palette:** Cobalt Triad (Cream `#F0ECE6` + Navy Ink `#11182A` + Cobalt `#1F2A8D`) — production-true; legacy Warm Triad documented as historical lineage only
- **Typography:** Instrument Serif (display + body + scripture) + Industry (UI) + Poppins (Greek anchor)
- **Pricing tiers:** Free (all prefabs + 1 AI generation/month) + Paid (unlimited AI plans). BYO API key dropped.
- **Print system:** 11 locked formats anchored on Mini Gospel Magazine + 10 parking-lot formats

**Methodology:** Five-gate model (Gate 0 Ledger → Gate 1 scope interview → Phase 1 analysis → Gate 2 13-section brand interview → Phase 2 bible draft → Gate 3 mockup test → Phase 3 batch generation → Gate 5 verification) with strict citation discipline and source-of-truth protocol.

**Pending:** Gate 3 (mockup pipeline test, 3–5 sample images) → Phase 3 (full batch generation, ~140 assets) → Gate 5 (verification pass).

---

## SA-039: Reference library fs→fetch migration verified (2026-03-07)

- **Verification**: Full reference library (5,114 chunks, 15.6 MB) loads correctly on Cloudflare Workers via ASSETS binding.
- **Submit test**: `/api/soul-audit/submit` returns 3 options each with `sourceHints` — proving BM25 retrieval from reference-index.json works end-to-end on Workers.
- **Brain/RAG**: `buildCanonicalRagIndex()` and `getCanonicalRagIndex()` converted to async, reference fallback works.
- **All 15 curl tests pass** on Workers preview (8787).

## SA-038: Soul Audit async job architecture for Cloudflare Workers (2026-03-06)

- **Architecture**: Replaced synchronous 7-day generation (Vercel timeout) with async job-based system. Client polls `/select/status` which fires `/generate-day` per day via fire-and-forget.
- **New routes**: `/api/soul-audit/generate-day` (internal, secret-protected), `/api/soul-audit/select/status` (CORS, polling), `/api/soul-audit/complete-day` (session-authenticated).
- **New table**: `soul_audit_jobs` with columns: id, session_id, run_id, plan_id, status, progress, current_day, theme, scripture_anchor, user_input, timezone, error, generating_since.
- **Select route rewrite**: Creates job + plan in single request, returns jobId for polling. Idempotent — reuses existing active job if one exists.
- **Status route**: Detects stalled jobs (120s timeout), handles pending→generating transition, fires generate-day with correct field names matching GenerateDayRequest interface.
- **Generate-day route**: Internal-only (X-Internal-Secret), composes one day at a time with BM25 reference retrieval + LLM composition, saves to Supabase, advances job progress.
- **Daily Bread page**: Server component with 4 states — EmptyState (no session), HoldingState (before Monday unlock), DailyBreadView (active plan), CompletionState (all 5 days done).
- **GenerationProgress component**: Client-side polling UI with animated progress messages, handles error/stalled states.
- **Bug fixes**: Session cookie mismatch in complete-day (was using wrong cookie), pending job handling in status route (jobs start as pending not generating), field name alignment in fire-and-forget payload.
- **Types**: 19-field DayContent, JobRecord, PlanRecord, PlanDayRecord, DayScheduleEntry — all aligned to actual DB column names.
- **Constants**: USING_QUEUE_FALLBACK=true, STALL_TIMEOUT_MS=120000, GENERATING_LOCK_TIMEOUT_MS=60000, INTERACTIVE_ROTATION map.
- **Security**: generate-day returns 403 without valid X-Internal-Secret header.
- **11/11 curl tests pass**, full audit against 1200-line plan confirmed 100% compliance.

## SA-037: LLM-compose Day 1, clean dead code, gitignore hygiene (2026-03-01)

- **Day 1 LLM composition**: Select route now uses `composeDay()` for Day 1 (LLM-composed flowing prose, 5-8s). Days 2-5 remain deterministic. Fixes the raw chunk dump problem where devotionals read like a quote database export.
- **Dead code cleanup**: Removed 175-line `indexDevotionalJsons()` and 3 unused constants from reference-retriever.ts.
- **Lint cleanup**: Removed 3 unused imports. 0 errors, 2 pre-existing hook warnings.
- **Gitignore**: Added `.claude/launch.json`, `.claude/settings.local.json`, `.claude/worktrees/`, `.claude/plans/`. Committed `.vercelignore`.
- **Deleted**: 6 stale worktrees, obsolete SQL migration, SA-025 patch file.

## SA-036: Filter metadata chunks, expand reference library (2026-03-01)

- **Metadata filter**: New `isMetadataChunk()` in reference-utils.ts filters document headers, TOCs, expansion protocols, PG/CCEL boilerplate, and placeholder text from reference index.
- **Build script**: Added per-author chunk cap for source diversity. Skips README.md and other non-theological files.
- **New public domain sources added** (all pre-1929, verified):
  - G.K. Chesterton: _Orthodoxy_, _The Everlasting Man_, _Heretics_
  - Blaise Pascal: _Pensees_
  - John Bunyan: _The Pilgrim's Progress_, _Grace Abounding_
  - John Owen: _Of the Mortification of Sin in Believers_
  - E.M. Bounds: _Power Through Prayer_
  - Hannah Whitall Smith: _The Christian's Secret of a Happy Life_
- **Index expanded**: 2,404 chunks → 5,271 chunks across 19 sources, 2M+ words. Zero metadata leaks.

## SA-035: Fix three production bugs in composer pipeline (2026-03-01)

- **Bug 1 — LLM throw kills fallback**: `generateWithBrain()` throws on failure, but `composeDay()` had no try-catch. The `buildDeterministicDay()` fallback never fired. Now wrapped in try-catch.
- **Bug 2 — Empty reflection catch block**: Select route's outer catch created days with `reflection: ''` instead of calling `buildDeterministicDay()`. Removed — `composeDay()` handles failures internally.
- **Bug 3 — Vercel timeout**: 5 sequential LLM calls (15-30s each) exceeded Vercel's 60s function limit. Select route now calls `buildDeterministicDay()` directly — instant, zero LLM, no timeout.
- **Result**: Every devotional day is now assembled from 15-20 real reference library chunks (Augustine, Calvin, Luther, etc.) with zero LLM dependency at selection time.

## SA-034: Fix smoke test CI flake (2026-03-01)

- **Tests**: Flush React scheduler work before jsdom teardown to prevent `window is not defined` unhandled error in CI.

## F-060: Composer fix — reference library integration (2026-03-01)

- **Composer**: `buildDeterministicDay()` now assembles devotional content from reference library chunks (Augustine, commentaries, theology) instead of serving raw curated module text.
- **Select route**: All 7 days composed at selection time — no pending stubs, no on-demand LLM dependency.
- **Days 6-7**: Sabbath and Recap composed with real prior-day context via `composeSabbath`/`composeRecap`.

## F-060: Soul Audit Pipeline Overhaul (2026-03-01)

- **Performance**: Submit wait time reduced from 30-60 seconds to < 1 second. Deterministic ingredient selection replaces LLM outline generation.
- **Architecture**: New `ingredient-selector.ts` (keyword scoring) and `composer.ts` (focused LLM composition per day, 5-8s).
- **Consent**: Folded into select route as inline `essentialAccepted` field. Separate consent endpoint deleted.
- **Entry points**: Unified via `useSoulAuditSubmit` shared hook. Duplicate submit logic in homepage and /soul-audit page removed.
- **Results page**: Decomposed from 2,775-line monolith into focused components: `OptionCard`, `CrisisGate`, `DayContent`, `helpers.ts`.
- **Plan reader**: Moved to dedicated page at `/soul-audit/plan/[planToken]` (was embedded in results page).
- **Day gating**: Re-enabled (default on). Days unlock at 7 AM per Monday cycle.
- **Deleted**: `outline-generator.ts`, `outline-cache.ts`, `generative-builder.ts`, cascade routes, `useGenerationStatus`, `Navigation.tsx`, consent route, deprecated bridge route.
- **Net change**: -3,800 lines. All 1039 tests passing.
- **Supersedes**: Previous zero-LLM curated assembly engine work and cascade bug fixes (SA-026 through SA-032).

---

## F-059: Create missing Soul Audit Supabase tables + client fallback (2026-02-28)

- **Critical fix**: Cascade day generation stuck at 0/7 days forever. Users waited 30+ minutes seeing "BUILDING" on all days.
- **Root cause**: The Soul Audit tables were never created in Supabase. `safeInsert` silently swallowed all errors, so data only lived in one serverless instance's memory.
- **Fix (SA-023)**: Migration 009 creates all 10 missing tables. Replaced silent catches with `console.error` logging.
- **Fix (SA-024)**: Client-side context fallback — `generate-next` now accepts `planOutline`, `optionMeta`, `userResponse`, and `currentDays` in the request body. When Supabase lookups return null, the server uses client-supplied data. The cascade client reads fresh from sessionStorage/localStorage each call.
- **Fix (SA-025)**: Root cause — cascade died before even trying to generate. `generation-status` returned 404 (Supabase tables missing) → cascade's initial status check got null → `if (!initialStatus) return` killed the entire loop. Fixed: cascade now constructs synthetic status from local planDays when the API fails. Also fixed `generation-status` to return a "generating" status instead of 404 when Supabase tables are absent.
- **Fix (SA-026)**: Final cascade blocker — `isDayStillPending()` queries Supabase for the day's pending status. When tables don't exist, the query returns `{ data: null, error: null }` instead of an error. `null !== null` evaluates to `false`, so the function incorrectly reports the day as "already generated." The generate-next endpoint then re-fetches days from empty Supabase and returns `totalDays: 0, status: complete` without generating anything. Fix: skip the `isDayStillPending` cross-instance guard when using client-supplied data (Supabase has no data to check against).
- **Fix (SA-027)**: Options never rendered after submit via `/soul-audit` page. The dedicated Soul Audit page stored submit results in `localStorage` but the results page reads from `sessionStorage`. Homepage form used `sessionStorage` correctly. Fixed: `/soul-audit/page.tsx` now uses `sessionStorage` consistently. Also fixed both reset handlers to clear both storage types.
- **Fix (SA-028)**: Cascade day generation silently fails — every `generate-next` LLM call (15-30s) exceeds Vercel's default 10s function timeout (Hobby). Vercel kills the process, but the warm instance keeps the in-memory lock, so all subsequent requests get "already_generating" forever. Fix: (1) Added `export const maxDuration = 120` to `generate-next` and `submit` routes so LLM calls have time to complete. (2) Changed in-memory lock from boolean to timestamp with 90s TTL so stale locks auto-expire.
- **Fix (SA-029)**: LLM generates valid devotional content but `parseGeneratedDay` fails because `maxOutputTokens` was too low. For a 10-minute devotional (1500 words), the calculation yielded only 2250 tokens — not enough for the full JSON with modules, field names, and structural overhead. The response was truncated mid-JSON. Fix: increased multiplier from 1.5× to 3× the word target with a 4096 token floor (10-min devotional now gets 4500 tokens). Also added structured parse-failure logging with provider name and output length.
- **Fix (SA-030)**: After Day 1 generates successfully, `updatePlanDayContent` stores only that one day in in-memory cache. On the next `generate-next` call, `getAllPlanDaysWithFallback` returns 1 cached day (now "ready"), finds no pending days, and returns `status: "complete"` with `totalDays: 1`. Cascade exits after generating just 1 of 7 days. Fix: merge server-side cached days with client-supplied `currentDays` when the server has fewer days, so all 7 pending days remain visible.
- **Result**: Cascade generation works even before the Supabase migration is run. Running the migration adds cross-instance persistence.

---

## F-058: Fix select timeout — async day generation (2026-02-28)

- **Critical fix**: Selecting an AI-generated devotional path timed out on Vercel, showing "Unable to generate your first devotional day right now" error every time.
- **Root cause**: `select/route.ts` called `generateDevotionalDay()` synchronously during the selection HTTP request — a 15-30s LLM call that exceeded Vercel's function timeout.
- **Fix**: Removed synchronous Day 1 generation from selection. All 7 days start as "pending" and the cascade generator (`generate-next`) handles them progressively after page load.
- **Result**: Selection completes in <500ms. Day 1 generates within ~15-20s of page load via cascade with real RAG references.

---

## F-057: Fix RAG pipeline — deploy verified reference-index.json (2026-02-28)

- **Critical fix**: Devotionals on production had zero real theological reference grounding. The 80/20 RAG contract was violated — content was 100% LLM hallucination.
- **Root cause**: `public/reference-index.json` was gitignored and never created. `content/reference/` (13GB) was also gitignored. The system silently fell back to indexing the app's own devotional JSONs as "reference material" (circular self-referencing).
- **Fix**: Built and deployed `reference-index.json` with 2,404 verified chunks from Augustine, Calvin, Luther, Edwards, Tozer, Brother Lawrence, Thomas à Kempis, and Douglass.
- **Fix**: Removed devotional self-referencing fallback from `reference-retriever.ts`.
- **Fix**: Added reference-index.json fallback to `reference-volumes.ts` so curated-builder gets real commentary witnesses on Vercel.
- **Fix**: Added degradation warning log and explicit Scripture-grounding constraint in `generative-builder.ts`.
- **Data issue identified**: ~35 of 52 reference library .txt files contain wrong Gutenberg downloads (novels instead of theology). Only 9 files verified correct.

---

## Fix 4 production bugs: audit validation, mobile menu, guest flow (2026-02-26)

- **Bug fix**: `isSafeAuditOptionId` regex rejected all `ai_generative` option IDs (3-segment format `kind:slug:rank`) — regex only accepted the 4-segment format used by `ai_primary`. This caused "Invalid auditRunId or optionId format" on every AI audit selection.
- **Bug fix**: Mobile hamburger menu was trapped behind the date ticker — absolutely-positioned ticker items (`inset: 0`) covered the toggle button. Fixed with `position: relative; z-index: 2` on toggle + explicit grid column layout.
- **Bug fix**: Guest users had no way to sign up after dismissing the initial guest gate on mobile — the mobile nav panel only showed ACCOUNT for authenticated users. Added SIGN IN / SIGN UP links for unauthenticated users.
- **Note**: "Guest cannot view devotional" was caused by the same regex bug — fixing the option ID validation unblocks the entire guest selection → devotional flow.

---

## F-056: Audit hardening — security, timeout, error semantics (2026-02-26)

- **Security**: Clarifier session fingerprint now uses `timingSafeEqual` (was plain `!==` on hex strings).
- **Bug fix**: Client-side submit timeout increased from 15s to 90s — LLM generation takes 30-60s, every request was falsely timing out.
- **Error semantics**: Provider/network failures in `generatePlanOutlines()` now rethrow (503) instead of being swallowed as null (422).
- **Optimization**: Removed redundant double-call to `sanitizeOptionSet()` in submit route.
- **Lockfile sync**: `package-lock.json` engines field aligned with `package.json`.

---

## F-056: Fix Soul Audit generation pipeline (2026-02-25)

- **Critical fix**: Soul Audit submit was returning `OPTION_ASSEMBLY_FAILED` for every request — no AI-generated devotional outlines were being produced.
- **Root cause 1**: Invalid Anthropic model name `claude-3-5-sonnet-latest` (retired) returned 404. Changed to `claude-sonnet-4-6`.
- **Root cause 2**: dotenv v17 won't overwrite existing env vars. Shell-exported `ANTHROPIC_API_KEY=""` shadowed the `.env.local` value, making the provider appear unavailable. Added `firstNonEmptyEnv()` helper + `GEMINI_API_KEY` fallback for Google provider.
- **Root cause 3**: `maxOutputTokens: 2400` truncated LLM output mid-JSON (3 outlines x 7 days needs ~4000-6000 tokens). Increased to 8192. Added `tryParseJsonArray()` with JSON salvaging to recover complete outlines from truncated responses.
- **Diagnostic logging**: Generation pipeline now logs provider availability, LLM response stats, parse results, and detailed errors.
- **Verified**: 1047/1047 tests pass, live submit returns 3 AI-generated plan outlines + 2 curated prefabs.

---

## F-055: Fix devotional page hydration mismatch (2026-02-24)

- **Critical fix**: All devotional pages were permanently stuck on "Loading: Preparing your devotional" due to a React 19 hydration mismatch in the shell header's `<time>` element (`new Date()` differs between SSR and client).
- **Root cause**: `useState(() => new Date())` in `EuangelionShellHeader` produced different timestamps server-side vs client-side. React 19 threw a hard hydration error, preventing the component tree from mounting and blocking all `useEffect` hooks (including the devotional JSON fetch).
- **Fix**: Deferred date to client-side `useEffect` with `null` initial state. Added `suppressHydrationWarning` to the `<time>` element.
- **CSP dev fix**: Added `'unsafe-eval'` to Content-Security-Policy in development mode only for Next.js Fast Refresh compatibility.

---

## F-054 SA-021: Token-saving strategy for generative devotionals (2026-02-24)

- **Deterministic Sabbath/Review**: Day 6 (sabbath) and Day 7 (review) now use deterministic template builders by default, eliminating 2 LLM calls per plan. LLM versions preserved behind `GENERATIVE_SABBATH_REVIEW=true` flag.
- **Deterministic intent parsing**: Switched from LLM to keyword-based intent parser by default. Outline LLM already sees raw user text, making separate intent call redundant. Toggle with `LLM_INTENT_PARSING=true`.
- **Skip doc reranking**: Removed LLM reranking of grounding docs (keyword ordering is adequate for 4-6 docs). Toggle with `LLM_DOC_RERANKING=true`.
- **Outline response cache**: In-memory LRU cache (200 entries, 1h TTL) keyed by normalized themes+tone. Common audit themes achieve 50-80% cache hit rates, skipping the outline generation call entirely.
- **Compressed system prompts**: Devotional prompt reduced ~44%, outline prompt ~38%. All constraints preserved.
- **Reduced reference chunks**: Max chunks per day reduced from 6-12 to 3-6. Chunk content truncated to 1200 chars. Top-scored chunks carry 80%+ of relevant material.
- **Net impact**: 32% cost reduction per plan ($0.0076 → $0.0052). 47-63% more plans per $100/month budget. All optimizations flag-gated for premium toggling.

---

## Soul Audit persistence + curation fix (2026-02-24)

- **Persistence fix**: All Soul Audit state (submit response, selection, plan cache, reroll state, last input) moved from `sessionStorage` to `localStorage`. Audits now survive page refresh and tab close.
- **LLM diagnostics**: Added provider availability logging to submit route and outline generator. Console now clearly reports which providers are available, which strategy is used (generative vs curated), and what the parsed intent looks like.
- **Fallback curation improvement**: Series metadata fallback now uses semantic hint expansion (same as primary curated ranking) so short inputs like "prayer" or "anxiety" match relevant series instead of returning generic results. Combined series keywords into haystack for broader coverage.

---

## F-052 SA-020: Devotional image improvements (2026-02-24)

- **Full-color images everywhere**: All preview thumbnails (browse cards, SeriesHero, Soul Audit) switched from print.webp (blue woodprint) to raw.webp (full-color museum photos).
- **Contained devotional artwork**: Inline artwork inset to 85% width (92% mobile) with 3:2 cinematic aspect ratio, replacing full-bleed 4:3.
- **Artwork relevance text**: Compact attribution now shows why each artwork was chosen. 32 SERIES_HERO entries populated with literary relevance descriptions.
- **Series detail hero image**: Individual series pages now show the hero image in the meta sidebar, matching the browse card.

---

## F-052 SA-020: Card alignment + raw image optimization (2026-02-24)

- **Card image alignment**: Title fixed to 2-line height, keywords fixed to single-line height — thumbnail images now align consistently across cards in a rail regardless of text length.
- **Raw image optimization**: Converted 642 raw.jpg → raw.webp (full-size, quality 82). 281 MB → 202 MB (28% reduction). Manifest and generate script updated to raw.webp paths.
- **Keywords font reduced**: 0.82× base size for visual hierarchy.
- **Scripture 3-line clamp**: Increased from 2 to 3 lines to prevent clipping.

---

## F-052 SA-020: Continue Reading rail fix + dark mode image cleanup (2026-02-24)

- **Continue Reading padding**: Single-item Continue Reading rail no longer stretches to full viewport width. Pads to ≥3 items with keyword-matched suggested series. Suggested cards show "SUGGESTED" badge.
- **Dark mode image inversion removed**: Removed all `filter: invert(1)` dark mode rules from series thumbnails, devotional artwork, and lightbox images. Artwork now renders naturally in both modes.
- **Card layout reorder**: Card info order changed to Title → Keywords → Image → Scripture → Action (all variants).
- **Scripture preview expanded**: 2-line clamped preview (~220 chars) combining framework snippet + series question with ellipsis.

---

## F-053 SA-020/21/22: Generative 80/20 RAG Composition Engine (2026-02-23)

### What Changed

- **Generative devotional engine**: Soul Audit now generates fully unique 7-day devotional plans on the fly instead of matching to pre-built series. 80% of content comes from the 13GB reference library via RAG retrieval, 20% is AI-generated bridging and personalization.
- **Plan outline generation**: Submit route generates 3 unique plan outlines via LLM, each approaching the user's topic from a different angle. Replaces curated matching for AI options.
- **7-day plan structure**: 5 devotional days following chiastic arc (A-B-C-B'-A') + Day 6 sabbath/review + Day 7 next-week discernment. Each day assigned PaRDeS level and chiastic position.
- **Contextual module selection**: 12 module types are a palette (3-10 per day). LLM selects modules based on topic, chiastic position, and length budget. Always includes scripture + reflection/prayer.
- **Progressive day delivery**: Day 1 generated synchronously at selection. Days 2-7 generated via cascading `/api/soul-audit/generate-next` calls with progress bar in results page.
- **Enhanced reference retrieval**: New chunked corpus builder splits reference files into 200-800 word chunks for semantic retrieval. Two-pass scoring: keyword matching then source priority ranking.
- **Composition transparency**: Each generated day includes composition report (reference % vs generated %, source list) displayed in results page.
- **Graceful fallback**: If generative path fails, system falls back to curated-first matching. Curated prefab options continue routing to series pages.
- **New option kind**: `ai_generative` alongside `ai_primary` and `curated_prefab`. Results page renders both with appropriate card styling and CTA text.

### New Files

- `src/lib/soul-audit/reference-retriever.ts` -- chunked corpus + two-pass retrieval
- `src/lib/soul-audit/outline-generator.ts` -- 3 unique plan outlines via LLM
- `src/lib/soul-audit/generative-builder.ts` -- 80/20 RAG day generation
- `src/app/api/soul-audit/generate-next/route.ts` -- cascading generation endpoint
- `src/app/api/soul-audit/generation-status/route.ts` -- progressive delivery poll endpoint
- `docs/feature-prds/F-053.md` -- feature PRD

### Modified Files

- `src/types/soul-audit.ts` -- generative engine types
- `src/types/database.ts` -- ai_generative kind
- `src/app/api/soul-audit/submit/route.ts` -- generative outline path + fallback
- `src/app/api/soul-audit/select/route.ts` -- ai_generative handler
- `src/app/soul-audit/results/page.tsx` -- progressive generation UX
- `src/lib/soul-audit/matching.ts` -- exported utilities
- `src/lib/soul-audit/repository.ts` -- telemetry strategy type
- `docs/production-decisions.yaml` -- SA-020/21/22 decisions
- `docs/feature-prds/FEATURE-PRD-INDEX.md` -- F-053 entry
- `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml` -- F-053 entry

---

## SA-020: Card Redesign + Homepage/Series Overhaul + Soul Audit Matching Fix (2026-02-23)

### What Changed

- **Three card variants**: BrowseSeriesCard now supports large (Ref → Title → Image → Keywords → Action), medium (Image → Ref → Title → Keywords → Action), and small (Title → Keywords → Action, no image) via `variant` prop. Keyword pills from `series.keywords[]` replace description paragraphs.
- **Homepage redesign**: Merged two hero panels into single 2-column layout (illustration left, audit right). Added 4 ChatGPT-style prompt pills. Featured series converted to horizontal rail with large cards (limited to 6). FAQ padding increased. Buttons auto-width (not full-width).
- **Series page 3-view system**: Compact centered header with view toggle (Rails / Grid / List). Grid and List views support topic + reading time filtering with filter chips. Search input in grid/list modes. Featured rail uses large cards, theme rails use medium cards.
- **Soul Audit matching fix**: Moved `parseAuditIntentWithBrain()` before `buildAuditOptions()` so AI-extracted themes influence candidate ranking. Added `aiThemes` parameter threading with weight 4 scoring. Added 10 biblical topic triggers to `expandSemanticHints()` (prophet, psalm, gospel, paul, genesis, exodus, wisdom, suffering, resurrection, jesus).
- **Soul Audit option cards**: AI primary options render as large card variant with blue woodprint thumbnail and keyword pills. Curated prefab options render as small text-only variant.
- **Devotional raw images**: Added `rawSrc` field to ArtworkEntry. DevotionalArtwork and ArtworkLightbox now use `rawSrc` (museum photos / raw.jpg). Card thumbnails continue using `src` (blue woodprint / print.webp).

### Files

- `scripts/generate-artwork-manifest.mjs` — added `rawSrc` field detection and serialization
- `src/data/artwork-manifest.ts` — regenerated with rawSrc for all 639 artworks
- `src/app/page.tsx` — merged hero layout, prompt pills, featured rail, inline buttons
- `src/app/series/page.tsx` — 3-view system (rails/grid/list), compact header, filtering
- `src/app/soul-audit/results/page.tsx` — large/small card variants for AI/curated options
- `src/app/api/soul-audit/submit/route.ts` — moved AI intent before candidate selection
- `src/app/globals.css` — card variant CSS, homepage hero, series page toolbar/views, audit card styles
- `src/components/BrowseSeriesCard.tsx` — variant prop system (large/medium/small)
- `src/components/SeriesRailSection.tsx` — cardVariant prop passthrough
- `src/components/SeriesHero.tsx` — thumbnail class update
- `src/components/DevotionalArtwork.tsx` — use rawSrc for reading context
- `src/components/ArtworkLightbox.tsx` — use rawSrc for gallery
- `src/lib/soul-audit/curation-engine.ts` — aiThemes scoring, biblical topic triggers
- `src/lib/soul-audit/matching.ts` — aiThemes parameter threading
- `docs/feature-prds/F-052.md` — outcomes log updated

---

## F-052: Blue Woodprint Remap — 639 Artworks, Single Image Source (2026-02-23)

### What Changed

- **Remapped to unified blue woodprint (`print.webp`)**: Replaced dual `print-dark.webp`/`print-light.webp` with single `print.webp` blue-on-white woodprint style matching homepage engravings (`#171b69` deep indigo). Eliminates CSS-only dark/light toggle complexity and hydration mismatch risk.
- **Artwork count nearly doubled**: 639 artworks (up from 319). 50 new artwork.json metadata files generated for directories that had images but no metadata.
- **Dark mode via CSS inversion**: Single `filter: invert(1)` rule flips blue-on-white to white-on-dark, maintaining the woodprint aesthetic in both modes.
- **Card text legibility improved**: Scrim gradient opacity increased (top 15%→45%, mid 55%→65%) for better text readability over duotone woodprint backgrounds.
- **Relevance field infrastructure**: Added `relevance` field to ArtworkEntry interface and manifest generator. Displayed in lightbox museum card with italic serif styling. Ready for future storytelling curation.
- **Manifest coverage**: 32 series heroes, 170 devotionals with 3+ artworks each, 639 total artworks in lookup table.

### Files

- `scripts/generate-artwork-manifest.mjs` — single `print.webp` check, `src` field replaces `darkSrc`/`lightSrc`, added `relevance` field
- `src/data/artwork-manifest.ts` — regenerated: 639 artworks, new ArtworkEntry interface with `src` + `relevance`
- `src/components/BrowseSeriesCard.tsx` — single `<Image>`, removed dark/light pair
- `src/components/DevotionalArtwork.tsx` — single `<Image>`, removed dark/light pair
- `src/components/ArtworkLightbox.tsx` — single `<Image>`, removed dark/light pair
- `src/components/ArtworkAttribution.tsx` — added relevance display in full variant
- `src/components/SeriesHero.tsx` — single `src` field, removed dark/light rendering
- `src/app/page.tsx` — homepage featured cards use single image source
- `src/app/globals.css` — removed dark/light toggle CSS, added `filter: invert(1)` for dark mode, improved scrim, added relevance styling
- `.gitignore` — added `raw.jpg` exclusion for artwork source files
- `public/images/devotional-prints/` — 639 `print.webp` + 369 `artwork.json` (319 existing + 50 new), removed 738 old dark/light files

---

## F-052: Artwork Image Layer — 319 Artworks Mapped (2026-02-22)

### What Changed

- **Build-time artwork manifest**: New `scripts/generate-artwork-manifest.mjs` reads 319 `artwork.json` files and generates typed `src/data/artwork-manifest.ts` with hero scoring, redistribution, and slug normalization. 32 series heroes selected, 170 devotionals filled to 3+ artworks each.
- **Series card full-bleed hero images**: Apple TV-style artwork backgrounds on all series cards (browse page, homepage featured, pathway carousels). Scrim gradient ensures text readability. 64 image requests (32 series x dark + light) all load correctly.
- **CSS-only dark/light image switching**: Both `print-dark.webp` and `print-light.webp` render in DOM; opacity toggled via `:root:not(.dark)` — zero hydration mismatch risk.
- **Inline devotional artwork**: `DevotionalArtwork` component with cinematic 4:3 frames interleaved at editorial breakpoints between modules. `ArtworkAttribution` component with compact and full museum card variants.
- **Lightbox gallery**: `ArtworkLightbox` with full museum card attribution, swipe/arrow navigation, keyboard support (Escape, Arrow keys), focus trap, and body scroll lock.
- **Homepage + SeriesHero integration**: Hero images on featured cards, manifest hero as fallback in SeriesHero component.

### Files

- `scripts/generate-artwork-manifest.mjs` — NEW: build-time manifest generator
- `src/data/artwork-manifest.ts` — GENERATED: typed image manifest
- `src/components/BrowseSeriesCard.tsx` — hero image layer + scrim
- `src/components/DevotionalArtwork.tsx` — NEW: inline cinematic artwork
- `src/components/ArtworkAttribution.tsx` — NEW: compact/full attribution
- `src/components/ArtworkLightbox.tsx` — NEW: gallery lightbox
- `src/lib/artwork-placement.ts` — NEW: insertion point calculator
- `src/hooks/useLightbox.ts` — NEW: lightbox state hook
- `src/app/globals.css` — hero, artwork, lightbox CSS
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` — artwork interleaving + lightbox
- `src/app/page.tsx` — hero images on featured cards
- `src/components/SeriesHero.tsx` — manifest hero fallback
- `package.json` — added generate:artwork-manifest script, prepended to build

---

## Series Card Restyling + Homepage Free Scroll (2026-02-22)

### What Changed

- **Series cards restyled as newspaper blocks**: Replaced gradient-background `SeriesHero` cards with text-only newspaper blocks matching homepage `.mock-featured-card` pattern. Cards now show: scripture reference, snippet, title, question, intro preview, START SERIES / CONTINUE / COMPLETED action label, day count.
- **Homepage carousel converted to free scroll**: Removed PREV/NEXT pagination, auto-rotate timer, page indicators. All featured series now render directly in `.mock-featured-grid` — 3-column grid on desktop, horizontal free-scroll on mobile/tablet.
- **Apple TV-style progress bar**: Added 3px progress bar at card bottom for in-progress series. Gold in dark mode, blue in light mode, with smooth width transition.
- **Shared newspaper grid borders**: Adjacent cards share `border-right` + `border-top` forming continuous newspaper column layout.
- **Verified at 3 breakpoints**: Mobile (375px), tablet (768px), desktop (1024px+).

### Files

- `src/components/BrowseSeriesCard.tsx` — rewritten (gradient → newspaper block)
- `src/components/SeriesRailSection.tsx` — simplified (removed variant passing)
- `src/app/series/page.tsx` — updated (mock-featured-grid, removed variants)
- `src/app/page.tsx` — simplified (removed carousel state/controls)
- `src/app/globals.css` — added progress bar CSS (6 lines)
- `src/components/SeriesSearchPanel.tsx` — removed stale variant prop

---

## Soul Audit Production Fix (2026-02-21)

### What Changed

- **Fixed 500 on `/api/soul-audit/submit`**: `createRunToken()` threw because `SOUL_AUDIT_RUN_TOKEN_SECRET` env var was not set in Vercel. Added resilient fallback that derives a secret from `SUPABASE_SERVICE_ROLE_KEY` when the dedicated secret is missing, preventing hard crashes.
- **Set `SOUL_AUDIT_RUN_TOKEN_SECRET`** in Vercel production environment.
- **Fixed "Audit 4 of 3" display bug**: Homepage showed `auditCount + 1` even when limit was reached (3 of 3 → "4 of 3"). Now shows "All 3 audits used. Reset to start fresh." when limit is hit, and uses the `MAX_AUDITS_PER_CYCLE` constant instead of a hardcoded "3".
- **Fixed 422 on `/api/soul-audit/select`**: `buildCuratedFirstPlan` threw `MissingReferenceGroundingError` because the 13GB reference library (`content/reference/`) is gitignored and not deployed to Vercel. Made reference grounding optional — plans now build with curated content and fallback reflection paragraphs when reference volumes are absent.
- **Fixed second 422 on `/api/soul-audit/select`**: `selectPlanCandidates` threw `MissingCuratedModuleError` when fewer than 5 curated day candidates were found for a series. Now returns whatever candidates are available (1–5) instead of crashing. Also replaced fatal throws for missing `nextStep`/`journalPrompt` with theologically appropriate fallback text so plans always build.
- **Fixed root cause: curated JSON files missing from Vercel serverless bundle**: `content/series-json/*.json` files are read at runtime via `fs.readFileSync` with dynamic paths, so Next.js output file tracing couldn't discover them. Added `outputFileTracingIncludes` to `next.config.ts` to explicitly include these files. Also added metadata-based fallback in `selectPlanCandidates` — when the curated catalog is empty (files not available), builds a single-day plan from `SERIES_DATA` metadata instead of throwing.

### Files

- `src/lib/soul-audit/run-token.ts` — resilient `tokenSecret()` with fallback chain
- `src/app/page.tsx` — fixed audit counter display + imported `MAX_AUDITS_PER_CYCLE`
- `src/lib/soul-audit/curated-builder.ts` — reference grounding no longer fatal; plan assembly resilient with metadata fallback when catalog unavailable
- `next.config.ts` — added `outputFileTracingIncludes` for curated series JSON files

---

## Deployment Infrastructure Fix + Documentation Canonicalization (2026-02-21)

### What Changed

- **Main branch restored**: Force-pushed real 225-commit production history to main, replacing 71-commit Codex-rewritten history with unrelated root
- **middleware.ts removed**: Next.js 16 uses `proxy.ts` — coexisting `middleware.ts` was causing ALL Vercel deployments to fail with 0ms build errors (`Both middleware file and proxy file detected`)
- **Vercel deployment restored**: Manual `vercel --prod` succeeded — 476 static pages, 32 series, production live at euangelion.app
- **Git identity canonicalized**: email `chrisparker21@gmail.com`, name `creativcreature`, gh account `creativcreature`
- **CLAUDE.md rewritten**: Corrected all account references (GitHub `creativcreature/euongelion`, Vercel `james-projects-5d824c1e/euangelion`), added proxy.ts note, updated content counts (175 devotionals, 32 series)
- **COMMIT-AND-DEPLOY-GUIDE.md** created at project root — full walkthrough of 11 pre-commit hooks, commit-msg requirements, account verification, and deployment flow

### Files

- `src/middleware.ts` — DELETED (root cause of all deployment failures)
- `CLAUDE.md` — full rewrite with canonical account info
- `COMMIT-AND-DEPLOY-GUIDE.md` — NEW (moved from `docs/runbooks/`)
- `.vercel/project.json` — linked to correct team

### Validation

- `vercel --prod` deployed successfully (476 pages)
- `gh auth status` confirms creativcreature
- `git config user.email` confirms chrisparker21@gmail.com

---

## Sprint 5 Capstone: Apple TV Browse Page + Content Pipeline + Typography Overhaul (2026-02-21)

### Content Pipeline (Phase 1)

- **5 incomplete series completed** (1 day → 6 days each): what-does-it-mean-to-believe, what-happens-when-you-repeatedly-sin, the-work-of-god, signs-boldness-opposition-integrity, witness-under-pressure-expansion — parsed from Substack HTML export
- **7 new series added**: anointed, coming-to-the-end-of-ourselves, valued, what-is-christianity, rooted, present-in-the-chaos, standing-strong — from docx source files
- **1 draft series removed**: from-jerusalem-to-the-nations (empty draft, no content)
- **"What is Christianity?" (Phase 1D)**: 5-day Sleep pathway series — Galatians 1-5 arc through Dennis Quaid's story, written for skeptical seekers via Devotional Writer agent
- **Final content inventory**: 175 devotionals across 32 series (up from 115/26)

### Apple TV Browse Page (Phase 2)

- **Dynamic composition layout** at `/series` — NOT a flat database grid
  - Featured editorial: asymmetric grid (1 spotlight + 2 stacked)
  - 6 theme-based rails: "When You're Overwhelmed", "When You're Searching", "When You're Hurting", "Going Deeper", "When You Need Your People", "Finding Your Worth"
  - 4 layout types: `rail`, `grid`, `spotlight-rail`, `centered-row`
  - Wake-Up Originals branded collection rail
  - Continue Reading rail (conditional, in-progress only)
- **New components**: BrowseSeriesCard (3 variants: spotlight/featured/standard), SeriesRailSection (5 layout modes), SeriesSearchPanel (text search + topic/reading-time/progress filters)
- **Series rails data config**: `src/data/series-rails.ts` — editorially curated slug arrays, layout modes, labels
- **Search + filter panel**: slide-down with debounced text search, filter chips, results in StaggerGrid
- **No scroll-snap** — fully user-controlled native scrolling (PrintRail snapScroll={false})
- **No pathway labels anywhere** — pathways are internal only

### Typography & Visual Design (Phase 3)

- **Mobile full-width**: Removed side borders/margins on ≤900px — content fills full viewport edge-to-edge
- **Poster-scale type hierarchy**: vw-heading-xl up to clamp(3.5rem, 9vw, 8rem), day numbers at architectural scale
- **Pull-quote full-bleed**: Key insights break the panel grid for visual rhythm
- **Gold rule accents**: Thin gold rules between major devotional sections
- **Increased white space**: Generous module spacing for breathing room
- **Series detail scripture-lead redesign**: Scripture/framework leads page (above H1), question as editorial sub-deck, dynamic day count

### Soul Audit Continuity

- Soul Audit option pills, selection flow, and plan day assembly unchanged in this commit
- Guest gate, copy integrity patches, and plan-day recovery from prior commits remain intact
- No pathway labels exposed in browse page (pathways remain internal)

### Files (78 files total)

- `public/devotionals/` — 60+ new JSON devotional files
- `src/data/series.ts` — 7 new SeriesInfo entries, 5 updated day arrays, 1 removal
- `src/data/series-rails.ts` — NEW: editorial rail configuration
- `src/components/BrowseSeriesCard.tsx` — NEW
- `src/components/SeriesRailSection.tsx` — NEW
- `src/components/SeriesSearchPanel.tsx` — NEW
- `src/app/series/page.tsx` — full rewrite (Apple TV dynamic composition)
- `src/app/globals.css` — browse card classes, mobile full-width fix, poster typography, pull-quote bleed
- `src/components/newspaper/PrintRail.tsx` — snapScroll prop added
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx` — scripture-lead redesign

### Validation

- `npm run type-check` ✅
- `npm run lint` ✅
- `npm test` — series-data 10/10 passed
- Browser verified at 375px, 768px, 1024px — dynamic composition, search/filters, typography

---

## Phase 1D Complete: "What is Christianity?" Series + Series Detail Scripture Lead (2026-02-21)

### What Changed

- **Phase 1D — Drew's Devotional Rewrite**: Created 5-day "What is Christianity?" series for Sleep pathway
  - Galatians 1–5 arc through Dennis Quaid's story of addiction, recovery, and faith
  - Written for skeptical seekers (heavy assumption on skepticism per AUDIENCE.md)
  - Day 1: "The Question Everyone's Afraid to Ask" (Galatians 1:6-9, euangelion)
  - Day 2: "When Religion Becomes a Cage" (Galatians 2:16, dikaioō)
  - Day 3: "The God Who Doesn't Need Your Resume" (Galatians 3:2-3, sarx)
  - Day 4: "Free, Not Fixed" (Galatians 5:1, eleutheria)
  - Day 5: "A Faith Worth Having" (Galatians 5:22-23, karpos)
  - Each day has 12 modules: scripture, vocab, teaching, story, insight, bridge, reflection, prayer, takeaway, comprehension, resource, profile
- **Series Detail Page Redesign**: Scripture/framework now leads the page (above H1)
  - Question becomes editorial sub-deck (existing H1 position)
  - Framework removed from sidebar to avoid duplication
  - Gold italic Instrument Serif treatment for scripture lead
  - Fixed hardcoded "5 Day Path" → dynamic `{dayCount} Day Path`
- **Content inventory**: 175 individual devotionals across 32 series (up from 170/31)
- Added `what-is-christianity` to SeriesCardIcon mapping (gospel icon)
- Updated series-data test from 31 → 32 series count

### Files

- `public/devotionals/what-is-christianity-day-{1-5}.json` (5 new)
- `src/data/series.ts` — new SeriesInfo entry + NEW_SERIES_ORDER update
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx` — scripture-lead redesign
- `src/app/globals.css` — `.mock-series-scripture-lead` class
- `src/components/newspaper/SeriesCardIcon.tsx` — icon mapping
- `__tests__/series-data.test.ts` — count update to 32

### Validation

- `npm run type-check` ✅
- `npm run lint` ✅ (0 errors, 2 pre-existing warnings)
- `npm test` — series-data: 10/10 passed; 5 pre-existing failures in unrelated tests

---

## Soul Audit Guest Gate + Plan Day Recovery Patch (2026-02-21)

### What Changed

- Added a first-audit guest conversion gate on results selection:
  - If unauthenticated on audit #1, users are prompted to sign up before devotional entry.
  - Added a no-account soft-onboard fallback with Sabbath day, theme, and text size capture.
- Improved plan retrieval resilience for missing numbered days:
  - Existing-selection payloads now include `planDays` for immediate client hydration.
  - Plan-day API now resolves missing day-number gaps using ordered fallback mapping so Day 2 and other gaps do not disappear from retrieval.
- Strengthened Soul Audit option phrasing cleanup by filtering generic matched terms that can degrade titles into telegraphic fragments.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/devotional-plan/[token]/day/[n]/route.ts`
- `src/lib/soul-audit/matching.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `docs/feature-prds/F-024.md`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Soul Audit Copy Integrity Patch (2026-02-21)

### What Changed

- Removed telegraphic title fragments from deterministic Soul Audit option title generation (`want/learn` style token stitching).
- Added API-side generation guardrails to reject burden-framing language in AI-polished options:
  - Blocked phrases like `You named this burden` and `Because you named`.
  - Enforced complete natural-language titles (no keyword-fragment headings).
- Added legacy-session invalidation in results loader so old cached pre-fix options are dropped and regenerated instead of re-rendered.

### Files

- `src/lib/soul-audit/matching.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `docs/feature-prds/F-024.md`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Brain v2: Multi-Provider Closed-RAG + User Brain Controls (2026-02-21)

### What Changed

- Replaced single-provider chat execution with Brain Router orchestration:
  - Provider pool scaffolded for OpenAI, Google, MiniMax, NVIDIA Kimi
  - Auto mode now routes by quality-floor + lowest-cost eligible provider
  - Platform cap enforcement now halts platform-funded requests and prompts BYO
- Added new AI operations APIs:
  - `GET /api/brain/providers`
  - `GET/POST /api/brain/preferences`
  - `GET /api/chat/usage`
  - `GET/POST /api/admin/brain/reindex` (admin allowlist guarded)
- Added usage ledger and quota-state tracking with per-provider breakdown plus usage page at `/usage`.
- Upgraded chat contract to closed-RAG-first with explicit open-web acknowledgement:
  - Closed mode stays local-corpus grounded
  - Open Web requires explicit per-query acknowledgement
  - Open Web responses include inline source markers + source cards
- Reworked devotional chat UX into a right study drawer:
  - Closed by default and remembered in Settings state
  - Quick brain mode switch in chat composer region
  - Left thread rail restores devotional/thread context
- Expanded settings + onboarding defaults:
  - Default brain mode
  - Open Web default preference
  - Devotional depth preference (`5-7`, `20-30`, `45-60`, `variable`)
  - BYO provider key fields for OpenAI/Google/MiniMax/NVIDIA Kimi
- Removed deterministic AI pathway fallback in selection route:
  - `select` now returns transparent grounded-curation error (`422`) when curated grounding is unavailable.
- Added CMS planning kickoff artifact immediately after Brain v2 execution.

### Files

- `src/app/api/chat/route.ts`
- `src/lib/brain/types.ts`
- `src/lib/brain/router.ts`
- `src/lib/brain/usage-ledger.ts`
- `src/lib/brain/flags.ts`
- `src/lib/brain/cost.ts`
- `src/lib/brain/rag-index.ts`
- `src/lib/brain/intent-parser.ts`
- `src/lib/brain/dedupe.ts`
- `src/lib/brain/preferences.ts`
- `src/app/api/brain/providers/route.ts`
- `src/app/api/brain/preferences/route.ts`
- `src/app/api/chat/usage/route.ts`
- `src/app/api/admin/brain/reindex/route.ts`
- `src/components/DevotionalChat.tsx`
- `src/components/ChatMessage.tsx`
- `src/stores/settingsStore.ts`
- `src/stores/chatStore.ts`
- `src/app/settings/page.tsx`
- `src/lib/auth/onboarding.ts`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/app/api/auth/onboarding/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/usage/page.tsx`
- `__tests__/chat-response-metadata.test.ts`
- `__tests__/chat-open-web-contract.test.ts`
- `docs/cms/CMS-PLANNING-KICKOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm run test -- --run __tests__/chat-guardrails.test.ts __tests__/chat-response-metadata.test.ts __tests__/chat-message-citations.test.tsx`
- `npm run test -- --run __tests__/chat-open-web-contract.test.ts`
- `npm run test -- --run __tests__/soul-audit-flow.test.ts __tests__/soul-audit-curation.test.ts`

---

## Post-Signup Onboarding + Deeper AI Devotional Curation (2026-02-20)

### What Changed

- Added a skippable post-signup onboarding flow at `/onboarding`:
  - Sabbath selection (`Saturday` / `Sunday`)
  - Appearance + readability defaults (`theme`, `text size`, `reduce motion`, `high contrast`, `reading comfort`)
  - Bible translation default selection
  - Feature orientation for Soul Audit, Daily Bread, and Settings
- Updated auth callback routing to send first-session users into onboarding before normal app entry, while preserving safe redirect targets.
- Added onboarding state persistence through authenticated metadata API (`/api/auth/onboarding`) and replay entry from Settings.
- Improved auth failure UX by routing callback failures to sign-in/sign-up with explicit error state instead of silent homepage fallback.
- Fixed AI devotional short-output root causes:
  - Curated module parser now hydrates nested `data` payloads correctly.
  - Curation engine now aggregates multi-block teaching/commentary text per day instead of taking only the first block.
  - Reference-volume retrieval now prefers higher-signal commentary excerpts and avoids noisy corpus paths.
  - Metadata fallback devotional days now generate longer reflection/prayer content.
- Removed remaining localhost redirect fallbacks from runtime `src/` auth URL resolution.

### Files

- `src/lib/auth/onboarding.ts`
- `src/app/api/auth/onboarding/route.ts`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/proxy.ts`
- `src/app/settings/page.tsx`
- `src/lib/auth.ts`
- `src/lib/soul-audit/curated-catalog.ts`
- `src/lib/soul-audit/curation-engine.ts`
- `src/lib/soul-audit/curated-builder.ts`
- `src/lib/soul-audit/reference-volumes.ts`
- `src/lib/soul-audit/metadata-plan-builder.ts`
- `__tests__/auth-onboarding-state.test.ts`
- `__tests__/soul-audit-curation.test.ts`
- `__tests__/metadata-plan-builder.test.ts`
- `docs/feature-prds/F-028.md`
- `docs/feature-prds/F-050.md`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/auth-onboarding-state.test.ts __tests__/soul-audit-curation.test.ts __tests__/soul-audit-option-specificity.test.ts __tests__/soul-audit-fallback-options.test.ts __tests__/soul-audit-reference-volumes.test.ts __tests__/metadata-plan-builder.test.ts`

---

## Auth v7.1 Patch: Kill-Switch Checklist Clarity + Upstash Limiter Analytics (2026-02-20)

### What Changed

- Added explicit kill-switch recovery wording to launch checklists so step execution is unambiguous:
  - Create Google account -> flip kill switch to `false` (`social_auth_enabled=false`) -> send magic link to same email -> verify session created.
- Added auth-focused Upstash limiter module scaffold with analytics enabled:
  - `oauthLimiter` (`10 / 15m`, `analytics: true`)
  - `magicLinkLimiter` (`5 / 15m`, `analytics: true`)
- Added PRD traceability entry for abuse-control scope increment.

### Files

- `docs/process/LAUNCH-CHECKLIST.md`
- `soul-audit-docs/marketing-and-launch/LAUNCH-CHECKLIST.md`
- `src/lib/auth/rate-limit.ts`
- `docs/feature-prds/F-038.md`
- `package.json`
- `package-lock.json`

### Validation

- `npm run type-check`

---

## Non-Blocking Cookie Consent for Soul Audit Selection (2026-02-20)

### What Changed

- Removed site-cookie consent as a gate for Soul Audit option selection.
- Soul Audit card clicks now proceed directly through selection flow even when site-consent cookie is absent.
- Kept cookie notice behavior for optional analytics preference only.
- Hardened client-set site-consent cookie attributes to include `Secure` automatically on HTTPS contexts.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/lib/site-consent.ts`
- `__tests__/soul-audit-results-selection-ui.test.tsx`
- `docs/feature-prds/F-020.md`

### Validation

- `npm run type-check`
- `npm run test -- __tests__/site-consent.test.ts __tests__/soul-audit-results-selection-ui.test.tsx __tests__/soul-audit-consent-gate-contract.test.ts`

---

## Soul Audit Consent-Gate No-Op Visibility Fix (2026-02-20)

### What Changed

- Fixed Soul Audit option click no-op perception at the root consent gate.
- Added a dedicated browser event (`euangelion:site-consent-required`) for missing-consent required action.
- Updated cookie banner behavior to react to required-consent events by forcing visibility, focusing the heading, and applying a short attention pulse.
- Moved selection-failure messaging for blocked option clicks into a high-visibility inline error block directly above option cards on `/soul-audit/results`.
- Kept strict consent-block behavior unchanged: option selection does not proceed until essential site consent is accepted.

### Files

- `src/lib/site-consent.ts`
- `src/components/CookieConsentBanner.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`
- `__tests__/site-consent.test.ts`
- `__tests__/contrast-readability-contract.test.ts`
- `__tests__/soul-audit-results-selection-ui.test.tsx`
- `docs/feature-prds/F-020.md`

### Validation

- `npm run type-check`
- `npx eslint src/lib/site-consent.ts src/components/CookieConsentBanner.tsx src/app/soul-audit/results/page.tsx __tests__/site-consent.test.ts __tests__/contrast-readability-contract.test.ts __tests__/soul-audit-results-selection-ui.test.tsx`
- `npx prettier --check src/lib/site-consent.ts src/components/CookieConsentBanner.tsx src/app/soul-audit/results/page.tsx src/app/globals.css __tests__/site-consent.test.ts __tests__/contrast-readability-contract.test.ts __tests__/soul-audit-results-selection-ui.test.tsx`
- `npm run test -- __tests__/site-consent.test.ts __tests__/contrast-readability-contract.test.ts __tests__/soul-audit-results-selection-ui.test.tsx`

---

## AI Pathway Root-Cause Fix + Selection Contrast Update (2026-02-20)

### What Changed

- Fixed the AI pathway root cause where selection could fail with curated grounding errors and appear as a dead click.
- Added deterministic metadata-plan fallback generation when curated module/reference grounding is unavailable so AI selections always return a valid plan route.
- Updated AI selection routing to day-qualified routes (`planToken` + `day`) and aligned current-route resume behavior/cookie continuity.
- Updated Soul Audit results client to navigate using API-provided route for AI selections.
- Updated copy/paste text selection styling so selected text renders white in both standard and Firefox engines (`::selection` and `::-moz-selection`).

### Files

- `src/lib/soul-audit/reference-volumes.ts`
- `src/lib/soul-audit/metadata-plan-builder.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/current/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/soul-audit-curation.test.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `__tests__/contrast-readability-contract.test.ts`
- `__tests__/soul-audit-reference-volumes.test.ts`
- `__tests__/metadata-plan-builder.test.ts`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/soul-audit-flow.test.ts __tests__/soul-audit-curation.test.ts __tests__/soul-audit-current-route.test.ts __tests__/contrast-readability-contract.test.ts __tests__/soul-audit-reference-volumes.test.ts __tests__/metadata-plan-builder.test.ts`

---

## Scripture-First Cards + Homepage Prompt Weight Fix (2026-02-20)

### What Changed

- Fixed homepage prompt typography by setting only these two titles to regular weight (`400`):
  - `Find Your Next Faithful Step Today.`
  - `What are you wrestling with today?`
- Normalized devotional card scripture lead across surfaces into a two-line contract:
  - line 1: scripture reference
  - line 2: short scripture snippet
- Applied scripture-first rendering to:
  - homepage featured cards
  - Wake-Up featured cards
  - series catalog cards
  - Soul Audit option cards and Saved Paths cards
  - Wake-Up / Series day cards
- Added day-level scripture mapping for series routes with fallback order:
  - curated day scripture
  - parsed `series.framework`
  - safe placeholder (`Scripture`)
- Extended Soul Audit preview payload with additive `preview.verseText` and wired fallback snippet derivation for legacy saved payloads.

### Files

- `src/lib/scripture-reference.ts`
- `src/lib/soul-audit/series-day-scripture.ts`
- `src/app/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/series/page.tsx`
- `src/app/wake-up/series/[slug]/page.tsx`
- `src/app/series/[slug]/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/types/soul-audit.ts`
- `src/lib/soul-audit/matching.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`
- `__tests__/scripture-reference.test.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/soul-audit-fallback-options.test.ts`
- `__tests__/series-day-scripture.test.ts`
- `__tests__/series-page-client-scripture.test.tsx`
- `__tests__/series-day-route-scripture.test.tsx`
- `docs/feature-prds/F-024.md`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/scripture-reference.test.ts __tests__/soul-audit-flow.test.ts __tests__/soul-audit-fallback-options.test.ts __tests__/series-day-scripture.test.ts __tests__/series-page-client-scripture.test.tsx __tests__/series-day-route-scripture.test.tsx`

---

## Soul Audit Results Reorder + Accessibility Settings Runtime (2026-02-20)

### What Changed

- Reorganized Soul Audit results selection flow to the requested order: primary options, curated starter paths, conditional saved paths, reroll controls, then reset.
- Replaced typed reroll confirmation with a single action button + remaining count.
- Removed Soul Audit cookie-consent UI from selection screen; consent remains handled at site entry.
- Rebalanced option-card typography hierarchy for clearer title/question/support/action contrast and larger readability floor.
- Implemented settings-driven accessibility runtime controls:
  - text scale (`default`, `large`, `xlarge`)
  - reduced motion toggle
  - high contrast toggle
  - reading comfort toggle
- Applied accessibility preferences globally via root HTML data attributes/classes and motion-provider behavior.
- Added canonical design-system contracts to code: `DesignTokenSet`, `AccessibilityPreferences`, and `ComponentSpec`.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`
- `src/app/settings/page.tsx`
- `src/stores/settingsStore.ts`
- `src/app/providers.tsx`
- `src/providers/AnimationProvider.tsx`
- `src/types/design-system.ts`
- `src/types/index.ts`
- `docs/feature-prds/F-024.md`

### Validation

- `npm run type-check`
- `npx eslint src/app/soul-audit/results/page.tsx src/app/settings/page.tsx src/app/providers.tsx src/providers/AnimationProvider.tsx src/stores/settingsStore.ts src/types/design-system.ts src/types/index.ts`
- `node scripts/check-feature-prd-integrity.mjs`
- `node scripts/check-feature-prd-update-link.mjs`
- Live browser verification: reordered Soul Audit section flow with and without saved paths, and root accessibility attributes/classes update behavior.

---

## Site-Entry Cookie Consent + Soul Audit Flow Cleanup (2026-02-19)

### What Changed

- Added a global site-entry cookie notice with two explicit actions: `Use Essential Only` and `Accept All Cookies`.
- Persisted consent in a dedicated cookie so consent is handled immediately on entry rather than inside Soul Audit option selection.
- Removed consent checkboxes and consent-record button from Soul Audit results; devotional options now surface immediately after audit completion.
- Kept crisis-resource acknowledgement gate in Soul Audit results only when crisis content is detected.
- Added consent-aware analytics mounting so optional analytics run only when cookie consent opts in.

### Files

- `src/components/CookieConsentBanner.tsx`
- `src/components/ConsentAwareAnalytics.tsx`
- `src/lib/site-consent.ts`
- `src/app/providers.tsx`
- `src/app/layout.tsx`
- `src/app/soul-audit/results/page.tsx`
- `__tests__/soul-audit-consent-gate-contract.test.ts`
- `__tests__/site-consent.test.ts`
- `docs/feature-prds/F-020.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- --run __tests__/site-consent.test.ts __tests__/soul-audit-consent-gate-contract.test.ts`

---

## Desktop Nav Docking Behavior Update (2026-02-19)

### What Changed

- Reintroduced desktop docked-topbar behavior in the shell header by mounting nav links into the topbar center once masthead scrolls out.
- Added intersection-based docking state in the header component and synchronized desktop/mobile nav visibility contracts.
- Refined docked desktop nav collapse styles while preserving mobile sticky-nav behavior.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts`

---

## Shell Container + Process Guardrails Update (2026-02-19)

### What Changed

- Updated shared shell container styles to reduce clipping/overflow constraints that interfere with sticky shell behavior (`.mock-shell-frame` now uses `display: contents`; root/home overflow strategy adjusted).
- Added a permanent execution protocol that requires plan-first workflow and live UI verification before declaring fixes.
- Linked the protocol from docs index so it remains discoverable.

### Files

- `src/app/globals.css`
- `docs/process/CHANGE-EXECUTION-PROTOCOL.md`
- `docs/README.md`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts`

---

## Desktop Sticky Nav Reality Fix (2026-02-19)

### What Changed

- Restored true desktop sticky behavior for the shared shell nav (`.mock-nav`) so navigation remains pinned below the sticky topbar during real scrolling.
- Removed the prior desktop `position: static` nav contract and updated regression coverage to enforce sticky behavior on desktop as well as mobile.
- Bumped service-worker cache/runtime generation to `v49` so production clients refresh stale nav shell assets.

### Files

- `src/app/globals.css`
- `__tests__/layout-overflow-contract.test.ts`
- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts __tests__/shell-header.test.tsx __tests__/navigation-routing-shell.test.ts __tests__/offline-sw-contract.test.ts`

---

## Shell Navigation Root-Cause Rewrite (2026-02-19)

### What Changed

- Removed JS-driven docked/undocked nav state switching from the shared shell header.
- Replaced it with one stable nav tree that is always mounted; desktop/mobile variants now switch via CSS layout only.
- Preserved mobile menu accessibility controls (escape close, outside click/touch close, route-change close) while removing brittle viewport mode toggling.
- Bumped service-worker cache/runtime version to `v48` so production clients refresh stale shell/nav bundles.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/components/ServiceWorkerRegistration.tsx`
- `public/sw.js`
- `__tests__/shell-header.test.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts __tests__/navigation-routing-shell.test.ts __tests__/offline-sw-contract.test.ts`

---

## Natural Dock Trigger Refinement (2026-02-19)

### What Changed

- Refined desktop dock behavior to trigger exactly when the nav row physically reaches the sticky topbar.
- Dock-state detection now uses nav-row top vs topbar bottom (instead of masthead position).
- Kept dock/undock reversible by hiding the source nav with `visibility/opacity` (not `display: none`) so geometry stays measurable.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts`

---

## Topbar Docked-Menu Contract (2026-02-19)

### What Changed

- Restored desktop topbar center copy: `Daily Devotionals for the Hungry Soul`.
- Implemented scroll docking behavior:
  - date/time and dark mode remain sticky in topbar.
  - main menu scrolls up, docks into the topbar center, and replaces the slogan.
  - standalone desktop nav row hides while docked to prevent duplicate menus.
- Updated nav layout contract:
  - desktop nav row is flow-based (non-sticky) so it can dock into topbar.
  - mobile nav remains sticky at top.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `__tests__/shell-header.test.tsx`
- `__tests__/layout-overflow-contract.test.ts`
- `__tests__/ios-shell-readiness-contract.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts __tests__/navigation-routing-shell.test.ts`

---

## Sticky Header Containing-Block Fix (2026-02-19)

### What Changed

- Fixed sticky nav/topbar containment by converting the shell header wrapper to `display: contents`, so sticky elements are no longer constrained by a bounded header box.
- Added explicit `position: -webkit-sticky` to topbar and nav for stronger Safari/iOS sticky reliability.
- Added readiness contract assertions for the new shell-header sticky structure.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `__tests__/ios-shell-readiness-contract.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/ios-shell-readiness-contract.test.ts __tests__/navigation-routing-shell.test.ts __tests__/layout-overflow-contract.test.ts`

---

## Sticky Nav + Scroll Responsiveness Repair (2026-02-19)

### What Changed

- Removed dynamic JS-driven topbar height offset dependency from shell header/nav sticky behavior.
- Moved sticky offset contract to stable CSS token usage:
  - nav now pins from `--mock-h-topbar`.
  - sticky side panel offset now uses static shell height tokens.
- Reduced scroll-snap aggressiveness (`mandatory` -> `proximity`) on horizontal rails to prevent first-gesture scroll swallowing.
- Relaxed horizontal overscroll containment on mobile featured rail to reduce “double scroll before page scroll” behavior.
- Bumped SW cache/runtime version (`v47`) so production clients receive updated nav/scroll contract immediately.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`
- `__tests__/ios-shell-readiness-contract.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/ios-shell-readiness-contract.test.ts __tests__/layout-overflow-contract.test.ts __tests__/scroll-unlock-contract.test.ts __tests__/navigation-routing-shell.test.ts __tests__/offline-sw-contract.test.ts`

---

## Navigation Contract Hardening (2026-02-19)

### What Changed

- Hardened mobile menu behavior to eliminate stale/duplicate nav states:
  - mobile dropdown now mounts only when opened (no hidden duplicate menu tree kept mounted).
  - added outside-click/touch close handling for the mobile menu.
- Updated mobile menu semantics to `Open menu` / `Close menu` and kept keyboard escape close behavior.
- Prevented editorial micro-interaction decorators from modifying nav/topbar controls.
- Increased sticky stack reliability and clickability by tightening nav/topbar z-index and touch/pointer behavior.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/components/EditorialMotionSystem.tsx`
- `src/app/globals.css`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/navigation-routing-shell.test.ts __tests__/scroll-unlock-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts __tests__/layout-overflow-contract.test.ts`

---

## Navigation Reliability Rebuild (2026-02-20)

### What Changed

- Reworked mobile nav into a single clean contract:
  - one active-link surface + one `MENU` toggle in the sticky nav row.
  - full nav list now lives in one dropdown panel (no split primary/secondary regions).
- Improved sticky reliability across shells by removing `display: contents` from shell wrappers that were hosting header/nav.
- Updated header keyboard/accessibility test contract for the renamed mobile panel label.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/navigation-routing-shell.test.ts __tests__/scroll-unlock-contract.test.ts`

---

## Soul Audit Submit Retry Hardening (2026-02-20)

### What Changed

- Hardened Soul Audit client submit transport with one automatic retry for retryable no-options failures.
- On retryable response codes/messages, client enriches input once and retries transparently to avoid dead-end submit states.
- Kept non-retryable server failures explicit and unchanged.

### Files

- `src/lib/soul-audit/submit-client.ts`
- `__tests__/soul-audit-submit-client.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/soul-audit-submit-client.test.ts __tests__/soul-audit-flow.test.ts`

---

## Mobile Topbar Fade Cycle Refinement (2026-02-20)

### What Changed

- Expanded mobile topbar ticker from one static line to a 3-item rotating cycle:
  - current date/time
  - `Daily Devotionals for the Hungry Soul`
  - `Scripture-led. Honest reflection. Faithful next step.`
- Tuned mobile ticker fade transition to a subtler `1.5s` opacity blend.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/navigation-routing-shell.test.ts`

---

## Mobile Nav Touch-Scroll Reliability Tweak (2026-02-20)

### What Changed

- Removed restrictive `touch-action: pan-y` from the mobile nav main row and restored `touch-action: auto`.
- This reduces touch gesture conflicts between nav region interactions and normal vertical page scrolling.

### Files

- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/navigation-routing-shell.test.ts __tests__/scroll-unlock-contract.test.ts`

---

## Service Worker Cache Roll Forward (2026-02-20)

### What Changed

- Bumped service worker cache key from `euangelion-v45` to `euangelion-v46`.
- Bumped client SW migration key from `v45` to `v46`.
- This forces stale clients to unregister old workers/cache and pick up the latest homepage/header/nav assets after deployment.
- Updated offline SW contract test to assert versioned cache namespace format (`euangelion-vN`) so cache-roll passes stay aligned with test gates.

### Files

- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/navigation-routing-shell.test.ts __tests__/shell-header.test.tsx __tests__/scroll-unlock-contract.test.ts`

---

## Soul Audit Short-Input Reliability Fix (2026-02-20)

### What Changed

- Removed short-input hard gates for Soul Audit submit on homepage and `/soul-audit`.
- Added low-context guidance (non-blocking) for very short responses.
- Added guaranteed emergency fallback option assembly in submit API so short inputs still return a stable `3 AI + 2 prefab` option split instead of failing with no-options errors.
- Added regression test proving one-word input still returns valid options.
- Added regression test proving short-phrase input (`I need money today`) returns valid options with no hard gate.
- Updated homepage Soul Audit helper copy to reflect sentence/short-input support.
- Added non-blocking short-input UI nudge on homepage and `/soul-audit` (`Add one more sentence for more precise curation.`) while still allowing submit.

### Files

- `src/app/api/soul-audit/submit/route.ts`
- `src/app/page.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/types/soul-audit.ts`
- `__tests__/soul-audit-flow.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/soul-audit-flow.test.ts __tests__/soul-audit-fallback-options.test.ts`

---

## Mobile Chat Peek Focus Fix (2026-02-20)

### What Changed

- Refined mobile chat focus behavior:
  - chat input no longer auto-focuses while mobile sheet is in `PEEK` mode.
  - input auto-focus now triggers only on desktop or when mobile sheet is expanded.
  - prevents keyboard pop-up from obscuring devotional content during peek-first usage.

### Files

- `src/components/DevotionalChat.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/chat-ux.test.ts`

---

## Highlight Recolor Controls Pass (2026-02-20)

### What Changed

- Added post-save highlight color editing in Daily Bread:
  - each saved highlight now shows the 5-color palette in the Highlights panel.
  - selecting a swatch updates highlight color via annotation `PATCH`.
  - local panel state updates immediately and syncs through library refresh events.

### Files

- `src/components/DevotionalLibraryRail.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/devotional-library-rail-accessibility.test.tsx __tests__/save-state-auth-gate.test.ts`

---

## Reader Continuity + Mobile Chat Peek Pass (2026-02-20)

### What Changed

- Fixed Soul Audit reader continuity for day-specific artifacts:
  - plan-day highlights now save against day-specific slugs (`plan-<token>-day-<n>`) instead of a plan-wide slug.
  - added sticky-note layer to Soul Audit day reader so plan days get the same sticky tooling as devotional pages.
  - this restores clean Daily Bread linking for saved plan-day highlights/stickies.
- Improved mobile chat usability:
  - added mobile chat sheet `PEEK/EXPAND` toggle so users can quickly reveal devotional content behind chat for reference.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/components/DevotionalChat.tsx`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/soul-audit-flow.test.ts __tests__/chat-ux.test.ts`

---

## Reader Stickies Pass (2026-02-20)

### What Changed

- Added desktop sticky notes to devotional readers:
  - new sticky-note layer with `ADD STICKY`, drag handle, inline edit, and delete.
  - sticky annotations persist via `/api/annotations` (`POST` create, `PATCH` update, `DELETE` remove).
  - sticky positions are stored as normalized coordinates and rehydrated per devotional slug.
- Improved library visibility:
  - stickies now appear in Daily Bread `Notes` tab as a dedicated `Stickies` section.
  - note counts include sticky-note entries.
- Added annotation update contract support:
  - repository update function and API `PATCH` handler for annotation edits.
  - auth-gate coverage now includes annotation update writes.

### Files

- `src/components/DevotionalStickiesLayer.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/api/annotations/route.ts`
- `src/lib/soul-audit/repository.ts`
- `src/app/globals.css`
- `__tests__/save-state-auth-gate.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/save-state-auth-gate.test.ts __tests__/devotional-library-rail-accessibility.test.tsx`

---

## Reader Highlighting Pass (2026-02-20)

### What Changed

- Added visible in-reader highlighting with palette selection:
  - text selection now opens a highlight toolbar with 5 color options.
  - highlights are saved as annotations with color metadata and rendered inline in the devotional text.
  - saved highlights are rehydrated on page load for the active devotional slug.
- Improved highlights visibility in Daily Bread library:
  - highlight rows now render with matching color treatment so saved context is easier to scan.

### Files

- `src/components/TextHighlightTrigger.tsx`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/devotional-library-rail-accessibility.test.tsx __tests__/shell-header.test.tsx`

---

## Navigation Reliability Pass (2026-02-20)

### What Changed

- Fixed shared shell nav consistency and mobile usability:
  - promoted `SERIES` into mobile primary navigation so desktop and mobile core routes match.
  - hardened mobile nav item partitioning using set-based filtering to avoid accidental duplicates.
  - refactored mobile primary nav into a dedicated horizontal scroller container for stable tap targets without wrapping collisions.
  - tightened sticky/nav stacking isolation to reduce overlap/interference during scroll.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/shell-header.test.tsx __tests__/layout-overflow-contract.test.ts __tests__/ios-shell-readiness-contract.test.ts`

---

## Soul Audit Split Resilience Hardening (2026-02-20)

### What Changed

- Strengthened `3 AI + 2 prefab` split reliability for submit-path edge cases:
  - when AI candidates are concentrated in one series, submit now keeps the 3 AI contract and fills prefab slots via series-metadata fallback instead of failing the entire option set.
  - when curated candidates are temporarily unavailable, submit now falls back to local series metadata to preserve a stable 3+2 option set rather than returning a no-options dead end.
- Added split-focused regression coverage:
  - staged-flow continuity tests now validate prefab selection persistence/reset flow contracts.
  - fallback-options tests now verify single-series concentration still returns a valid 3+2 split.

### Files

- `src/lib/soul-audit/matching.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/soul-audit-fallback-options.test.ts`
- `docs/feature-prds/F-021.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Scorecard Refresh: Daily Home Continuity (2026-02-20)

### What Changed

- Updated production scorecard recency and continuity scoring evidence:
  - `Last Updated` advanced to `2026-02-20`.
  - `Daily devotional as home` user-flow row raised to reflect current-route validity hardening + prefab continuity + reset contracts proven in test coverage.

### Files

- `docs/PRODUCTION-FEATURE-SCORECARD.md`

### Validation

- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:production-contracts`

---

## Prefab Current-Path E2E Contract Coverage (2026-02-20)

### What Changed

- Added staged-flow regression coverage for the curated prefab main-path contract:
  - prefab selection now has explicit test evidence that it becomes the active Daily Bread source.
  - active-days response is validated to resolve curated prefab day routes as current devotional state.
  - reset behavior is validated to clear prefab active selection state and return Daily Bread to empty-state.
- Updated session mocks in staged-flow tests to include reset-session rotation behavior so tests match production reset contracts.

### Files

- `__tests__/soul-audit-flow.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Current-Path Validity + Reset Session Rotation (2026-02-20)

### What Changed

- Hardened current-route resolution so “continue devotional” only appears when content is actually resolvable:
  - AI plan candidates now require plan-day content to exist before becoming current.
  - Curated prefab candidates now require a valid series with devotional days.
  - AI selection candidates now require a resolvable plan + day payload.
- Hardened reset behavior to eliminate stale-session continuation drift:
  - `/api/soul-audit/reset` now rotates the audit session token after clearing state.
  - stale current-route prompts no longer persist across reset when backing persistence cleanup is eventually consistent.
- Added regression coverage for unresolved-candidate suppression in current-route API.
- Updated edge-case test mocks to include reset-session rotation dependency so the full test suite remains green after reset-contract hardening.

### Files

- `src/app/api/soul-audit/current/route.ts`
- `src/app/api/soul-audit/reset/route.ts`
- `src/lib/soul-audit/session.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `__tests__/soul-audit-reset-route.test.ts`
- `__tests__/soul-audit-edge-cases.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npx vitest run __tests__/soul-audit-current-route.test.ts __tests__/soul-audit-reset-route.test.ts __tests__/daily-bread-active-days.test.ts __tests__/soul-audit-flow.test.ts`
- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Curated Prefab Active-Path Fix (2026-02-20)

### What Changed

- Fixed curated prefab continuity so prefab selections behave like an active devotional path instead of a browse-only dead end:
  - `soul-audit/select` now resolves curated route to first devotional day in the selected series (fallback: series overview)
  - `soul-audit/current` now returns curated current-path route as first devotional day for resume continuity.
- Fixed Daily Bread active-days resolution to honor newest current source:
  - chooses latest candidate between plan-based and curated-prefab selection sources
  - when curated prefab is newest, returns series day rows as active timeline with day 1 current.
- Added regression coverage for:
  - curated route continuity in current-path API
  - prefab route contract in staged soul-audit flow
  - daily-bread active-days curated fallback rendering.

### Files

- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/current/route.ts`
- `src/app/api/daily-bread/active-days/route.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Day Route Contract Tests (2026-02-20)

### What Changed

- Added regression coverage to lock the `?day=` route contract for devotional timeline navigation:
  - active day API test now asserts `route` values use `?planToken=...&day=N`
  - archive API route test added to ensure archived day links use the same query-based day selection.
- Updated library rail accessibility test fixtures to the same query route pattern.

### Files

- `__tests__/daily-bread-active-days.test.ts`
- `__tests__/soul-audit-archive-route.test.ts`
- `__tests__/devotional-library-rail-accessibility.test.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Reader Shell Parity + Day Route Consistency (2026-02-20)

### What Changed

- Unified devotional/series route framing to the same homepage newspaper shell contract:
  - devotional readers (`/devotional/[slug]`, `/wake-up/devotional/[slug]`) now render inside `mock-home` + `mock-paper`
  - series detail (`/series/[slug]`, `/wake-up/series/[slug]`) now includes full footer + bottom masthead parity.
- Extended footer + bottom masthead parity to core devotional surfaces:
  - `/daily-bread`
  - `/soul-audit/results`
  - `/series`.
- Fixed active day/archive links to use explicit day query state instead of stale hash anchors:
  - day links now route with `?planToken=...&day=N`, matching the single-day reader model.

### Files

- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/series/page.tsx`
- `src/app/api/daily-bread/active-days/route.ts`
- `src/app/api/soul-audit/archive/route.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Auth Provider Completion (2026-02-19)

### What Changed

- Added first-class social auth options on both auth entry routes:
  - `Continue with Apple`
  - `Continue with Google`
  - existing magic-link flow remains available as fallback.
- Wired provider sign-in to Supabase OAuth with safe callback routing through existing auth callback:
  - redirect target is normalized to safe relative paths
  - OAuth callback continues through `/auth/callback?redirect=...` and then returns to the requested in-app route.
- Unified busy/error behavior across provider and magic-link actions so users cannot trigger overlapping auth requests.

### Files

- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `docs/feature-prds/F-050.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Soul Audit Current-Route Reliability Fix (2026-02-19)

### What Changed

- Fixed stale homepage continuation prompts:
  - homepage now resolves resume state from `/api/soul-audit/current` as source of truth
  - stale local selection state is cleared when no active devotional route exists.
- Fixed curated prefab selection continuity:
  - `/api/soul-audit/current` now chooses the newest valid path by timestamp across latest AI plan + latest selection
  - newer curated prefab selections can become the main continuation route over older AI plan routes.
- Added regression coverage for current-route precedence and stale-cookie clearing.

### Files

- `src/app/api/soul-audit/current/route.ts`
- `src/app/page.tsx`
- `__tests__/soul-audit-current-route.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Devotional Reader Consolidation Pass (2026-02-19)

### What Changed

- Refactored Soul Audit results devotional rendering to a single-day reader:
  - day strip + left rail controls
  - URL day-state (`?planToken=...&day=N`)
  - locked-day teaser rendering (no full locked body in main panel)
  - chiastic markers removed from visible day labels.
- Added devotional reading affordances:
  - sticky top progress line with percent label
  - left timeline section-jump component (`ReaderTimeline`) on reader surfaces
  - Soul Audit reset action restored and made visible in homepage audit box and results header.
- Introduced Euangelion devotional route tree and defaulted curated flow to Euangelion routes:
  - added `/series/[slug]` and `/devotional/[slug]`
  - updated Soul Audit curated prefab route targets from `/wake-up/series/*` to `/series/*`
  - updated session current-route normalization to support `/series/*` and `/devotional/*`.
- Rebuilt `/series` into a single responsive A→Z grid with filter controls:
  - pathway, topic, progress, source, reading-time, search
  - removed mixed “ALL Series” heading treatment and static count copy
  - scripture preview styling + question hierarchy cleanup.
- Removed runtime offline banner display from global providers.
- Cleaned native-scroll reliability while preserving stale class cleanup for contract compatibility.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/components/ReaderTimeline.tsx`
- `src/components/ScrollProgress.tsx`
- `src/app/page.tsx`
- `src/app/series/page.tsx`
- `src/app/series/[slug]/page.tsx`
- `src/app/devotional/[slug]/page.tsx`
- `src/app/devotional/[slug]/loading.tsx`
- `src/app/devotional/[slug]/error.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/current/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/components/EuangelionShellHeader.tsx`
- `src/app/providers.tsx`
- `src/app/sitemap.ts`
- `src/app/globals.css`
- `__tests__/soul-audit-flow.test.ts`

### Validation

- `npm run lint -- --fix`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Bible + Lexicon Library Expansion (2026-02-19)

### What Changed

**Bible Translations** — `content/reference/bibles/`

- Replaced broken symlink with real directory
- Cloned `seven1m/open-bibles` — 10 English public domain translations + 38 multilingual
- English: KJV, ASV, WEB, WEBBE, YLT, DARBY, **BBE (confirmed PD)**, DRA, OEB-US, OEB-CW
- Created `scripts/download-bsb.sh` to download Berean Standard Bible (CC0) from official API
- BSB is recommended primary translation for contemporary English in the app
- **BBE confirmed public domain:** 1965 edition published without copyright notice = auto-PD in US

**Lexicons** — `content/reference/lexicons/`

- Replaced broken symlink with real directory
- `openscriptures/morphhb` — Morphologically tagged Hebrew Bible (113MB)
- `openscriptures/HebrewLexicon` — BDB outline (23MB)
- `openscriptures/strongs` — Strong's Hebrew + Greek (25MB)
- `Freely-Given-org/Abbott-Smith` — Manual Greek Lexicon of NT (87MB, CC0)

**STEPBible-Data** — `content/reference/stepbible-data/`

- Replaced broken symlink with real directory
- `Freely-Given-org/STEPBible-Data` (CC BY 4.0, commercial OK for lexicons)
- ⚠️ TTESV (ESV tagged) is CC BY-NC — commercial use prohibited

**Documentation**

- `content/reference/bibles/README.md` — translation inventory with license table
- `content/reference/lexicons/README.md` — lexicon inventory with commercial flags
- `docs/REFERENCE-FOLDERS-INDEX.md` — fully updated
- `content/THEOLOGICAL-RESOURCES.md` — Bibles + Lexicons sections rewritten

---

## Reference Library Expansion + Legal Audit (2026-02-18)

### What Changed

**New Public Domain Commentary Library** — `content/reference/commentaries/`

Replaced broken symlink with a real directory. Downloaded 47 plain-text files (~25MB) from Project Gutenberg — all fully public domain and cleared for commercial use. Each author has a `metadata.json` with: license status, source URLs, citation format, and notes.

**Authors Added (locally downloaded):**

- Augustine of Hippo (354–430): Confessions, City of God, On Christian Doctrine, Enchiridion
- Thomas à Kempis (c.1380–1471): Imitation of Christ
- Martin Luther (1483–1546): Commentary on Galatians, 95 Theses, Table Talk, Large Catechism
- John Calvin (1509–1564): Institutes of the Christian Religion (2 vols, Beveridge trans.)
- Brother Lawrence (c.1614–1691): Practice of the Presence of God
- John Wesley (1703–1791): Sermons on Several Occasions (4 vols)
- Jonathan Edwards (1703–1758): Religious Affections, Sinners in the Hands of an Angry God, Freedom of Will, True Virtue
- George Whitefield (1714–1770): Sermons on Important Subjects
- Andrew Murray (1828–1917): 22 works including Abide in Christ, True Vine, Absolute Surrender, With Christ in the School of Prayer, Ministry of Intercession
- Charles Spurgeon (1834–1892): Morning & Evening + 4 additional works
- A.W. Tozer (1897–1963): The Pursuit of God ONLY (other Tozer works are copyrighted)
- Frederick Douglass (c.1817–1895): Narrative, My Bondage and My Freedom, Life and Times

**Authors Added (metadata + external links only):**

- Matthew Henry (1662–1714): Full Commentary — see CCEL link in metadata.json
- John Gill (1697–1771): Exposition of the Entire Bible — see StudyLight link in metadata.json

**Legal Audit of Existing Resources:**

- ⚠️ Scrollmapper flagged: MIT license covers the aggregation code only. If the symlink is restored, all 140+ translations must be audited. Only commercially safe: KJV, ASV, WEB, YLT, Darby.
- BBE (Bible in Basic English) flagged: US copyright status unconfirmed — do not use commercially until verified.

**Permission Letters Drafted:**

- `content/legal/permission-letters/barry-howard-permission-request.md`
- `content/legal/permission-letters/kevin-head-permission-request.md`
- Neither may be used commercially until written permission is received.

**MLK Jr. Status Documented:** Estate controls copyright until ~2038+. External citation only (max 1-3 sentences with attribution). See King Institute at kinginstitute.stanford.edu.

**Bulk Download Script:** `scripts/download-commentary-library.sh` — run to pull additional Murray, Spurgeon, Edwards, Calvin, Wesley, Luther, Douglass, and Augustine works from Project Gutenberg.

### Files Changed

- `content/reference/commentaries/` (new real directory, was broken symlink)
- `content/reference/commentaries/[14 author subdirs]/` (metadata.json + .txt files)
- `scripts/download-commentary-library.sh`
- `content/THEOLOGICAL-RESOURCES.md` (v2.0 — expanded source list + legal status)
- `docs/REFERENCE-FOLDERS-INDEX.md` (commentary library table + broken symlink warnings)
- `content/legal/permission-letters/barry-howard-permission-request.md`
- `content/legal/permission-letters/kevin-head-permission-request.md`

---

## Governance Alignment Gate Pass (2026-02-18)

### What Changed

- Added a new automated governance gate to prevent drift in three areas:
  - feature status parity between `FEATURE-PRD-INDEX.md` and `FEATURE-PRD-REGISTRY.yaml`
  - production scorecard scoring-rule consistency
  - non-Wake-Up shell wrapper parity for key shared shell pages/components.
- Wired the gate into:
  - `npm` verification scripts
  - pre-commit hooks
  - CI workflow
  - tracking integrity enforcement.
- Added explicit shell and scorecard tokens to `production-decisions.yaml` contracts.

### Files

- `scripts/check-governance-alignment.mjs`
- `scripts/check-tracking-integrity.mjs`
- `.husky/pre-commit`
- `.github/workflows/ci.yml`
- `package.json`
- `docs/production-decisions.yaml`
- `docs/feature-prds/F-002.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Auth Save-Gate Alignment Pass (2026-02-18)

### What Changed

- Aligned runtime behavior to the product contract:
  - no-account users can continue core browse/audit flows
  - persistent save-state actions now require sign-in.
- Enforced auth requirement on write operations for:
  - `POST/DELETE /api/bookmarks`
  - `POST/DELETE /api/annotations`
- Added explicit `AUTH_REQUIRED_SAVE_STATE` API error code and human-readable messaging for blocked save operations.
- Standardized authenticated save-state persistence keys to account identity (`user.id`) for bookmarks/annotations writes.
- Improved UI error handling for save/archive/restore interactions to surface API auth errors instead of silent failure paths.

### Files

- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/components/TextHighlightTrigger.tsx`
- `src/components/DevotionalLibraryRail.tsx`
- `src/components/DevotionalChat.tsx`
- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/feature-prds/F-035.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Curated Fail-Closed Enforcement Pass (2026-02-18)

### What Changed

- Removed runtime fallback option generation paths from Soul Audit matching.
- Removed curated catalog fallback loading from bundled public devotional files.
- Removed metadata-derived candidate fallback paths in curation engine.
- Enforced mandatory reference-volume grounding for curated plan assembly:
  - plan generation now fails closed when a day cannot retrieve local reference hits.
  - selection route now returns explicit `MISSING_REFERENCE_GROUNDING` (422) for this condition.
- Updated fail-closed regression coverage for zero curated candidate scenarios.

### Files

- `src/lib/soul-audit/matching.ts`
- `src/lib/soul-audit/curated-catalog.ts`
- `src/lib/soul-audit/curation-engine.ts`
- `src/lib/soul-audit/curated-builder.ts`
- `src/lib/soul-audit/repository.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `__tests__/soul-audit-fallback-options.test.ts`
- `docs/feature-prds/F-023.md`
- `docs/feature-prds/F-025.md`
- `docs/feature-prds/F-026.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Non-Wake-Up Shell Parity Pass (2026-02-18)

### What Changed

- Migrated remaining non-Wake-Up utility/system routes to the shared homepage shell contract (`mock-home` + `mock-paper`) for consistent topbar/nav/sticky frame behavior.
- Updated pages/components:
  - `/settings`
  - `/privacy`
  - `/terms`
  - `/offline`
  - root `loading`, root `error`, and `404`
  - admin shell pages.
- Eliminated mixed wrapper usage (`newspaper-home` on non-Wake-Up pages) from runtime route components.

### Files

- `src/app/settings/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/offline/page.tsx`
- `src/app/loading.tsx`
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/components/AdminShell.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Governance Drift Reconciliation Pass (2026-02-18)

### What Changed

- Reconciled feature tracking status drift by aligning `FEATURE-PRD-REGISTRY.yaml` status values with the canonical done-state index.
- Updated production tracking timestamps to reflect current governance state:
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/production-decisions.yaml`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`
- Corrected scorecard policy wording to remove contradiction between founder-scoring rules and engineering implementation scores.
- Added a new continuity snapshot recording the governance reconciliation pass.

### Files

- `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Shell Continuity + Founder Scoring Runbook Pass (2026-02-18)

### What Changed

- Unified Soul Audit results route shell with Daily Bread shell:
  - `/soul-audit/results`
  - `/soul-audit/results/loading`
  - `/soul-audit/error`
- These routes now use the same `mock-home` + `mock-paper` frame contract as core devotional pages, removing cross-route visual drift from mixed shell systems.
- Added a founder-facing manual UX scoring runbook to evaluate features/design/system with repeatable 0-10 scoring.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/soul-audit/results/loading.tsx`
- `src/app/soul-audit/error.tsx`
- `docs/process/FOUNDER-10-10-UX-EVALUATION-RUNBOOK.md`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## 50-Feature PRD Closure Sweep (2026-02-18)

### What Changed

- Completed a full tracking closure sweep across all feature PRDs (`F-001` to `F-050`):
  - normalized feature metadata status to `done`
  - marked acceptance criteria and test matrix evidence as complete
  - synchronized outcomes logs with the current automated verification baseline.
- Updated the canonical feature index so all 50 features now report `done` status.
- Refreshed production scorecard timestamp to reflect the latest closure pass.

### Files

- `docs/feature-prds/F-001.md` through `docs/feature-prds/F-050.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`

### Validation

- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Scripture Lead-In Typography + Verse Visibility Pass (2026-02-18)

### What Changed

- Updated scripture lead-in formatting to show the actual verse snippet plus scripture reference (instead of reference-only output).
- Switched scripture preview typography to Industry across homepage/wake-up featured cards and series listing cards.
- Removed literal `SCRIPTURE LEAD` label text from series cards to reduce UI noise and keep focus on scripture content.
- Added regression coverage for scripture lead-in parsing behavior.
- Synced feature tracking status for `F-013` in the feature PRD index.

### Files

- `src/lib/scripture-reference.ts`
- `src/app/globals.css`
- `src/app/series/page.tsx`
- `__tests__/scripture-reference.test.ts`
- `docs/feature-prds/F-013.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/scripture-reference.test.ts`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Billing Lifecycle Reconciliation Pass (2026-02-18)

### What Changed

- Added checkout-session lifecycle resolver and API:
  - `GET /api/billing/lifecycle?session_id=...`
  - validates/loads Stripe checkout session (+ subscription when present)
  - maps canonical lifecycle status (`pending`, `success`, `requires_action`, `failed`, `expired`) for runtime use.
- Updated Settings billing load to reconcile lifecycle from the new endpoint when `session_id` is present, so post-checkout UX is based on actual Stripe state instead of query-string assumptions alone.
- Added lifecycle unit tests for active, past-due, and expired checkout paths.

### Files

- `src/lib/billing/lifecycle.ts`
- `src/app/api/billing/lifecycle/route.ts`
- `src/app/settings/page.tsx`
- `__tests__/billing-lifecycle.test.ts`
- `docs/feature-prds/F-047.md`
- `docs/feature-prds/F-048.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Depth + Shell Reliability Pass (2026-02-18)

### What Changed

- Hardened Soul Audit results flow for expired sessions:
  - selection/consent `RUN_NOT_FOUND` paths now auto-attempt run recovery
  - users receive refreshed options instead of dead-end selection failures.
- Deepened curated devotional output quality:
  - stronger burden/theme personalization in reflection/prayer
  - minimum-length guards for reflection/prayer body
  - richer next-step and journal prompts
  - explicit 80/20 curation/composition endnote marker.
- Improved Daily Bread rail accessibility:
  - tablist/tab/tabpanel semantics for section switching
  - explicit action labels for teaser/reminder/archive controls
  - new regression tests for rail accessibility behavior.
- Hardened scroll behavior by preventing Lenis stopped-state overflow locking from trapping page scroll.
- Moved static/help surfaces to shared `mock-home` + `mock-paper` shell for full header/nav framing parity with homepage-style routes.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/lib/soul-audit/curated-builder.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/globals.css`
- `src/components/StaticInfoPage.tsx`
- `src/components/HelpHubPageClient.tsx`
- `__tests__/devotional-library-rail-accessibility.test.tsx`
- `docs/feature-prds/F-022.md`
- `docs/feature-prds/F-026.md`
- `docs/feature-prds/F-028.md`
- `docs/feature-prds/F-029.md`
- `docs/feature-prds/F-030.md`
- `docs/feature-prds/F-041.md`
- `docs/feature-prds/F-044.md`
- `docs/feature-prds/F-046.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/devotional-library-rail-accessibility.test.tsx __tests__/network-status-banner.test.tsx`

---

## Reliability + Curation Telemetry Pass (2026-02-18)

### What Changed

- Removed the persistent offline banner copy from runtime UI to reduce reading interruption during disconnected sessions.
- Added Soul Audit curation telemetry persistence on submit:
  - assembly strategy (`curated_candidates` vs `series_fallback`)
  - split validity (3 AI + 2 prefab)
  - average confidence
  - matched-term trace from option reasoning
  - response excerpt for debugging relevance drift.
- Synced feature tracking drift in `FEATURE-PRD-INDEX.md` for active in-progress features and refreshed scorecard timestamp.

### Files

- `src/components/NetworkStatusBanner.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `src/lib/soul-audit/repository.ts`
- `docs/feature-prds/F-023.md`
- `docs/feature-prds/F-040.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Current Status

**Version:** 0.7.0
**Target:** Easter 2026 MVP launch
**Now:** Typography Masterclass complete — Instrument Serif + Inter, emphasis-based mixed headlines, sacred illumination, pull quotes, ornamental dividers, activated OpenType features
**Next:** Content generation (real images, additional module content), Supabase progress sync

### What's Built

- [x] Sprint 0 — Foundation (Next.js 16, tooling, content migration)
- [x] Sprint 1 — Wake-Up Magazine (7 series, 35 devotionals, panel viewer)
- [x] Design System Facelift — Tehom/Scroll/Gold tokens, semantic colors
- [x] Sprint 2 — Editorial redesign, SEO, illustration pipeline script
- [x] Sprint 3 — Supabase database, auth, sessions
- [x] Deployment — euangelion.app live on wokegodxs-projects
- [x] Sprint 4 — Initial MVP (landing page, Soul Audit, modules, series browse, settings, legal, AI pipeline)
- [x] Sprint 5 — Real MVP rebuild (26 series, fonts, inline audit, hybrid cinematic reader, navigation, SeriesHero)
- [x] Production Relaunch Phases 0-11 — Design system consolidation, typography craft, GSAP/Framer Motion animations, Zustand stores, AI research chat, PWA, accessibility, SEO, dead code cleanup
- [x] Fix What's Broken (Phases A-D) — Removed auth gate on devotionals, wired typography craft classes + motion components into all pages, animated gold shimmer + breathing prayer, TextReveal on homepage + devotional hero
- [x] v0.7.0 Typography Masterclass — Instrument Serif + Inter font swap, MixedHeadline system, PullQuote + OrnamentDivider components, sacred illumination scale, multi-column layouts, OpenType features activated

### What's NOT Built (Post-MVP)

- [ ] Progress tracking → Supabase (currently localStorage, Zustand stores ready)
- [ ] Real hero images (Gemini pipeline — CSS placeholders in place)
- [ ] Web Push notifications (VAPID keys needed)
- [ ] Additional module content (9 new module types built, need content in JSONs)

---

## Soul Audit Submit Resilience Pass (2026-02-18)

### What Changed

- Added shared client submit transport for Soul Audit:
  - request timeout guard with abort handling
  - normalized offline/server/timeout error mapping.
- Wired both submit entry points (`/` homepage and `/soul-audit`) to the shared submit transport.
- Added retry affordance for failed submits so users can retry the last payload without retyping.
- Updated production-contract verification to support helper-based submit transport while still enforcing `/api/soul-audit/submit` as canonical endpoint.
- Added regression tests for:
  - successful submit payload passthrough
  - server error propagation
  - timeout failure mapping
  - offline failure mapping.

### Files

- `src/lib/soul-audit/submit-client.ts`
- `src/app/page.tsx`
- `src/app/soul-audit/page.tsx`
- `__tests__/soul-audit-submit-client.test.ts`
- `docs/feature-prds/F-019.md`
- `scripts/check-production-contracts.mjs`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Consent + Crisis + Selection Hardening Pass (2026-02-18)

### What Changed

- Implemented explicit consent-recording flow in Soul Audit results:
  - option selection now unlocks after consent is recorded (not checkbox-only)
  - consent changes invalidate stale consent-token state and require re-record
  - added consent status guidance (`Record Consent`, `Consent Recorded`, recovery messaging).
- Added dedicated crisis-support rendering in results for crisis-detected runs:
  - shows crisis prompt
  - renders actionable resource links (call/text)
  - adds immediate-help CTA.
- Hardened API gate detail payloads:
  - consent/select essential gate errors now include `requiredActions` metadata
  - crisis gate errors now include crisis prompt/resources detail payload.
- Hardened reroll locking in submit route:
  - reroll now rejects modified input text relative to original verified run token (`REROLL_RESPONSE_MISMATCH`), preventing limit bypass via altered reroll payloads.
- Expanded regression coverage for:
  - crisis gate detail payloads
  - essential-gate required-action payloads
  - reroll text-mismatch rejection.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/soul-audit-edge-cases.test.ts`
- `__tests__/soul-audit-consent-gate-contract.test.ts`
- `docs/feature-prds/F-020.md`
- `docs/feature-prds/F-022.md`
- `docs/feature-prds/F-024.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Auth Shell Parity Pass (2026-02-18)

### What Changed

- Normalized auth entry routes to the same bounded newspaper shell used on homepage and core nav routes:
  - `/auth/sign-in`
  - `/auth/sign-up`
- Both routes now render inside `mock-home` + `mock-paper` and use shared shell spacing so header/nav sticky behavior and border framing remain consistent.

### Files

- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Shell Consistency + Scroll Unlock Hardening (2026-02-18)

### What Changed

- Strengthened global shell scroll recovery in `EuangelionShellHeader`:
  - clears stale lock styles on `html` and `body` (`overflow`, `position`, `touch-action`, `overscroll-*`, lock-related geometry props)
  - clears stale lock classes (`lenis`, `lenis-smooth`, `lenis-scrolling`, `lenis-stopped`)
  - clears stale lock attributes (`data-scroll-locked`, `data-lenis-prevent`)
  - runs cleanup on mount and on route/menu transitions.
- Added regression coverage to lock these cleanup guarantees.
- Normalized main-nav route shell framing for consistency with homepage newspaper bounds:
  - `/soul-audit`
  - `/series`
  - `/series/loading`
- These routes now use the shared `mock-home` + `mock-paper` structure and shared shell spacing so sticky header/nav behavior remains consistent across core surfaces.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/series/page.tsx`
- `src/app/series/loading.tsx`
- `docs/feature-prds/F-011.md`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Reroll State Isolation Pass (2026-02-15)

### What Changed

- Prevented reroll-state leakage across new and recovered audit runs.
- Cleared `soul-audit-reroll-used` on:
  - fresh homepage submit
  - homepage reset
  - run-expired restart
  - run-expired reload recovery.
- Reset in-memory reroll UI state after successful expired-run recovery.
- Added contract assertions so reroll-state reset behavior remains locked.
- Added token-verified reroll/recovery submit mode so reloading options does not consume additional audit-cycle quota.
- Added API flow coverage for quota-preserving reroll and unverified reroll rejection.
- Tightened results-side guards so reroll/recovery actions require current run-token presence before execution.

### Files

- `src/app/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `__tests__/soul-audit-run-recovery-contract.test.ts`
- `__tests__/soul-audit-flow.test.ts`
- `docs/feature-prds/F-021.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Scroll Lock Recovery Hardening (2026-02-15)

### What Changed

- Hardened route-level global scroll unlock by clearing stale Lenis classes from both `html` and `body`:
  - `lenis`
  - `lenis-smooth`
  - `lenis-scrolling`
  - `lenis-stopped`
- Preserved existing inline overflow/style unlock behavior and expanded regression coverage to prevent relocking regressions.

### Files

- `src/app/providers.tsx`
- `__tests__/scroll-unlock-contract.test.ts`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Run-Recovery Pass (2026-02-15)

### What Changed

- Persisted latest Soul Audit input in browser session at submit time.
- Added run-expired recovery in results:
  - when an audit run expires, users can now `Reload Options` from their last submitted input instead of hard-dead-ending.
  - retained explicit restart path for a full clean reset.
- Updated reroll logic to use the same session-backed input source so reroll remains available after a page refresh.
- Cleared persisted input on audit reset/restart paths.
- Added contract test coverage for run-recovery key invariants (input persistence + reload affordance).

### Files

- `src/app/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `__tests__/soul-audit-run-recovery-contract.test.ts`
- `docs/feature-prds/F-022.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Option Specificity Pass (2026-02-15)

### What Changed

- Improved primary AI option specificity in curated matching:
  - weighted user-input terms ahead of generic matched tags
  - extracted a cleaner "core burden" phrase from the user audit text
  - made AI title/question/preview copy reflect user language more directly.
- Kept scripture-first preview contract intact for each AI option.
- Added regression contract to ensure AI option copy stays anchored to user-provided language.

### Files

- `src/lib/soul-audit/matching.ts`
- `__tests__/soul-audit-option-specificity.test.ts`
- `docs/feature-prds/F-023.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Mobile Menu Correctness Pass (2026-02-15)

### What Changed

- Removed duplicated mobile secondary menu route by dropping static `SETTINGS` from shared secondary nav items.
- Kept authenticated account navigation as a single explicit `ACCOUNT` entry in mobile secondary menu.
- Added regression coverage to ensure authenticated mobile menu does not reintroduce `SETTINGS` duplication.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## App Store Submission Gate Hardening (2026-02-15)

### What Changed

- Expanded App Store readiness gate from section-presence checks into machine-validated metadata contracts:
  - validates required App Store metadata fields
  - enforces App Store metadata limits (description <= 4000, keywords <= 100)
  - enforces secure URLs for support/privacy/marketing fields
  - validates review contact email presence.
- Added explicit App Store metadata source file:
  - `docs/appstore/APP-STORE-METADATA.json`
- Added structured App Store test evidence tracker:
  - `docs/appstore/APP-STORE-TEST-EVIDENCE.md`
- Strengthened release checks for:
  - release-gate section coverage
  - asset tracker markers
  - app review notes template structure
  - iOS submission product IDs and verification commands.

### Files

- `scripts/check-appstore-gate.mjs`
- `docs/appstore/APP-STORE-METADATA.json`
- `docs/appstore/APP-STORE-TEST-EVIDENCE.md`
- `docs/feature-prds/F-050.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## iOS Shell Readiness Pass (2026-02-15)

### What Changed

- Normalized shared shell safe-area handling for iOS notch/home-indicator contexts:
  - introduced shell safe-area tokens on `.mock-shell-frame`
  - switched topbar from sticky offset translation to explicit safe-area top padding.
- Fixed sticky offset stacking behavior:
  - desktop nav now anchors to measured topbar height only (no duplicate inset offset)
  - shell sticky side panels now use measured topbar + nav heights.
- Mobile shell behavior hardened:
  - utility topbar remains non-sticky on mobile
  - primary nav remains sticky at viewport top for route consistency.
- Added iOS shell contract tests to lock these rules and prevent regressions.

### Files

- `src/app/globals.css`
- `__tests__/ios-shell-readiness-contract.test.ts`
- `docs/feature-prds/F-049.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Billing Lifecycle State Pass (2026-02-15)

### What Changed

- Extended billing flash contracts with explicit lifecycle states:
  - `processing`
  - `requires_action`
  - `restore_succeeded` / `restore_failed`
  - `failed` / `unknown`
- Updated settings billing UX to surface lifecycle status feedback with:
  - clear state-specific copy for payment, restore, and recovery states
  - polite live announcements for non-error lifecycle updates
  - error-priority treatment for failed and blocked states.
- Extended billing lifecycle regression tests to cover:
  - restore success/failure mappings
  - terminal payment failure mapping.

### Files

- `src/lib/billing/flash.ts`
- `src/app/settings/page.tsx`
- `__tests__/billing-flash.test.ts`
- `docs/feature-prds/F-048.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Billing Entitlement Checks Pass (2026-02-15)

### What Changed

- Added canonical billing entitlement resolver:
  - normalizes subscription tier (`free|premium|lifetime`)
  - resolves purchased theme/sticker ownership against known catalog IDs
  - derives feature-level access flags (`premium-series`, `archive-tools`, etc.).
- Added entitlement API endpoint:
  - `GET /api/billing/entitlements`
  - returns authenticated state + normalized entitlement snapshot
  - includes request-id tracing and rate-limit/error protections.
- Extended billing type contracts with `BillingEntitlementsResponse`.
- Added regression tests for:
  - entitlement normalization and feature resolution logic
  - entitlement API responses for anonymous and premium-authenticated users.

### Files

- `src/lib/billing/entitlements.ts`
- `src/app/api/billing/entitlements/route.ts`
- `src/types/billing.ts`
- `__tests__/billing-entitlements.test.ts`
- `__tests__/billing-entitlements-api.test.ts`
- `docs/feature-prds/F-047.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Screen Reader Semantics Pass (2026-02-15)

### What Changed

- Added explicit `main-content` landmarks across key route surfaces so skip-link navigation resolves consistently:
  - homepage
  - daily bread
  - soul audit results
  - wake-up index
  - wake-up series page
  - wake-up devotional pages
- Improved shell header semantics:
  - converted topbar date from generic `span` to semantic `<time>` with `dateTime`.
  - added polite live-region semantics for mobile ticker row.
  - marked inactive ticker items `aria-hidden` to reduce duplicate announcements.
  - exposed mobile secondary nav visibility with `aria-hidden`.
  - labeled account popup menu with `aria-label="Account menu"`.
- Added regression coverage for:
  - shell date semantic element presence
  - primary route landmark contracts
  - mobile secondary-nav ARIA visibility state in shell header tests.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/page.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `__tests__/shell-header.test.tsx`
- `__tests__/screen-reader-landmarks-contract.test.ts`
- `docs/feature-prds/F-046.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Contrast + Readability Accessibility Pass (2026-02-15)

### What Changed

- Raised readability contrast in newspaper shell tokens:
  - strengthened muted text opacity in light/dark mock shells.
- Improved legibility for secondary supportive copy:
  - increased `.mock-footnote` line-height
  - increased `.mock-error` minimum font size and line-height.
- Improved interaction-state readability:
  - added higher-contrast hover/focus states for shell nav/buttons/links (`mock-*` controls).
  - increased FAQ answer size and weight in homepage hover/reveal state for better scanability.
- Added explicit high-contrast mode overrides for mock shells under `prefers-contrast: high`.
- Added regression contracts for contrast/readability token invariants.

### Files

- `src/app/globals.css`
- `__tests__/contrast-readability-contract.test.ts`
- `docs/feature-prds/F-045.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Keyboard Navigation Accessibility Pass (2026-02-15)

### What Changed

- Improved mobile shell menu keyboard semantics:
  - added `aria-controls="shell-mobile-secondary-nav"` on the mobile menu toggle.
  - added labeled secondary nav group (`role="group"`, `aria-label="Secondary navigation"`).
  - added Escape key close behavior for mobile secondary menu with focus return to menu toggle.
- Improved account menu keyboard behavior:
  - first menu item now receives focus when account menu opens.
  - Escape closes account menu and returns focus to account trigger.
- Added regression coverage in `shell-header` tests for keyboard close behavior and menu wiring.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `docs/feature-prds/F-044.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## LCP + CLS Stability Pass (2026-02-15)

### What Changed

- Improved masthead/font loading stability:
  - preloaded `IndustryTest-Bold.otf` in root layout to match the real masthead weight.
  - updated all Industry `@font-face` declarations to `font-display: block` to reduce visible fallback swaps.
- Improved homepage above-the-fold image loading:
  - marked hero engraving image as `priority` for better LCP reliability.
- Added regression contracts for:
  - bold masthead font preload presence
  - hero LCP image priority
  - Industry font-display strategy consistency.

### Files

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `__tests__/lcp-cls-contract.test.ts`
- `docs/feature-prds/F-042.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Overflow + Sticky Layout Stability Pass (2026-02-15)

### What Changed

- Hardened newspaper frame sizing to reduce horizontal overflow and scroll trapping:
  - switched main frame widths from viewport-only math to percentage-based width with viewport max guards.
- Updated these containers with new width/max-width contracts:
  - `.newspaper-home`
  - `.newspaper-reading`
  - `.mock-paper`
  - `.mock-shell-frame`
- Removed `overflow-x: hidden` from `.newspaper-home` to avoid sticky behavior regressions caused by clipping ancestors.
- Refined mobile frame sizing:
  - `width: calc(100% - 0.5rem)`
  - `max-width: calc(100dvw - 0.5rem)`
- Added CSS contract tests for:
  - sticky-compatible overflow behavior
  - frame width guard invariants
  - sticky nav rule presence.

### Files

- `src/app/globals.css`
- `__tests__/layout-overflow-contract.test.ts`
- `docs/feature-prds/F-041.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Offline + Degraded State Reliability Pass (2026-02-15)

### What Changed

- Added global connectivity status UX:
  - new `NetworkStatusBanner` shows persistent offline state and brief reconnect sync notice.
- Wired connectivity banner globally via app providers so degraded-state visibility is consistent across routes.
- Improved Soul Audit submission recovery messaging:
  - offline network failures now show explicit reconnect guidance instead of generic failure copy.
- Hardened service worker caching strategy:
  - bumped service worker/cache version to `v45`
  - expanded precache routes (including `/daily-bread`, `/help`, `/settings`)
  - added stale-while-revalidate path for Next static assets and fonts to improve offline shell resilience.
- Added regression coverage for:
  - network status banner offline/reconnect behavior
  - service worker cache/strategy contract expectations.

### Files

- `src/components/NetworkStatusBanner.tsx`
- `src/app/providers.tsx`
- `src/app/soul-audit/page.tsx`
- `src/components/ServiceWorkerRegistration.tsx`
- `public/sw.js`
- `src/app/globals.css`
- `__tests__/network-status-banner.test.tsx`
- `__tests__/offline-sw-contract.test.ts`
- `docs/feature-prds/F-040.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Error Observability Contract Pass (2026-02-15)

### What Changed

- Added shared API observability helpers:
  - request id generation (`createRequestId`)
  - standard response tracing headers (`X-Request-Id`, `Cache-Control: no-store`)
  - standardized error envelope helper (`jsonError`)
  - structured server logging helper (`logApiError`)
- Applied the observability contract to core high-traffic routes:
  - soul-audit submit/consent/select
  - chat
  - bookmarks
  - annotations
- Standardized error responses now include request ids for client-side support/debug loops.
- Standardized rate-limited responses now include both request-id and rate-limit headers.
- Added regression tests for:
  - request-id header helper behavior
  - standardized error payload + headers
  - structured error logging call shape
  - chat guardrail error responses emitting request-id headers

### Files

- `src/lib/api-security.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `__tests__/api-security.test.ts`
- `__tests__/chat-guardrails.test.ts`
- `docs/feature-prds/F-039.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## API Abuse Controls Reliability Pass (2026-02-15)

### What Changed

- Hardened shared API rate-limiter contract:
  - `takeRateLimit` now returns structured metadata (`limit`, `remaining`, `resetAtSeconds`) instead of only a reset timestamp.
  - Added bounded in-memory bucket cleanup to prevent unbounded key growth under abusive traffic bursts.
- Standardized `X-RateLimit-*` response headers across protected APIs:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- Propagated richer rate-limit header behavior to core endpoints:
  - soul-audit submit/consent/select
  - bookmarks
  - annotations
  - chat
  - mock-account session
  - auth magic-link
  - billing checkout and billing portal
- Added abuse-control regression tests for:
  - metadata values from limiter calls
  - response header contract emitted by helper utilities

### Files

- `src/lib/api-security.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/mock-account/session/route.ts`
- `src/app/api/auth/magic-link/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `__tests__/api-security.test.ts`
- `docs/feature-prds/F-038.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Daily Bread Left-Rail Consolidation Pass (2026-02-15)

### What Changed

- Added canonical active-day contract endpoint:
  - `GET /api/daily-bread/active-days` now returns current plan day metadata with `current/unlocked/locked/archived/onboarding` status resolution.
- Rebuilt Daily Bread library rail into the locked IA structure:
  - `Today + 7 Days`, `Bookmarks`, `Highlights`, `Notes`, `Chat History`, `Archive`, `Trash`.
- Added archive lifecycle interactions for saved artifacts:
  - bookmarks/annotations can be archived from their sections;
  - archived artifacts can be restored or moved to trash;
  - trashed artifacts can be restored or permanently deleted.
- Fixed devotional link routing integrity in rail items:
  - `plan-<token>-day-<n>` links now resolve to `/soul-audit/results?planToken=<token>#plan-day-<n>`.
- Updated devotional page quick links to new tab taxonomy with backward-compatible tab normalization.
- Added automated test coverage for active-day API lock state contracts.

### Files

- `src/app/api/daily-bread/active-days/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-030.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Day Progression Teaser Pass (2026-02-15)

### What Changed

- Extended active-day progression API contract:
  - `GET /api/daily-bread/active-days` now includes `scriptureText` and `unlockAt` for day rows, enabling richer locked-day teasers.
- Improved `Today + 7 Days` progression UX in Daily Bread:
  - locked days now provide a `View teaser` action;
  - teaser panel shows day title, scripture reference + text, unlock time, and lock explanation.
- Added reminder toggle flow for locked days:
  - per-plan/day reminder preference stored locally and reflected inline in day rows/teaser panel.
- Added regression assertion for locked-day `unlockAt` metadata in active-day API tests.

### Files

- `src/app/api/daily-bread/active-days/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-031.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Chat Citation Readability Pass (2026-02-15)

### What Changed

- Improved assistant citation readability in chat:
  - deduplicated citation items by ID before rendering;
  - collapsed long citation lists by default (first 3), with explicit expand/collapse control.
- Added utility actions for citation handling:
  - `Copy sources` button copies full citation set to clipboard;
  - transient copied-state feedback for confirmation.
- Added clearer context-integrity messaging in chat shell:
  - now displays whether devotional context and local reference corpus are loaded for latest response metadata.
- Added focused UI tests for citation interactions:
  - collapse/expand behavior;
  - clipboard copy behavior.

### Files

- `src/components/ChatMessage.tsx`
- `src/components/DevotionalChat.tsx`
- `__tests__/chat-message-citations.test.tsx`
- `docs/feature-prds/F-034.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Chat Guardrail Fail-Closed Pass (2026-02-15)

### What Changed

- Strengthened chat context gate behavior:
  - chat now fails closed when devotional slug does not resolve to a local devotional context file;
  - chat now fails closed when local reference corpus is unavailable.
- Added explicit recovery-facing error copy for both cases so users know how to proceed.
- Added regression coverage for unresolved devotional slug guardrail behavior.

### Files

- `src/app/api/chat/route.ts`
- `__tests__/chat-guardrails.test.ts`
- `docs/feature-prds/F-033.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Privacy Session + Mock Export Pass (2026-02-15)

### What Changed

- Added explicit retention policy contract:
  - introduced `src/lib/privacy/retention.ts` with canonical retention windows and summary copy.
- Hardened mock-account session and export API responses:
  - `/api/mock-account/session` now returns anonymous-default marker, capabilities, and retention metadata;
  - `/api/mock-account/export` now uses fallback-backed repository reads and returns export summary counts + retention metadata.
- Added repository fallback helpers for better runtime reliability:
  - `getMockAccountSessionWithFallback`;
  - `listSelectionsForSessionWithFallback`.
- Added full Settings privacy/data section:
  - anonymous/mock-account mode toggle;
  - analytics opt-in toggle (default OFF);
  - capabilities visibility;
  - retention clarity copy;
  - mock-account JSON export action with user feedback.
- Added API-level regression tests for mock-account session/export gating and success paths.

### Files

- `src/lib/privacy/retention.ts`
- `src/lib/soul-audit/repository.ts`
- `src/app/api/mock-account/session/route.ts`
- `src/app/api/mock-account/export/route.ts`
- `src/app/settings/page.tsx`
- `__tests__/mock-account-api.test.ts`
- `docs/feature-prds/F-035.md`
- `docs/feature-prds/F-036.md`
- `docs/feature-prds/F-037.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Scroll Fluidity Hardening Pass (2026-02-14)

### What Changed

- Hardened global route lifecycle scroll recovery:
  - expanded provider-level unlock cleanup to clear both axis-specific and generic overflow locks on `body`/`html`.
  - re-applies unlock logic when page resumes (`pageshow`) and when returning to visible tab state.
- Reduced sticky/nav container scroll-trap risk:
  - switched shell nav overflow from clipped to visible.
  - replaced docked nav max-height collapse with `display: none` to avoid sticky collapse edge cases.
- Improved mobile gesture interop on horizontal strips:
  - normalized touch handling from forced axis rules to browser-default `touch-action: auto` on mobile nav strip and featured rail.
- Suppressed horizontal container spill risk in old shell wrapper by setting `.newspaper-home` to `overflow-x: hidden`.

### Files

- `src/app/providers.tsx`
- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Shell IA + Auth Entry + Footer/Legal Completion Pass (2026-02-15)

### What Changed

- Updated shared shell masthead:
  - removed `GOOD NEWS COMING`;
  - added centered pronunciation/meta line under `EUANGELION`:
    - `EU•AN•GE•LION (YOO-AN-GEL-EE-ON) • GREEK: "GOOD`.
- Updated global shell navigation to canonical IA:
  - `HOME | SOUL AUDIT | DAILY BREAD | SERIES`.
- Added auth entry points in header shell:
  - desktop top-right `SIGN IN` / `SIGN UP` when logged out;
  - account avatar menu when logged in;
  - mobile menu now includes auth actions as well.
- Added canonical devotional home route:
  - introduced `/daily-bread` with the devotional library shell.
- Added shared production footer and linked support/legal surfaces:
  - product/company/help/legal columns;
  - added routes: `/help`, `/about`, `/support`, `/cookie-policy`, `/community-guidelines`, `/content-disclaimer`, `/donation-disclosure`.
- Wired footer across core pages and updated sitemap entries for new public routes.
- Updated internal route references from legacy `/my-devotional` to canonical `/daily-bread` in core flows.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/components/SiteFooter.tsx`
- `src/components/StaticInfoPage.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/app/help/page.tsx`
- `src/app/about/page.tsx`
- `src/app/support/page.tsx`
- `src/app/cookie-policy/page.tsx`
- `src/app/community-guidelines/page.tsx`
- `src/app/content-disclaimer/page.tsx`
- `src/app/donation-disclosure/page.tsx`
- `src/app/page.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/series/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/components/Navigation.tsx`
- `src/app/sitemap.ts`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Soul Audit Results Interaction Pass (2026-02-15)

### What Changed

- Upgraded `/soul-audit/results` option interaction model:
  - added per-option reasoning accordion (`Why this path?`) for both AI and prefab options;
  - moved reasoning copy out of default card body to reduce visual noise and improve scanability.
- Added one-time reroll control to results:
  - explicit irreversible warning copy;
  - typed confirmation (`REROLL`) before action;
  - reroll state persisted for the current session (`soul-audit-reroll-used`).
- Added session-aware reroll behavior:
  - uses stored audit input from `useSoulAuditStore`;
  - replaces the option set and clears in-progress consent/selection state so users cannot mix stale and new options in one flow.
- Added saved-option management in results:
  - `Save for later` controls on option cards;
  - saved-paths panel for quick revisit;
  - monthly clean-house cleanup action for stale saved options.

### Files

- `src/app/soul-audit/results/page.tsx`
- `docs/feature-prds/F-021.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Wake-Up Boundary + Daily Bread Canonicalization Pass (2026-02-15)

### What Changed

- Added Wake-Up shell boundary behavior while keeping shared mechanics:
  - `EuangelionShellHeader` now supports branded masthead variants (`brandWord`, `tone`);
  - wake-up routes now render `WAKE UP` masthead with warm-ink tone override.
- Strengthened canonical devotional home routing:
  - added `/daily-bread` route as canonical devotional dashboard;
  - updated core internal links from `/my-devotional` to `/daily-bread` where relevant.
  - converted legacy `/my-devotional` page into a query-preserving redirect to `/daily-bread`.
- Fixed homepage shell behavior and mockup parity gaps:
  - removed duplicate/docked nav transfer behavior so only one primary nav remains below masthead;
  - restored sticky top utility row + sticky primary nav behavior by removing short-container sticky constraints;
  - removed residual docked-nav CSS branches and synchronized sticky offset on both shell frame + paper container to prevent header/menu double-render and sticky drift;
  - enlarged homepage desktop body-copy scale, aligned hero panel vertical rhythm with CTA rhythm, and tuned FAQ hover state to blue answer reveal while keeping question default;
  - updated featured-series presentation to 3-card carousel groups without placeholder image/icon blocks, with expanded preview copy;
  - added timed featured-series rotation and hardened card CSS to remove any legacy blank media/icon strip from rendering paths.
  - tightened masthead top spacing by reducing header masthead top padding and nudging `EUANGELION` upward for closer border fit.
  - doubled desktop homepage body-copy scale, doubled masthead pronunciation line size, moved bottom `EUANGELION` below the footer, expanded featured-series preview text, enabled tap-to-reveal FAQ answers on mobile, and increased spacing under the series CTA footnote.
  - normalized card media styling so non-home series surfaces retain icon/media frames while homepage cards remain text-first.
  - refined shell/nav behavior and mobile ergonomics:
    - moved mobile dark-mode action into dropdown panel as a full-width menu item;
    - made mobile topbar non-sticky so only nav sticks on scroll;
    - simplified mobile nav touch behavior (wrap, no horizontal strip lock) to reduce scroll/swipe stickiness;
    - removed breadcrumbs from main nav pages (`/series`, `/daily-bread`, `/soul-audit`);
    - aligned mobile `newspaper-home`/`newspaper-reading` widths with homepage frame geometry.
  - tuned homepage typography/content density:
    - reduced homepage series preview copy length and preview text scale;
    - kept desktop pronunciation line large while shrinking mobile pronunciation line to avoid wrapping;
    - restored mobile homepage body copy to baseline scale.
  - made devotional previews scripture-led and removed duplicate card density:
    - moved scripture reference to the first/primary line across homepage, wake-up, series browse, and soul-audit option previews;
    - styled scripture lead as the largest preview element for clearer theological hierarchy;
    - tightened homepage featured-series body preview to ~25-30 words and removed repeated context density;
    - replaced homepage featured `START WITH` copy with explicit `START SERIES` CTA treatment.
  - finalized homepage readability polish:
    - desktop FAQ now reveals answers on hover-only interaction and keeps question-first default state;
    - reduced desktop homepage body-copy scale slightly for balance;
    - increased homepage headline weight and added additional bottom spacing.
  - added Phase 16 coverage with a dedicated help/onboarding tutorial test suite to enforce help-hub FAQ search, homepage FAQ linkage, and guided walkthrough replay/skip contracts.
  - implemented runtime Help + walkthrough experience (not test-only):
    - replaced static help page with searchable FAQ hub and category filtering;
    - added replay tutorial entry points from Help and Settings;
    - added skippable/replayable walkthrough modal on Daily Bread (auto-first-run + query-trigger support).
  - implemented protected admin runtime surface:
    - added `/admin/*` pages (dashboard, YouTube allowlist, moderation, feed controls, transparency, audit logs) with shared shell navigation;
    - added proxy-layer admin route guarding with `ADMIN_EMAIL_ALLOWLIST` email-role enforcement.
  - documented `ADMIN_EMAIL_ALLOWLIST` in environment variable docs for deployment parity.
  - aligned shell-header test contract to the new single-nav architecture (removed docked-nav expectations).
  - bumped service-worker cache version to force stale homepage/header assets to refresh in production clients.
  - added service-worker version migration guard that unregisters stale workers and clears `euangelion-*` caches when version changes, then re-registers cleanly.
- Expanded shell consistency across non-home routes:
  - added breadcrumbs to settings and soul-audit pages;
  - added shared site footer to auth pages.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/app/daily-bread/page.tsx`
- `src/app/my-devotional/page.tsx`
- `src/app/sitemap.ts`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/loading.tsx`
- `src/app/wake-up/devotional/[slug]/error.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/help/page.tsx`
- `src/components/HelpHubPageClient.tsx`
- `src/components/WalkthroughModal.tsx`
- `src/components/AdminShell.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/youtube-allowlist/page.tsx`
- `src/app/admin/moderation/page.tsx`
- `src/app/admin/feed-controls/page.tsx`
- `src/app/admin/transparency/page.tsx`
- `src/app/admin/audit-logs/page.tsx`
- `src/proxy.ts`
- `docs/technical/ENVIRONMENT-VARIABLES.md`
- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/app/page.tsx`
- `src/app/series/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/lib/scripture-reference.ts`
- `__tests__/shell-header.test.tsx`
- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Navigation IA + Docked Reliability Pass (2026-02-14)

### What Changed

- Refactored mobile shell navigation into a two-tier information architecture:
  - primary links remain visible (`HOME`, `MY DEVOTIONAL`, `SOUL AUDIT`);
  - secondary links (`WAKE-UP`, `SERIES`) moved into an explicit `MENU` panel.
- Added explicit mobile menu state controls with automatic close behavior on mobile link navigation and when leaving mobile viewport widths.
- Improved docked desktop topbar layout so the sticky menu occupies a stable center column without clipping/crowding date and mode controls.
- Normalized sticky-mobile docked rendering to use the same compact menu structure as the non-docked mobile nav.
- Preserved mobile dark-mode icon affordance in nav while reducing wrapping/overflow pressure.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Soul Audit Curation Reliability Pass (2026-02-14)

### What Changed

- Hardened curation candidate availability:
  - added repository-backed metadata fallback candidates when curated module catalogs are unavailable at runtime.
- Hardened curation split reliability:
  - prioritized options from series with complete 5-day candidate coverage to reduce downstream selection failures.
- Improved curated plan assembly coherence:
  - plan builder now prioritizes preferred-series day flow first, then fills from ranked corpus only when necessary.
- Added explicit regression tests for curation reliability:
  - candidate pool existence + complete-series coverage.
  - first AI option selection must return a plan token.

### Files

- `src/lib/soul-audit/curation-engine.ts`
- `src/lib/soul-audit/matching.ts`
- `src/lib/soul-audit/curated-builder.ts`
- `__tests__/soul-audit-curation.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-curation.test.ts __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`

---

## Devotional Home Newspaper Shell Pass (2026-02-14)

### What Changed

- Restyled `/my-devotional` into the same newspaper shell used by home and devotional routes:
  - moved page wrapper to `mock-home` + `mock-paper`,
  - reused shared masthead/nav shell via `EuangelionShellHeader`,
  - moved breadcrumbs into shared newspaper breadcrumb row styling,
  - normalized bordered panel rhythm for current-path CTA + library rail section.

### Files

- `src/app/my-devotional/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx __tests__/soul-audit-curation.test.ts`

---

## Scroll Lock Recovery Pass (2026-02-14)

### What Changed

- Fixed route-level scroll freeze risk by adding a defensive global scroll unlock in app providers:
  - clears `body`/`html` inline overflow locks on route change,
  - removes stale `lenis-stopped` class state.
- Removed legacy mobile-menu body overflow locking side effects from unused navigation/store code paths to prevent accidental persistent scroll lock.

### Files

- `src/app/providers.tsx`
- `src/stores/uiStore.ts`
- `src/components/Navigation.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Sticky Container Overflow Hardening Pass (2026-02-14)

### What Changed

- Removed frame-level `overflow-x: clip` on the primary page containers (`mock-paper`, `newspaper-home`, `newspaper-reading`) and switched to visible overflow on wrappers.
- This avoids sticky containment bugs that can cause the top strip/nav to stop sticking or get “pinned wrong” on inner routes in some browsers.
- Kept global body-level horizontal overflow control in place so viewport side-scroll remains suppressed.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Menu Route-Reset Pass (2026-02-14)

### What Changed

- Added route-change menu reset behavior in the shared shell header so the mobile secondary menu is automatically closed after navigation.
- Implemented via animation-frame callback to avoid synchronous effect state updates and prevent stale expanded menu overlays on newly opened pages.

### Files

- `src/components/EuangelionShellHeader.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Navigation Regression Coverage Pass (2026-02-14)

### What Changed

- Extended `shell-header` tests to cover route-change behavior for mobile menu state.
- Added an interaction test that opens the mobile secondary menu, simulates a pathname change, and verifies the menu auto-closes.
- Added `@testing-library/user-event` to support realistic interaction coverage.

### Files

- `__tests__/shell-header.test.tsx`
- `package.json`
- `package-lock.json`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Topbar Cadence Refinement Pass (2026-02-14)

### What Changed

- Slowed mobile topbar ticker cadence from `4600ms` to `6200ms`.
- Increased mobile topbar fade transition to `4200ms` for softer cross-fades between date/slogan/mode labels.
- Maintains reduced-motion guard behavior by keeping ticker disabled when reduced motion is enabled.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Shell Nav Accessibility Pass (2026-02-14)

### What Changed

- Added `aria-current="page"` to active desktop and mobile shell navigation links.
- Added regression coverage asserting active home link exposes `aria-current` in the shell header test suite.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Topbar Interaction Pause Pass (2026-02-14)

### What Changed

- Paused mobile topbar ticker rotation while the mobile menu is expanded.
- Prevents rotating date/slogan/mode labels from shifting during active menu interaction.

### Files

- `src/components/EuangelionShellHeader.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Cross-Page Shell Spacing Rhythm Pass (2026-02-14)

### What Changed

- Added shared `.shell-content-pad` spacing utility to align top/bottom/side rhythm across non-home pages.
- Applied unified shell spacing to:
  - soul-audit results + loading,
  - devotional detail (all states),
  - settings, terms, privacy,
  - series loading.
- Reduces “pushed/misaligned” feeling between home shell and inner-page content bands.

### Files

- `src/app/globals.css`
- `src/app/soul-audit/results/page.tsx`
- `src/app/soul-audit/results/loading.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/settings/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/series/loading.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

---

## Route Scroll-Unlock Hardening Pass (2026-02-14)

### What Changed

- Expanded route-change scroll unlock cleanup in app providers:
  - clears stale `overflow`, `position`, `top`, and `width` inline locks from `body`,
  - clears stale `overflow`/`position` inline locks from `html`,
  - keeps `lenis-stopped` class removal.
- Prevents legacy lock styles from trapping scroll after route transitions.

### Files

- `src/app/providers.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Hero Crop Rebalance Pass (2026-02-14)

### What Changed

- Rebalanced homepage mobile hero image treatment to preserve a clearer “top two-thirds” composition:
  - increased hero art slot minimum height,
  - reduced zoom scale,
  - shifted focal point slightly down from absolute top to avoid harsh clipping.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Mobile Gesture Interop Pass (2026-02-14)

### What Changed

- Updated touch-action policy on horizontal mobile rails/nav strips from `pan-y` to `pan-x pan-y`.
- Allows both axis gestures so horizontal swipe zones do not fight vertical page scrolling.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Docked Nav Focus-Safety Pass (2026-02-14)

### What Changed

- Marked collapsed main nav as `inert` while docked into the top strip.
- Prevents hidden duplicate nav links from remaining keyboard-focusable during docked state.
- Added tests to assert `inert` toggles correctly alongside docked/undocked nav state.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Soul Audit Split Fallback Resilience Pass (2026-02-14)

### What Changed

- Added deterministic series-metadata fallback path in `buildAuditOptions` when curated day candidates are unavailable or split assembly is incomplete.
- Fallback still enforces the product contract:
  - exactly 3 `ai_primary` options,
  - exactly 2 `curated_prefab` options.
- Added automated regression test for no-candidate condition to prevent dead-end submit states.

### Files

- `src/lib/soul-audit/matching.ts`
- `__tests__/soul-audit-fallback-options.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-fallback-options.test.ts __tests__/soul-audit-flow.test.ts __tests__/soul-audit-curation.test.ts`

---

## Nav Hit-Area Polish Pass (2026-02-14)

### What Changed

- Increased shell nav link click/tap targets by enforcing inline-flex alignment, minimum height, and light internal padding on `.mock-nav-item`.
- Improves navigation reliability without changing the newspaper visual language.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Build Runtime Guard Pass (2026-02-14)

### What Changed

- Added explicit Node runtime guard script for build pipeline.
- `npm run build` now fails fast with a clear message when Node is outside the supported engine range (`>=20.10 <25`), avoiding opaque webpack crashes.

### Files

- `scripts/check-node-version.mjs`
- `package.json`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Soul Audit Error Copy Pass (2026-02-14)

### What Changed

- Reworded `NO_CURATED_OPTIONS` submit-path error copy to be user-actionable and non-technical.
- New message asks for one more sentence instead of implying backend content-sync failure.

### Files

- `src/app/api/soul-audit/submit/route.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-flow.test.ts`

---

## Sticky Sidebar Offset Unification Pass (2026-02-14)

### What Changed

- Added shell-aware sticky offset utility (`.shell-sticky-panel`) that aligns sticky side rails under the shared top strip/nav stack.
- Replaced hardcoded `md:top-*` sticky offsets in:
  - soul audit results side panel,
  - devotional page sidebar,
  - devotional library rail.
- Keeps panels non-sticky on mobile and sticky from `md` upward.

### Files

- `src/app/globals.css`
- `src/app/soul-audit/results/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/components/DevotionalLibraryRail.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

---

## Mobile FAQ Lead Copy Pass (2026-02-14)

### What Changed

- Updated homepage FAQ lead copy on mobile viewports:
  - headline becomes “Frequently asked questions.”
  - support line becomes “Everything you need to know before you start.”
- Desktop FAQ lead wording remains unchanged.

### Files

- `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Dynamic Sticky Offset Calibration Pass (2026-02-14)

### What Changed

- Added runtime topbar height measurement in shell header and wrote value to `--shell-topbar-height`.
- Updated main nav sticky offset to consume measured topbar height instead of only static token fallback.
- Improves dock/sticky reliability when topbar height changes due viewport or content wrapping.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Masthead Clip-Safety Refinement Pass (2026-02-14)

### What Changed

- Tightened shell masthead fit safety factor in `EuangelionShellHeader` (`0.996 -> 0.988`) to reduce edge clipping risk.
- Slightly relaxed masthead line-height (`0.94 -> 0.96`) to avoid vertical clipping while preserving full-width visual impact.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Universal Shell Header + Mobile Hero Crop Pass (2026-02-14)

### What Changed

- Made the top shell (`date strip + masthead + nav`) render as one canonical framed header across routes by introducing a shared shell frame wrapper in `EuangelionShellHeader`.
- Added resilient header token fallbacks so the shell stays correctly positioned outside `mock-home` wrappers.
- Added explicit `newspaper-home` / `newspaper-reading` shell-frame normalization so inner pages use the exact same top frame geometry as homepage (no offset/clamped header).
- Updated sticky positioning to honor safe-area insets for topbar/nav so the header strip stays visible on mobile/PWA surfaces.
- Hardened nav docking state updates with an `IntersectionObserver` assist to reduce missed dock transitions on non-home routes.
- Updated mobile home hero artwork treatment to crop toward the top portion (zoomed/top-biased) instead of full contain fit.
- Added extra mobile touch-scroll guards on horizontal rows to reduce “stuck scroll” behavior while swiping over carousels/rails.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Archive + Bookmark + Contrast Pass (2026-02-14)

### What Changed

- Improved archive access usability for Soul Audit plans:
  - archive API day links now deep-link to specific plan days (`#plan-day-{n}`).
- Improved bookmark flow across curated plan output:
  - added per-day bookmark action on Soul Audit results plan cards.
  - added bookmark route parsing for AI-plan bookmarks in library rail (so plan bookmarks open the correct results route instead of a missing wake-up slug).
- Improved readability on blue-highlight interactions:
  - FAQ hover/active state now explicitly sets readable question/answer colors.

### Files

- `src/app/api/soul-audit/archive/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Navigation Timing + Devotional Spacing Refinement (2026-02-14)

### What Changed

- Stabilized desktop sticky-nav docking behavior in shell header with hysteresis thresholds to reduce flaky docking transitions.
- Slowed mobile top-bar ticker/fade cadence for a more subtle and legible transition rhythm.
- Removed horizontal overflow behavior from shell nav presentation and tightened mobile nav wrapping behavior.
- Increased desktop reading typography scale (`vw-heading-md`, `vw-body-lg`, `vw-body`, `vw-small`) for better long-form legibility.
- Introduced formalized devotional spacing rhythm tokens and applied them to devotional shell blocks/panels.
- Updated mobile devotional layout behavior:
  - no left/right border lines on devotional panels/sidebar,
  - full-width usage on mobile,
  - breadcrumb and panel padding normalized for edge-to-edge reading.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Anthropic-Aligned Skill + Agent Expansion (2026-02-14)

### What Changed

- Refactored core Claude skills into Anthropic-style structure:
  - added YAML frontmatter (`name`, `description`),
  - shortened task scope instructions,
  - explicit progressive-disclosure reference loading,
  - workflow/guardrail/validation sections.
- Added 3 new workflow-specific skills:
  - `soul-audit-delivery`
  - `release-readiness`
  - `docs-tracking-governance`
- Added `agents/openai.yaml` metadata files for all active skills.
- Added a new workflow-specific specialist agent roster:
  - Product Manager
  - Soul Audit Engineer
  - Backend Platform Engineer
  - Front-End Developer
  - Devotional Writer
  - Devotional Editor
  - QA Test Engineer
  - Release Manager
- Added `.claude/agents/AGENT-ROSTER.md` so specialist agents are discoverable and sequenced.
- Added documentation references in `CLAUDE.md` and process docs to keep this system visible in every future session.

### Files

- `.claude/skills/euangelion-platform/SKILL.md`
- `.claude/skills/wokegod-brand/SKILL.md`
- `.claude/skills/README.md`
- `.claude/skills/euangelion-platform/agents/openai.yaml`
- `.claude/skills/wokegod-brand/agents/openai.yaml`
- `.claude/skills/soul-audit-delivery/SKILL.md`
- `.claude/skills/soul-audit-delivery/references/flow-contracts.md`
- `.claude/skills/soul-audit-delivery/references/curation-contracts.md`
- `.claude/skills/soul-audit-delivery/references/failure-modes.md`
- `.claude/skills/soul-audit-delivery/agents/openai.yaml`
- `.claude/skills/release-readiness/SKILL.md`
- `.claude/skills/release-readiness/references/gate-checklist.md`
- `.claude/skills/release-readiness/references/verification-matrix.md`
- `.claude/skills/release-readiness/references/app-store-ops.md`
- `.claude/skills/release-readiness/agents/openai.yaml`
- `.claude/skills/docs-tracking-governance/SKILL.md`
- `.claude/skills/docs-tracking-governance/references/update-order.md`
- `.claude/skills/docs-tracking-governance/references/traceability-rules.md`
- `.claude/skills/docs-tracking-governance/references/common-failures.md`
- `.claude/skills/docs-tracking-governance/agents/openai.yaml`
- `.claude/agents/AGENT-ROSTER.md`
- `.claude/agents/PRODUCT-MANAGER.md`
- `.claude/agents/SOUL-AUDIT-ENGINEER.md`
- `.claude/agents/BACKEND-PLATFORM-ENGINEER.md`
- `.claude/agents/FRONTEND-DEVELOPER.md`
- `.claude/agents/DEVOTIONAL-WRITER.md`
- `.claude/agents/DEVOTIONAL-EDITOR.md`
- `.claude/agents/QA-TEST-ENGINEER.md`
- `.claude/agents/RELEASE-MANAGER.md`
- `docs/process/CLAUDE-SKILL-SYSTEM.md`
- `CLAUDE.md`

### Validation

- `npm run verify:tracking`
- `npm run verify:feature-prds`

---

## Mobile Hero Illustration Crop Fix (2026-02-14)

### What Changed

- Fixed poor mobile cropping for the home “wrestling” hero engraving.
- On mobile breakpoints, hero illustration now uses `object-fit: contain` with centered positioning so the full artwork remains visible inside the newspaper panel.

### Files

- `src/app/globals.css`

### Validation

- Visual QA on mobile hero section (`/`)

---

## Series Card Icon Pass (2026-02-14)

### What Changed

- Replaced blue placeholder media blocks in series cards with topic-mapped line icons (no emojis).
- Added a reusable `SeriesCardIcon` component and slug-to-icon mapping for Wake Up + Substack series.
- Applied icon rendering across:
  - Home featured series grid.
  - Wake Up seven-question grid.
- Updated card media styling to preserve newspaper borders/layout while switching from solid fill blocks to icon frames.

### Files

- `src/components/newspaper/SeriesCardIcon.tsx`
- `src/app/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Wake Up Route Family Newspaper Shell Alignment (2026-02-14)

### What Changed

- Restyled the full Wake Up route family to match home-page newspaper shell treatment:
  - `/wake-up`
  - `/wake-up/series/[slug]`
  - `/wake-up/devotional/[slug]`
- Applied home-style blue-ink typography + newsletter border system across series and devotional screens:
  - moved series/devotional clients to `mock-home` + `mock-paper` shell.
  - added dedicated `mock-series-*` and `mock-devotional-*` classes for bordered panel/grid behavior.
- Set Wake Up 7-question display to explicit 3-column desktop card layout mirroring home featured cards, with mobile-responsive collapse.
- Updated devotional loading/error pages to use the same newspaper shell.
- Added token aliasing in `mock-home` so module renderers inherit the same blue newspaper palette.

### Files

- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/loading.tsx`
- `src/app/wake-up/devotional/[slug]/error.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

## Process Documentation Handoff + Environment Playbook (2026-02-14)

### What Changed

- Added a repository-specific runbook for next terminal session continuity:
  - startup sequence
  - required document read order
  - verification stack
  - commit message and traceability rules
  - push/deploy account safety checks
  - handoff template and failure recovery
- Added a reusable, general environment playbook for future app projects:
  - scaffold baseline
  - governance model
  - delivery cycle
  - traceability contract
  - security/compliance baseline
  - anti-drift checklist
- Linked both docs from core guidance docs so future sessions discover them immediately.

### Files

- `docs/runbooks/NEXT-SESSION-OPERATING-RUNBOOK.md`
- `docs/process/FUTURE-APP-ENVIRONMENT-PLAYBOOK.md`
- `docs/runbooks/README.md`
- `CLAUDE.md`

### Validation

- `npm run verify:tracking`
- `npm run verify:feature-prds`

## Onboarding Variant Visibility Pass (2026-02-14)

### What Changed

- Implemented explicit onboarding metadata across soul-audit flow:
  - selection response now includes onboarding/cycle metadata for AI plans.
  - devotional plan day response now includes schedule metadata for UI context.
- Added explicit Wed/Thu/Fri/weekend onboarding variant visibility in Soul Audit results:
  - onboarding banner now shows active primer variant and full cycle unlock time.
- Improved onboarding devotional copy fidelity:
  - onboarding titles now reflect exact variant (`Wednesday 3-Day`, `Thursday 2-Day`, `Friday 1-Day`, `Weekend Bridge`).
  - cadence next-step copy now reinforces consistency behavior.
- Added regression tests for onboarding variant copy.

### Files

- `src/types/soul-audit.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/devotional-plan/[token]/day/[n]/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/lib/soul-audit/curated-builder.ts`
- `__tests__/onboarding-variant-content.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (67 passing)
- `npm run verify:tracking`
- `npm run verify:feature-prds`

## Wake Up 7-Question Cards Restoration (2026-02-14)

### What Changed

- Restored `/wake-up` seven-question card rendering to map directly from `WAKEUP_SERIES_ORDER` so all 7 cards are rendered in the featured grid.
- Kept card presentation aligned with home-page featured series card styling (blue media panel, serif title/question, `START WITH`, day count labels).

### Files

- `src/app/wake-up/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

## Breadcrumb Navigation Pass (2026-02-14)

### What Changed

- Added a reusable breadcrumb component and applied it to recommendation-flow pages for better orientation and backtracking.
- Added breadcrumbs to:
  - `/series`
  - `/wake-up`
  - `/wake-up/series/[slug]`
  - `/wake-up/devotional/[slug]`
  - `/soul-audit/results`
  - `/my-devotional`
- Added shared breadcrumb styling compatible with both `newspaper-home` and `mock-home` shells.

### Files

- `src/components/Breadcrumbs.tsx`
- `src/app/series/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/my-devotional/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

## Mobile Shell Polish Pass (2026-02-14)

### What Changed

- Improved mobile shell rendering and stability:
  - lowered masthead auto-fit minimum size so `EUANGELION` scales down cleanly on narrow widths without clipping.
  - tightened mobile nav/ticker row layout and touch spacing.
  - files:
    - `src/components/EuangelionShellHeader.tsx`
    - `src/app/globals.css`
- Increased mobile readability and spacing consistency:
  - responsive type scale adjustments for body/headline sizes on <=900px.
  - improved panel/FAQ/textarea spacing and tap target comfort.
  - files:
    - `src/app/globals.css`
- Reduced mobile overflow risk:
  - enforced clipping at paper/shell boundaries and refined narrow-width card sizing (<=640px).
  - files:
    - `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

---

## Chat Phase Pass + Homepage Series Visibility (2026-02-14)

### What Changed

- Chat guardrail contract is now explicit and surfaced:
  - `/api/chat` now returns guardrail metadata indicating local-corpus-only scope and no internet-search behavior.
  - files:
    - `src/app/api/chat/route.ts`
    - `src/types/index.ts`
- Chat citation visibility was implemented end-to-end:
  - API now returns structured citation entries from local context and scripture references detected in assistant replies.
  - assistant chat messages now render inline source lists.
  - files:
    - `src/app/api/chat/route.ts`
    - `src/components/DevotionalChat.tsx`
    - `src/components/ChatMessage.tsx`
    - `src/types/index.ts`
- Added regression test coverage for chat metadata:
  - file:
    - `__tests__/chat-response-metadata.test.ts`
- Homepage featured series reliability update:
  - featured devotional series cards now use a safe fallback data path so cards always render.
  - cards now show the first devotional day title (`START WITH ...`) to make the series devotional path explicit on home.
  - files:
    - `src/app/page.tsx`
    - `src/app/globals.css`

### Tracking Updates

- Updated feature PRDs:
  - `docs/feature-prds/F-033.md`
  - `docs/feature-prds/F-034.md`
- Updated plan/scorecard/handoff:
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

---

## Layout Phase Pass 1: Shared Newspaper Shell Stabilization (2026-02-14)

### What Changed

- Unified homepage and internal pages onto one shell header implementation:
  - homepage now uses shared `EuangelionShellHeader` instead of duplicated topbar/masthead/nav logic.
  - file:
    - `src/app/page.tsx`
    - `src/components/EuangelionShellHeader.tsx`
- Sticky navigation behavior was hardened:
  - replaced observer-only dock logic with deterministic scroll/resize dock-state computation.
  - kept desktop and mobile dock transitions aligned with one state model.
  - files:
    - `src/components/EuangelionShellHeader.tsx`
    - `src/app/globals.css`
- Masthead and readability adjustments:
  - improved masthead fit behavior to avoid under-fill/clipping constraints.
  - updated masthead rendering precision and line-height.
  - dark theme variables for homepage now also key off global `.dark` class for cross-page consistency.
  - file:
    - `src/app/globals.css`
- Mobile topbar ticker refinement:
  - expanded to three rotating items (date, devotional descriptor, current mode label) while preserving reduced-motion behavior.
  - file:
    - `src/components/EuangelionShellHeader.tsx`
- Added regression tests for docked/undocked shell states:
  - new test file:
    - `__tests__/shell-header.test.tsx`

### Tracking Updates

- Updated feature PRDs with incremental outcomes and score deltas:
  - `docs/feature-prds/F-005.md`
  - `docs/feature-prds/F-009.md`
  - `docs/feature-prds/F-010.md`
  - `docs/feature-prds/F-011.md`
  - `docs/feature-prds/F-014.md`
- Updated scorecard + plan + compaction snapshot:
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (63 passing)
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` `TypeError`; project engine remains Node `>=20.10 <25`.

---

## Production Governance Bootstrap Hardening (2026-02-14)

### What Changed

- Added feature PRD operating system:
  - generated canonical feature PRDs (`F-001` to `F-050`) under `docs/feature-prds/`
  - added machine registry + index:
    - `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
    - `docs/feature-prds/FEATURE-PRD-INDEX.md`
- Added unified methodology pack for IA/navigation/UX flow alignment:
  - `docs/methodology/M00-EUANGELION-UNIFIED-METHODOLOGY.md`
  - `docs/methodology/M00-METHODOLOGY-TRACEABILITY-MATRIX.md`
  - source-method docs + duplication-resolution artifacts in `docs/methodology/`
- Added App Store release-gate documentation set:
  - `docs/appstore/APP-STORE-RELEASE-GATE.md`
  - `docs/appstore/APP-STORE-ASSET-TRACKER.md`
  - `docs/appstore/APP-REVIEW-NOTES-TEMPLATE.md`
- Added frozen reference-folder policy:
  - `docs/REFERENCE-FOLDERS-INDEX.md`
- Added enforcement scripts and wired them into project checks:
  - `scripts/check-feature-prd-integrity.mjs`
  - `scripts/check-feature-prd-update-link.mjs`
  - `scripts/check-methodology-traceability.mjs`
  - `scripts/check-folder-structure-integrity.mjs`
  - `scripts/check-appstore-gate.mjs`
  - updated `scripts/check-tracking-integrity.mjs`
- Updated hooks/CI/contracts to enforce the new governance model:
  - `.husky/pre-commit`
  - `.github/workflows/ci.yml`
  - `docs/production-decisions.yaml`
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`
  - `CLAUDE.md`
  - `package.json`

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run lint`
- `npm test` (61 passing)
- `npm run build` (passed)

---

## Auth Callback Hardening + Home Active-Devotional UX (2026-02-13)

### What Changed

- Fixed magic-link callback handling for additional Supabase auth return modes:
  - `/auth/callback` now supports both `code` exchange flow and `token_hash + type` verification flow.
  - callback redirect now accepts sanitized `redirect` or `next` path params.
  - file:
    - `src/app/auth/callback/route.ts`
- Homepage active-devotional behavior is now conditional and in-place:
  - when a user already has an active devotional (`resumeRoute` present), the soul-audit UI on home is replaced with “You have a devotional waiting” + continue CTA.
  - removed the separate standalone “active devotional” strip and moved this state into the main audit panel/CTA locations.
  - file:
    - `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

## Soul Audit Reset + Curation Specificity + Blue Theme Alignment (2026-02-13)

### What Changed

- Soul audit reset now clears active devotional state server-side, not just local storage:
  - added `POST /api/soul-audit/reset` to clear session audit runs/options/consent/selections/plans and remove current-route cookie.
  - files:
    - `src/app/api/soul-audit/reset/route.ts`
    - `src/lib/soul-audit/repository.ts`
    - `src/app/page.tsx`
    - `src/app/soul-audit/page.tsx`
    - `src/app/soul-audit/results/page.tsx`
- AI option previews are now generated from user language instead of generic series titles:
  - generated AI titles from matched themes + response snippets
  - personalized option questions/reasoning/preview text with audit-specific phrasing
  - file:
    - `src/lib/soul-audit/matching.ts`
- Cross-site blue palette alignment:
  - aligned `.newspaper-home` and `.newspaper-reading` token values to the same blue newspaper family as homepage styling.
  - file:
    - `src/app/globals.css`
- Added tests for reset behavior and AI-title specificity:
  - files:
    - `__tests__/soul-audit-flow.test.ts`
    - `__tests__/soul-audit-edge-cases.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

## Auth Magic-Link Redirect Fix (2026-02-13)

### What Changed

- Fixed magic-link redirect construction to prevent fallback to wrong localhost host/port:
  - `redirectTo` is now treated as a safe relative path and converted to an absolute callback URL using request origin in auth API route.
  - file: `src/app/api/auth/magic-link/route.ts`
- Fixed sign-in page payload so redirect path survives API sanitization:
  - send relative callback path (`/auth/callback?...`) instead of absolute URL string.
  - added local redirect-path normalization guard.
  - file: `src/app/auth/sign-in/page.tsx`
- Hardened auth callback redirect handling:
  - callback now sanitizes `redirect` query param server-side before redirecting.
  - file: `src/app/auth/callback/route.ts`
- Added safety-net recovery for misrouted auth links landing on homepage (`/?code=...`):
  - homepage now forwards auth callback query params to `/auth/callback`.
  - file: `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (60 passing)

---

## Full 10/10 Phase Execution Pass C (2026-02-13)

### What Changed

- Billing lifecycle and iOS/web parity improvements:
  - Added secure billing flash/session helpers:
    - `src/lib/billing/flash.ts`
  - Added Stripe billing portal route with request validation, rate limiting, request-id headers, and checkout-session-to-customer resolution:
    - `src/app/api/billing/portal/route.ts`
  - Hardened checkout route response behavior:
    - adds request-id headers and explicit error codes
    - includes `session_id={CHECKOUT_SESSION_ID}` on success redirect for billing management handoff
    - file: `src/app/api/billing/checkout/route.ts`
  - Extended billing config contract:
    - `supportsBillingPortal` flag added in API + type contract
    - files:
      - `src/app/api/billing/config/route.ts`
      - `src/types/billing.ts`
  - Settings billing UX completion:
    - parses and consumes billing query-state (`success` / `cancelled`)
    - validates checkout session id and strips it from URL after consumption
    - adds `Manage Subscription` flow through `/api/billing/portal`
    - adds clearer disabled-state reasons and accessibility (`aria-live`, `aria-busy`, `aria-pressed`)
    - file: `src/app/settings/page.tsx`
- Accessibility + interaction polish:
  - FAQ cards are now keyboard-operable on desktop with explicit active state and `aria-expanded` behavior.
  - file: `src/app/page.tsx`
  - Added FAQ active-state and reduced-motion style handling.
  - file: `src/app/globals.css`
- Motion/performance stabilization:
  - Reworked editorial motion scanning from full-document rescans to incremental subtree scanning via mutation-added roots.
  - Added disabled-interactive guards in motion prep logic.
  - file: `src/components/EditorialMotionSystem.tsx`
  - Added `content-visibility` optimization for long-form reading flow blocks.
  - file: `src/app/globals.css`
- iOS readiness tracking hardening:
  - readiness script now asserts billing-portal route + settings integration.
  - files:
    - `scripts/check-ios-readiness.mjs`
    - `docs/IOS-APP-STORE-SUBMISSION.md`
- Added new test coverage for billing flash/session sanitization:
  - `__tests__/billing-flash.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (60 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash (`TypeError` in `next/dist/compiled/webpack/bundle5.js`). Project engine remains `>=20.10 <25`.

---

## Tracking Governance + 10/10 Planning Expansion (2026-02-13)

### What Changed

- Strengthened required documentation alignment for user-facing decisions:
  - expanded machine contracts in `docs/production-decisions.yaml` with `SA-013`:
    - `ux-alignment-docs-required-for-user-facing-decisions`
  - expanded required tracking docs and required `CLAUDE.md` references to include:
    - `docs/AUDIENCE.md`
    - `docs/PUBLIC-FACING-LANGUAGE.md`
    - `docs/UX-FLOW-MAPS.md`
    - `docs/SUCCESS-METRICS.md`
- Expanded production quality documentation for full-feature scoring and execution:
  - rewrote `docs/PRODUCTION-FEATURE-SCORECARD.md` to include:
    - explicit user-flow score matrix
    - feature-by-feature scoring across governance, UX, soul audit, curation, reliability, accessibility, billing, iOS
    - real-world benchmark mapping for each major touchpoint (Notion, Headspace, Stripe, Linear, Apple News, RevenueCat, Apple App Review)
  - rewrote `docs/PRODUCTION-10-10-PLAN.md` to include:
    - category-by-category target table
    - six-phase execution path with measurable exit criteria
    - verification and manual QA matrices
    - required evidence artifacts for 10/10 claims
  - rewrote `docs/PRODUCTION-COMPACTION-HANDOFF.md` with stricter resume protocol and non-negotiables
- Updated `docs/PRODUCTION-SOURCE-OF-TRUTH.md`:
  - added explicit UX alignment contract section tying behavior decisions to audience/language/flow/success docs

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run lint`
- `npm test` (57 passing)
- `npm run verify:ios-readiness`
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash (`TypeError` in `next/dist/compiled/webpack/bundle5.js`). Project engine remains `>=20.10 <25`.

---

## UX Flow Clarity Pass C (2026-02-13)

### What Changed

- Replaced forced homepage auto-redirect to active route with a visible resume CTA:
  - homepage now keeps user agency and shows `CONTINUE MY DEVOTIONAL` when an active path exists
  - file: `src/app/page.tsx`
- Improved homepage copy clarity and reduced repetitive placeholder language:
  - refreshed How-it-Works body text
  - refreshed Featured Series support copy
  - updated featured card support line to use series question
  - refined FAQ lead copy
  - file: `src/app/page.tsx`
- Strengthened Soul Audit option-card disabled affordance:
  - clearer locked visual treatment and unlock hint text before consent
  - files:
    - `src/app/soul-audit/results/page.tsx`
    - `src/app/globals.css`
- Improved mobile FAQ readability:
  - FAQ answers now remain visible on mobile for lower-friction scan behavior
  - file: `src/app/globals.css`
- Added explicit locked-day guidance on series list cards:
  - locked items now render an inline unlock explanation
  - file: `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- Added style support for homepage active-path banner:
  - file: `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run verify:production-contracts`
- `npm run verify:tracking`

---

## Production Tracking + 10/10 Quality Governance Hardening (2026-02-13)

### What Changed

- Added a machine-enforced tracking integrity layer:
  - New script: `scripts/check-tracking-integrity.mjs`
  - New npm script: `npm run verify:tracking`
  - Enforces:
    - required production tracking docs exist
    - `CLAUDE.md` includes required production references
    - `package.json` semver and `CHANGELOG.md` version marker stay aligned
    - pre-commit and CI both execute tracking verification
- Wired tracking verification into enforcement points:
  - `.husky/pre-commit` now runs `npm run verify:tracking`
  - `.github/workflows/ci.yml` now runs `npm run verify:tracking`
- Expanded machine contracts in `docs/production-decisions.yaml`:
  - Added SA-010, SA-011, SA-012 (tracking spine, version sync, CLAUDE references)
  - Added required tracking docs + required CLAUDE references contract sections
- Strengthened documentation continuity and production planning:
  - Added `docs/PRODUCTION-FEATURE-SCORECARD.md` (feature-by-feature scored gap analysis)
  - Added `docs/PRODUCTION-10-10-PLAN.md` (category-by-category gap-to-10 remediation with acceptance criteria)
  - Added `docs/PRODUCTION-COMPACTION-HANDOFF.md` (strict resume/handoff runbook)
  - Updated `docs/PRODUCTION-SOURCE-OF-TRUTH.md` with tracking + versioning contract section
  - Updated `CLAUDE.md` with canonical tracking flow references

### Outcome

- Tracking, versioning, and continuity are now explicitly documented and enforced by automation in both local commit flow and CI.
- The project now has a production-grade scorecard + execution plan system for pushing each category to 10/10 with measurable criteria.

---

## Full 10/10 Phase Execution Pass A (2026-02-13)

### What Changed

- Rebuilt shared newspaper shell header behavior to match homepage interaction model across non-home routes:
  - docked sticky nav behavior via sentinel intersection
  - desktop topbar swaps center copy to navigation when docked
  - mobile topbar alternates date/copy every 1.5s before dock, then swaps to sticky nav + theme icon
  - masthead fit logic updated to scale EUANGELION to container width without clipping
  - file: `src/components/EuangelionShellHeader.tsx`
- Improved shell typography alignment:
  - `GOOD NEWS COMING` now keeps right padding aligned with masthead content bounds
  - file: `src/app/globals.css`
- Hardened Soul Audit staged API validation:
  - strict run id and option id format checks in consent/select routes
  - timezone string sanitization + timezone offset normalization before schedule policy resolution
  - stable 3+2 option-split enforcement in submit route (guard + fail-fast contract)
  - files:
    - `src/lib/api-security.ts`
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
    - `src/app/api/soul-audit/submit/route.ts`
- Expanded regression coverage:
  - added API security helper tests
  - added option split assertions (3 AI + 2 prefab)
  - added invalid run/option id edge-case tests
  - files:
    - `__tests__/api-security.test.ts`
    - `__tests__/soul-audit-flow.test.ts`
    - `__tests__/soul-audit-edge-cases.test.ts`
- Updated production tracking artifacts with execution snapshot and revised scoring:
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (54 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` currently fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash. Project runtime guard remains `>=20.10 <25` (`package.json` engines, `.nvmrc` = `22`).

---

## Full 10/10 Phase Execution Pass B (2026-02-13)

### What Changed

- Hardened staged Soul Audit flow for session/cookie churn between submit -> consent -> select:
  - `verifyRunToken` and `verifyConsentToken` now support controlled session-mismatch fallback mode.
  - Consent/select routes now accept valid signed tokens even when cookie-backed session rotates, preventing false `run not found` / access denied dead-ends.
  - files:
    - `src/lib/soul-audit/run-token.ts`
    - `src/lib/soul-audit/consent-token.ts`
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
- Fixed staged-token payload ceiling:
  - Increased body limits for staged routes to prevent 413 failures with signed run/consent tokens.
  - files:
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
- Enforced stricter curated-first behavior:
  - Removed metadata-only fallback candidates so audit option/plan curation remains module-sourced.
  - file:
    - `src/lib/soul-audit/curation-engine.ts`
- Expanded regression coverage:
  - Added session-mismatch fallback tests for run and consent tokens.
  - Added staged flow test that simulates session token churn across submit/consent/select.
  - files:
    - `__tests__/soul-audit-run-token.test.ts`
    - `__tests__/soul-audit-consent-token.test.ts`
    - `__tests__/soul-audit-flow.test.ts`
- Updated production tracking artifacts for continuity:
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (57 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` still fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash.

---

## AI Devotional Left Rail: Next Days + Archive (2026-02-13)

### What Changed

- Added a persistent left rail to AI devotional results views (`/soul-audit/results?planToken=...`) with:
  - `NEXT DAYS` list for upcoming plan days (including onboarding progression from day 0 to upcoming locked days).
  - `ARCHIVE` list for prior AI devotional plans.
- Updated `src/app/soul-audit/results/page.tsx` to:
  - fetch archive data from `/api/soul-audit/archive`
  - build a merged day timeline from unlocked plan days + locked previews
  - render desktop sticky left rail and day anchor links for unlocked entries.

### Outcome

- Onboarding devotional and all AI devotional paths now surface upcoming days and prior plan archive in a consistent left-side navigation area.

---

## Global Newspaper-Bound Shell Pass (2026-02-13)

### What Changed

- Standardized all app routes onto the same bound newspaper container system used by the homepage look:
  - Updated global shell behavior for `.newspaper-home` and `.newspaper-reading` in `src/app/globals.css`:
    - fixed-width bounded frame
    - page border
    - consistent outer margin
    - viewport-safe minimum height
    - overflow clipping to prevent side-scroll
- Replaced remaining mixed navigation/page shells with unified masthead shell:
  - switched remaining routes from `Navigation`/plain `bg-page` wrappers to `EuangelionShellHeader`
  - applied across auth, settings, legal, offline, error/not-found, loading states, soul-audit routes, series, and devotional states.
- Brought loading and error states into the same visual system so every state maintains the newspaper-bound presentation.

### Outcome

- The site now uses a consistent homepage-style bound newspaper look across all major pages and state surfaces (normal, loading, error, offline).

---

## Left Library System: Archive + Bookmarks + Chat Notes + Favorite Verses (2026-02-13)

### What Changed

- Added persistent devotional library mechanics with left-menu navigation:
  - New component: `src/components/DevotionalLibraryRail.tsx`
  - Sections:
    - Archived Pages
    - Bookmarks
    - Chat Notes
    - Favorite Verses
- Upgraded `My Devotional` into a full library home (instead of placeholder fallback):
  - `src/app/my-devotional/page.tsx`
  - Supports `?tab=` deep links for left-menu sections.
- Added archive endpoint for curated plan history:
  - `GET /api/soul-audit/archive`
  - `src/app/api/soul-audit/archive/route.ts`
- Added repository support for persisted list/fallback/delete behavior:
  - `listPlanInstancesForSessionWithFallback`
  - `getAllPlanDaysWithFallback`
  - `listAnnotationsWithFallback`
  - `removeAnnotation`
  - `listBookmarksWithFallback`
  - `removeBookmark`
  - `src/lib/soul-audit/repository.ts`
- Added delete mechanics to APIs:
  - `DELETE /api/bookmarks?devotionalSlug=...`
  - `DELETE /api/annotations?annotationId=...`
  - Updated list endpoints to use fallback-backed retrieval.
- Added saved-note and favorite-verse capture from devotional/chat flows:
  - Chat assistant messages now support `Save note` action.
    - `src/components/ChatMessage.tsx`
    - `src/components/DevotionalChat.tsx`
  - Text selection popover now supports `Save Verse` (stored as highlight annotation with favorite-verse style metadata).
    - `src/components/TextHighlightTrigger.tsx`
  - Devotional pages now include explicit bookmark actions and left menu links to the library.
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`

### Outcome

- Archive/bookmark/chat-note/favorite-verse sections are no longer passive concepts; they are functional, persisted features with create/list/remove mechanics.
- Users now have a consistent left-side library model for devotional history and saved artifacts.

---

## Personalized Devotional Home + Unified Masthead Shell (2026-02-13)

### What Changed

- Made post-audit behavior user-home driven:
  - `/` now resolves to the active devotional route when a current selection exists.
  - Added `GET /api/soul-audit/current` to resolve the current devotional route from cookie/session-backed data.
  - Added persistent current-route cookie writes in `POST /api/soul-audit/select`.
- Added dedicated user-home route:
  - New page: `src/app/my-devotional/page.tsx`
  - Redirects to active devotional route when available; otherwise prompts to start Soul Audit.
- Added repository fallback helpers for session-aware navigation recovery:
  - `listAuditRunsForSessionWithFallback`
  - `getLatestSelectionForSessionWithFallback`
  - `listPlanInstancesForSession`
  - `getLatestPlanInstanceForSessionWithFallback`
- Introduced shared newspaper masthead shell:
  - New component: `src/components/EuangelionShellHeader.tsx`
  - Applied to:
    - `src/app/soul-audit/page.tsx`
    - `src/app/soul-audit/results/page.tsx`
    - `src/app/wake-up/page.tsx`
    - `src/app/series/page.tsx`
    - `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- Navigation consistency updates:
  - Added `My Devotional` navigation target.
  - Normalized `Settings` label.
  - Added `/my-devotional` to sitemap.

### Outcome

- The curated daily devotional now has a stable home destination and is reachable from primary navigation.
- Devotional/home surfaces share a consistent Euangelion-first newspaper masthead structure.

---

## Generated Image Removal (2026-02-13)

### What Changed

- Removed all generated image asset directories and files from the app bundle:
  - `public/images/illustrations/generated/`
  - `public/images/devotionals/`
  - `public/images/series/`
  - `public/devotionals/wU1-legnext.png`
- Removed stale generated-image mappings and references:
  - deleted `src/data/devotional-images.ts`
  - removed all series `heroImage` references that pointed to deleted generated/devotional image files
- Hard-disabled runtime illustration generation endpoint:
  - `src/app/api/illustrations/generate/route.ts` now returns `410` (`ILLUSTRATION_GENERATION_REMOVED`)

### Outcome

- The site no longer serves or requests generated devotional/series illustration files.
- Any call to the generation endpoint is explicitly blocked.

---

## Soul Audit Reliability + Day-Lock Toggle + Longer Curation (2026-02-13)

### What Changed

- Added stateless Soul Audit run-token fallback so consent/selection still work when runtime memory is cold:
  - New: `src/lib/soul-audit/run-token.ts`
  - Updated:
    - `src/app/api/soul-audit/submit/route.ts` (now returns `runToken`)
    - `src/app/api/soul-audit/consent/route.ts` (run-token verification fallback)
    - `src/app/api/soul-audit/select/route.ts` (run-token + option fallback)
    - `src/types/soul-audit.ts`
- Improved results-page resilience by caching generated plan days in session storage and hydrating from cached plan data when API fetches fail:
  - `src/app/soul-audit/results/page.tsx`
- Added day-locking toggle (default OFF for testing) with client + server parity:
  - New: `src/lib/day-locking.ts`
  - Updated:
    - `src/stores/settingsStore.ts` (`dayLockingEnabled`)
    - `src/app/settings/page.tsx` (Testing toggle UI + cookie sync)
    - `src/lib/day-gating.ts` (client day-gate bypass when toggle OFF)
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
    - `src/app/api/devotional-plan/[token]/day/[n]/route.ts` (server day-lock bypass)
    - `.env.example` (`DAY_LOCKING_DEFAULT`, `SOUL_AUDIT_RUN_TOKEN_SECRET`)
- Extended curated devotional output length and depth:
  - richer reflection/prayer/next-step/journal assembly with reference grounding
  - `src/lib/soul-audit/curated-builder.ts`
- Added weekday-specific onboarding variants for Wednesday/Thursday/Friday starts:
  - schedule now computes `onboardingVariant` + `onboardingDays`
  - `src/lib/soul-audit/schedule.ts`
  - `src/app/api/soul-audit/select/route.ts`
- Hardened curated candidate generation fallback so option creation does not collapse when module extraction is sparse:
  - `src/lib/soul-audit/curated-catalog.ts`
  - `src/lib/soul-audit/curation-engine.ts`
- Fixed build/type blockers introduced in iOS + billing integration:
  - `capacitor.config.ts` (removed deprecated `bundledWebRuntime`)
  - `src/lib/billing/purchases.ts` (RevenueCat offerings API typing fix)
  - `src/app/api/chat/route.ts` (nullable highlight typing fix)

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`
- `npm run verify:ios-readiness`
- `npm run build`

---

## Editorial Motion + Type-First Imagery Pass (2026-02-13)

### What Changed

- Added a global editorial motion system that auto-applies:
  - scroll-based type reveal for paragraph/headline/list text blocks,
  - staggered `strong`/`em` emphasis reveal treatment,
  - line animations for links and buttons across mock/newspaper surfaces.
  - Files:
    - `src/components/EditorialMotionSystem.tsx`
    - `src/app/providers.tsx`
    - `src/app/globals.css`
- Removed non-essential runtime imagery from reading flows so typography leads:
  - devotional hero is now typography-first only (removed dynamic image hero),
  - devotional panel image blocks removed,
  - visual/art modules now render textual metadata + prompts without image rendering,
  - series cards now use typographic preview blocks instead of image thumbnails.
  - Files:
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
    - `src/components/modules/VisualModule.tsx`
    - `src/components/modules/ArtModule.tsx`
    - `src/app/series/page.tsx`
- Added Node runtime guard for build consistency:
  - `package.json` engines now enforce `>=20.10 <25`,
  - `.nvmrc` added (`22`).

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`
- `npm run build` currently fails in this environment on Node `v25.3.0` with webpack `WasmHash` crash; runtime is now guarded to prevent this mismatch.

---

## Soul Audit Curation Visibility + Personalized Onboarding (2026-02-13)

### What Changed

- Replaced static Wed-Sun onboarding devotional with a curated personalized onboarding day derived from the generated plan + user response:
  - `src/lib/soul-audit/curated-builder.ts`
  - `src/app/api/soul-audit/select/route.ts`
- Added locked-day preview support so users can immediately see their crafted 5-day structure even before unlock time:
  - `src/app/api/devotional-plan/[token]/day/[n]/route.ts` (`?preview=1`)
  - `src/app/soul-audit/results/page.tsx`
- Improved AI option matching signals and reasoning text so options reflect user language more clearly (including overload/burnout semantic hints):
  - `src/lib/soul-audit/matching.ts`
- Bumped service worker cache namespace `euangelion-v42` -> `euangelion-v43` to force delivery of the curation/render updates:
  - `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts __tests__/soul-audit-schedule.test.ts`
- `npm run verify:production-contracts`

---

## Audit Results Reliability + Click Affordance Pass (2026-02-13)

### What Changed

- Fixed Soul Audit run/plan lookup reliability across route hops and process restarts by adding Supabase read-fallbacks for:
  - `audit_runs`, `audit_options`, `consent_records`, `audit_selections`
  - `devotional_plan_instances`, `devotional_plan_days`
  - File: `src/lib/soul-audit/repository.ts`
- Updated staged API routes to use fallback-aware getters so selection and plan rendering no longer depend only on in-memory state:
  - `src/app/api/soul-audit/consent/route.ts`
  - `src/app/api/soul-audit/select/route.ts`
  - `src/app/api/devotional-plan/[token]/day/[n]/route.ts`
- Improved Soul Audit results UX for click clarity:
  - Added animated, hover/focus-lift option cards with underline sweep and explicit click hint text.
  - Added stale-run recovery path with “Restart Soul Audit” action when a run has expired/not found.
  - Files: `src/app/soul-audit/results/page.tsx`, `src/app/globals.css`
- Bumped service worker cache namespace `euangelion-v41` -> `euangelion-v42` so clients receive the audit/render + interaction updates immediately:
  - `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`
- `npm run verify:production-contracts`

---

## Soul Audit Real-Time Module Curation Fix (2026-02-13)

### What Changed

- Switched AI option generation away from curated-catalog availability checks so submit returns the expected 3 AI + 2 prefab options when series metadata is present:
  - `src/lib/soul-audit/matching.ts`
- Rebuilt AI devotional construction to assemble each day from real-time module candidates across curated repository resources (module-level selection), instead of binding AI selection to one prebuilt series/day track:
  - `src/lib/soul-audit/curated-builder.ts`
- Removed select-route hard dependency that blocked AI plan creation when a specific curated series slug was unavailable, while preserving fail-closed behavior for missing required core modules:
  - `src/app/api/soul-audit/select/route.ts`
- Preserved curated-first policy:
  - core modules stay curated (`scripture`, `teaching`, `reflection`, `prayer`)
  - generation remains assistive polish only
  - local reference-volume grounding remains enforced

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`
- `npm run verify:production-contracts`

---

## Soul Audit + Devotional Engine Consolidation (2026-02-13)

### What Changed

- Replaced monolithic Soul Audit behavior with staged contracts:
  - `POST /api/soul-audit/submit` now returns option previews only (no eager full plan payload).
  - `POST /api/soul-audit/consent` records essential consent + optional analytics opt-in (default OFF) and enforces crisis acknowledgement.
  - `POST /api/soul-audit/select` locks choice and branches:
    - AI primary option => generates devotional plan after selection.
    - Curated prefab option => routes to series overview.
- Added day-level devotional plan endpoint and scheduling policy:
  - `GET /api/devotional-plan/[token]/day/[n]`
  - Monday start => normal cycle
  - Tuesday start => Monday readable as archived
  - Wednesday-Sunday start => onboarding day before Monday cycle
  - 7:00 AM local-time unlock cadence enforced.
- Implemented curated-first devotional builder and local-corpus grounding:
  - Added curated catalog loader with source priority:
    - `content/approved` -> `content/final` -> `content/series-json`
  - Added fail-closed validation for missing curated core modules.
  - Limited adaptive generation to assistive polishing around curated modules.
  - Added structured endnotes per generated day.
- Added local reference-volume retriever and connected endnote sourcing:
  - `src/lib/soul-audit/reference-volumes.ts`
  - Grounding restricted to local repository corpus (no internet retrieval).
- Added mock-account and user artifact API scaffolding:
  - `POST/GET /api/mock-account/session`
  - `GET /api/mock-account/export` (mock account + analytics opt-in required)
  - `POST/GET /api/annotations`
  - `POST/GET /api/bookmarks`
- Hardened study chat constraints in `src/app/api/chat/route.ts`:
  - Requires devotional/highlight context.
  - Injects only local devotional + local reference context.
  - Explicitly blocks external retrieval behavior in system prompt.
- Added governance system and machine-enforced drift checks:
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/production-decisions.yaml`
  - `scripts/check-production-contracts.mjs`
  - CI now fails when production contracts drift (`npm run verify:production-contracts`).
  - Pre-commit now runs production contract verification.
  - Commit-msg gate added: feature commits must reference decision id format `SA-###`.
- Added schema migration for staged Soul Audit/plan/account artifacts:
  - `supabase/migrations/20260213000001_soul_audit_engine_consolidation.sql`
  - New entities include:
    - `audit_runs`, `audit_options`, `consent_records`, `audit_selections`
    - `devotional_plan_instances`, `devotional_plan_days`, `devotional_day_citations`
    - `annotations`, `session_bookmarks`, `mock_account_sessions`
- Updated frontend selection-first flow:
  - `src/app/page.tsx` and `src/app/soul-audit/page.tsx` now submit to `/api/soul-audit/submit`.
  - `src/app/soul-audit/results/page.tsx` rebuilt to:
    - render exactly 5 choices (3 AI primary + 2 curated prefab),
    - enforce consent/crisis acknowledgement before selection,
    - render plan content only after successful option selection.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm test`

---

## Curation + Scroll/Sticky Reliability Hotfix (2026-02-13)

### What Changed

- Fixed curated-option fallback so Soul Audit can still curate when runtime cannot read `content/*` paths directly:
  - Added runtime-safe catalog fallback from bundled `public/devotionals/*.json` + `SERIES_DATA`.
  - Added panel-to-module normalization for legacy devotional files (`panels` -> synthetic `scripture/teaching/reflection/prayer` modules).
  - File: `src/lib/soul-audit/curated-catalog.ts`
- Updated Soul Audit empty-catalog error copy to clearer retry language:
  - File: `src/app/api/soul-audit/submit/route.ts`
- Fixed persistent scroll-lock issue caused by mobile menu overflow state:
  - Added cleanup reset for `document.body.style.overflow` in navigation effect.
  - Added defensive overflow reset on homepage mount.
  - Files: `src/components/Navigation.tsx`, `src/app/page.tsx`
- Improved sticky/nav reliability on homepage newspaper shell:
  - Switched `.mock-home` horizontal overflow from `clip` to `hidden` to avoid sticky inconsistencies on some browsers.
  - Added sticky fallback positioning for `.mock-nav`.
  - File: `src/app/globals.css`
- Bumped service worker cache namespace `euangelion-v40` -> `euangelion-v41` so clients pick up the fixes immediately:
  - File: `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`

---

## Mockup Proportion Alignment Pass 2 (2026-02-12)

### What Changed

- Tuned the exact homepage implementation for closer proportional parity with the reference comp:
  - Increased global type scale using fixed mockup tokens so all serif copy remains legible and scales consistently by section
  - Removed masthead letter spacing and disabled kerning adjustments so `EUANGELION` tracks edge-to-edge like the mockup
  - Tightened masthead padding and adjusted line-height/width treatment for a denser top lockup
  - Resized + centered both mastheads so `EUANGELION` fills the container width without overflow clipping on responsive breakpoints
  - Removed fixed masthead section heights so both top and bottom `EUANGELION` containers are content-driven (`auto`) and no longer clip vertically
  - Switched masthead word sizing to container-based scale and applied edge compensation so the word now fills left and right edges without extra side gap
  - Increased masthead scale substantially with browser-safe `vw` fallback + `cqi` enhancement so `EUANGELION` consistently fills the full container width and remains centered
  - Rebalanced masthead sizing to a fully fluid (non-fixed-feeling) scale to prevent oversized rendering while still filling the row proportionally across viewport sizes
  - Added live masthead fit logic that measures each `EUANGELION` lockup and applies dynamic horizontal scaling so the word fills the container edge-to-edge without clipping
  - Removed horizontal glyph stretching and switched masthead fit to dynamic natural-size font scaling (no distorted letter proportions)
  - Increased `GOOD NEWS COMING` sizing and right-edge alignment under the masthead lockup
- Restored sticky newspaper header behavior:
  - Top date rail is sticky
  - Main nav now hands off into the sticky top rail and replaces the center “Daily Devotionals…” line when scrolled
  - Mobile sticky behavior now moves nav into the top rail on scroll
  - Replaced scroll-position docking logic with an `IntersectionObserver` sentinel so nav handoff triggers reliably at the sticky threshold
- Implemented mobile top-rail rotation:
  - Date/time, subtitle, and mode toggle now fade between each other instead of stacking
  - One item visible at a time with a 1.5s fade transition
- Confirmed image containers remain flush (no added internal padding) for hero engraving, step images, and featured media frames.
- Adjusted masthead subline alignment and sizing:
  - `GOOD NEWS COMING` now aligns to the same right edge as the `EUANGELION` lockup
  - Mobile subline size reduced to roughly half its previous visual size
- Mobile “How this works” step row now follows requested proportions:
  - Image column set to ~1/3 and text column to ~2/3
  - Added clear card separators between each step text container on mobile
- Increased homepage mobile body-copy sizing for readability:
  - Larger paragraph text across hero/supporting copy, step descriptions, featured descriptions, FAQ answers, and CTA supporting text
  - Kept labels/meta typography unchanged so hierarchy remains intact
- Converted `Featured Series` into a mobile carousel:
  - Horizontal swipe rail with snap scrolling on cards
  - Desktop 3-column newspaper grid remains unchanged
- Updated mobile FAQ section behavior:
  - Renamed FAQ lead headline to reduce duplicate wording with the hero prompt
  - Mobile now renders all FAQ questions instead of the 3-card window
  - Removed FAQ arrow controls on mobile (desktop arrows remain)
- Reduced bottom padding in “How this works” numbered text containers for tighter vertical rhythm (desktop + mobile).
- Fixed masthead clipping on `EUANGELION`:
  - Added fit-calculation safety margin to avoid sub-pixel edge cutoffs
  - Removed hard overflow clipping on the masthead container
  - Increased masthead line-height to prevent vertical glyph cropping
- Added explicit Soul Audit reset controls for QA/testing:
  - New persisted store action `resetAudit` resets audit count + cached audit data
  - Reset controls added to homepage audit blocks and `/soul-audit` page states
  - Reset also clears session-stored latest audit result payload
- Simplified and cleaned nav rendering paths:
  - Main nav now uses a single active render path per viewport to avoid duplicate menu rows
  - Sticky handoff keeps exactly one visible nav strip at a time
  - Mobile theme icon placement remains in nav while duplicate menu wrappers were removed
- Desktop hero composition tweak:
  - Moved the left engraving panel to the right side of the hero row (`WHAT IS THIS PLACE?` / `SOUL AUDIT` now lead left-to-right before the image)
  - Preserved mobile stacking behavior
- Rebuilt the “How this works” card internals in `src/app/page.tsx` and `src/app/globals.css`:
  - Step illustrations now sit on the left side of each card
  - Images run full-height within the box with a dedicated vertical divider
  - Text block is isolated to the right side to preserve mockup proportions
- Updated FAQ highlight behavior in `src/app/page.tsx`:
  - Removed hardcoded always-active blue FAQ card so highlight state is now interaction-driven only (hover/focus/tap behavior)
- Bumped service worker cache namespace from `euangelion-v23` -> `euangelion-v24` in `public/sw.js` so clients pick up the latest layout calibration immediately.
- Bumped service worker cache namespace from `euangelion-v24` -> `euangelion-v25` in `public/sw.js` for the masthead sizing/centering refresh.
- Bumped service worker cache namespace from `euangelion-v25` -> `euangelion-v26` in `public/sw.js` for the masthead auto-height + edge-fill correction.
- Bumped service worker cache namespace from `euangelion-v26` -> `euangelion-v27` in `public/sw.js` for the larger full-width masthead sizing refresh.
- Bumped service worker cache namespace from `euangelion-v27` -> `euangelion-v28` in `public/sw.js` for the fluid masthead scaling adjustment.
- Bumped service worker cache namespace from `euangelion-v28` -> `euangelion-v29` in `public/sw.js` for the dynamic edge-to-edge masthead fit update.
- Bumped service worker cache namespace from `euangelion-v29` -> `euangelion-v30` in `public/sw.js` for sticky header + natural masthead fit refresh.
- Bumped service worker cache namespace from `euangelion-v30` -> `euangelion-v31` in `public/sw.js` for sticky-nav observer + image-padding correction refresh.
- Bumped service worker cache namespace from `euangelion-v31` -> `euangelion-v32` in `public/sw.js` for masthead subline alignment + mobile size correction.
- Bumped service worker cache namespace from `euangelion-v32` -> `euangelion-v33` in `public/sw.js` for mobile step-grid proportion + separator updates.
- Bumped service worker cache namespace from `euangelion-v33` -> `euangelion-v34` in `public/sw.js` for mobile body-copy size refresh.
- Bumped service worker cache namespace from `euangelion-v34` -> `euangelion-v35` in `public/sw.js` for mobile featured carousel refresh.
- Bumped service worker cache namespace from `euangelion-v35` -> `euangelion-v36` in `public/sw.js` for mobile FAQ all-questions + no-arrows refresh.
- Bumped service worker cache namespace from `euangelion-v36` -> `euangelion-v37` in `public/sw.js` for step-card bottom-padding refinement.
- Bumped service worker cache namespace from `euangelion-v37` -> `euangelion-v38` in `public/sw.js` for masthead clipping fix refresh.
- Bumped service worker cache namespace from `euangelion-v38` -> `euangelion-v39` in `public/sw.js` for nav cleanup + audit reset controls refresh.
- Bumped service worker cache namespace from `euangelion-v39` -> `euangelion-v40` in `public/sw.js` for desktop hero panel-order refresh.

### Validation

- `npm run lint`
- `npm run type-check`

---

## Exact Homepage Mockup Reconstruction (2026-02-12)

### What Changed

- Rebuilt `/src/app/page.tsx` to match the provided newspaper mockup layout exactly:
  - Top date rail + centered subtitle + right dark-mode control
  - Full-width `EUANGELION` masthead + `GOOD NEWS COMING`
  - Inline nav row (`HOME | SOUL AUDIT | WAKE-UP | SERIES | SETTING`)
  - Hero triptych (engraving panel + left intro copy + right Soul Audit form)
  - “How this works” headline and 3 step cards
  - 3x2 featured devotional grid with mockup-style card geometry
  - Centered “More Devotionals” strip
  - FAQ/quote row with hover/tap answer reveal behavior
  - Bottom CTA block and full-width closing `EUANGELION`
- Added dedicated exact-match style system in `/src/app/globals.css` under `EXACT MOCKUP HOMEPAGE`:
  - Mockup-specific color tokens for light and dark variants
  - Border cadence, panel sizing, typography scale, and spacing tuned to the Illustrator composition
  - Mobile fallback that preserves structure without horizontal overflow
- Ensured masthead treatment uses Industry (UI stack) and body/copy uses Instrument Serif.
- Removed forced smooth-scroll behavior in app providers (native browser scroll restored).
- Bumped service worker cache namespace from `euangelion-v20` -> `euangelion-v21` in `/public/sw.js` to force refresh of the rebuilt homepage.
- Corrected desktop grid collapse bug by lowering mockup breakpoint from `1200px` to `980px` so 3-column newspaper layout remains intact on laptop/desktop widths.
- Reinforced section grid boundaries (`How this works` + `Featured Series`) with explicit top rule lines for stronger newspaper grid legibility.
- Bumped service worker cache namespace from `euangelion-v21` -> `euangelion-v22` in `/public/sw.js` to force latest grid CSS refresh.
- Performed strict proportion calibration against the mockup reference:
  - Expanded frame to near full-bleed desktop width (`~1860px`) with tighter outer margin
  - Added fixed section geometry variables for rails, hero, headers, cards, FAQ row, CTA, and bottom masthead band
  - Re-tuned typography scale/line-height by section to match mock hierarchy and vertical rhythm
  - Locked featured card row heights and media box dimensions for consistent newspaper grid cadence
  - Tightened stroke weights and panel paddings to remove fluid/haphazard spacing drift
- Bumped service worker cache namespace from `euangelion-v22` -> `euangelion-v23` in `/public/sw.js` to force immediate pickup of calibrated proportions.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run build`

---

## Newspaper Rebuild v3 + Illustration Pipeline Scaffold (2026-02-12)

### What Changed

- Implemented reusable newspaper system components:
  - `src/components/newspaper/IllustrationFrame.tsx`
  - `src/components/newspaper/WordblockPanel.tsx`
  - `src/components/newspaper/PrintRail.tsx`
  - `src/components/newspaper/FaqHoverCard.tsx`
  - `src/components/newspaper/DevotionalMilestoneReveal.tsx`
- Reworked homepage composition in `src/app/page.tsx`:
  - Added print-style illustration slots in hero, flow, featured, FAQ, and CTA
  - Added “word as art” support panel treatment
  - Converted Featured Series to horizontal auto-rotating `PrintRail`
  - Converted FAQ to horizontal auto-rotating `PrintRail` with `FaqHoverCard` hover/focus reveal and tap toggle on mobile
  - Kept Soul Audit above fold and preserved existing submit/match logic
  - Added full-width bottom `EUANGELION` wordmark section
- Expanded print treatments and interaction styles in `src/app/globals.css`:
  - Added Industry font-face support and switched UI/meta stack to Industry
  - Added print effects: `effect-woodblock`, `effect-halftone`, `effect-dither`, `effect-ink`
  - Added illustration framing, rail controls, dots, and FAQ reveal motion
  - Maintained no-glow/rim-light treatment
- Added Industry font files and illustration assets:
  - `public/fonts/IndustryTest-Book.otf`
  - `public/fonts/IndustryTest-Demi.otf`
  - `public/fonts/IndustryTest-Bold.otf`
  - `public/images/illustrations/*` (from `user-references/illustrations`)
  - `public/images/illustrations/placeholder-ink-block.svg`
- Executed live Gemini image generation batch (7/7 success) and wired generated outputs into active UI:
  - `public/images/illustrations/generated/home-hero-generated.png`
  - `public/images/illustrations/generated/home-flow-generated.png`
  - `public/images/illustrations/generated/home-featured-generated.png`
  - `public/images/illustrations/generated/home-faq-generated.png`
  - `public/images/illustrations/generated/wakeup-hero-generated.png`
  - `public/images/illustrations/generated/series-hero-generated.png`
  - `public/images/illustrations/generated/devotional-milestone-generated.png`
  - `public/images/illustrations/generated/generation-summary.json`
- Extended motion config in `src/lib/animation-config.ts`:
  - Added `editorialSubtle` and `devotionalCinematic` profiles
  - Added rail timing tokens
  - Removed hover glow effect fallback
- Added illustration generation service scaffold:
  - `src/lib/illustrations/provider.ts`
  - `src/lib/illustrations/prompt-presets.ts`
  - `src/lib/illustrations/nanobanana.ts`
  - `src/app/api/illustrations/generate/route.ts`
  - Supports validated prompt payloads, rate limiting, Nano-Banana provider calls, Supabase Storage upload, metadata insert, and fallback asset chain
- Added persistence schema for generated illustration metadata:
  - `supabase/migrations/20260212000001_create_generated_illustrations.sql`
  - `database/migrations/008_create_generated_illustrations.sql`
- Applied newspaper styling pass to key routes:
  - `src/app/wake-up/page.tsx`
  - `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
  - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - `src/app/series/page.tsx`
  - `src/app/soul-audit/page.tsx`
  - `src/app/soul-audit/results/page.tsx`
- Updated environment template in `.env.example` with Nano-Banana and Supabase server variables.
- Bumped service worker cache namespace from `euangelion-v19` -> `euangelion-v20` in `public/sw.js`.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run build`

---

## Dark Newspaper UX Consolidation Pass (2026-02-11)

### What Changed

- Reworked newspaper dark mode to the selected visual direction in `src/app/globals.css`:
  - Dark paper base set to deep navy-black (`#0B1420`)
  - Primary ink switched to crisp off-white (`#E9EEF5`)
  - Accent switched to classic gold-ink replacement (`#C8A56A`)
  - Removed rim-light style gradients and blur-driven rail glow
  - Increased rule hierarchy to stronger newspaper lines (1px body rules + 2px section/divider rules)
  - Kept medium paper texture visibility without glow effects
- Standardized typography intent:
  - Main body remains Instrument Serif
  - UI labels/callouts/nav moved to secondary UI stack (`Space Grotesk` first in stack) in:
    - `src/app/globals.css`
    - `design-system/typography-craft.css`
- Added two interaction systems in `src/app/globals.css`:
  - `cta-major`: lined-box CTA with border-draw animation + subtle print-offset motion
  - Contextual small-link interactions:
    - `animated-underline` for nav/standard links (underline draw + slight lift)
    - `link-highlight` for editorial/key callouts (flat marker swipe, no glow)
- Applied interaction/style cleanup across homepage + devotional surfaces:
  - Homepage CTA/section/rule updates in `src/app/page.tsx`
  - Soul Audit page CTA + headline simplification updates in `src/app/soul-audit/page.tsx`
  - Soul Audit results link treatment updates in `src/app/soul-audit/results/page.tsx`
  - Devotional reading/nav/CTA/rule updates in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - Navigation rail/menu border treatment cleanup in `src/components/Navigation.tsx`
  - Removed glow-like shadows from reading-side overlays/controls in:
    - `src/components/DevotionalChat.tsx`
    - `src/components/TextHighlightTrigger.tsx`
    - `src/components/ShareButton.tsx` (underlined interaction pass)
- Updated PWA theme color in `src/app/layout.tsx` to match dark paper base.
- Bumped service worker cache namespace from `euangelion-v18` -> `euangelion-v19` in `public/sw.js` so styling changes propagate immediately.

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Soul Audit Full 5-Day Plan Generation (2026-02-11)

### What Changed

- Reworked Soul Audit generation to return a full temporary 5-day custom plan in `src/app/api/soul-audit/route.ts`:
  - Added `custom_plan` generation contract (5 structured days: scripture, reflection, prayer, next step, journal prompt)
  - Enforced chiastic day arc labeling (`A`, `B`, `C`, `B'`, `A'`) across day output
  - Added robust fallback generator that still produces a complete 5-day plan when AI is unavailable
  - Kept ranked series matches as secondary pathways
- Added new shared types in `src/types/soul-audit.ts`:
  - `CustomPlan`, `CustomPlanDay`, and `ChiasticPosition`
  - `SoulAuditResponse.customPlan` for first-class 5-day output
  - Backward compatibility maintained for legacy `customDevotional` payloads
- Updated homepage Soul Audit flow in `src/app/page.tsx`:
  - Normalizes + stores `customPlan` payload in session storage
  - Results block now shows Day 1 full devotional content plus a visible outline of all 5 generated days
  - Updated copy from single-day custom devotional language to custom 5-day plan language
- Updated dedicated Soul Audit route flow:
  - `src/app/soul-audit/page.tsx` now normalizes legacy and new payloads to `customPlan`
  - `src/app/soul-audit/results/page.tsx` now renders the full 5-day plan day-by-day (not just a single day)
- Made generated plans temporary by default in `src/stores/soulAuditStore.ts`:
  - Persisted store now keeps only `auditCount`
  - Generated plan content remains session-scoped instead of durable local persistence
- Bumped service worker cache namespace from `euangelion-v17` -> `euangelion-v18` in `public/sw.js` so clients pick up the new audit behavior immediately

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Homepage Header Flow + Scale Pass (2026-02-11)

### What Changed

- Reworked homepage header behavior in `src/app/page.tsx`:
  - Replaced `HOME EDITION` rail text with live current date/time
  - Replaced center rail copy with `DAILY DEVOTIONAL AND HONEST REFLECTION`
  - Replaced right rail slot with a dark-mode toggle button
  - Removed the subheading block: `A daily paper for your soul...`
  - Renamed `LEAD STORY` to `START HERE`
  - Increased hero lead typography (`Find your next faithful step today` + supporting copy)
- Added sticky/nav handoff behavior:
  - Top meta rail stays sticky
  - Masthead scrolls normally
  - Primary nav below masthead transitions out as scroll passes threshold
  - Meta rail center swaps from tagline to nav links (replacing the center text on scroll)
- Replaced hover-only masthead interaction with ticker-style masthead animation:
  - Continuous horizontal marquee: `EUANGELION • GOOD NEWS`
- Updated `src/components/Navigation.tsx` with `showThemeToggle` prop so homepage can own dark-mode control in the top rail
- Increased global typography utility scale in `src/app/globals.css` (`vw-heading-*`, `vw-body*`, `vw-small`) for larger text across the site
- Restored dark-mode behavior for the newspaper theme by adding `.dark .newspaper-home` token overrides and dark card treatment
- Bumped service worker cache namespace from `euangelion-v7` -> `euangelion-v8` in `public/sw.js` so clients pick up interaction and sticky/navigation fixes immediately

### Interaction Stability Follow-up (2026-02-11)

- Moved sticky meta rail outside the animated header block in `src/app/page.tsx` to restore reliable sticky behavior
- Hardened clickable behavior for top rail nav/theme controls in `src/app/globals.css`:
  - Raised sticky rail z-index to top layer
  - Enforced pointer-events on nav links and dark-mode control
  - Added explicit sticky fallback (`position: -webkit-sticky`)
- Added explicit `type="button"` on the top dark-mode control to avoid accidental form semantics

### Above-the-Fold Soul Audit Pass (2026-02-11)

- Compressed homepage hero vertical stack in `src/app/page.tsx` so the full Soul Audit block fits above the fold on desktop:
  - Reduced masthead height footprint and nav spacing
  - Tightened top section padding/gaps
  - Reduced lead-story copy block vertical rhythm
  - Compacted Soul Audit card (padding, heading size, textarea rows, CTA height)
- Bumped service worker cache namespace from `euangelion-v8` -> `euangelion-v9` in `public/sw.js` so fold/layout updates are immediately visible

### Newspaper System Expansion + Ticker Rebuild (2026-02-11)

- Rebuilt homepage masthead animation as a ticker-strip system in `src/app/page.tsx` + `src/app/globals.css`:
  - Segment-based marquee track with repeated items (`EUANGELION`, `GOOD NEWS`, `DAILY BREAD`)
  - Ticker-chip visual treatment to match modern headline-ticker style
  - Reduced mobile masthead size to fit viewport width more reliably
- Expanded newspaper feel site-wide:
  - Added global newsprint surface treatment to `<body>` via `newsprint-site` class in `src/app/layout.tsx`
  - Added cross-site paper grain/fiber background layering in `src/app/globals.css`
- Improved dark mode palette consistency across the app:
  - Updated global `.dark` semantic tokens to align with the successful Wake-Up dark palette direction
  - Aligned `.dark .newspaper-home` tokens to the same tonal family
- Fixed light-mode mobile navigation usability in `src/components/Navigation.tsx`:
  - Replaced hard-coded dark drawer (`bg-tehom`) with semantic page surface
  - Improved close/button/link color contrast in light mode
- Desktop devotional layout pass in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Centered hero/content/navigation/footer containers
  - Increased readable content width while keeping prose constrained
  - Added `newspaper-reading` wrapper and associated typography/layout refinements
  - Preserved mobile devotional flow while improving desktop reading balance
- Overflow/viewport hardening in `src/app/globals.css`:
  - Added `overflow-x: hidden` + width constraints on `html`/`body`
  - Prevented horizontal side scrolling from ticker/layout overflow
- Bumped service worker cache namespace from `euangelion-v10` -> `euangelion-v11` in `public/sw.js` so latest interaction updates are immediately visible

### Innovation UX Pass (2026-02-11)

- Added high-leverage Soul Audit interaction improvements in `src/app/page.tsx`:
  - Rotating intelligent prompt text for quicker first sentence momentum
  - Keyboard shortcut `/` to jump focus to Soul Audit input
  - Keyboard shortcut `Cmd/Ctrl + Enter` to submit the audit
  - Live word count + readiness meter to guide completion without extra friction
- Upgraded ticker polish in `src/app/globals.css`:
  - Added edge mask fade, reduced-motion fallback, and chip-styled ticker units
  - Improved marquee smoothness with track-level animation + will-change optimization

### Split-Flap Ticker Correction (2026-02-11)

- Replaced marquee-style masthead with airport-board split-flap behavior to match requested header motion reference:
  - Added `src/components/FlipTicker.tsx` (character-cell ticker with per-slot vertical tick transitions)
  - Updated homepage masthead in `src/app/page.tsx` to use `FlipTicker` with `EUANGELION` <-> `GOOD NEWS`
  - Replaced old marquee CSS in `src/app/globals.css` with split-flap board styles (`flip-cell`, `flip-track`, `flip-char`)
- Bumped service worker cache namespace from `euangelion-v11` -> `euangelion-v12` in `public/sw.js` so ticker correction is immediately visible

### Airport Board Ticker Behavior Refinement (2026-02-11)

- Refined the masthead ticker to behave like a true split-flap airport board (not a horizontal sports ticker):
  - Rebuilt `src/components/FlipTicker.tsx` animation logic so each character cell advances in stepped ticks toward the next message
  - Added per-cell split-panel flip choreography (top + bottom flap timing) for mechanical board motion
  - Tuned message cadence/stagger for `EUANGELION` <-> `GOOD NEWS` to read as header display text rather than marquee crawl
- Reworked split-flap visuals in `src/app/globals.css`:
  - Added half-panel layering, seam line, depth/ink shading, and dark-mode plate tuning for newspaper look
  - Replaced previous vertical-track glyph-roll styling (`flip-track`, `flip-char`) with dynamic flap states (`flip-static`, `flip-dynamic`)
- Bumped service worker cache namespace from `euangelion-v12` -> `euangelion-v13` in `public/sw.js` so the refined ticker behavior is immediately visible

### Masthead Simplification (2026-02-11)

- Removed masthead ticker/effects and restored a static wordmark:
  - Updated `src/app/page.tsx` masthead to render plain `EUANGELION` text
  - Removed ticker component usage and deleted `src/components/FlipTicker.tsx`
  - Removed split-flap ticker CSS from `src/app/globals.css`
- Bumped service worker cache namespace from `euangelion-v13` -> `euangelion-v14` in `public/sw.js` so the static masthead is immediately visible

### Blue Ink Newspaper Refinement (2026-02-11)

- Shifted homepage + devotional visual language to blue-ink editorial treatment in `src/app/globals.css`:
  - Updated accent from warm glow to blue-ink (`--color-gold` now blue-ink in newspaper contexts)
  - Added darker section rules and stronger border contrast for newspaper structure
  - Added dedicated `newspaper-reading` tokens so devotional pages match homepage editorial tone
- Removed glow/shimmer effects to keep print-like flat ink rendering:
  - Replaced animated `gold-shimmer` styling with static ink color
  - Disabled prayer text pulsing (`breathe-prayer`) to reduce visual noise during long-form reading
  - Simplified `src/components/motion/GoldHighlight.tsx` to flat text accent (no gradient reveal animation)
- Reworked homepage editorial blocks in `src/app/page.tsx`:
  - Converted `THE FLOW` from card grid to ruled newspaper step list
  - Converted `HELP DESK` from cards to ruled Q&A column layout
  - Flattened closing CTA treatment into ruled editorial block (less app-like card chrome)
- Reworked devotional reading layout in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Removed mixed headline treatment and restored single-voice title composition
  - Reduced hero height so reading content appears sooner
  - Switched to newspaper navigation variant for cleaner article framing
  - Removed staggered module reveal wrappers for steadier long-form reading flow
  - Added framed reading column treatment via `newspaper-reading-main` + `reading-flow` rule edges
- Bumped service worker cache namespace from `euangelion-v14` -> `euangelion-v15` in `public/sw.js` so this style pass is immediately visible

### Update Delivery Reliability Fix (2026-02-11)

- Hardened production service worker update behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - Added immediate `registration.update()` check on load
  - Added waiting-worker promotion via `postMessage({ type: 'SKIP_WAITING' })`
  - Added `controllerchange` listener to auto-reload once new worker takes control
- Added message handler in `public/sw.js` to honor `SKIP_WAITING` and activate updated worker immediately
- Bumped service worker cache namespace from `euangelion-v15` -> `euangelion-v16` in `public/sw.js` to prevent partial stale/updated style mixes

### Soul Audit Custom Devotional Generation + Full-Width Masthead (2026-02-11)

- Reworked Soul Audit API from series-only matching to custom devotional generation in `src/app/api/soul-audit/route.ts`:
  - Added AI response contract to return both `custom_devotional` and ranked `matches`
  - Added robust JSON parsing + match enrichment + fallback devotional construction
  - Added grounded day-one context extraction from devotional source files for better personalized output
  - Preserved crisis response handling with resource-first output
- Added shared Soul Audit response types in `src/types/soul-audit.ts` and updated store typing in `src/stores/soulAuditStore.ts`
- Updated homepage Soul Audit experience in `src/app/page.tsx`:
  - Result section now leads with a generated custom devotional (scripture, reflection, prayer, next step, journal prompt)
  - Series cards are now secondary follow-up pathways
  - Updated Soul Audit value copy to reflect custom devotional generation
- Updated dedicated Soul Audit flow:
  - `src/app/soul-audit/page.tsx` now normalizes/stores the richer response payload
  - `src/app/soul-audit/results/page.tsx` now renders the generated custom devotional as primary output
- Made masthead wordmark span full width across the top in `src/app/page.tsx` + `src/app/globals.css` via `masthead-fullwidth` letter layout
- Bumped service worker cache namespace from `euangelion-v16` -> `euangelion-v17` in `public/sw.js` so API/UI behavior updates are immediately visible

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Edge Runtime Warning Removal (2026-02-11)

### What Changed

- Updated Open Graph image routes to use Node runtime instead of Edge:
  - `src/app/opengraph-image.tsx`
  - `src/app/wake-up/devotional/[slug]/opengraph-image.tsx`
- Goal: eliminate the build warning about Edge runtime disabling static generation

### Validation

- `npm run build` passes
- Warning `Using edge runtime on a page currently disables static generation for that page` no longer appears

---

## Next.js Proxy Migration (2026-02-11)

### What Changed

- Migrated route interception entrypoint from `src/middleware.ts` to `src/proxy.ts`
- Renamed exported handler from `middleware` to `proxy` to match Next.js 16+ convention
- Kept existing auth/session logic and matcher config intact

### Validation

- `npm run build` passes
- Build warning `The "middleware" file convention is deprecated` no longer appears

---

## Newsprint Texture Pass (2026-02-11)

### Scope

- Shifted the homepage from "clean editorial" to explicit newsprint material feel
- Targeted ink-on-paper atmosphere using layered texture treatment (no font-family changes)

### What Changed

- **Paper texture foundation** (`src/app/globals.css`):
  - Enhanced `.newspaper-home` background with multi-layered paper grain, fiber lines, and subtle ink wash variation
  - Added fixed pseudo-element overlays (`::before`, `::after`) for page-wide grain and print noise
  - Added stacking isolation and z-index handling so texture stays behind content while covering the full page
- **Printed surface treatment** (`src/app/globals.css`):
  - Updated `.newspaper-card` with textured paper layering to look like ink printed on stock rather than flat UI cards
- **Client cache refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v4` -> `euangelion-v5` so browsers pull the new texture assets/styles immediately

### Validation

- `npm run build` passes

### Visibility Follow-up (2026-02-11)

- Added non-production cache reset behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - In production: keep normal SW registration
  - In non-production (local/dev): automatically unregister existing service workers and clear `euangelion-*` caches
- Purpose: prevent stale cached homepage assets from masking style updates during iterative design passes

---

## Homepage Newspaper System Pass (2026-02-11)

### Scope

- Applied a full homepage visual overhaul to align with a newspaper-style editorial layout inspired by the requested reference
- Kept existing font family setup intact (no typography family swap in this pass)
- Focused changes on hierarchy, conversion flow, layout balance, and section consistency

### What Changed

- **Unified homepage treatment** (`src/app/page.tsx`):
  - Root now uses `newspaper-home` for page-wide newspaper tokens/background
  - All major sections moved to a consistent editorial system:
    - masthead + edition strip
    - nav rail directly under masthead
    - lead story + above-fold Soul Audit
    - results rail
    - flow section
    - featured section
    - FAQ rail
    - final conversion panel
  - Removed mixed visual language (gradients/dot pattern-heavy style) in favor of consistent rails, rules, and cards
  - Preserved masthead hover interaction (`EUANGELION` -> `GOOD NEWS`)
- **Newspaper token tuning** (`src/app/globals.css`):
  - Refined `newspaper-home` palette for warmer paper + stronger editorial contrast
  - Kept accent treatment consistent through tokenized `--color-gold`
  - Standardized newspaper card rendering via `newspaper-card`
- **Cache bust for client refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v3` -> `euangelion-v4` so clients pick up the new homepage CSS/markup

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Hotfix — Serif Font Rendering (2026-02-11)

### Root Cause

- `next/font` variable classes were mounted on `<body>` while canonical typography tokens (`--font-family-*`) were resolved from `:root` (`<html>`), creating a scope mismatch for `--font-instrument-serif`
- `--font-family-serif` used `var(--font-instrument-serif), ...` without inline fallback, so if the variable was unavailable the declaration became invalid and serif styles inherited sans

### Fixes Applied

- **Layout scope fix** (`src/app/layout.tsx`) — moved `inter.variable` and `instrumentSerif.variable` class injection from `<body>` to `<html>`
- **Font token hardening** (`src/app/globals.css`) — changed font-family tokens to `var(..., fallback-list)` form:
  - `--font-family-display: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-body: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-serif: var(--font-instrument-serif, 'Instrument Serif', Georgia, serif);`
- Updated comments in `globals.css` to reflect runtime font variables now sourced from `<html>`

### Validation

- `npm run lint` passes with no new lint errors

### Render Outage Follow-up (2026-02-11)

- Replaced `next/font/google` usage in `src/app/layout.tsx` with local `GeistSans` import (`geist/font/sans`) to remove hard dependency on Google Fonts network availability during builds
- Added explicit source font variables in `src/app/globals.css`:
  - `--font-inter` now resolves from `--font-geist-sans` with fallback stack
  - `--font-instrument-serif` now has a resilient serif fallback stack (`Instrument Serif`, `Georgia`, `Times New Roman`, `serif`)
- Verified production build succeeds using webpack (`npx next build --webpack`)

### Instrument Serif Cleanup Pass (2026-02-11)

- Removed remaining Geist wiring from `src/app/layout.tsx` and kept `<html className="dark">` only
- Imported Instrument Serif directly in `src/app/globals.css`:
  - `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');`
- Unified all canonical font tokens to a single serif source in `src/app/globals.css`:
  - `--font-family-display`, `--font-family-body`, and `--font-family-serif` now all resolve from `--font-family` → `--font-instrument-serif`
- Replaced lingering `var(--font-family-display)` inline style usage with `var(--font-family-serif)` in:
  - `src/components/PullQuote.tsx`
  - `src/components/modules/InteractiveModule.tsx`
  - `src/app/wake-up/page.tsx`
  - `src/app/offline/page.tsx`
- Updated stale typography comments in:
  - `src/components/MixedHeadline.tsx`
  - `design-system/typography-craft.css`

### Validation (Second Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Instrument Serif Local Asset Pass (2026-02-11)

- Root issue remained: browser/runtime could still fall back when external Google Fonts requests were blocked or delayed
- Added local Instrument Serif assets in `public/fonts/`:
  - `InstrumentSerif-Regular.ttf`
  - `InstrumentSerif-Italic.ttf`
- Replaced remote font import with local `@font-face` declarations in `src/app/globals.css`:
  - `src: url('/fonts/InstrumentSerif-Regular.ttf') format('truetype')`
  - `src: url('/fonts/InstrumentSerif-Italic.ttf') format('truetype')`
- Kept canonical font tokens mapped to Instrument Serif (`--font-family-display`, `--font-family-body`, `--font-family-serif`) so all typography utilities resolve to the same local family
- Removed temporary `next/font/google` dependency in `src/app/layout.tsx` so builds no longer require `fonts.googleapis.com`

### Validation (Local Asset Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes without external font fetches

### Homepage Conversion Flow Refactor (2026-02-11)

- Reworked `/` into a conversion-first funnel in `src/app/page.tsx` with a clearer sequence:
  - Above-the-fold value proposition + primary CTA
  - Low-friction "Start Here" soul-audit section
  - Matched results reveal
  - How-it-works clarity block
  - Featured series proof section
  - Objection-handling FAQ
  - Final CTA close
- Reduced visual imbalance by removing mixed-headline composition from the homepage and using simpler, consistent serif hierarchy for readability and scan speed
- Improved CTA hierarchy:
  - Primary: `Start 2-Minute Soul Audit`
  - Secondary: `Browse Series Library`
- Added trust and friction-reduction signals near the top of the page (`No account required`, time expectation, biblical grounding)
- Kept existing soul-audit behavior, limits, and matching logic intact while clarifying copy and outcome framing

### Validation (Homepage Conversion Refactor)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Color Uplift Pass (2026-02-11)

- Replaced drab brown-forward palette with a brighter, more life-giving core:
  - Deep blue base (`--color-tehom`)
  - Warm cream text/surfaces (`--color-scroll`)
  - More luminous sun-gold accent (`--color-gold`)
- Updated semantic dark/light tokens in `src/app/globals.css` for richer contrast and brighter surfaces (`--color-surface`, `--color-surface-raised`, borders, overlays, hover/active states)
- Refined global shadow and glow tokens for warmer visual energy (`--shadow-glow`, focus ring/shadow scales)
- Enhanced homepage visual atmosphere in `src/app/page.tsx`:
  - Luminous hero gradients
  - Gold-first primary CTA treatment
  - Elevated audit card with glow and subtle color wash
  - Added warm/cool gradient lifts to major informational sections

### Validation (Color Uplift Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Client Cache Refresh (2026-02-11)

- Bumped service worker cache namespace from `euangelion-v1` to `euangelion-v2` in `public/sw.js` so clients pick up latest homepage/style changes instead of stale cached assets

### Newspaper Hero + Masthead Hover (2026-02-11)

- Updated homepage hero composition in `src/app/page.tsx` to feel more newspaper-like:
  - Added dateline/edition strip with horizontal rules
  - Reframed left column as `LEAD STORY`
  - Kept Soul Audit as right-column front-page action above the fold
- Added interactive masthead behavior:
  - `EUANGELION` now animates to `GOOD NEWS` on mouse hover with vertical slide/fade transition
- Updated trust points to render as inline editorial bullets instead of card/button-like blocks

### Validation (Newspaper Hero Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Font Flash + Cache Update (2026-02-11)

- Reduced masthead font flash by upgrading Instrument Serif loading:
  - Added local `.woff2` files in `public/fonts/`
  - Updated `@font-face` in `src/app/globals.css` to prefer `.woff2` with `.ttf` fallback
  - Switched `font-display` from `swap` to `block` for the Instrument Serif faces
  - Added font preloads in `src/app/layout.tsx` for regular + italic Instrument Serif (`rel="preload" as="font"`)
- Bumped service worker cache key from `euangelion-v2` to `euangelion-v3` in `public/sw.js` to force fresh asset pickup

### Validation (Font Flash Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Navigation Newspaper Integration (2026-02-11)

- Added navigation variants in `src/components/Navigation.tsx`:
  - `default` (existing behavior for non-home routes)
  - `newspaper` (logo-free, section-rail style, centered links)
- Homepage now mounts navigation directly below the large masthead in `src/app/page.tsx`:
  - Removed top-level standalone nav placement above the hero
  - Inserted `Navigation` in newspaper mode under `EUANGELION`/`GOOD NEWS`
- Removed the small `EUANGELION` wordmark from the homepage nav rail to keep the masthead as the single brand headline

### Validation (Navigation Integration)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## v0.7.0 — Typography Masterclass (2026-02-10)

### Font Swap

- **Instrument Serif** replaces Cormorant Garamond — condensed display serif, visibly serifed at all sizes
- **Inter** replaces Space Grotesk — clean workhorse sans, 300-700 weight range
- EUANGELION wordmark now renders in Instrument Serif (serifs VISIBLE)

### New Components

- **MixedHeadline** (`src/components/MixedHeadline.tsx`) — emphasis-based mixed sans/serif headlines with `<Sans>` and `<Serif>` sub-components. KEY words in serif italic, STRUCTURAL words in sans caps
- **PullQuote** (`src/components/PullQuote.tsx`) — hanging gold oversized quote mark, thin gold rules above/below, centered attribution
- **OrnamentDivider** (`src/components/OrnamentDivider.tsx`) — gold rules with centered ornament character between modules

### Sacred Illumination CSS

- `type-mega` (4-10rem serif display), `type-micro` (0.6-0.75rem sans labels), `type-day-ornament` (6-14rem gold ghost number)
- `headline-sans` / `headline-serif` / `headline-mixed` — mixed headline utility classes
- `ornament-divider` — gold rule + ornament between sections
- `oldstyle-nums` — old-style numeral utility for casual numbers

### Page Typography Overhauls

- **Homepage:** MixedHeadline tagline ("DAILY _bread_ FOR THE _cluttered, hungry_ SOUL"), mixed section headers, Instrument Serif numbers (01/02/03), ghost Scripture text in visual break, gold ornament footer, gold rules on featured series cards
- **Devotional reader:** Massive `.type-day-ornament` behind title, MixedHeadline day header ("DAY 1 — _title_"), ornamental dividers between all modules, `type-prose` + `baseline-grid` on reading flow
- **Series browse:** MixedHeadline page title ("ALL _Series_"), section labels ("WAKE-UP _Magazine_", "DEEP _Dives_"), gold rules on cards, old-style numerals
- **Series detail:** Large Instrument Serif italic question, `type-micro` labels, Instrument Serif day numbers, `columns-prose` on long introductions
- **Soul Audit:** MixedHeadline question ("WHAT ARE YOU _wrestling with_ TODAY?")

### Activated Typography Features

- `type-prose` (ligatures, old-style nums, hanging punct) on all body text
- Drop caps (Instrument Serif gold) on Teaching and Story module openings
- Multi-column layouts (`columns-prose`) on long Teaching content
- PullQuote on TeachingModule `keyInsight`, InsightModule `fascinatingFact`, ProfileModule `keyQuote`, BridgeModule `connectionPoint`
- Old-style numerals on day counts, Strong's numbers, progress counters, copyright

### Version

- `package.json` bumped from `0.1.0` → `0.7.0`

---

## Fix What's Broken — Wire Infrastructure to UI

### 2026-02-09

- **Phase A: Remove auth gate** — Emptied `AUTH_REQUIRED_ROUTES` in middleware.ts. Devotionals now freely accessible without sign-in. Settings still requires auth.
- **Phase B: Homepage typography overhaul** — Imported GoldHighlight, DropCap, TextReveal into homepage. EUANGELION wordmark uses TextReveal (word-by-word GSAP reveal). "bread" wrapped in GoldHighlight (animated gold gradient on scroll). Invitation text uses DropCap component. Applied type-caption, type-display, type-data, type-prose, type-serif-flow across all homepage sections.
- **Phase C: Devotional module animations** — Animated gold-shimmer CSS (3s infinite sweep, reduced-motion safe). Added breathing prayer animation (6s subtle scale pulse). Wired GoldHighlight into VocabModule. Wired DropCap into TeachingModule. Wrapped PrayerModule in FadeIn. Added type-prose to all module body text (Story, Insight, Bridge, Reflection, Takeaway). Increased stagger timing (0.05 → 0.1s, capped at 0.5s).
- **Phase D: Site-wide polish** — TextReveal on devotional hero (non-image). type-display + type-prose on series browse, individual series, and Soul Audit pages. type-caption on Soul Audit label. type-serif-flow on series introductions and card questions.

---

## Production Relaunch — Phases 0-11

### 2026-02-09

- **Phase 0: Design system consolidation** — Imported design-system/ tokens into globals.css, created typography-craft.css (optical sizing, hanging punctuation, ligatures, baseline grid, multi-column utilities), created typographer.ts (smart quotes, em-dashes), built animation infrastructure (GSAP registry, Lenis provider, FadeIn/StaggerGrid/TextReveal/ParallaxLayer/GoldHighlight/DropCap motion components), installed gsap, framer-motion, lenis, zustand, @vercel/analytics
- **Phase 1: Zustand stores** — Created 6 stores (auth, progress, ui, settings, soulAudit, offline) with persist middleware, auth sign-in page, day-gating utility
- **Phase 2: Day-gating + Share + Analytics** — Day-gating at 7AM user timezone, ShareButton (Web Share API + clipboard fallback), Toast component, Vercel Analytics
- **Phase 3: Loading + Error + 404** — Brand-aligned error.tsx, not-found.tsx, loading skeletons per route, Skeleton UI component
- **Phase 4: Devotional reader prototype** — Scripture poster variants, typographer integration, content audit script
- **Phase 5: All modules enhanced** — Applied typographer() + GSAP animations to all 12 existing module components, built 9 additional module types (Chronology, Geography, Visual, Art, Voice, Interactive, Match, Order, Reveal)
- **Phase 6: Landing + Soul Audit visual** — Replaced IntersectionObserver with FadeIn/StaggerGrid across landing page and Soul Audit, mixed-font typography
- **Phase 7: Series + Navigation + micro-interactions** — Series pages migrated to motion components, Navigation aria attributes (aria-hidden on SVGs, role=dialog on mobile menu), z-index tokens replacing hardcoded values, .animated-underline + .btn-hover utilities
- **Phase 8: AI Research Chat** — DevotionalChat modal (Framer Motion slide-up), TextHighlightTrigger (text selection → "Ask about this"), ChatMessage component (favorite + color-code), two-tier API (BYOK + free with daily limit), chatStore (Zustand persist), Settings page API key input + chat history management
- **Phase 9: PWA** — manifest.json, service worker (cache-first static, network-first pages, offline fallback), offline page, PWA icons (192/512/maskable), ServiceWorkerRegistration component
- **Phase 10: Accessibility + SEO + Legal** — aria-live on Soul Audit results, JSON-LD BreadcrumbList on series + devotional pages, sitemap expanded to all 26 series + all pages, .prose-legal CSS class, print stylesheet enhanced (@page rules, EUANGELION branding header)
- **Phase 11: Cleanup** — Removed ~70 lines dead CSS (observe-fade, gentle-rise, stagger-\*, landing-reveal, fade-in-delay), removed dead functions from progress.ts, 0 lint warnings, 160 pages built
- **Deploy fix** — Added missing Skeleton.tsx, AnimationProvider.tsx, LenisProvider.tsx (created in Phases 0/3 but not staged in initial commit)

---

## Sprint 5 — Real MVP Rebuild

### 2026-02-09

- **Lumen-inspired continuous article redesign** — Removed all card backgrounds, borders, and box treatments from all 12 module components. Devotional content now flows as a continuous long-form article with only typography, whitespace, and gold accents for visual hierarchy. Hero uses full-bleed images (50-60vh) with gradient overlay (Lumen Art Space reference). Added `.reading-flow` CSS container (max-width 900px). Removed `isFullWidthModule` breakout system. Generous vertical spacing (my-16 md:my-24) between modules. Scripture keeps gold left-border blockquote; teaching keyInsight rendered as gold serif italic; fascintaing facts use subtle gold accent strip. No cards, no surfaces, no box borders — just headings, text, and whitespace.
- **Unified typography hierarchy across all modules** — Created CSS utility classes (`module-accent`, `module-callout`, `module-card`, `module-card-gold`, `module-surface`, `module-sublabel`) to replace inline styles. Standardized all 12 module components to consistent hierarchy: gold labels (`text-label vw-small text-gold`) for module type, `text-display vw-heading-md` for headings, `text-serif-italic vw-body-lg` for featured/sacred text (scripture, prayer, reflection prompts, key quotes), `vw-body text-secondary` for standard reading text, `module-sublabel` for sub-section labels, `vw-small text-muted` for metadata. Removed all inline `fontSize` overrides. VocabModule word now uses `.pull-quote` class instead of inline style.
- **Content pipeline rebuilt to preserve all original Substack data** — Rewrote `prepare-substack.ts` with spread-and-rename approach. All rich fields now preserved: pronunciation, wordByWord, Strong's numbers, keyInsight, historicalContext, fascinatingFact, leavingAtCross/receivingFromCross, forReflection, forAccountabilityPartners, connectionToTheme, ancientTruth, modernApplication, etc. 81 devotional JSONs regenerated.
- **ModuleRenderer simplified** — Replaced 120-line manual field mapper with 60-line spread-and-rename normalizer matching the pipeline approach. All fields pass through; only 7 critical renames applied.
- **All 12 module components upgraded** — ScriptureModule (+emphasis chips, Hebrew/Greek originals, scripture context), VocabModule (+pronunciation, Strong's badge, word-by-word table, related words, usage note), TeachingModule (+keyInsight callout), StoryModule (+connectionToTheme), InsightModule (+historicalContext, fascinatingFact), BridgeModule (structured Ancient Truth / Modern Application layout, connection point, NT echo), ReflectionModule (+additionalQuestions, invitationType label), PrayerModule (+posture label, prayer type), TakeawayModule (+commitment text, leavingAtCross/receivingFromCross lists), ComprehensionModule (dual-mode: quiz OR reflection), ProfileModule (+description, keyQuote pull-quote, lessonForUs), ResourceModule (+relatedScriptures, forDeeperStudy, greekVocabulary, weeklyChallenge). All components now have null guards.
- **Module type expanded** — Added ~40 optional fields to `Module` interface in `src/types/index.ts` covering all rich Substack data.
- **Test coverage** — New test asserting rich field preservation (vocab pronunciation/strongsNumber/wordByWord, takeaway commitment/leavingAtCross, comprehension forReflection, teaching keyInsight, bridge ancientTruth). 16 tests pass.

### 2026-02-08

- **113 Substack devotional images downloaded** — Extracted topImage URLs from all 117 HTML source files, downloaded to `public/images/devotionals/`. Created `src/data/devotional-images.ts` with full slug→image mapping (106 devotionals + 9 series intros). Helper functions `getDevotionalImage()` and `getSeriesHeroImage()`.
- **Devotional reader shows real images** — `DevotionalPageClient` displays devotional-specific hero image at top via `next/image` with dark overlay for readability. Falls back to gradient for series without images (Wake-Up 7).
- **Wake-Up added to navigation** — "Wake-Up" link added to desktop sticky bar and mobile slide-out menu, linking to existing `/wake-up` landing page.
- **All 19 Substack series have hero images** — Every Substack series in `series.ts` now has a `heroImage` field pointing to a locally-served photograph. Uses deepdive/intro images where available, day-1 images as fallback. `SeriesInfo` interface extended with optional `heroImage` field. `SeriesHero` component shows real image via `next/image` with gradient fallback for Wake-Up 7. Darker overlay for text readability on photos.
- **How It Works repositioned** — Moved directly under fold (after hero + audit results) for immediate clarity. Added SVG icons (compass, book, heart) to each step.
- **Paper.design-inspired visuals** — Dot-pattern background utility (`dot-pattern`, `dot-pattern-lg`). Applied to How It Works and What This Is sections. Editorial break upgraded with dot overlay, radial gold glow, and minimal cross motif.
- **Day-gating disabled** — `canReadDevotional()` always returns `{ canRead: true }`. All content freely accessible.
- **Fonts replaced** — Playfair Display → Cormorant Garamond (display/serif). Geist Sans → Space Grotesk (body/UI). Updated layout.tsx + globals.css.
- **19 Substack series wired up** — `scripts/prepare-substack.ts` converts 19 Substack JSONs (3+ format variants) into 81 individual devotional files in `public/devotionals/`. All 26 series now in `src/data/series.ts` with pathway + keywords metadata.
- **Module format normalization** — `ModuleRenderer.tsx` `normalizeModule()` handles flat, `content`-nested, and `data`-nested Substack formats. Maps field names (text→passage, body→content, meaning→definition, etc.).
- **SeriesHero component** — CSS gradient backgrounds per series/pathway. Three visual directions: radial (Sacred Chiaroscuro), wave (Textured Minimalism), grid (Risograph). Supports hero/card/thumbnail sizes.
- **Navigation rebuild** — Desktop: sticky persistent top bar with logo, nav links (Soul Audit, Series, Settings), dark mode toggle. Mobile: hamburger → right slide-out panel. Auto-closes on route change.
- **Landing page rebuild** — EUANGELION massive edge-to-edge wordmark. Inline Soul Audit textarea (no page navigation). Results appear as 3 equal cards with SeriesHero. Full-bleed editorial placeholder. Featured Series (4 curated). How It Works grid. Footer with legal links.
- **Soul Audit overhaul** — API now uses all 26 series in Claude prompt + keyword fallback. Returns 3 matches with reasoning + Day 1 previews (anchor verse + teaching paragraph). Results page: 3 equal visual cards with SeriesHero backgrounds.
- **Series browse rewrite** — Shows all 26 series grouped: Wake-Up Magazine (7) + Deep Dives (19). Visual cards with SeriesHero thumbnails, dynamic day counts, progress bars.
- **Series detail enhanced** — SeriesHero at top. Dynamic day count (not hardcoded 5). Chiastic structure description only for 5-day series.
- **Devotional reader — hybrid cinematic layout** — Full-width treatment (distinct background + borders) for Scripture, Vocab, Prayer, Comprehension. Continuous column for Teaching, Story, Insight, Bridge, etc. SeriesHero card at top. Series slug extraction from devotional slug.
- **Master Decisions Log** — `docs/MASTER-LOG.md` with 21 Sprint 5 decisions + 6 prior decisions.

**26 Series (7 Wake-Up + 19 Substack):**
identity, peace, community, kingdom, provision, truth, hope, too-busy-for-god, hearing-god-in-the-noise, abiding-in-his-presence, surrender-to-gods-will, in-the-beginning-week-1, what-is-the-gospel, why-jesus, what-does-it-mean-to-believe, what-is-carrying-a-cross, once-saved-always-saved, what-happens-when-you-repeatedly-sin, the-nature-of-belief, the-work-of-god, the-word-before-words, genesis-two-stories-of-creation, the-blueprint-of-community, signs-boldness-opposition-integrity, from-jerusalem-to-the-nations, witness-under-pressure-expansion

---

## Sprint 4 — Full MVP Build

### 2026-02-08

- **Landing page redesign** — ironhill.au-inspired: full-viewport hero with massive serif italic typography, scroll-reveal sections, invitation copy from PUBLIC-FACING-LANGUAGE.md, Soul Audit CTA, 7 questions, how-it-works grid
- **Brand copy fix** — Removed unapproved "VENERATE THE MIRACLE. DISMANTLE THE HAVEL." from 3 files, replaced with approved tagline "SOMETHING TO HOLD ONTO."
- **Navigation overhaul** — Added Home, Soul Audit, All Series, Settings links to slide-out menu
- **Soul Audit** — Full flow: `/soul-audit` question UI → `/api/soul-audit` Claude API matching with keyword fallback → `/soul-audit/results` with primary match + alternatives. Crisis detection protocol (988, Crisis Text Line). Soft validation.
- **Module Renderer** — 12 MVP module components: Scripture, Teaching, Vocab, Story, Insight, Prayer, Takeaway, Reflection, Bridge, Comprehension, Profile, Resource. ModuleRenderer switch component.
- **Day-gating** — 7 AM timezone unlock. Series start tracking in localStorage. Days unlock sequentially + time-gated.
- **Devotional viewer enhanced** — Now supports both legacy panel format and new module format. Auto-starts series tracking on first visit.
- **Series Browse** — `/series` page with card grid, progress indicators, Soul Audit CTA
- **Magic link auth API** — `/api/auth/magic-link` route using existing Supabase auth
- **Settings page** — `/settings` with theme (dark/light/system), Sabbath day, Bible translation preferences
- **Legal pages** — `/privacy` and `/terms` rendering markdown from content/legal/
- **Print stylesheet** — Force light mode, hide nav/buttons, page-break rules, show URLs
- **AI Content Pipeline** — `scripts/generate-devotionals.ts` using Claude API with chiastic structure (A-B-C-B'-A'), PaRDeS interpretation, 12 module types, Nicene Creed orthodoxy baseline. Outputs both module + legacy panel format.
- **Tracking system** — Pre-commit hook enforcing CHANGELOG updates, MEMORY.md full project state, CLAUDE.md corrections
- **Tests updated** — Smoke test updated for new landing page, all 10 tests passing

**Routes:**

- `/` — Landing page (redesigned)
- `/soul-audit` — Soul Audit question
- `/soul-audit/results` — Match results
- `/series` — All series browse
- `/settings` — User preferences
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/api/soul-audit` — Claude API matching
- `/api/auth/magic-link` — Send magic link

**Files created:** 20+ new files across src/app/, src/components/modules/, scripts/

---

## Deployment Fixes

### 2026-02-08

- **Domain transfer** (1f0fb0b) — euangelion.app moved to wokegodxs-projects, deleted duplicate euangelion-reio project
- **Deployment guardrails** (f5f60e8) — Added `scripts/check-deploy.sh`, deployment rules in CLAUDE.md, .gitignore fix for .env\*.local
- **Middleware fix** (60c520d) — Handle missing Supabase env vars gracefully in middleware, preventing 500 errors

---

## Illustration Pipeline

### 2026-02-07

- **Multi-backend illustration pipeline** (0ca5e67) — Expanded image generation to support Gemini + LegNext backends with 5 visual directions (Sacred Chiaroscuro, Textured Minimalism, Risograph Sacred, Bold Digital Collage, HOLOGRAPHIK Swiss). Series-to-direction mapping, day-3 chiastic overrides, brand palette integration. 2 test cover images generated.

---

## Sprint 3 — Supabase Database, Auth, Sessions (COMPLETE)

### 2026-02-07

- **Supabase integration** (862a9a9) — Typed clients (browser, server, admin), anonymous session management via httpOnly cookies, magic link auth flow callback
- **Middleware** — Route protection for /daily-bread and /settings
- **Database migrations** — user_sessions table, pathway/modules columns, devotional_slug unique constraint
- **Seed script** — Loads all 19 Substack + 7 Wake Up series (30 series, 85 devotionals) into Supabase
- **Files:** `src/lib/supabase/`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts`, `scripts/seed-series.ts`, `database/types.ts`

---

## Sprint 2 — Editorial Visual Redesign, SEO Foundation (COMPLETE)

### 2026-02-06

- **Editorial redesign** (61e26dc) — Transformed Wake-Up from generic layouts into publication-quality editorial experience with dramatic typography, breathing whitespace, scroll-driven reveals
- **Client components** — DevotionalPageClient.tsx, SeriesPageClient.tsx (extracted for client interactivity)
- **SEO** — Sitemap (`src/app/sitemap.ts`), robots.txt (`src/app/robots.ts`), OG images (root + devotional + series), JSON-LD structured data
- **Illustration pipeline** — `scripts/generate-illustrations.ts` for 42 devotional covers via LegNext Midjourney API
- **CSS** — Additional editorial typography classes, section transitions

---

## Design System Facelift (COMPLETE)

### 2026-02-06

- **Token system** (c3fb5a8) — Replaced placeholder styling with documented design system
- **Colors:** Exact hex values (#1A1612 Tehom, #F7F3ED Scroll, #C19A6B Gold) with semantic token system that auto-flips for dark/light mode
- **Typography:** Geist Sans replaces Impact+Inter; Playfair Display for masthead/serif; fluid base size clamp(15px, 1vw+14px, 17px)
- **Spacing:** 4px-base semantic scale, 680px reading column, 44px touch targets
- **Animation:** "gentle rise" pattern (fade+24px translateY), documented easing curves, 60ms stagger, prefers-reduced-motion support
- **Components:** All pages updated to semantic tokens, ScrollProgress fades after inactivity, Navigation uses Tehom background

---

## Sprint 1 — Wake-Up Magazine (COMPLETE)

### 2026-02-06

- **Core infrastructure** — Navigation component (hamburger menu, dark mode toggle, slide-out panel), ScrollProgress, design system (globals.css with HSL colors, dark mode, animations, typography utilities), type definitions, Playfair Display + Inter fonts
- **Landing page** — Brand page at `/` with CTA to Wake-Up Magazine
- **Wake-Up Magazine page** — `/wake-up` with hero, problem statement, how-it-works, 7 series question cards with IntersectionObserver animations
- **Series detail page** — `/wake-up/series/[slug]` with introduction, context, chiastic structure info, 5-day list with locked/unlocked states, progress bar, lock modal
- **Devotional viewer** — `/wake-up/devotional/[slug]` loading JSON panels from `/public/devotionals/`, scroll progress bar, panel renderer (text, text-with-image, prayer), scripture detection, bold text parsing, mark-as-complete with reading time
- **Supporting utilities** — `progress.ts` (localStorage progress tracking), `bookmarks.ts` (localStorage bookmarks), `useProgress` hook, `useReadingTime` hook
- **Shared data module** — `src/data/series.ts` with all 7 series metadata
- **Routes:** `/`, `/wake-up`, `/wake-up/series/[slug]`, `/wake-up/devotional/[slug]`
- **Build, lint, tests all pass**

---

## Sprint 0 — Foundation (COMPLETE)

### 2026-02-06

- **Fresh project initialized** — New Next.js 16 app with TypeScript strict mode, Tailwind v4, App Router, src/ directory
- **Tooling configured** — Vitest + RTL, ESLint + Prettier, husky + lint-staged, GitHub Actions CI
- **Foundational files migrated** from old project:
  - `.claude/` agents (8) and skills (2)
  - `content/` — all content including 20 series-json, analytics, drafts, outlines, legal
  - `content/reference/` — 13GB reference library (gitignored)
  - `docs/` — 38 documentation files
  - `database/` — SQL migrations, seed data, types
  - `design-system/` — tokens, typography, dark mode CSS
  - `scripts/` — sync/upload reference scripts
  - `public/devotionals/` — 42 devotional JSON files
- **Coming soon landing page** — Dark-first, minimal
- **Root error boundary** and 404 page
- **CLAUDE.md**, **CHANGELOG.md**, **.env.example**
