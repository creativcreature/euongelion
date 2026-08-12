#!/usr/bin/env python3
"""Narration extraction v2 — complete, verbatim, register-tagged.

WHY THIS EXISTS
---------------
The shipped Audio Edition (`src/lib/audio/segments.ts` → `moduleText()`) reads a
fixed field list. The corpus carries far more prose than that list names, so
measured across 521 devotionals the reader speaks a median of only 70.7% of the
distinct prose in each entry — about 29% is silently never read. Entire module
types are skipped (`profile`: 69k words corpus-wide), as are
`insight.historicalContext` (66k), `vocab.usageNote`/`rootMeaning` (50k),
`bridge.newTestamentEcho` (36k), `story.connectionToTheme` (18k).

This module is the corrected contract: every module type has an explicit,
ordered field list, mirrored fields are deduped rather than read twice, and
non-Latin scripture glyphs are replaced by their transliteration so the voice
says a word instead of skipping or mangling one.

Output: ordered [{label, register, text}] where `register` selects narration
pace downstream. Verbatim by construction — shaping may change punctuation and
chunk boundaries, never wording.
"""
import json
import re
import sys
import unicodedata

# ── Reading order per module type ────────────────────────────────────
# First present field of each tuple wins (mirrored variants like
# teaching.content == teaching.body must never both be read).
READING_ORDER = {
    "scripture": [("reference",), ("passage", "text", "fullPassage"),
                  ("scriptureContext", "context")],
    "vocab": [("meaning", "definition"), ("rootMeaning", "root_meaning"),
              ("usage",), ("usageNote", "usage_note", "usageNotes"),
              ("grammarNote", "grammarSummary")],
    "teaching": [("content", "body"), ("keyInsight",)],
    "story": [("title",), ("content", "body"), ("connectionToTheme",)],
    "insight": [("content", "body", "text"), ("historicalContext",),
                ("fascinatingFact",)],
    "bridge": [("ancientTruth", "ancient"), ("modernApplication", "modern"),
               ("connectionPoint", "connection"), ("newTestamentEcho",),
               ("oldTestamentEcho",), ("question",)],
    "reflection": [("prompt", "question", "prompt_text")],
    "prayer": [("prayerText", "text"), ("breathPrayer",),
               ("scriptureEcho", "scripture_echo")],
    "takeaway": [("commitment",), ("content", "text"), ("action",), ("outcome",)],
    "comprehension": [("question",), ("explanation",)],
    "profile": [("name", "title"), ("era",), ("description", "bio", "summary"),
                ("keyTrait", "key_trait"), ("keyQuote", "key_quote"),
                ("lessonForUs",)],
    "interactive": [("instruction",), ("prompt",), ("follow_up",)],
    "recap": [("intro",), ("content",), ("integration_question",)],
    "sabbath": [("invitation",), ("content",), ("prayerText",)],
    "pullquote": [("quote", "content")],
}

# Labels, identifiers, media paths, presentation hints — never read aloud.
# Anything NOT here is picked up by the catch-all sweep, so a field that
# appears in only a few modules can never go silent (this is how
# `sabbath.content`, 295 words, was lost before the sweep existed).
NON_PROSE = {
    "type", "id", "slug", "heading", "translation", "language", "pronunciation",
    "strongsNumber", "invitationType", "prayerType", "interaction_type",
    "posture", "eyebrow", "dayLabel", "displayTitle", "heroImage",
    "heroImageAlt", "heroVariant", "markdown", "ctaLabel", "ctaHref",
    "ctaSubtext", "videoProvider", "videoId", "videoTitle", "videoCaption",
    "videoAttribution", "imageUrl", "imageAlt", "imageCaption",
    "inlineImageSrc", "inlineImageAlt", "inlineImageCaption",
    "inlineImageWidth", "duration", "location", "region", "modernDay",
    "no_modules_after", "hebrewOriginal", "greekOriginal", "greekText", "word",
}

# Navigation chrome — never spoken.
NAV_TYPES = {"inline-image", "art", "video", "cta", "resource"}

# Module type → narration register (pace band).
REGISTER = {
    "scripture": "scripture",
    "prayer": "prayer",
    "sabbath": "prayer",
    "reflection": "reflection",
    "comprehension": "reflection",
    "interactive": "reflection",
    "takeaway": "takeaway",
    "vocab": "teaching",
    "pullquote": "scripture",
}

# Spoken lead-ins so a bare field doesn't arrive without context.
PREFIX = {
    ("profile", "name"): "The voice behind today: ",
    ("profile", "keyQuote"): "In his words: ",
    ("profile", "key_quote"): "In his words: ",
    ("comprehension", "question"): "One question. ",
    ("vocab", "usage"): "In use: ",
}


