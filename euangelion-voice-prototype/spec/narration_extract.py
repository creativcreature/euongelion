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
import hashlib
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

# Module types whose heading is page furniture rather than a spoken signpost —
# announcing "Sources & Further Study" mid-listen is chrome, not content.
HEADING_NOT_SPOKEN = {"resource", "cta", "video", "inline-image", "art"}

# Navigation chrome — never spoken.
NAV_TYPES = {"inline-image", "art", "video", "cta", "resource",
             # Pull quotes lift a sentence out of the prose and set it
             # large. Spoken, that is a stutter: the listener hears the
             # sentence in place and again out of it. All 66 in the
             # catalog duplicate body prose verbatim.
             "pullquote"}

# ── Reading contract versions ────────────────────────────────────────
# Contract 1 is what every track rendered before 2026-09-13 speaks. It is kept
# byte-for-byte so those tracks stay current and are never re-rendered.
#
# Contract 2 (SA-141, forward only) reads everything the page shows:
#   - list fields the page renders (exercise steps, extra reflection questions,
#     related words, leaving/receiving at the cross) — contract 1 skipped every
#     list, because the catch-all sweep only looks at strings;
#   - scripture citations inside prose are expanded for speech, not only the
#     scripture module's own reference (FINDINGS-inline-citations-2026-09-12);
#   - each paragraph is its own segment, so the renderer can cut requests at
#     paragraph breaks instead of sending a whole module as one request.
CONTRACT_LATEST = 2

# Lists the page renders, in page order, read after a module's ordered fields.
# Lead-ins match the labels printed above each list on the page.
LIST_FIELDS = {
    "vocab": [("relatedWords", "See also: ")],
    "reflection": [("additionalQuestions", "")],
    "interactive": [("steps", "")],
    "takeaway": [("leavingAtCross", "What I leave at the cross: "),
                 ("receivingFromCross", "What I receive from the cross: ")],
    "comprehension": [("forReflection", "For reflection: "),
                      ("forAccountabilityPartners",
                       "For accountability partners: ")],
}

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
# Contract 2 lead-ins read as sentences, not labels (proofread 2026-09-13).
PREFIX_V2 = dict(PREFIX, **{
    "profile|name": "The voice behind today is ",
    "profile|title": "The voice behind today is ",
    "comprehension|explanation": "Here is the answer. ",
    "vocab|usage": "",
})


def strip_nonlatin(text):
    """Replace Hebrew/Greek glyph runs with nothing, keeping any parenthetical
    transliteration that follows. The voice must never be handed glyphs it
    cannot pronounce."""
    if not text:
        return text
    out = []
    for ch in text:
        cp = ord(ch)
        # 0x1F00-0x1FFF is Greek Extended (polytonic). Without it, accented
        # vowels survive the strip as lone glyphs and the engine either
        # spells them out or stumbles — 49 of them across 11 devotionals.
        if (0x0590 <= cp <= 0x05FF or 0x0370 <= cp <= 0x03FF
                or 0x1F00 <= cp <= 0x1FFF or 0xFB1D <= cp <= 0xFB4F):
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


def text_hash(dev, contract=1):
    """Stable fingerprint of everything this devotional would say aloud.

    The renderer stores it alongside each track so a later run can tell whether
    a rendered file is still current. Word counts alone cannot: an edit that
    swaps one word for another leaves the count identical while the audio goes
    stale. Any change to the reading contract or the devotional text moves the
    hash, and the track re-renders on the next pass.
    """
    joined = "\n".join(s["text"] for s in extract(dev, contract))
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()[:12]


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


