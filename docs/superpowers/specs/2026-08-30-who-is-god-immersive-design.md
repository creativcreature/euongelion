# /who-is-god — Seven Rooms, Climbed

Design spec, 2026-08-30. Supersedes the first build of this page (SA-134 / F-178),
which shipped a well-made hero and then a conventional article. This document is
the plan for what replaces the article.

## The problem with what shipped

Founder, on the live page: _"You added one really kewl thing at the begining and
then made rhe rest of it basic... The inteo is amazing- then it immediately gets
boring and basic."_ And: _"This is a basic ass webpag and you didnt pull ANY
research I can tell."_

Both are correct. The hero is a scroll-scrubbed film; everything after it is a
centred-ish column of prose with fade-ins. Three specific failures:

1. **A dead stretch.** The hero copy reaches `opacity: 0.15` at the halfway point
   of a 320vh track and stays there for the remaining ~160vh. Measured live. That
   is the "completely blank section".
2. **The measure leans left.** `.wig-chapter-body` sits at the left edge of a
   74rem chapter rather than centred in it.
3. **Sections are separated by rules.** A `border-top` above each chapter head is
   the single most blog-like thing on the page.

## What the research actually says

| Finding                                                                                                                                                                                                                                                                                      | Source                                                                                  | What it means here                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Heavy video backgrounds appear in **<8%** of 2026 Awwwards winners; full-page hero images **<12%**. Not less effective at communicating — less effective at **differentiating**.                                                                                                             | Digital Strategy Force, "Why Are Immersive Experiences Dominating the 2026 Awwwards?"   | Keep the one film. Do **not** build the rest of the page on video.                                           |
| Apple moved **from** frame-by-frame image sequences **to** video scrubbing — precision traded for perceived smoothness, ~80% smaller assets, main thread freed. AirPods Pro ships 15 inline videos; its own markup calls the components `scroll-gallery` / `scroll-group`.                   | Brad Holmes, "Why Most Scroll Animations Miss What Apple Gets Right"; scrollytelling.ai | `ScrubbedFilm` is current practice. Frame stacks would be a regression.                                      |
| Judges reward **art direction with a clear point of view** — every type choice, colour and grid serving a single idea — and **directed motion**: "not animation for its own sake, but choreography with transitions that carry meaning, scroll sequences that pace a story".                 | Digital Strategy Force                                                                  | The whole page needs ONE idea that motion serves. See "The spine".                                           |
| **Cartier Watches & Wonders 2026** (Immersive Garden; Awwwards SOTD + CSSDA): six **self-contained alcoves** — "intimate, protective spaces inviting visitors into moments of wonder" — scrolled through **like rooms in a museum**. "Scroll moves you between rooms, not just down a page." | Awwwards; Immersive Garden; utsubo.com                                                  | The structural exemplar. Borrow the **idea**, not the WebGL.                                                 |
| **Snow Fall** (NYT, 2012) established scrollytelling; **Scrollama** (Russell Samora, The Pudding) packaged it: one pinned graphic, discrete text steps, an IntersectionObserver **trigger line** partway up the viewport rather than plain visibility.                                       | scrollytelling.ai, "Famous Scrollytelling Examples"                                     | The interior pattern for every room. The trigger line is what stops two steps being active on a fast scroll. |
| **Nous portal**: sections separated by **whitespace rather than borders**; dithered hero imagery (`dither-19.webp`, `dither-edits-93.webp`); **monospace** for numeric/technical readouts; generous letterspacing; centred vertical scroll.                                                  | portal.nousresearch.com                                                                 | Directly fixes failures 2 and 3 above. Founder named this site twice.                                        |
| Editorial longform: display **48–96px**, body **18–20px** for longer dwell; dark palettes build tension before a word is read.                                                                                                                                                               | Maglr; Ben Nichol, "Scrollytelling Narrative"                                           | Our body is currently ~17px at the low end. Raise it.                                                        |
| **Lenis** (~3kB, Darkroom Engineering) runs **on native scroll** — `position: sticky`, anchor links and accessibility keep working — and is built to sync GSAP/parallax off one rAF loop.                                                                                                    | lenis.darkroom.engineering; GitHub                                                      | Already a dependency (`lenis@1.3.17`, `gsap@3.14.2`). Zero install cost.                                     |
| Scrolljacking breaks JAWS/VoiceOver and can make content **keyboard-unreachable** (WCAG 2.1 failure). Parallax triggers vestibular symptoms. `prefers-reduced-motion` needs more than a blanket `animation: none`.                                                                           | Greenlit Content; Accessible Web; css-scroll-driven.com                                 | Hard constraint. See "What we refuse".                                                                       |

