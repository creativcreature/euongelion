#!/usr/bin/env python3
"""Build a printable PDF for a Euangelion devotional series.

Reads the 7 devotional JSONs from public/devotionals/ and produces a single
PDF at public/series-pdf/{slug}.pdf.

Substitutes ReportLab for the originally-planned Playwright-based HTML→PDF
pipeline so the build is pure-Python with no system Chromium dependency.

Usage:
    python3 scripts/build-series-pdf.py [series-slug]

Defaults to 'saved-and-faithing'.
"""
from __future__ import annotations

import json
import re
import sys
def escape(s: str, quote: bool = True) -> str:
    """Escape only the characters ReportLab paraparser cares about.

    ReportLab supports the named entities &amp; &lt; &gt; &quot; &apos; but
    NOT generic numeric character references like &#x27;. So we do not use
    html.escape (which emits &#x27; for apostrophe) and instead emit named
    entities only.
    """
    if s is None:
        return ""
    s = str(s)
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    if quote:
        s = s.replace('"', "&quot;").replace("'", "&apos;")
    return s
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics, ttfonts
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


REPO_ROOT = Path(__file__).resolve().parent.parent
DEVOTIONAL_DIR = REPO_ROOT / "public" / "devotionals"
OUTPUT_DIR = REPO_ROOT / "public" / "series-pdf"

SERIES_TITLE = "Saved & Faithing"
SERIES_SUBTITLE = (
    "A seven-day walk through salvation, the words of Jesus, and the three baptisms."
)
SERIES_QUESTION = "What does it actually mean to be saved?"

GOLD = colors.HexColor("#9B7E3D")
INK = colors.HexColor("#1A1A1A")
QUIET = colors.HexColor("#5C5C5C")
RULE = colors.HexColor("#C7B98C")


def register_fonts() -> dict[str, str]:
    """Register Times (body) and Arial Hebrew (Hebrew runs) from macOS system."""
    times_path = "/System/Library/Fonts/Times.ttc"
    hebrew_path = "/System/Library/Fonts/ArialHB.ttc"

    pairs = [
        ("Body", times_path, 0),
        ("Body-Italic", times_path, 1),
        ("Body-Bold", times_path, 2),
        ("Body-BoldItalic", times_path, 3),
        ("Hebrew", hebrew_path, 0),
        ("Hebrew-Bold", hebrew_path, 2),
    ]
    for name, path, idx in pairs:
        pdfmetrics.registerFont(ttfonts.TTFont(name, path, subfontIndex=idx))

    pdfmetrics.registerFontFamily(
        "Body",
        normal="Body",
        bold="Body-Bold",
        italic="Body-Italic",
        boldItalic="Body-BoldItalic",
    )
    return {
        "body": "Body",
        "italic": "Body-Italic",
        "bold": "Body-Bold",
        "hebrew": "Hebrew",
    }


HEBREW_RANGE = re.compile(r"([֐-׿יִ-ﭏ]+(?:\s+[֐-׿יִ-ﭏ]+)*)")


def visual_reverse_hebrew(run: str) -> str:
    """Reverse a Hebrew run so ReportLab's LTR pipeline renders it correctly.

    ReportLab has no Unicode bidi, so Hebrew codepoints in logical order render
    left-to-right and look mirrored. Reversing the run pre-render produces
    correct visible output. Trade-off: PDF text-extraction on Hebrew runs
    returns reversed text. Acceptable for a print artifact.
    """
    return run[::-1]


def wrap_hebrew(text: str) -> str:
    """Escape text and wrap Hebrew runs in Hebrew-font tags with visual reversal.

    Greek renders fine in Times Roman; only Hebrew needs a separate font.
    Non-Hebrew segments are escape()d for ReportLab's paraparser. Hebrew
    runs are reversed and wrapped in <font name="Hebrew">.
    """
    if not text:
        return ""
    parts: list[str] = []
    last = 0
    for m in HEBREW_RANGE.finditer(text):
        if m.start() > last:
            parts.append(escape(text[last:m.start()]))
        reversed_run = visual_reverse_hebrew(m.group(0))
        parts.append(f'<font name="Hebrew">{escape(reversed_run)}</font>')
        last = m.end()
    if last < len(text):
        parts.append(escape(text[last:]))
    return "".join(parts)