# ── Citations inside prose (contract 2) ──────────────────────────────
# Proved over the whole corpus in FINDINGS-inline-citations-2026-09-12.md:
# 3,904 citations, zero false positives. `_NOTBOOK` stops "In 1:14" being read
# as a book; a bare chapter:verse is never read as a clock time.
_BOOK = r"(?:[123]\s+|I{1,3}\s+)?(?:[A-Z][a-z]+)(?:\s+(?:of\s+)?[A-Z][a-z]+)?"
_BOOKED = re.compile(rf"\b({_BOOK})\s+(\d+):([1-9]\d*)(?:\s*[-–]\s*(\d+))?(?!\d)")
_BARE = re.compile(r"(?<![A-Za-z0-9_:])(\d+):([1-9]\d*)(?:\s*[-–]\s*(\d+))?"
                   r"(?!\s*[ap]\.?m\.?)(?![\d:])")
_NOTBOOK = {"The", "A", "An", "In", "At", "On", "And", "But", "For", "This",
            "That", "His", "Her", "Their", "It", "He", "She", "They", "We",
            "You", "When", "While", "Verse", "Verses", "Chapter", "See",
            "Compare", "Read", "Also", "From", "Psalm", "Psalms"}


def expand_in_prose(text):
    if not text or ":" not in text:
        return text

    def pause(m):
        # "verse forty-four the order is" needs the comma a reader supplies.
        return "," if re.match(r" [a-z]", m.string[m.end():m.end() + 2]) else ""

    def booked(m):
        book, ch, v1, v2 = m.group(1), m.group(2), m.group(3), m.group(4)
        if book.split()[0] in _NOTBOOK:
            return m.group(0)
        # Roman book ordinals ("II Kings") normalised first, so both twins
        # hand expand_reference the same Arabic form.
        book = re.sub(r"^(I{1,3})\s+", lambda r: f"{len(r.group(1))} ", book)
        return expand_reference(f"{book} {ch}:{v1}" + (f"-{v2}" if v2 else "")) \
            + pause(m)

    def bare(m):
        ch, v1, v2 = m.group(1), m.group(2), m.group(3)
        vs = (f"verses {num_to_words(v1)} to {num_to_words(v2)}"
              if v2 else f"verse {num_to_words(v1)}")
        return f"chapter {num_to_words(ch)}, {vs}" + pause(m)

    return _BARE.sub(bare, _BOOKED.sub(booked, text))


# "1 Corinthians 8", "2 Kings": a numbered book with no verse is otherwise read
# as a count ("one Corinthians"). The 66 books only (SA-141).
_NUMBERED_BOOK = re.compile(
    r"\b([123]) (Samuel|Kings|Chronicles|Corinthians|"
    r"Thessalonians|Timothy|Peter|John)\b")


def expand_book_ordinals(text):
    return _NUMBERED_BOOK.sub(
        lambda m: f"{_BOOK_ORDINAL[m.group(1)]} {m.group(2)}", text)


def speech_v2(text):
    """Contract 2 spoken form of one paragraph. Changes what the voice is sent,
    never the page: capitals that eleven_v3 may stress, initials whose full
    stops read as sentence ends, and "?." left where a title meets a subtitle."""
    s = expand_book_ordinals(expand_in_prose(text))
    s = re.sub(r"\bLORD\b", "Lord", s)
    # Greek schizo, "to tear": spelled as written it can come out as the slur.
    s = re.sub(r"\bschizo\b", "skeezo", s)
    s = re.sub(r"\bGOD\b", "God", s)
    s = re.sub(r"\b([A-HJ-Z])\. (?=[A-Z])", r"\1 ", s)
    s = terminate(s)
    return re.sub(r"([?!])\.", r"\1", s)


def terminate(text):
    """Contract 2: every spoken piece ends as a sentence. A heading, a scripture
    reference or a list item with no closing punctuation otherwise runs straight
    into the next words in the same request."""
    t = text.rstrip()
    if t and t[-1] not in ".!?:;\"')":
        return t + "."
    return t