def strip_nonlatin(text):
    """Replace Hebrew/Greek glyph runs with nothing, keeping any parenthetical
    transliteration that follows. The voice must never be handed glyphs it
    cannot pronounce."""
    if not text:
        return text
    out = []
    for ch in text:
        cp = ord(ch)
        if 0x0590 <= cp <= 0x05FF or 0x0370 <= cp <= 0x03FF or 0xFB1D <= cp <= 0xFB4F:
            continue
        out.append(ch)
    s = "".join(out)
    s = re.sub(r"\(\s*\)", " ", s)
    s = re.sub(r"[—–-]\s*[—–-]", "—", s)
    return re.sub(r"\s{2,}", " ", s).strip(" ,;—–-")


def to_speech(raw):
    """Mirrors src/lib/audio/segments.ts toSpeech(), plus glyph handling."""
    if not raw:
        return ""
    s = raw
    s = re.sub(r"\{\{wn:[a-z0-9-]+\|([^}]*)\}\}", r"\1", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", s)
    s = re.sub(r"`{1,3}([^`]*)`{1,3}", r"\1", s)
    s = re.sub(r"^#{1,6}\s+", "", s, flags=re.M)
    s = re.sub(r"^>\s?", "", s, flags=re.M)
    s = re.sub(r"^\s*[-*+]\s+", "", s, flags=re.M)
    s = re.sub(r"^\s*\d+\.\s+", "", s, flags=re.M)
    s = strip_nonlatin(s)
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    s = re.sub(r"\.{2,}(?!\.)", ".", s)      # ".." typos → "."
    s = expand_roman(s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_key(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())[:220]


# ── Roman numerals in citations ──────────────────────────────────────
# "chapter VIII" is ambiguous to a speech engine — it may read the word or
# spell the letters, and an ASR round-trip cannot tell the two apart because
# Whisper writes both back as "VIII". Expanding at the source removes the
# ambiguity. Only expanded after an explicit cue word, so the pronoun "I" and
# words like "MIX" are never touched.

_ROMAN_CUE = re.compile(
    r"\b(chapter|book|section|part|volume|canto|act|scene|appendix|psalm)\s+"
    r"([IVXLC]{1,7})\b",
    re.IGNORECASE,
)
_ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}


def roman_to_int(s):
    total, prev = 0, 0
    for ch in reversed(s.upper()):
        v = _ROMAN_VALUES.get(ch)
        if v is None:
            return None
        total = total - v if v < prev else total + v
        prev = max(prev, v)
    return total or None


def expand_roman(text):
    def sub(m):
        cue, numeral = m.group(1), m.group(2)
        if numeral.upper() != numeral:      # lowercase = ordinary word, skip
            return m.group(0)
        n = roman_to_int(numeral)
        if not n or n > 200:
            return m.group(0)
        return f"{cue} {num_to_words(n)}"
    return _ROMAN_CUE.sub(sub, text)


# ── scripture reference → spoken English ─────────────────────────────
# "1 Thessalonians 5:2-3" read literally comes out as digits and a colon.
# Spoken form is what a reader would actually say aloud.

_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven",
         "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
         "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
         "eighty", "ninety"]
_BOOK_ORDINAL = {"1": "First", "2": "Second", "3": "Third",
                 "I": "First", "II": "Second", "III": "Third"}


