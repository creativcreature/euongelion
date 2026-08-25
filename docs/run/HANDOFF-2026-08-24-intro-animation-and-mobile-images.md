# Handoff — 2026-08-24 — the intro animation, mobile images, and a deploy that eats content

Written for compaction. Everything here is either **shipped and live**, **open
with a named reason**, or a **trap worth keeping**. Nothing is in my head only.

At least three sessions ran in parallel through this day. Ids collided twice and
the shared checkout held 426 working-tree-only files under `public/`. Read
“Traps worth keeping” before deploying anything.

---

## Shipped and live

| PR | Decision | What |
| --- | --- | --- |
| `#41` | SA-123 (F-168) | Mobile images survive one bad network moment |
| `#42` | SA-123 (F-168) | The responsive hero variants, committed at last |
| `#43` | SA-127 (F-171) | The intro opens in the reader's own mode |
| `#38` / `#39` | SA-121 (F-166) | The homepage led with the Word — **reverted, see below** |
| `#40` | SA-121 (F-166) | The revert |

Live at time of writing: service worker **v154**, worker version
`140eb73e-c0d4-4db0-8d0d-50767ce4ff15`.

### The intro animation (SA-127 / F-171) — the headline

Founder: *"The homepage animation is not working at all the way it should. This
is the intro animation I want [telhaclarke.com.au]. I need 2 versions - one for
Darkmode, one for Light Mode… If Light Mode, Euangelion should be Blue, if Dark
Mode it should be white. I also want the subtle text rollover."*

**There was only ever ONE version.** The sheet was cobalt in both themes with
the wordmark KNOCKED OUT of it, so a light-mode reader watched a cream word on
blue for the entire intro and it turned blue only in the final frame as it flew
to the masthead. That is the whole bug; everything else followed from it.

Now the ground is the mode's own (paper `#f5eee3` light, `#171b69` dark) and the
word is drawn in the mode's own masthead colour from the first frame (`#1f2a8d`
light, `#efe5d8` dark) — the exact values `--mock-blue-text` resolves to, so the
hand-off is pure position and scale and the word lands as the thing it already
was.

The sequence is the reference's, in our materials: **per-letter one-face masks
with a duplicate stacked beneath**, the top copy rolling out as the duplicate
rolls in, staggered 36ms per letter over a 720ms roll (the same roll:stagger
ratio as their GSAP 2s / 47.5ms); then the ground leaves on a hard `clip-path`
inset, as their page opens on a clip curtain. Built in CSS — GSAP 3.13 +
CustomEase + SplitText is a large dependency for one ten-letter wordmark.

**The rollover** is their origin-flip wipe: `scaleX(0)` from the right at rest,
`scaleX(1)` from the left on hover, `0.7s cubic-bezier(.23, 1, .32, 1)`. The
flipped origin is the point — the rule never rewinds the way it came.

Reference decomposition (worth keeping, it took an agent to extract): GSAP 3.13,
CustomEase `gl.fastInOut` = `M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1`,
Lenis, Taxi.js. Runs **every hard load** — zero `sessionStorage` in their bundle;
it only feels once-per-session because SPA navigation never reloads. **They ship
no `prefers-reduced-motion` handling at all.** We do not copy that.

### Mobile images (SA-123 / F-168)

Founder: *"The mobile version of the homepage doesnt load the images."*
Production would not fail on demand — real Chrome AND real WebKit at 375px
painted everything. The cause was device-side: `sw.js`'s image handler answered
any failed fetch with a fabricated **empty 404**, and an installed PWA keeps the
same page alive for days, so one dead spot blanked images until the page itself
reloaded. It now retries once and otherwise fails with `Response.error()` — a
real network error. The featured devotional art (the LCP candidate) also dropped
`lazy` for `priority`.

### The homepage “Word first” rebuild — REVERTED

Built overnight to the research-backed order (Word of the Day → Soul Audit →
Grace Line → featured → scale line → one action), shipped, and reverted the next
morning on sight: *"revert the homepage your flow just doesnt make sense."* The
pre-SA-121 structure is the standing state. **Do not re-propose that reorder.**
The word-of-the-day resolver and the writer's copy alternates are recoverable
from `#38` if ever wanted. See `feedback_homepage_rebuild_reverted` in memory.