def list_items(field, items):
    """Spoken text for one list the page renders, one entry per item.

    Related words are one line on the page ("See also …"), so they are one
    spoken line. Steps are numbered on the page, so they are numbered aloud."""
    if field == "relatedWords":
        parts = []
        for it in items:
            if isinstance(it, dict):
                head = (it.get("transliteration") or "").strip() \
                    or strip_nonlatin(it.get("word") or "")
                meaning = (it.get("meaning") or "").strip()
                part = f"{head} means {meaning}" if head and meaning \
                    else head or meaning
            elif isinstance(it, str):
                part = it
            else:
                continue
            part = part.strip()
            if part:
                parts.append(terminate(part[0].upper() + part[1:]))
        return [" ".join(parts)] if parts else []
    if field in ("leavingAtCross", "receivingFromCross"):
        parts = [it.strip().rstrip(".") for it in items
                 if isinstance(it, str) and it.strip()]
        return [terminate("; ".join(parts))] if parts else []
    out = []
    for n, it in enumerate(items, 1):
        if isinstance(it, dict):
            title = (it.get("title") or "").strip().rstrip(".")
            desc = (it.get("description") or "").strip()
            text = f"{title}. {desc}" if title and desc else title or desc
        elif isinstance(it, str):
            text = it
        else:
            continue
        if not text.strip():
            continue
        out.append(f"Step {num_to_words(n)}. {text}" if field == "steps" else text)
    return out


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