def styles(fonts: dict[str, str]) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["BodyText"]
    s = {}
    s["title_eyebrow"] = ParagraphStyle(
        "title_eyebrow",
        parent=base,
        fontName=fonts["italic"],
        fontSize=10,
        textColor=GOLD,
        alignment=TA_CENTER,
        leading=14,
        spaceAfter=18,
    )
    s["title_main"] = ParagraphStyle(
        "title_main",
        parent=base,
        fontName=fonts["bold"],
        fontSize=44,
        textColor=INK,
        alignment=TA_CENTER,
        leading=52,
        spaceAfter=20,
    )
    s["title_sub"] = ParagraphStyle(
        "title_sub",
        parent=base,
        fontName=fonts["italic"],
        fontSize=14,
        textColor=QUIET,
        alignment=TA_CENTER,
        leading=20,
        spaceAfter=36,
    )
    s["title_question"] = ParagraphStyle(
        "title_question",
        parent=base,
        fontName=fonts["italic"],
        fontSize=16,
        textColor=INK,
        alignment=TA_CENTER,
        leading=22,
        spaceAfter=48,
    )
    s["title_word_constellation"] = ParagraphStyle(
        "title_word_constellation",
        parent=base,
        fontName=fonts["body"],
        fontSize=12,
        textColor=GOLD,
        alignment=TA_CENTER,
        leading=18,
    )

    s["toc_heading"] = ParagraphStyle(
        "toc_heading",
        parent=base,
        fontName=fonts["bold"],
        fontSize=18,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=24,
        leading=22,
    )
    s["toc_row"] = ParagraphStyle(
        "toc_row",
        parent=base,
        fontName=fonts["body"],
        fontSize=12,
        textColor=INK,
        leading=20,
        leftIndent=0,
    )

    s["day_eyebrow"] = ParagraphStyle(
        "day_eyebrow",
        parent=base,
        fontName=fonts["bold"],
        fontSize=10,
        textColor=GOLD,
        spaceAfter=8,
        leading=14,
    )
    s["day_title"] = ParagraphStyle(
        "day_title",
        parent=base,
        fontName=fonts["bold"],
        fontSize=28,
        textColor=INK,
        leading=32,
        spaceAfter=8,
    )
    s["day_anchor"] = ParagraphStyle(
        "day_anchor",
        parent=base,
        fontName=fonts["italic"],
        fontSize=12,
        textColor=QUIET,
        leading=16,
        spaceAfter=20,
    )
    s["section_heading"] = ParagraphStyle(
        "section_heading",
        parent=base,
        fontName=fonts["bold"],
        fontSize=11,
        textColor=GOLD,
        leading=14,
        spaceBefore=14,
        spaceAfter=6,
    )
    s["scripture_text"] = ParagraphStyle(
        "scripture_text",
        parent=base,
        fontName=fonts["italic"],
        fontSize=12,
        textColor=INK,
        leading=18,
        leftIndent=16,
        rightIndent=16,
        spaceAfter=10,
    )
    s["scripture_ref"] = ParagraphStyle(
        "scripture_ref",
        parent=base,
        fontName=fonts["body"],
        fontSize=10,
        textColor=QUIET,
        alignment=TA_LEFT,
        leftIndent=16,
        leading=14,
        spaceAfter=14,
    )
    s["original_lang"] = ParagraphStyle(
        "original_lang",
        parent=base,
        fontName=fonts["body"],
        fontSize=13,
        textColor=INK,
        alignment=TA_CENTER,
        leading=20,
        spaceAfter=8,
    )
    s["transliteration"] = ParagraphStyle(
        "transliteration",
        parent=base,
        fontName=fonts["italic"],
        fontSize=10,
        textColor=GOLD,
        alignment=TA_CENTER,
        leading=14,
        spaceAfter=12,
    )
    s["body_text"] = ParagraphStyle(
        "body_text",
        parent=base,
        fontName=fonts["body"],
        fontSize=11,
        textColor=INK,
        alignment=TA_JUSTIFY,
        leading=17,
        spaceAfter=10,
    )
    s["body_emphasis"] = ParagraphStyle(
        "body_emphasis",
        parent=base,
        fontName=fonts["italic"],
        fontSize=11,
        textColor=INK,
        alignment=TA_JUSTIFY,
        leading=17,
        spaceAfter=10,
    )
    s["vocab_word"] = ParagraphStyle(
        "vocab_word",
        parent=base,
        fontName=fonts["bold"],
        fontSize=14,
        textColor=INK,
        leading=18,
        spaceAfter=4,
    )
    s["vocab_meta"] = ParagraphStyle(
        "vocab_meta",
        parent=base,
        fontName=fonts["italic"],
        fontSize=10,
        textColor=QUIET,
        leading=14,
        spaceAfter=8,
    )
    s["vocab_def"] = ParagraphStyle(
        "vocab_def",
        parent=base,
        fontName=fonts["body"],
        fontSize=10.5,
        textColor=INK,
        leading=15,
        spaceAfter=6,
    )
    s["prayer_text"] = ParagraphStyle(
        "prayer_text",
        parent=base,
        fontName=fonts["italic"],
        fontSize=12,
        textColor=INK,
        alignment=TA_LEFT,
        leftIndent=16,
        rightIndent=16,
        leading=18,
        spaceAfter=8,
    )
    s["breath_prayer"] = ParagraphStyle(
        "breath_prayer",
        parent=base,
        fontName=fonts["body"],
        fontSize=10,
        textColor=GOLD,
        alignment=TA_CENTER,
        leading=14,
        spaceAfter=8,
    )
    s["reflection_q"] = ParagraphStyle(
        "reflection_q",
        parent=base,
        fontName=fonts["italic"],
        fontSize=11,
        textColor=INK,
        leading=16,
        leftIndent=16,
        spaceAfter=6,
        bulletIndent=2,
    )
    s["takeaway_commitment"] = ParagraphStyle(
        "takeaway_commitment",
        parent=base,
        fontName=fonts["bold"],
        fontSize=12,
        textColor=INK,
        leading=18,
        spaceAfter=10,
    )
    s["takeaway_list_label"] = ParagraphStyle(
        "takeaway_list_label",
        parent=base,
        fontName=fonts["italic"],
        fontSize=9,
        textColor=GOLD,
        leading=12,
        spaceAfter=4,
    )
    s["takeaway_list_item"] = ParagraphStyle(
        "takeaway_list_item",
        parent=base,
        fontName=fonts["body"],
        fontSize=10,
        textColor=INK,
        leading=14,
        spaceAfter=4,
        leftIndent=12,
        bulletIndent=0,
    )

    s["closing_verse_label"] = ParagraphStyle(
        "closing_verse_label",
        parent=base,
        fontName=fonts["italic"],
        fontSize=10,
        textColor=GOLD,
        alignment=TA_CENTER,
        leading=14,
        spaceAfter=4,
    )
    s["closing_verse_ref"] = ParagraphStyle(
        "closing_verse_ref",
        parent=base,
        fontName=fonts["bold"],
        fontSize=12,
        textColor=INK,
        alignment=TA_CENTER,
        leading=16,
        spaceAfter=14,
    )
    return s