---

## Still open

1. **426 files under `public/` exist only in the shared working tree** — the
   whole All These Things series (devotional JSON, audio, imagery) plus the
   Seeking Help Georgia page. They are live only because deploys carry the
   working tree. **They should be committed by whoever owns them.** Until then
   every deploy is one clean checkout away from deleting them (see traps).
2. **Dark mode logs React error #418 on every page** (hydration mismatch).
   Confirmed **pre-existing** — the live site showed it before any change here,
   light mode is clean. Not diagnosed; nobody owns it yet.
3. **The `devotional-rekindled-video/` Remotion project cannot build from a
   fresh `npm ci`** — its `@remotion/cli` dependency is not in the site's
   `package.json`. It only builds in the session whose `node_modules` has it.
4. **Founder has not yet confirmed the intro visually.** Verified frame-by-frame
   in real Chrome in both modes, but the service worker moved v151 → v154 today,
   so a stale tab needs one hard reload. The intro plays **once per session** on
   `/` only.

---

## Traps worth keeping

**A clean-checkout deploy DELETES live content.** This is the big one.
`deploy-clean.sh` builds from `origin/main`, which is correct for not shipping
other sessions' half-finished code — and catastrophic for content, because other
sessions ship content they never commit. Deploying that way today would have
taken All These Things off the site. Use
`scratchpad/deploy-preserving.sh`: rsync the shared working tree into a stage,
overlay only your branch's changed files
(`git diff --name-only $(git merge-base HEAD origin/main) HEAD`), then
`npm ci && npm run deploy` from the stage. Exclude `devotional-rekindled-video`
or the build dies on its missing dependency. Memory:
`project_content_preserving_deploy`.

**The same trap already bit once today, in the other direction.** The mobile
hero 404'd because another session generated the `-960`/`-1600` hero variants,
committed the CODE that references them, and deployed the FILES working-tree
only — so the first clean deploy removed them. Caught by a post-deploy WebKit
probe listing `HTTP>=400`, not by any build step. Assets must be as durable as
the code that references them.

**`::after` is spoken for.** EditorialMotionSystem claims `::after` on every
`.mock-paper` link at runtime; any `::after` geometry un-collapses its hidden
underline into a painted slab. The rollover is built on `::before` for exactly
this reason, and the CSS says so at three separate sites.

**Computed styles will lie to you about an animation.** Every computed value for
the letter roll was correct while the intro was visibly broken — the mask sized
itself to both copies, so the word showed doubled and then vanished entirely.
Only capturing frames and **looking at them** caught it. Percentage transforms
are of the *element*, and the column is two faces tall, so one face of travel is
50%, not 100%.

**Ids race.** `SA-120`/`F-165` were claimed by another session mid-build and had
to be renumbered to `SA-121`/`F-166` during a rebase. Before claiming, check
`origin/main` **and** the shared working tree — this session's ids were already
taken locally through `SA-126`/`F-170`. `EXPECTED_FEATURE_IDS` must equal the
merged registry count, recomputed after every rebase.

**The commit-msg hook resolves every `F-###` you mention.** Citing a feature id
in prose requires that PRD staged in the same commit. Reword rather than fight
it.

**Port 3333 is often another session's dev server.** Use the Workers preview for
verification; it is the required path anyway (Rule 9).

---

## Where the tooling lives

- `scratchpad/deploy-preserving.sh` — the content-preserving deploy.
- `scratchpad/browser-check/check-intro.mjs` — frame-by-frame intro capture in
  both `colorScheme`s; writes PNGs to `intro-frames/`. Takes a base URL.
- `scratchpad/browser-check/check-hover.mjs` — rollover measurement rest→hover.
  Sets the first-run keys so the onboarding layer cannot intercept the pointer.
- `scratchpad/browser-check/check-mobile.mjs` / `check-webkit.mjs` — the mobile
  image probes, Chrome and WebKit.
- `scratchpad/browser-check/hero-heads.py` — all 21 hero variants, mobile UA.
  Note the edge **403s HEAD requests**; these are GETs for that reason.
