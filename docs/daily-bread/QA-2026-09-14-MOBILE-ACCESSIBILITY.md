# Daily Bread V2 — mobile, performance and accessibility QA (plan §75, §77, §87)

SA-142 / F-184. Measured 2026-09-14 on a local **production** build (`next build` +
`next start`) of the fixture week, at commit `841a8555` plus the fixes below. It was
not measured on a dev server.

## Method

- **Phones:** iPhone 15 (393×852, DPR 3), iPhone SE (375×667, DPR 2), Pixel 7
  (412×915, DPR 2.625). Chromium through Playwright, with touch and a mobile user
  agent.
- **Throttling:** CPU 4× via CDP `Emulation.setCPUThrottlingRate`, and network "Slow 4G"
  (150 ms RTT, 1.6 Mbps down, 750 kbps up) via `Network.emulateNetworkConditions`.
- **Vitals:** `PerformanceObserver` in the page.
  - **LCP:** `largest-contentful-paint`.
  - **CLS:** `layout-shift` without recent input.
  - **INP:** the longest `event` entry with an interaction ID, from a real tap on the
    contents line.
  - **Long tasks:** counted while scrolling the whole paper.
  - **Memory:** `performance.memory`.
- **Accessibility:**
  - axe-core, WCAG 2 A/AA and 2.1 AA, on `<main>`;
  - heading order;
  - 40 Tab presses on desktop, checking each focused element for a visible outline,
    shadow or underline;
  - reflow at 320 CSS px (WCAG 1.4.10, equal to 400% zoom).
- **Editions:**
  - Sep 14, Broadsheet: lead plate, word search and verse rebuild;
  - Sep 16, Study Table: lead plate, crossword and quiz;
  - Sep 18, Prayer Book: the prayer first.

## Results after the fixes

| Edition | Phone | LCP | CLS | INP | Long tasks scrolling | Heap | Canvases | Overflow | axe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sep 16 | iPhone 15 | 7,444 ms | 0.058 | 48 ms | 0 | 13 MB | 1 | no | 0 |
| Sep 16 | iPhone SE | 7,300 ms | 0.060 | 80 ms | 0 | 14 MB | 1 | no | 0 |
| Sep 16 | Pixel 7 | 7,416 ms | 0.052 | 40 ms | 0 | 13 MB | 1 | no | 0 |
| Sep 14 | iPhone 15 | 7,420 ms | 0.068 | 32 ms | 0 | 14 MB | 1 | no | 0 |
| Sep 14 | iPhone SE | 7,424 ms | 0.061 | 24 ms | 0 | 12 MB | 1 | no | 0 |
| Sep 14 | Pixel 7 | 7,420 ms | 0.061 | 24 ms | 0 | 13 MB | 1 | no | 0 |
| Sep 18 | iPhone 15 | 1,580 ms | 0.108 | 16 ms | 0 | 12 MB | 1 | no | 0 |
| Sep 18 | iPhone SE | 1,576 ms | 0.061 | 24 ms | 0 | 14 MB | 1 | no | 0 |
| Sep 18 | Pixel 7 | 1,576 ms | 0.105 | 16 ms | 0 | 14 MB | 1 | no | 0 |

Keyboard and zoom, all three editions:
- 39–40 tab stops reached, none without visible focus, none off-screen;
- no horizontal overflow at 320px;
- one `<h1>` and no skipped heading levels.

Shader responsiveness: at most one canvas, 0 long tasks while scrolling, 30 fps cap.
Hydration: no mismatch on these pages under `next start`. The one console error is
the local server's missing service worker. (Under `next dev` a mismatch shows on the
site header, from the site-wide reveal script.)

## Fixed in this pass

1. **Critical axe violations in the puzzle grids.**
   - **Before:** word search `aria-required-parent`, 63–144 cells;
     `aria-required-children` on the grid.
   - **Cause:** `role="grid"` held `gridcell` buttons with no `row`.
   - **Fix:** each row of cells is wrapped in `role="row"` with `display: contents`,
     so the CSS grid is unchanged. The crossword got the same fix; its arrow-key
     navigation makes grid semantics correct.
   - **After:** 0 violations. The existing puzzle tests pass. The components are shared
     with the SA-114 paper, which gains the fix too.
2. **Layout shift from the contents line.**
   - **Before:** on a phone, the wrapped contents line grew from one line to three when
     the UI font arrived, pushing the paper down. Prayer Book CLS was 0.146.
   - **Fix:** on screens up to 700px it is one horizontally scrollable line with
     44px-high links (also meeting the touch-target rule).
   - **After:** 0.061–0.108.

## Still failing, with the decisions they need

1. **LCP of about 7.4 s on every edition led by a plate** (target 2.5 s). The LCP element
   is the lead plate. Series art is 300–565 KB webp (Sep 14's `kingdom.webp` is 565 KB),
   served at full size because `images.unoptimized` is true. On Slow 4G it arrives
   behind 2.2 MB of JavaScript in 29 site-wide chunks. First contentful paint is
   1.4 s, and the Prayer Book edition, with no plate up top, reaches LCP at 1.6 s.
   The options:
   - **(a) Resized derivatives.** Commit phone-sized copies of the 42 plates (for
     example 1200px wide), served through `srcset`. The plates keep their look, but the
     repo gains 42 files and a build step.
   - **(b) Cloudflare image resizing** at the edge. No repo files, but a paid Cloudflare
     feature and a config change.
   - **(c) Plate below the headline on phones.** Type becomes the LCP, the image comes
     later, and the front page composition changes.
   - **(d) Keep as is.** Accept a slow LCP on slow networks; fast networks are unaffected.
2. **Prayer Book CLS of 0.105–0.108 on two phones** (target under 0.1). What remains is
   the UI and serif fonts swapping into the front prayer (about 0.06), plus the
   site-wide shell header growing 23px after load (about 0.03). Both are site-wide font
   and header behaviour, not Daily Bread layout.

## Not measured

- **Real devices and Safari (WebKit).** Everything above is Chromium emulation.
- **Production over the real network.** The fixes are not deployed.
- **A screen reader pass.** axe checks the roles; no one listened with VoiceOver or
  TalkBack.