def horizontal_rule() -> Table:
    t = Table([[""]], colWidths=[6.5 * inch], rowHeights=[1])
    t.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.5, RULE)]))
    return t


def render_scripture_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = []
    text = m.get("passage") or m.get("text") or ""
    flow.append(Paragraph(f"“{wrap_hebrew(text)}”", S["scripture_text"]))
    ref = m.get("reference", "")
    trans = m.get("translation", "")
    ref_line = f"— {escape(ref)}" + (f" ({escape(trans)})" if trans else "")
    flow.append(Paragraph(ref_line, S["scripture_ref"]))
    if m.get("greekOriginal"):
        flow.append(Paragraph(wrap_hebrew(m["greekOriginal"]), S["original_lang"]))
    if m.get("hebrewOriginal"):
        flow.append(Paragraph(wrap_hebrew(m["hebrewOriginal"]), S["original_lang"]))
    if m.get("transliteration"):
        flow.append(Paragraph(escape(m["transliteration"]), S["transliteration"]))
    fp = m.get("fullPassage")
    if isinstance(fp, dict) and fp.get("text"):
        flow.append(Spacer(1, 4))
        flow.append(
            Paragraph(
                f"<i>Read also:</i> “{wrap_hebrew(fp['text'])}” — {escape(fp.get('reference', ''))}",
                S["scripture_ref"],
            )
        )
    return flow


