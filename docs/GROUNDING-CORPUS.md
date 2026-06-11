# GROUNDING CORPUS INVENTORY — Phase 0 (Elevation Brief v3.0)

**Date:** 2026-06-10 · Read-only inventory. What EXISTS vs what the brief assumes must be built.

## A. Scripture store — EXISTS, complete, verbatim-by-reference works today

- **`public/bibles/{BSB,WEB,KJV,ASV,YLT,DARBY,BBE}/`** — 7 public-domain translations, full verse text (each manifest: **31,086 verses, 66 books**), OSIS-coded book JSONs (`{chapter:{verse:"verbatim text"}}`). ~30 MB total.
- **`src/lib/bible/getVerse.ts`** resolves any reference (single/range/cross-chapter/whole-chapter) to verbatim text by reading the book JSON server-side (module-cached). Default `BSB`. **Renderer-ready today.** (Server-only by design; client barrel `index.ts` exposes metadata + `parseReference` only.)
- **GAP:** the 176 existing curated devotionals embed Scripture **inline** with **copyrighted** tags (NIV ×128, ESV ×26, NKJV ×5) and do **not** use `getVerse`. A grounded rebuild that wants verbatim PD text must route quoted references through `getVerse` (ready) rather than model output. (Short inline snippet quotes in hand-curated devotionals are defensible fair use; bulk hosting of full paid translations is the licensing line — see MEMORY.)

## B. Reference / commentary index — verbatim prose, keyword-only

- **`public/reference-index.json` — 15.6 MB, 5,114 chunks.** Each: `{id, source, sourceType, title, content, contextualSummary, keywords, scriptureRefs, priority, wordCount}`. `content` = full ~400-word **verbatim** PD prose. Breakdown: commentary 5,091, theology 12, bible 11. Top sources: Augustine _City of God_ (400), Calvin _Institutes_ (400), Pascal _Pensées_ (340), Luther _Galatians_ (262), Murray _Abide_ (244), Chesterton (237), à Kempis (225), Spurgeon, Edwards, Bunyan, Owen, Wesley, Tozer…
- **Retrieval = lexical (BM25 + RRF + diversity), NO vectors.** No `embedding` field exists. (`reference-retriever.ts` calls it "contextual retrieval" but it is keyword-based.)
- **DOC DRIFT TO FIX:** CLAUDE.md/MEMORY claim a **3.2 MB slim `reference-index-slim.json` used on Workers**. It **does not exist** — the loader header literally says _"NO SLIM INDEX. NO SILENT FALLBACKS"_ and loads the full 15.6 MB index via the Workers ASSETS binding. Update the docs.

## C. Historic-voice quote bank — EXISTS but small (~60 vs ≥300 wanted)

- **`content/reference/SOURCE-BANK.md`** (v1.0, ~60 verified quotes, **37 named voices** — every name in the brief: Augustine, à Kempis, Calvin, Spurgeon, Tozer, Bunyan, Owen, Pascal, Chesterton, Brother Lawrence + Luther, Bonhoeffer, Lewis, Kierkegaard, Nouwen, Chambers, Teresa of Ávila, Athanasius, Irenaeus…). Organized by theme / era / book, each fully cited (work, translator, page/section), with a verification-notes section flagging unverified attributions.
- **GAP vs brief:** ~60 → ≥300 = **~240 quotes to curate** (the by-book index is mostly empty stubs). This is editorial content work, not engineering.
- Adjacent usable banks (markdown): `HEBREW-GREEK-WORDS.md` (687 lines — feeds the `<WordNote>` Phase 3.1), `STORY-HOOKS.md`, `REFLECTION-QUESTIONS.md`, `BREATH-PRAYERS.md`. No `content/voices/` dir.

## D. Theme→passage maps — EXIST

- `src/lib/soul-audit/ingredient-selector.ts:82` `THEMATIC_SCRIPTURE_EXPANSIONS` — ~20 themes incl. the brief's exact `anxiety → ['Philippians 4:6-7','1 Peter 5:7','Matthew 6:34','Psalm 94:19']`.

## Bottom line

The brief's "build a grounding corpus" is mostly **already done**: 7 PD translations with a working verbatim resolver, a 5,114-chunk verbatim voice/commentary index with theme maps, and a 60-quote curated bank. The real corpus _gaps_ are: (1) grow the quote bank to ≥300, (2) route rendered Scripture through `getVerse` for the bespoke path, (3) optionally add embeddings for semantic retrieval, (4) fix the slim-index doc drift.