## The spine: the page brightens as you climb

One idea, and every motion decision serves it.

The page opens in darkness over the face of the deep and ends in full light. That
is not decoration — it is the shape of the story. A single scroll-linked custom
property `--room-light` runs `0 → 1` across the whole document. It drives:

- **plate opacity and brightness**
- **ground colour** from `--color-tehom` (#0a1320) toward `--color-scroll` (#efe5d8)
- **type colour**, inverting from cream-on-navy to navy-on-cream by the last room
- **veil opacity** over each plate

**The page is CLIMBED, not descended** (founder direction, 2026-08-30). The reader
lands at the bottom and scrolls up into the light. `.wig-main` is
`flex-direction: column-reverse`, so the first DOM child — the door — renders at
the visual foot and Room 07 sits at the top. Scrolling is entirely normal;
nothing is hijacked.

**Why column-reverse and not reversed markup.** DOM order stays in narrative
order, so a screen reader, a crawler and the no-JS page all still read the door
then Room 01 first. Reversing the markup would have made the accessible reading
order run backwards — the same class of failure as scrolljacking, which this
page's own research flags as a WCAG 2.1 keyboard and screen-reader break.

**Three things invert with it**, each found by measuring rather than assuming:
the light spine's within-room progress (the door was reading 1.0 — full daylight
at the exact moment it should be black), the out-of-range fallbacks (the
geometrically-first element on screen is now the LAST room), and the film scrub
(the reader was landing on the final frame and the last beat, with the sequence
running backwards as they climbed).

**The spine has exactly one dip, and Scripture put it there.** Matthew 27:45:
_"From the sixth hour until the ninth hour darkness came over all the land."_
Luke 23:44 says the same. Room 05 — the crucifixion — is the one room where
`--room-light` **falls** instead of rising.

**Measured on the climb:** door 0.03 → 0.12 → 0.29 → 0.48 → 0.65 → **Room 05 at
0.18** → 0.94 → 1.0. Ground travels from near-black navy to cream.

## Seven rooms, and the seventh is the threshold

The count is not arbitrary. Founder direction: **seven, with the seventh as the
threshold.** Seven is the most solidly attested number in Scripture — the creation
week, the sevens of Revelation. The scrubbed film is not a room: it is the **door**
you pass through to reach them, and it sits at the foot of the page where the
reader lands.

| #   | Room                            | Pattern                                                                                           | Plate                             | `--room-light`         |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------- |
| —   | **The door**                    | Scrubbed film at the visual bottom; three beats hand off across the scrub; the two-ways-up choice | genesis film                      | 0.00                   |
| 01  | Not a force. Someone.           | Sticky stage + 3 steps                                                                            | `deep`                            | 0.06                   |
| 02  | A story in four movements       | **Centrepiece.** Stage swaps plate per movement                                                   | `deep → break → rescue → restore` | 0.18                   |
| 03  | He is not given one name        | Pinned Hebrew at display scale, 15 names                                                          | `names`                           | 0.40                   |
| 04  | One God. Father, Son, Spirit    | Matrix that builds a row per step                                                                 | —                                 | 0.56                   |
| 05  | The ninth hour                  | Sticky stage; **the light falls here**                                                            | `rescue`                          | 0.74 → **0.18** → 0.80 |
| 06  | What being saved actually means | Sticky stage + steps                                                                              | `restore`                         | 0.88                   |
| 07  | **The threshold**               | Full light. Navy on cream.                                                                        | `help`                            | 1.00                   |

**Room 07 carries two things of equal weight**, because being sent out means both:

- _If you want to keep going_ — three next steps, ordered by how much they ask.
- _If what you need right now is a phone number_ — Seeking Help Georgia at full
  section weight with its own plate, naming what is actually there: crisis
  support, a bed tonight, food, rent and power, a doctor, a lawyer. Free,
  printable, no sign-up, nothing to believe first.

## Two ways up

Someone opening this at three in the morning does not owe the page a twenty-minute
climb. The door offers **The climb** (seven rooms) or **The short way** (the same
story, straight).

Short mode keeps every room, claim, verse and attribution in the DOM and only
collapses the stepped expansions — so with JavaScript off, or for a crawler, the
page is still the complete text. Short is something a reader chooses, never a
truncation imposed on them. Room 07 stays whole in both modes.

**Measured: 42,398 px → 9,814 px, a 77% shorter page.**