def render_vocab_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = [Paragraph("WORD STUDY", S["section_heading"])]
    word = m.get("word", "")
    translit = m.get("transliteration", "")
    flow.append(Paragraph(wrap_hebrew(word), S["original_lang"]))
    if translit:
        flow.append(Paragraph(f"<i>{escape(translit)}</i>", S["transliteration"]))
    meta_bits = []
    if m.get("language"):
        meta_bits.append(escape(m["language"].title()))
    if m.get("strongsNumber"):
        meta_bits.append(f"Strong's {escape(m['strongsNumber'])}")
    if m.get("pronunciation"):
        meta_bits.append(f"pronunciation: {escape(m['pronunciation'])}")
    if meta_bits:
        flow.append(Paragraph(" · ".join(meta_bits), S["vocab_meta"]))
    if m.get("definition") or m.get("meaning"):
        d = m.get("definition") or m.get("meaning")
        flow.append(Paragraph(f"<b>Definition.</b> {wrap_hebrew(d)}", S["vocab_def"]))
    if m.get("rootMeaning") or m.get("usage"):
        u = m.get("rootMeaning") or m.get("usage")
        flow.append(Paragraph(f"<b>Root.</b> {wrap_hebrew(u)}", S["vocab_def"]))
    if m.get("usageNote"):
        flow.append(
            Paragraph(f"<b>Usage.</b> {wrap_hebrew(m['usageNote'])}", S["vocab_def"])
        )
    related = m.get("relatedWords") or []
    for rw in related:
        rw_word = rw.get("word", "")
        rw_translit = rw.get("transliteration", "")
        rw_meaning = rw.get("meaning") or rw.get("reference") or ""
        line_parts = []
        if rw_word:
            line_parts.append(f"<b>{wrap_hebrew(rw_word)}</b>")
        if rw_translit:
            line_parts.append(f"<i>{escape(rw_translit)}</i>")
        if rw_meaning:
            line_parts.append(wrap_hebrew(rw_meaning))
        if line_parts:
            flow.append(
                Paragraph(" — ".join(line_parts), S["vocab_def"])
            )
    return flow


def paragraph_break_text(text: str) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]


def render_teaching_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = []
    heading = m.get("heading")
    if heading:
        flow.append(Paragraph(escape(heading).upper(), S["section_heading"]))
    if m.get("keyInsight"):
        flow.append(
            Paragraph(
                f"<i>{wrap_hebrew(m['keyInsight'])}</i>",
                S["body_emphasis"],
            )
        )
    body = m.get("content") or m.get("body") or ""
    for para in paragraph_break_text(body):
        flow.append(Paragraph(wrap_hebrew(para), S["body_text"]))
    if m.get("historicalContext"):
        flow.append(
            Paragraph(
                f"<b>Historical context.</b> {wrap_hebrew(m['historicalContext'])}",
                S["body_text"],
            )
        )
    if m.get("fascinatingFact"):
        flow.append(
            Paragraph(
                f"<b>Note.</b> {wrap_hebrew(m['fascinatingFact'])}",
                S["body_text"],
            )
        )
    return flow