def extract(dev, contract=1):
    """Devotional JSON → ordered narration segments."""
    segs = []
    seen = set()

    def push(label, register, text, module_index=0, heading=None,
             allow_single=False, break_before=False):
        t = to_speech(text)
        # A lone word mid-devotional is a label or a stray fragment, not prose.
        # Titles and headings are exempt: "Contentment" is the whole title of
        # one day and "Sabbath" is a real section, and dropping either would
        # cost the listener something deliberate.
        if not t or (len(t.split()) < 2
                     and register != "title" and not allow_single):
            return
        k = norm_key(t)
        if k in seen:          # never read the same prose twice
            return
        seen.add(k)
        # Contract 2: one segment per paragraph, citations expanded. The floor
        # and the dedup above still judge the whole field, so a one-word
        # paragraph inside real prose is never dropped.
        pieces = [t]
        if contract >= 2:
            # Paragraphs, and each markdown list line within one: a list line
            # has no closing punctuation, so joined it runs into the next.
            paras = [to_speech(p) for p in
                     re.split(r"\n\s*\n|\n(?=[ \t]*(?:[-*+]|\d+\.)[ \t])", text or "")]
            pieces = [speech_v2(p) for p in paras if p]
        for n, piece in enumerate(pieces):
            segs.append({
                # Renderer hint only, not part of the spoken text or its hash:
                # this field starts a new request (the note after a reading).
                "break_before": break_before and n == 0,
                "label": label, "register": register, "text": piece,
                # 1-based to match the reader's `#devotional-section-N` anchors,
                # which are 1-indexed over the module array (SA-034). 0 = the
                # title, which precedes every module.
                "module_index": module_index,
                "heading": heading,
            })

    # Title and subtitle are separate sentences; joined bare they run together.
    parts = [x.strip().rstrip(".") for x in
             (dev.get("title"), dev.get("subtitle")) if x and x.strip()]
    push("Title", "title", ". ".join(parts) + "." if parts else "", 0, None)
    # Some days repeat the devotional's own title as a module heading. The
    # opening line has already been read, so register the bare title and
    # subtitle too — otherwise the dedup only catches the repeat on days that
    # happen to have no subtitle.
    for part in (dev.get("title"), dev.get("subtitle")):
        k = norm_key(to_speech(part or ""))
        if k:
            seen.add(k)

    # ── Panels format (Wake-Up legacy) ─────────────────────────────────
    # Mirrors buildPanelSegments in src/lib/audio/segments.ts EXACTLY —
    # the vitest parity gate (narration-manifest-current.test.ts) recomputes
    # this hash from the TS side, so the two must stay byte-identical:
    # panel 0 is the cover and is skipped; each remaining panel speaks
    # (heading or "Section N") + content; the same <2-word floor applies;
    # deliberately NO dedup, because the TS panels path has none.
    if not dev.get("modules") and dev.get("panels"):
        for i, panel in enumerate(dev["panels"][1:]):
            t = to_speech(panel.get("content") or "")
            if not t or len(t.split()) < 2:
                continue
            segs.append({
                "label": panel.get("heading") or f"Section {i + 1}",
                "register": "teaching",
                "text": t,
                "module_index": i + 1,
                "heading": panel.get("heading"),
            })
        return segs

    for module_number, m in enumerate(dev.get("modules") or [], start=1):
        t = m.get("type", "teaching")
        if t in NAV_TYPES:
            continue
        order = READING_ORDER.get(t)
        reg = REGISTER.get(t, "teaching")

        # Speak the section heading.
        #
        # A reader can SEE where a section begins; a listener cannot. Headings
        # were originally classed as labels and left unspoken, which stripped
        # every devotional of its internal signposting in audio — 24 minutes of
        # continuous prose with no indication of structure. They are already
        # trusted to title the chapters, so they are content.
        heading = m.get("heading")
        if heading and t not in HEADING_NOT_SPOKEN:
            push(heading, reg, heading, module_number, heading,
                 allow_single=True)

        vocab_joined = False
        if t == "vocab":
            head = vocab_headword(m)
            meaning = next((m[f] for f in ("meaning", "definition")
                            if isinstance(m.get(f), str) and m[f].strip()), None)
            if contract >= 2 and head and meaning:
                # "The Hebrew word qadosh means holy; set apart for God."
                push("Word study", "teaching", f"{head} means {meaning}",
                     module_number, m.get("heading"))
                vocab_joined = True
            else:
                push("Word study", "teaching", head,
                     module_number, m.get("heading"))

        if not order:                      # unknown type: read its prose fields
            for k, v in m.items():
                if isinstance(v, str) and len(v.split()) >= 8 and k not in (
                        "type", "id", "slug", "heading"):
                    push(t.title(), reg, v, module_number, m.get("heading"))
            continue

        consumed = set()
        if vocab_joined:
            consumed.update(("meaning", "definition"))
        for group in order:
            if consumed.intersection(group):
                continue
            for field in group:
                v = m.get(field)
                if isinstance(v, str) and v.strip():
                    label = m.get("heading") or t.title()
                    prefix = PREFIX.get((t, field), "")
                    if contract >= 2:
                        prefix = PREFIX_V2.get(f"{t}|{field}", prefix)
                    if t == "scripture" and field == "reference":
                        v = expand_reference(v)
                    era = m.get("era")
                    if (contract >= 2 and t == "profile" and field in ("name", "title")
                            and isinstance(era, str) and era.strip()):
                        v = f"{v}, {era.strip()}"
                        consumed.add("era")
                    push(label, reg, prefix + v, module_number, m.get("heading"),
                         break_before=(contract >= 2 and t == "scripture"
                                       and field in ("scriptureContext", "context")))
                    consumed.update(group)   # mirrors are covered too
                    break                    # mirrored variants: first wins

        if contract >= 2:
            for field, lead in LIST_FIELDS.get(t, []):
                items = m.get(field)
                if not isinstance(items, list):
                    continue
                consumed.add(field)
                for i, item in enumerate(list_items(field, items)):
                    push(m.get("heading") or t.title(), reg,
                         (lead if i == 0 else "") + item,
                         module_number, m.get("heading"))

        # Catch-all: read any substantial prose the ordered list does not name.
        # push() dedupes, so mirrored text is not read twice.
        for k, v in m.items():
            if k in consumed or k in NON_PROSE or not isinstance(v, str):
                continue
            if len(v.split()) < 12:
                continue
            push(m.get("heading") or t.title(), reg, v,
                 module_number, m.get("heading"))
    return segs


def main():
    dev = json.load(open(sys.argv[1]))
    contract = (int(sys.argv[sys.argv.index("--contract") + 1])
                if "--contract" in sys.argv else 1)
    segs = extract(dev, contract)
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