## The nine, used honestly

The founder asked whether nine is God's number. It is not, in any well-attested
sense: most schemes assigning meanings to nine descend from E.W. Bullinger's
_Number in Scripture_ (1894), which is a nineteenth-century construction rather
than exegesis. The repo's standing rule — never overstate what the text supports,
and document the rejection — applies.

Nine's real weight in Scripture is **a moment, not a structure**: the ninth hour,
when Jesus cried out and died. Three gospels record it. So nine is spent as
content, at the hinge of Room 06, and never as architecture:

- Matthew 27:45 — "From the sixth hour until the ninth hour darkness came over all the land."
- Matthew 27:46 / Mark 15:34 — "About the ninth hour Jesus cried out in a loud voice…"
- Luke 23:44 — the sixth hour, darkness until the ninth
- Luke 23:46 — "Father, into Your hands I commit My Spirit."

All five verified present in `public/bibles/BSB` and quoted verbatim.

The structural numbers stay seven and eight, which carry far more weight: seven is
the most solidly attested number in Scripture, and eight has a building shaped
like it.

## The door fixes the dead stretch

The track shortens from 320vh to 220vh, and the copy becomes three beats that hand
off rather than one that fades to nothing:

| scrub     | beat                                                      |
| --------- | --------------------------------------------------------- |
| 0.00–0.30 | "You have heard the words God and Jesus."                 |
| 0.30–0.62 | "This is what they actually mean."                        |
| 0.62–1.00 | "No church background. Nothing to agree to. Just scroll." |

Each beat crosses over the last. No point in the track is ever empty.

## Typography and layout

- **Measure centred**, not left-aligned in a wide container. `margin-inline: auto`
  on the reading column, room number and kicker centred with it.
- **Separation by whitespace, never rules** (Nous). Every `border-top` on a chapter
  head is removed; rooms are separated by space and by the light shift.
- **Body 19px** (`clamp(1.15rem, 2.2vw, 1.25rem)`), up from ~17px, per the
  18–20px dwell-time standard.
- **Display 48–96px** (`clamp(3rem, 8vw, 6rem)`) for room titles.
- **Monospace for readouts** (Nous): room numbers, scripture references, the
  progress rail. Uses the existing Industry face at tight tracking; no new font.
- Line length capped at 62ch.

## Content: rewritten at FK ≤ 8.5

Founder direction: _"Think if Hemingway wrote this in terms of word choice- choose
the easier word to understand rather than the longer more precise word."_ Target is
the repo's own standard, verified with `scripts/check-readability.mjs`
(`fkMax: 8.5`, plus its 30-word and hard-cap sentence rules).

Specific rewrites: "rupture" → "the break"; "restoration" → "put right";
"consequence" → "what we had coming"; "negotiable" → cut; "levelling" → "it puts
everyone on the same footing". Every scripture quotation stays **corpus-verbatim**
from `public/bibles/BSB` — the prose around it changes, the quotations never do.

## The narration — excluded from this pass

The site has the founder's cloned voice and the SA-043 pipeline
(`render_el_catalog.py`, ElevenLabs `eleven_v3`), and a page a stranger can listen
to would be genuinely unique.

**Founder direction 2026-08-30: "finish the entire overhaul minus audio."** So it
is out of scope for this pass. When it returns, the hard constraint holds: it runs
**after all text is final**, because the track stores a `textHash` and any later
prose edit invalidates it and every chapter mark in it. Dry-run first and report
the exact character cost before spending.

## What we refuse, and why

- **No WebGL / Three.js rooms.** Cartier's grammar — dreamlike environments,
  mirrored surfaces, hidden gestures rewarding the curious — exists to make you
  want a watch. Pointed at God it makes God an object of connoisseurship. It is
  also ~500KB on a phone against a Workers free tier of 10ms CPU.
- **No scrolljacking.** Scroll is never captured, hijacked or paced for the
  reader. Every room is reachable by keyboard and by anchor link.
- **No Web Audio score.**
- **No hidden gestures.** A page for someone who knows nothing must not reward
  only the confident.

## Performance, and a correction

An earlier measurement of this page reported an **18-second LCP**. That was a
measurement error worth recording because it is easy to repeat: **LCP stops
updating at first user input, and a programmatic scroll is not input**, so a
script that scrolls while observing LCP watches the number climb every time a
larger element enters view. Measured correctly, sitting still: **LCP 92–456 ms,
FCP 84–336 ms, CLS 0.069, zero long tasks, 118 fps scrolling.** The page was never
failing Core Web Vitals.