def render_bridge_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = [Paragraph("BRIDGE", S["section_heading"])]
    pairs = [
        ("Ancient truth", m.get("ancientTruth")),
        ("Modern application", m.get("modernApplication")),
        ("Connection", m.get("connectionPoint")),
        ("New Testament echo", m.get("newTestamentEcho")),
    ]
    for label, val in pairs:
        if val:
            flow.append(
                Paragraph(
                    f"<b>{escape(label)}.</b> {wrap_hebrew(val)}", S["body_text"]
                )
            )
    return flow


def render_prayer_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = [Paragraph("PRAYER", S["section_heading"])]
    text = m.get("prayerText") or m.get("text") or ""
    if text:
        flow.append(Paragraph(wrap_hebrew(text), S["prayer_text"]))
    if m.get("breathPrayer"):
        flow.append(Paragraph(escape(m["breathPrayer"]), S["breath_prayer"]))
    return flow


def render_reflection_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = [Paragraph("REFLECTION", S["section_heading"])]
    if m.get("prompt"):
        flow.append(Paragraph(wrap_hebrew(m["prompt"]), S["body_emphasis"]))
    for q in m.get("additionalQuestions") or []:
        flow.append(Paragraph(f"• {wrap_hebrew(q)}", S["reflection_q"]))
    return flow


def render_takeaway_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = [Paragraph("TAKEAWAY", S["section_heading"])]
    commitment = m.get("commitment") or m.get("content") or ""
    if commitment:
        flow.append(Paragraph(wrap_hebrew(commitment), S["takeaway_commitment"]))
    leaving = m.get("leavingAtCross") or []
    if leaving:
        flow.append(Paragraph("LEAVING AT THE CROSS", S["takeaway_list_label"]))
        for item in leaving:
            flow.append(Paragraph(f"• {wrap_hebrew(item)}", S["takeaway_list_item"]))
    receiving = m.get("receivingFromCross") or []
    if receiving:
        flow.append(Spacer(1, 6))
        flow.append(Paragraph("RECEIVING FROM THE CROSS", S["takeaway_list_label"]))
        for item in receiving:
            flow.append(Paragraph(f"• {wrap_hebrew(item)}", S["takeaway_list_item"]))
    return flow


def render_resource_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    flow = []
    related = m.get("relatedScriptures") or []
    if related:
        flow.append(Paragraph("RELATED SCRIPTURE", S["section_heading"]))
        for rs in related:
            flow.append(
                Paragraph(
                    f"<b>{escape(rs.get('reference', ''))}.</b> “{wrap_hebrew(rs.get('text', ''))}”",
                    S["body_text"],
                )
            )
    deeper = m.get("forDeeperStudy") or []
    if deeper:
        flow.append(Paragraph("FURTHER READING", S["section_heading"]))
        for d in deeper:
            line = escape(d.get("title", ""))
            if d.get("note"):
                line += f" — <i>{escape(d['note'])}</i>"
            flow.append(Paragraph(line, S["body_text"]))
    return flow


def render_module(m: dict, S: dict[str, ParagraphStyle]) -> list:
    t = m.get("type")
    if t == "scripture":
        return render_scripture_module(m, S)
    if t == "vocab":
        return render_vocab_module(m, S)
    if t in ("teaching", "story", "insight"):
        return render_teaching_module(m, S)
    if t == "bridge":
        return render_bridge_module(m, S)
    if t == "prayer":
        return render_prayer_module(m, S)
    if t == "reflection":
        return render_reflection_module(m, S)
    if t == "takeaway":
        return render_takeaway_module(m, S)
    if t == "resource":
        return render_resource_module(m, S)
    if t == "comprehension":
        flow = [Paragraph("FOR REFLECTION", S["section_heading"])]
        for q in m.get("forReflection") or []:
            flow.append(Paragraph(f"• {wrap_hebrew(q)}", S["reflection_q"]))
        return flow
    return []


