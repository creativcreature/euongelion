# Newspaper Edition — Specimen

**Live URL:** `https://euangelion.app/audits/2026-05-16-newspaper-edition/`
**Source:** `public/audits/2026-05-16-newspaper-edition/index.html` (single self-contained file, ~2,500 lines, ~6,950 visible words)
**Brand:** Cobalt Triad on Newspaper Cream · Instrument Serif + Inter · 60–30–10 · single-ink print logic
**Mode:** Demo page, not strategy memo. Every classic broadsheet element rendered as a working visual specimen — not described, not debated, not gated behind a Yes/Maybe/No.

This page is the **opposite** of `/audits/2026-05-16-newspaper-metaphor/`. That earlier page is a pitch document with decision controls. This page is a finished one-edition broadsheet a designer could screenshot and lift.

---

## Companion files in this folder

| File | What it is |
| --- | --- |
| `research-newspaper-anatomy.md` | 9,000-word deep-dive on broadsheet anatomy. Sources: Society for News Design, Poynter, Library of Congress Chronicling America, Tim Harrower's *Newspaper Designer's Handbook*. Read this before changing any terminology on the specimen page. |
| `comic-strip-prompts.md` | All four comic-strip generation prompts saved verbatim with the exact MCP session config used to produce them. Re-runnable. |
| `README.md` | This file. |

## Companion assets on disk

```
public/audits/2026-05-16-newspaper-edition/
├── index.html                                  ← the specimen page itself
└── images/
    ├── comics/
    │   ├── 01-bus-stop.png                    ← B&W daily, "The Bus Stop"
    │   ├── 02-late-email.png                  ← B&W daily, "The Late Email"
    │   ├── 03-walking-home.png                ← B&W daily, "The Walk Home"
    │   └── 04-sunday-color.png                ← Sunday color, "The Boat in the Storm" (8 panels + title banner)
    ├── editorial/
    │   └── editorial-cartoon.png              ← Single-panel, "The Stillness Problem"
    ├── photos/
    │   └── lead-story-photo.png               ← Halftone documentary photo, elderly woman in pew
    ├── ads/
    │   └── in-character-ad.png                ← Cobalt + crimson display ad, "Morning Bread"
    └── infographics/
        └── liturgical-year-infographic.png    ← Liturgical wheel, cobalt + crimson, hand-drawn
```

All assets generated this session via the nanobanana MCP (Gemini Imagen). No image from `/images/devotional-prints/` is used; the strip art is bespoke and the lineage spec is in `comic-strip-prompts.md`.

---

## Section index — what each part of the page demonstrates

Each row below pairs a section on the page with the **newspaper-design element** it is a worked example of. Terminology is drawn from `research-newspaper-anatomy.md` (Section 2). Page anchors are HTML `id`s on the broadsheet page itself.

### Page A1 — Front Page · `#page-a1`

| Section on the page | Element it demonstrates |
| --- | --- |
| Nameplate / flag — *Euangelion* wordmark with Greek subtitle | **Nameplate** (American) = **Flag** (newsroom shop term) |
| Slogan + weather glance flanking the nameplate | **Ears** (upper-left and upper-right corners of the front page) |
| `A1 · Front Page · …` strip at the top | **Folio line** |
| "Inside today · Editorial A2 · Feature A3 · …" | **Refer / Index** (front-page table-of-contents to inside stories) |
| "TODAY'S LEAD · DEVOTIONAL · ECCLESIASTES 3 · DAY 134" | **Kicker** (a.k.a. eyebrow) |
| "Be still. He has not gone anywhere." | **Banner headline** (a.k.a. streamer) |
| Italic drophead | **Deck** (a.k.a. drophead, readout) |
| *By* The Editors · *Photograph by* Staff | **Byline** |
| `NEW JERUSALEM` opening the body | **Dateline** (AP style — all caps, city, em-dash) |
| First paragraph of the lead, oversized first letter | **Lede** (deliberately misspelled to distinguish from hot-metal *lead*) + **drop cap** (4-line) |
| Halftone photograph of Mrs. Renfrew + caption | **Photo** + **cutline** (with credit) |
| "The trouble with stillness is that the marketplace has noticed it." in big italics | **Pull quote** (lift-out quote) |
| "Continued on page A8" at the column foot | **Jump line** (continued line) |
| "Five ways to keep the hour" box | **Sidebar** |
| House promo for the Sunday edition | **Front-page promo** (refer to inside) |

### Page A2 — Editorial Page · `#page-a2`

| Section on the page | Element it demonstrates |
| --- | --- |
| Staff box — Editor, Theological Editor, Designer… | **Masthead** (American sense — the publishing-staff box, **distinct** from the page-one nameplate) |
| "Why we changed the paper." | **Editor's note** |
| "Against the velocity of certainty." | **Op-Ed** ("opposite-the-editorial" page, est. 1970 at the NYT) |
| Drawn single-panel "The Stillness Problem" | **Editorial cartoon** (in the Herblock / Oliphant register) |
| Four reader letters with one **Editor's reply** | **Letters to the Editor** |
| Three corrections from earlier this week | **Errata** / corrections box |

### Page A3 — Feature · `#page-a3`

| Section on the page | Element it demonstrates |
| --- | --- |
| 12-column modular grid: lead tile + scripture + funnies + opinion + letters + classifieds preview + almanac + weather + saints + classifieds | **Bento / modular grid** — every tile populated with real content, no placeholder copy |
| Liturgical-year wheel illustration + cutline | **Infographic** (in the early-1980s USA Today register, hand-drawn) |
| "16 May, through the centuries." with five dated entries | **Almanac / On This Day** |

