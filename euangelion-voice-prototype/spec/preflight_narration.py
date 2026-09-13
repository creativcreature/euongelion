#!/usr/bin/env python3
"""Prove a narration script is complete and speakable BEFORE any credit is spent.

Founder rule, 2026-09-13: audio is never re-rendered. So everything that used to
be found by listening afterwards is checked here first, on text, for free:

  1. COVERAGE. Every sentence the page shows a reader is in the script, in the
     contract the track will be rendered with. The only page text not read is
     listed by name (sources, pull quotes that repeat the prose, image alt text
     and captions, video embeds, the deep-dive button) so nothing is dropped by
     accident.
  2. SPEAKABILITY. Nothing the voice would read as symbols: original-language
     glyphs, raw chapter:verse, Strong's numbers, abbreviations, Roman numerals
     without a cue word, markup, URLs.
  3. REQUEST PLAN. Exactly the requests the renderer will send: count, sizes,
     and confirmation that no request cuts a sentence.

Writes the full script, request by request, to --out so it can be read end to
end before rendering. Exit code 1 on any coverage or speakability failure.

Usage:
  python3 preflight_narration.py <slug> [<slug> ...] [--out DIR]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne                      # noqa: E402
import render_el_catalog as rc                      # noqa: E402

# Page text that is deliberately not read aloud, by module type or field.
NOT_READ_TYPES = {"resource", "pullquote", "inline-image", "art", "video", "cta"}
NOT_READ_FIELDS = ne.NON_PROSE | {
    "emphasis",        # phrases lifted from the passage that is already read
    "redLetter",       # the same passage, marked for colour
    "wordByWord",      # a gloss table of the original words
    "transliteration", # spoken as the vocab headword
    "options",         # multiple-choice buttons
    "chiasm_position", "format",
}

SPEAK_TRAPS = [
    (re.compile(r"[֐-׿Ͱ-Ͽἀ-῿יִ-ﭏ]"),
     "original-language glyph"),
    (re.compile(r"\d+:\d+"), "raw chapter:verse"),
    (re.compile(r"\b[HG]\d{3,5}\b"), "Strong's number"),
    (re.compile(r"\b(?:c|ca|cf|ch|vol|pp|ff|vs|viz|e\.g|i\.e)\.(?=\s|$)"),
     "abbreviation"),
    (re.compile(r"\b(?!I\b)[IVXL]{2,}\b"), "Roman numeral"),
    (re.compile(r"https?://|www\."), "URL"),
    (re.compile(r"\b\d+\.\d+"), "dotted number"),
    (re.compile(r"\d\s*[-–]\s*\d"), "numeric range"),
    (re.compile(r"\b\d+:\d{2}\b"), "clock time or duration"),
    (re.compile(r"[&%#@*_\[\]{}<>|~^\\/=+]"), "symbol"),
    (re.compile(r"\b[123] [A-Z][a-z]+"), "numbered name read as a count"),
]


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def page_sentences(module):
    """Sentences a reader sees in one module, with the field they came from."""
    out = []

    def walk(value, field):
        if isinstance(value, str):
            text = ne.to_speech(value)
            for sent in re.split(r"(?<=[.!?])[\"')\]]?\s+", text):
                if len(sent.split()) >= 3:
                    out.append((field, sent))
        elif isinstance(value, list):
            for item in value:
                walk(item, field)
        elif isinstance(value, dict):
            for k, v in value.items():
                if k not in NOT_READ_FIELDS:
                    walk(v, field)

    for field, value in module.items():
        if field in NOT_READ_FIELDS:
            continue
        walk(value, field)
    return out


def check(slug, contract, out_dir):
    dev = json.load(open(os.path.join(REPO, "public", "devotionals", f"{slug}.json")))
    segs = ne.extract(dev, contract)
    spoken = " ".join(s["text"] for s in segs)
    # Citations are expanded in the script, so compare on the expanded form.
    haystack = norm(spoken)
    missing, skipped = [], {}

    for i, m in enumerate(dev.get("modules") or [], 1):
        t = m.get("type")
        if t in NOT_READ_TYPES:
            skipped[t] = skipped.get(t, 0) + 1
            continue
        for field, sent in page_sentences(m):
            if norm(ne.speech_v2(sent)) not in haystack \
                    and norm(sent) not in haystack:
                missing.append((i, t, field, sent))

    traps = []
    # A line break with no punctuation before it joins two lines into one
    # run-on sentence unless the extractor splits there.
    for i, m in enumerate(dev.get("modules") or [], 1):
        if m.get("type") in NOT_READ_TYPES:
            continue
        for field, value in m.items():
            if field in NOT_READ_FIELDS or not isinstance(value, str):
                continue
            for hit in re.finditer(r"[^\n.!?:;\"'”’)\s]\n(?![ \t]*(?:[-*+]|\d+\.)[ \t]|\s*\n)", value):
                a = max(0, hit.start() - 40)
                traps.append((i, "line break with no pause", value[a:hit.end() + 40].replace("\n", " ⏎ ")))
    for s in segs:
        for rx, what in SPEAK_TRAPS:
            for hit in rx.finditer(s["text"]):
                a = max(0, hit.start() - 40)
                traps.append((s["module_index"], what, s["text"][a:hit.end() + 40]))

    groups = rc.chunks(segs, contract)
    sizes = [len(" ".join(x["text"] for x in g)) for g in groups]
    cut_mid_sentence = 0
    for g in groups:
        text = " ".join(x["text"] for x in g).rstrip()
        if not re.search(r"[.!?:;\"')\]]$", text) and len(text.split()) > 3:
            cut_mid_sentence += 1

    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, f"{slug}.script.txt"), "w") as fh:
            for n, g in enumerate(groups, 1):
                text = " ".join(x["text"] for x in g)
                fh.write(f"── request {n} · module {g[0]['module_index']} · "
                         f"{len(text)} chars · gap {rc.gap_after(g):.2f}s\n{text}\n\n")

    words = sum(len(s["text"].split()) for s in segs)
    ok = not missing and not traps
    print(f"{'PASS' if ok else 'FAIL'} {slug} | contract {contract} | {words} words | "
          f"{sum(sizes):,} chars | {len(groups)} requests "
          f"(max {max(sizes)}, min {min(sizes)}) | "
          f"unfinished requests {cut_mid_sentence}")
    print(f"     not read by design: {', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none'}")
    for i, t, field, sent in missing:
        print(f"     MISSING module {i} {t}.{field}: {sent[:110]}")
    for i, what, ctx in traps[:40]:
        print(f"     SPEAK module {i} {what}: …{ctx}…")
    return ok, sum(sizes)


def main():
    slugs = [a for a in sys.argv[1:] if not a.startswith("--")]
    out_dir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
    if out_dir in slugs:
        slugs.remove(out_dir)
    all_ok, total = True, 0
    for slug in slugs:
        ok, chars = check(slug, ne.CONTRACT_LATEST, out_dir)
        all_ok &= ok
        total += chars
    print(f"\n{'ALL PASS' if all_ok else 'NOT READY'} · {len(slugs)} devotional(s) · "
          f"{total:,} characters to render")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