def render_day(day_json: dict, S: dict[str, ParagraphStyle]) -> list:
    flow: list = [PageBreak()]
    flow.append(
        Paragraph(f"DAY {day_json.get('day')} · SAVED &amp; FAITHING", S["day_eyebrow"])
    )
    flow.append(Paragraph(escape(day_json.get("title", "")), S["day_title"]))
    if day_json.get("anchorVerse"):
        flow.append(
            Paragraph(
                f"Anchor: {escape(day_json['anchorVerse'])}", S["day_anchor"]
            )
        )
    flow.append(horizontal_rule())
    flow.append(Spacer(1, 12))

    for m in day_json.get("modules", []):
        rendered = render_module(m, S)
        if rendered:
            flow.append(KeepTogether(rendered))
            flow.append(Spacer(1, 6))
    return flow


def title_page(S: dict[str, ParagraphStyle]) -> list:
    return [
        Spacer(1, 1.5 * inch),
        Paragraph("EUANGELION · A SERIES", S["title_eyebrow"]),
        Paragraph(escape(SERIES_TITLE), S["title_main"]),
        Paragraph(escape(SERIES_SUBTITLE), S["title_sub"]),
        Paragraph(f"“{escape(SERIES_QUESTION)}”", S["title_question"]),
        Paragraph(
            f"{wrap_hebrew('σῴζω · πιστεύω · βαπτίζω · συνθάπτω')}",
            S["title_word_constellation"],
        ),
        Paragraph(
            f"{wrap_hebrew('ישע · אמונה · רוּחַ')}",
            S["title_word_constellation"],
        ),
    ]


def toc_page(days: list[dict], S: dict[str, ParagraphStyle]) -> list:
    flow = [PageBreak(), Paragraph("THE WALK", S["toc_heading"])]
    for d in days:
        line = (
            f"<b>Day {d.get('day')}</b>   {escape(d.get('title', ''))} "
            f"  —   <i>{escape(d.get('anchorVerse', ''))}</i>"
        )
        flow.append(Paragraph(line, S["toc_row"]))
    return flow


def closing_anchors_page(days: list[dict], S: dict[str, ParagraphStyle]) -> list:
    flow = [PageBreak(), Spacer(1, 1.0 * inch)]
    flow.append(
        Paragraph("THE SEVEN ANCHORS", S["title_eyebrow"])
    )
    flow.append(
        Paragraph(
            "<i>Carry these forward.</i>",
            S["title_sub"],
        )
    )
    flow.append(Spacer(1, 24))
    for d in days:
        flow.append(
            Paragraph(
                f"Day {d.get('day')} · {escape(d.get('title', ''))}",
                S["closing_verse_label"],
            )
        )
        flow.append(
            Paragraph(escape(d.get("anchorVerse", "")), S["closing_verse_ref"])
        )
    return flow


def page_decorator(canvas, doc):
    """Footer with page number and series title."""
    canvas.saveState()
    canvas.setFont("Body-Italic", 9)
    canvas.setFillColor(QUIET)
    canvas.drawString(0.75 * inch, 0.5 * inch, SERIES_TITLE)
    canvas.drawRightString(
        LETTER[0] - 0.75 * inch,
        0.5 * inch,
        f"{doc.page}",
    )
    canvas.restoreState()


def build(slug: str = "saved-and-faithing") -> Path:
    fonts = register_fonts()
    S = styles(fonts)

    days = []
    for n in range(1, 8):
        path = DEVOTIONAL_DIR / f"{slug}-day-{n}.json"
        with path.open("r", encoding="utf-8") as f:
            days.append(json.load(f))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{slug}.pdf"

    doc = BaseDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.85 * inch,
        title=SERIES_TITLE,
        author="Euangelion",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
    )
    doc.addPageTemplates(
        [PageTemplate(id="main", frames=[frame], onPage=page_decorator)]
    )

    story: list = []
    story.extend(title_page(S))
    story.extend(toc_page(days, S))
    for day_json in days:
        story.extend(render_day(day_json, S))
    story.extend(closing_anchors_page(days, S))

    doc.build(story)
    return output_path


if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "saved-and-faithing"
    out = build(slug)
    size_kb = out.stat().st_size / 1024
    print(f"Wrote {out} ({size_kb:.1f} KB)")