### Page A4 — Lifestyle · `#page-a4`

| Section on the page | Element it demonstrates |
| --- | --- |
| Two letters from readers with full editor replies | **Advice column** ("Dear Editor" — the Dear Abby format adapted) |
| "Postcard from Capernaum" | **Travel column** (Saturday-Friday standing rotation) |
| Saturday evening · Sunday morning · This week notable | **Service / event listings** (replaces legacy TV / radio listings) |

### Page A5 — Classifieds + Obituaries · `#page-a5`

| Section on the page | Element it demonstrates |
| --- | --- |
| 5 classifieds categories: Calls (Help Wanted), For Sale, Personals (prayer requests), Lost &amp; Found, Notices | **Classifieds** (the post-1973 unsegregated form — no "Help Wanted Male / Female") |
| 3 obituaries — Helen, Marcus, Tomi | **Obituaries** / **In Memoriam** ("Saints Remembered") |

### Page A6 — Data · `#page-a6`

| Section on the page | Element it demonstrates |
| --- | --- |
| Scrolling scripture ticker strip across the top with ▲ ▼ ▶ | **Stock ticker** (newspaper market-summary strip, repurposed) |
| Today + 7-day "Spiritual Climate" panel | **Weather panel** (icon + word + extended forecast) |
| Scripture Market table: Reference / Direction / Note / Day | **Stock-market summary table** (the body of a financial page) |
| 12-cell grid: Aries → Pisces, one Scripture verse per house | **Horoscope** replacement: "Twelve Houses" |
| Standings table: Saints commemorated this week by tradition | **Sports page** (standings table) replacement: "This Week's Saints" |

### Page A7 — Puzzles · `#page-a7`

| Section on the page | Element it demonstrates |
| --- | --- |
| 13×13 grid with 180° rotational symmetry, 18 numbered start cells | **Crossword** (per Margaret Farrar's 1942 NYT rules) |
| 30 themed clues across the Across + Down lists | **Crossword clues** (themed: "Eastertide Verbs") |
| 12×12 letter grid with 10 highlighted words | **Word search** (forward, across, down, one diagonal) |

### Page A8 — The Funnies · `#page-a8`

| Section on the page | Element it demonstrates |
| --- | --- |
| Continuation of the front-page lead | **Jump page** (basement of the broadsheet) + **continued line** ("STILL, A8") |
| 3 daily strips with Jesus as recurring lead character — B&W, halftone, hand-lettered captions | **The Funnies** — the daily comic strip slot |
| 1 Sunday color strip (8 panels + title banner) | **Sunday color comics** (King Features 8-panel-with-title format) |

### Page A9 — Back / Circulation · `#page-a9`

| Section on the page | Element it demonstrates |
| --- | --- |
| The "Morning Bread" cobalt + crimson illustration | **Display advertisement** (in-character, riso/halftone duotone) |
| Boxed "Subscribe today" form | **Subscription / circulation box** |
| Cross-cutting strips: where to read, where to write | **Circulation panel** (delivery information) |
| Bottom strip: paper, composition, press, acknowledgments, sources | **Colophon / footer** (printer info, copyright, composition credits) |

---

## Section divider strip vocabulary

Every page-divider on the specimen uses the term newspaper designers actually use, per `research-newspaper-anatomy.md`. The terms in use:

`Nameplate` · `Ear` · `Folio` · `Refer` · `Banner Headline` · `Deck` · `Kicker` · `Byline` · `Dateline` · `Lede` · `Drop Cap` · `Pull Quote` · `Cutline` · `Jump Line` · `Sidebar` · `Bento` · `Masthead` · `Op-Ed` · `Editor's Note` · `Editorial Cartoon` · `Letters to the Editor` · `Editor's Reply` · `Errata` · `Dear Editor` · `Travel` · `Service Listings` · `Classifieds` · `Calls` · `Personals` · `Lost & Found` · `Notices` · `Saints Remembered` · `In Memoriam` · `Spiritual Climate` · `Scripture Market` · `Twelve Houses` · `Standings` · `Crossword` · `Word Search` · `The Funnies` · `Sunday Color` · `Display Advertisement` · `Subscription` · `Circulation` · `Colophon`

---

## Imagery rules — honored

- Every image used on this specimen page was generated this session into the `images/` subfolder. **None** of the assets in `/images/devotional-prints/` is referenced.
- All assets are stored locally and reference by relative path — no hot-linked stock, no broken refs.
- Brand: every painted/woodcut-style asset uses the cobalt + cream + crimson palette with visible halftone dot shading and slight ink misregistration. The comic-strip assets are pure black ink on cream newsprint (the comic-strip convention overrides the brand duotone for that single artifact type).
- Comic-strip prompts saved at `comic-strip-prompts.md` — the founder can re-run any single strip with one MCP call.

---

## Voice rules — honored

- No clichés.
- No formula prayers.
- No emojis.
- The Schulz / Linus register: honest about hard things, never preachy, never snarky, never irreverent. Jesus is depicted reverently throughout the comic strips and never as the joke.
- Body copy in Instrument Serif, labels in Inter, hierarchy preserved.
- No "should we ship this" debate, no effort badges, no v1/v2 recommendation cards. The specimen is the build.

---

## To re-deploy

```bash
# This page is static HTML in /public/ — pushed to main, auto-deployed by Cloudflare integration
git add public/audits/2026-05-16-newspaper-edition/ \
        docs/audits/2026-05-16-newspaper-edition/
git commit -m "audit-2026-05-16: newspaper-edition specimen page"
git push origin main
```

To regenerate a comic strip, see `comic-strip-prompts.md`.