The real waste was real: **2,327 KB of plates were requested at 24 ms**, before any
scrolling, for a room thousands of pixels away — because the story stage rendered
all four movement plates eagerly so it could cross-dissolve between them. Eleven
`<img>` tags served six files.

Fixed with 960px derivatives for stage slots (62% smaller), rendering only the
plate in view and the next one, and `loading="lazy"` + `decoding="async"` +
`fetchPriority="low"` + intrinsic dimensions throughout. The door film's 4.3 MB
fetch defers to first scroll or main-thread idle.

**Measured: plate bytes before any scroll 2,327 KB → 400 KB, an 83% cut.**

**This reverses the planned upscale to 2400×1600.** Serving the master size would
roughly double image payload for no visible gain at these display sizes. Masters
stay in `design-sources/`. Note `next.config.ts` sets `images.unoptimized`, so
there is no srcset in this repo.

## Accessibility, as a first-class requirement

- `prefers-reduced-motion`: the film becomes a still, every stage un-pins, every
  step renders as ordinary flow prose, and `--room-light` snaps to a fixed
  mid-value rather than animating. Not a blanket `animation: none`.
- Full keyboard reachability; visible focus on every control; 44px targets.
- The steps are ordinary flow content in reading order, so the page is a normal
  document to a screen reader. Pinned stages are `aria-hidden` decoration unless
  they carry an explicit label.
- **With JavaScript off the page is complete prose.** Hidden-start states stay
  scoped to `[data-js="true"]`.
- WCAG 2.1 AA contrast held at **both ends** of the light spine — checked at
  `--room-light: 0` and `1`, not only in the dark.

## Components

| File                | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `Room.tsx`          | One act: ground, plate, light level, entrance, exit transition                     |
| `StickyStepper.tsx` | Sticky stage + stepper text; Scrollama trigger line (already written, uncommitted) |
| `ScrubbedFilm.tsx`  | Unchanged except the three-beat copy and 220vh track                               |
| `LightSpine.tsx`    | Owns `--room-light`; one rAF loop, Lenis-synced                                    |
| `NameStage.tsx`     | Room 03 pinned Hebrew                                                              |
| `CompareStage.tsx`  | Room 04 building matrix                                                            |
| `ProgressRail.tsx`  | Fixed room indicator, monospace, keyboard-navigable                                |

## Plates

Six generated this session via `/imagen` → Codex built-in `image_gen`, 1536×1024
each (the full 1,572,864px budget at 3:2; no upscale needed). Strict cobalt/cream
duotone, Ben-Day halftone, amber spot, no text, no figures, no hands — matching the
`CLAUDE.md` style spec and the SA-133 "no visible hands, compositionally" rule.

`deep · break · rescue · restore · names · help`

They must be converted to `.webp` and inspected at 1:1 before install.

## Acceptance

Ticked only where verified by measurement or by eye. Everything else is open.

- [x] No point in the door's track is empty — three beats hand off across the scrub
- [x] Reading column centred at every breakpoint; no `border-top` section rules
- [x] The page loads at the bottom and is climbed; DOM order stays narrative
- [x] `--room-light` measurably runs 0 → 1 across the climb, with the ninth-hour dip
- [x] Two ways up; short mode keeps all content in the DOM
- [x] Seeking Help Georgia is a full section in Room 07 with its own plate
- [x] Reading level FK ≤ 8.5 (measured 2.74 with the repo's own formula)
- [x] Plate bytes before scroll under 500 KB (measured 400 KB)
- [ ] Every scripture quotation still byte-matches `public/bibles/BSB` — not re-verified since the rebuild
- [ ] Page is complete prose with JavaScript disabled — written for, never re-tested
- [ ] Reduced-motion: nothing pinned, nothing animated, still readable — written for, never tested
- [ ] AA contrast verified at both ends of the light spine
- [ ] Keyboard: every room reachable, focus visible throughout
- [ ] Mobile at 375px on the rebuilt page
- [ ] Rooms 01–07 looked at, not just measured
- [ ] Full test suite green since the rebuild
- [ ] Rendered-DOM tests for the seven new components (devo-go trap #1 requires these)
- [ ] Two plates failing `verify-masters.mjs` (`deep` 54%, `restore` 39% blank paper) regenerated
- [ ] Plate set passes the four set-level axes — currently 3 of 4 fail
- [ ] SBL Hebrew resolved (font file absent; licence question open)
- [ ] Live verify after deploy