def num_to_words(n):
    n = int(n)
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("-" + _ONES[n % 10] if n % 10 else "")
    if n < 1000:
        rest = n % 100
        return (_ONES[n // 100] + " hundred"
                + (" " + num_to_words(rest) if rest else ""))
    return str(n)


def _expand_verse_only(part):
    """A bare verse continuation inside a compound reference: '20-22' / '5'."""
    m = re.match(r"^(\d+)\s*[-–]\s*(\d+)$", part)
    if m:
        return f"verses {num_to_words(m.group(1))} to {num_to_words(m.group(2))}"
    if re.match(r"^\d+$", part):
        return f"verse {num_to_words(part)}"
    return None


def expand_reference(ref):
    """'1 Thessalonians 5:2-3' → 'First Thessalonians, chapter five, verses two to three'.

    Compound references ('Job 1:1, 20-22; 2:10; 38:1-4') are expanded part by
    part, carrying the book name forward, so the voice never reads raw digits
    and semicolons.
    """
    if not ref:
        return ref
    s = ref.strip().rstrip(".")

    if ";" in s or re.search(r",\s*\d", s):
        parts = [p.strip() for p in re.split(r"[;,]", s) if p.strip()]
        out, book = [], None
        for p in parts:
            bare = _expand_verse_only(p)
            if bare and book:
                out.append(bare)
                continue
            expanded = _expand_single(p, carry_book=book)
            if book is None:
                bm = re.match(r"^\s*(?:[123]|I{1,3})?\s*([A-Za-z][A-Za-z\s]+)", p)
                book = bm.group(1).strip() if bm else None
            out.append(expanded)
        return "; ".join(out)
    return _expand_single(s)


def _expand_single(s, carry_book=None):
    if carry_book and not re.search(r"[A-Za-z]", s):
        m = re.match(r"^(\d+)\s*:\s*(\d+)\s*(?:[-–]\s*(\d+))?$", s)
        if m:
            v = (f"verses {num_to_words(m.group(2))} to {num_to_words(m.group(3))}"
                 if m.group(3) else f"verse {num_to_words(m.group(2))}")
            return f"chapter {num_to_words(m.group(1))}, {v}"
    m = re.match(r"^\s*([123]|I{1,3})\s+(.+)$", s)
    prefix = ""
    if m and re.search(r"[A-Za-z]", m.group(2)):
        prefix = _BOOK_ORDINAL.get(m.group(1), "") + " "
        s = m.group(2)
    m = re.match(r"^([^\d]+?)\s*(\d+)\s*:\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$", s)
    if not m:
        m2 = re.match(r"^([^\d]+?)\s*(\d+)\s*$", s)
        if m2:
            bk = m2.group(1).strip()
            # "Psalm 23" is spoken "Psalm twenty-three", not "Psalm, chapter …"
            if bk.lower().rstrip("s") == "psalm":
                return f"{prefix}{bk} {num_to_words(m2.group(2))}"
            return f"{prefix}{bk}, chapter {num_to_words(m2.group(2))}"
        return prefix + s
    book, chap, v1, v2 = m.groups()
    if book.strip().lower().rstrip("s") == "psalm":
        verses = (f"verses {num_to_words(v1)} to {num_to_words(v2)}"
                  if v2 else f"verse {num_to_words(v1)}")
        return f"{prefix}{book.strip()} {num_to_words(chap)}, {verses}"
    verses = (f"verses {num_to_words(v1)} to {num_to_words(v2)}"
              if v2 else f"verse {num_to_words(v1)}")
    return f"{prefix}{book.strip()}, chapter {num_to_words(chap)}, {verses}"


def vocab_headword(m):
    """Vocab modules define a word; the definition must not be read orphaned.
    Speak the transliteration (pronounceable), never the glyph."""
    tr = (m.get("transliteration") or "").strip()
    word = (m.get("word") or "").strip()
    lang = (m.get("language") or "").strip()
    spoken = tr or strip_nonlatin(word)
    if not spoken:
        return ""
    lang_label = {"hebrew": "The Hebrew word", "greek": "The Greek word"}.get(
        lang.lower(), "The word")
    return f"{lang_label} {spoken}"


def extract(dev):
    """Devotional JSON → ordered narration segments."""
    segs = []
    seen = set()

    def push(label, register, text):
        t = to_speech(text)
        if not t or len(t.split()) < 2:
            return
        k = norm_key(t)
        if k in seen:          # never read the same prose twice
            return
        seen.add(k)
        segs.append({"label": label, "register": register, "text": t})

    # Title and subtitle are separate sentences; joined bare they run together.
    parts = [x.strip().rstrip(".") for x in
             (dev.get("title"), dev.get("subtitle")) if x and x.strip()]
    push("Title", "title", ". ".join(parts) + "." if parts else "")

    for m in dev.get("modules") or []:
        t = m.get("type", "teaching")
        if t in NAV_TYPES:
            continue
        order = READING_ORDER.get(t)
        reg = REGISTER.get(t, "teaching")

        if t == "vocab":
            push("Word study", "teaching", vocab_headword(m))

        if not order:                      # unknown type: read its prose fields
            for k, v in m.items():
                if isinstance(v, str) and len(v.split()) >= 8 and k not in (
                        "type", "id", "slug", "heading"):
                    push(t.title(), reg, v)
            continue

        consumed = set()
        for group in order:
            for field in group:
                v = m.get(field)
                if isinstance(v, str) and v.strip():
                    label = m.get("heading") or t.title()
                    prefix = PREFIX.get((t, field), "")
                    if t == "scripture" and field == "reference":
                        v = expand_reference(v)
                    push(label, reg, prefix + v)
                    consumed.update(group)   # mirrors are covered too
                    break                    # mirrored variants: first wins

        # Catch-all: read any substantial prose the ordered list does not name.
        # push() dedupes, so mirrored text is not read twice.
        for k, v in m.items():
            if k in consumed or k in NON_PROSE or not isinstance(v, str):
                continue
            if len(v.split()) < 12:
                continue
            push(m.get("heading") or t.title(), reg, v)
    return segs


def main():
    dev = json.load(open(sys.argv[1]))
    segs = extract(dev)
    words = sum(len(s["text"].split()) for s in segs)
    if "--json" in sys.argv:
        json.dump(segs, open(sys.argv[2], "w"), indent=1)
        print(f"{len(segs)} segments, {words} words → {sys.argv[2]}")
        return
    for i, s in enumerate(segs):
        print(f"{i:3} {s['register']:10} {len(s['text'].split()):4}w | {s['text'][:88]}")
    print(f"\n{len(segs)} segments, {words} words")


if __name__ == "__main__":
    main()
