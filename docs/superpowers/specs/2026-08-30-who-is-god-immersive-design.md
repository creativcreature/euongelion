# /who-is-god — Eight Rooms

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

## The spine: the page brightens as you descend

One idea, and every motion decision serves it.

The page opens in darkness over the face of the deep and ends in full light. That
is not decoration — it is the shape of the story being told. A single scroll-linked
custom property `--room-light` runs `0 → 1` across the whole document. It drives:

- **plate dot density** via the SA-128 halftone engine (`src/components/lab/demos/halftone.ts`) — dots open as light rises
- **ground colour** from `--color-tehom` (#0a1320) toward `--color-scroll` (#efe5d8)
- **type colour**, inverting from cream-on-navy to navy-on-cream by the last room
- **veil opacity** over each plate

**The spine has exactly one dip, and Scripture put it there.** Matthew 27:45:
_"From the sixth hour until the ninth hour darkness came over all the land."_
Luke 23:44 says the same. So Room 06 — the crucifixion — is the one room where
`--room-light` **falls** instead of rising: it climbs to 0.74 on the way in,
drops to 0.18 across the sixth-to-ninth-hour steps, and recovers past the empty
tomb. Every other room rises monotonically.

That dip is the most defensible motion decision on the page. It is not a designer
choosing drama; it is the text describing the sky, and the page obeying it.

By Room 08 the reader is on cream paper in full light. Nobody has done this because
nobody else is telling this story; it is derived from the content rather than
applied to it. It satisfies the two things judges actually reward — a single clear
point of view, and motion that carries meaning — without a polygon on screen.

## Seven rooms, then the eighth

The count is not arbitrary and it is not my chapter list. Seven rooms walk the
story; the eighth is the threshold.

Eight is Scripture's number of new beginning — circumcision on the eighth day
(Gen 17:12), eight souls carried through the flood (1 Pet 3:20), and the
resurrection as the day after the seventh, which the fathers called the eighth
day. It is why **baptistries are octagonal**; Ambrose's inscription for the
octagonal font at Milan says so outright. For a page whose whole job is carrying
someone from outside to the threshold, the baptistry is a better structural
exemplar than a luxury pavilion, because it is load-bearing rather than borrowed:
the building is shaped like the thing it is for.

So the seven rooms are the story, told in the dark and coming slowly into light.
Room 08 is a different kind of room — full light, cream paper, navy type, no
plate behind the words. Crossing into it is the largest single light shift on the
page, and it is the only transition the reader will consciously notice.

| #   | Room                           | Pattern                                                                 | Plate                             | `--room-light`         |
| --- | ------------------------------ | ----------------------------------------------------------------------- | --------------------------------- | ---------------------- |
| 01  | The deep                       | Scrubbed film, **three** typographic beats handing off across the scrub | existing genesis film             | 0.00                   |
| 02  | Someone, not something         | Sticky stage + 3 steps; takes its first light on "Let there be light"   | `deep`                            | 0.06 → 0.16            |
| 03  | The story                      | **Centrepiece.** Sticky stage, plate swaps per movement                 | `deep → break → rescue → restore` | 0.16 → 0.42            |
| 04  | The names                      | Pinned stage, Hebrew at display scale, swaps per step through 15 names  | `names`                           | 0.52                   |
| 05  | One God, three                 | Sticky matrix building a row per step                                   | — (type only)                     | 0.62                   |
| 06  | Why Jesus — **the ninth hour** | Sticky stage + steps; the light **falls** here                          | `rescue`                          | 0.74 → **0.18** → 0.80 |
| 07  | What salvation is              | Sticky stage + steps                                                    | `restore`                         | 0.86                   |
| —   | **the threshold**              | the one transition the reader notices                                   | —                                 | 0.86 → 1.00            |
| 08  | The eighth day                 | Full light. Navy on cream. Two equal halves.                            | `help` (in its right half)        | 1.00                   |

**Room 08 carries two things of equal weight**, because being sent out means
both:

- _If you want to keep going_ — three next steps, ordered by how much they ask.
- _If what you need right now is a phone number_ — Seeking Help Georgia, at full
  section weight with its own plate (the lit window), naming what is actually
  there: crisis support, a bed tonight, food, rent and power, a doctor, a lawyer.
  Free, printable, no sign-up, nothing to believe first.

That placement is deliberate. The lit window belongs in the brightest room, and
the person who needs it should arrive at it in full light rather than find it in
a footnote — which is what the first build did, and what the founder rejected.

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

## Room 01 fixes the dead stretch

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

## The narration, offered

The site already renders devotionals in the founder's cloned voice (SA-043) and
ships a full audio pipeline. Room 01 offers a listen control. It never autoplays.
Sound that starts unbidden on a page someone opened at three in the morning is an
intrusion, not immersion.

Scoped as **phase 2** — the page ships without it if the render is not ready.

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

- [ ] No point in Room 01's track is empty; measured copy opacity ≥ 0.35 throughout
- [ ] Reading column centred at every breakpoint; no `border-top` section rules
- [ ] `scripts/check-readability.mjs` reports FK ≤ 8.5 on the page copy
- [ ] Seeking Help Georgia is a full room with its own plate
- [ ] `--room-light` measurably rises 0 → 1 across the document
- [ ] Every scripture quotation still byte-matches `public/bibles/BSB`
- [ ] Page is complete prose with JavaScript disabled
- [ ] Reduced-motion: nothing pinned, nothing animated, still readable
- [ ] AA contrast verified at both ends of the light spine
- [ ] Keyboard: every room reachable, focus visible throughout
- [ ] type-check, lint, all verify gates, build, Workers preview, live verify
