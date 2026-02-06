# Reference Library

This folder contains public domain and freely-licensed biblical reference materials for content creation.

**Total Size:** ~13.5 GB
**Last Updated:** January 16, 2026

---

## Bibles (`/bibles/`)

| Folder | Contents | Format | License |
|--------|----------|--------|---------|
| `WEB-json/` | World English Bible | JSON | Public Domain |
| `open-bibles/` | Multiple translations (KJV, ASV, WEB, BBE, etc.) | XML (OSIS, USFX) | Public Domain / CC |
| `scrollmapper/` | 140+ translations | JSON, SQL, CSV, XML | MIT License |
| `hebrew-masoretic/` | Masoretic Hebrew text (Leningrad Codex) | OSIS XML | Public Domain |
| `greek-sblgnt/` | SBL Greek New Testament with morphology | Text, MorphGNT | CC BY 4.0 |
| `bible-kjv-asv/` | KJV and ASV | JSON | Public Domain |
| `theographic/` | Bible metadata (people, places, events, timeline) | JSON | CC BY 4.0 |

### Public Domain English Translations Available:
- **KJV** (King James Version, 1611/1769)
- **ASV** (American Standard Version, 1901)
- **WEB** (World English Bible, modern)
- **BBE** (Bible in Basic English)
- **YLT** (Young's Literal Translation)
- **Darby** (Darby Translation)

### Copyrighted Translations (API Access Only):
- NIV, NRSV, ESV, NASB, NLT — use Bible Gateway or API.Bible for quotations

---

## Commentaries (`/commentaries/`)

| Folder | Contents | Format |
|--------|----------|--------|
| `bible-org-sys/` | BibleOrgSys processing library (handles many commentary formats) | Python |

### Additional Commentary Access:
- **Matthew Henry** — see `/dictionaries/matthew-henry/`
- **StudyLight.org** — John Gill, Barnes, Clarke (web access)
- **CCEL.org** — ThML format commentaries available

---

## Lexicons (`/lexicons/`)

| Folder | Contents | Format |
|--------|----------|--------|
| `strongs/` | Strong's Hebrew & Greek Dictionaries | XML, JSON |
| `hebrew-lexicon/` | OpenScriptures Hebrew Lexicon (BDB-based) | XML |

---

## Dictionaries (`/dictionaries/`)

| Folder | Contents | Format |
|--------|----------|--------|
| `matthew-henry/` | Matthew Henry Commentary | Markdown/Text |
| `naves-topical/` | Nave's Topical Index with ESV/TSK integration | Data files |
| `cross-references/` | Treasury of Scripture Knowledge cross-references | JSON/SQL |

---

## STEPBible Data (`/stepbible-data/`)

High-quality lexical and tagged text data from STEP Bible project.

| File/Folder | Contents |
|-------------|----------|
| `Lexicons/` | Extended Strong's for Hebrew & Greek, LSJ Greek lexicon |
| `Tagged-Bibles/` | Morphologically tagged biblical texts |
| `TIPNR*.txt` | Proper names with all references |
| `TEGMC*.txt` | Greek morphology codes |
| `TEHMC*.txt` | Hebrew morphology codes |

**License:** CC BY 4.0

---

## Usage Notes

### For Scripture Quotations:
1. Use public domain translations (KJV, ASV, WEB) for stored content
2. For copyrighted translations (NIV, ESV), fetch via API at render time
3. Always cite the translation used

### For Hebrew Word Studies:
1. Look up in `/lexicons/strongs/hebrew/`
2. Cross-reference with `/stepbible-data/Lexicons/TBESH*.txt`
3. Check morphology in `/stepbible-data/TEHMC*.txt`

### For Greek Word Studies:
1. Look up in `/lexicons/strongs/greek/`
2. Cross-reference with `/stepbible-data/Lexicons/TBESG*.txt`
3. Check LSJ entries in `/stepbible-data/Lexicons/TFLSJ*.txt`

### For Topical Studies:
1. Start with `/dictionaries/naves-topical/`
2. Follow cross-references in `/dictionaries/cross-references/`

### For Commentary:
1. Check `/dictionaries/matthew-henry/`
2. Use BibleOrgSys in `/commentaries/bible-org-sys/` to process additional formats
3. Access StudyLight.org for John Gill, Barnes, Clarke

---

## APIs for Copyrighted Content

When you need copyrighted translations, use these APIs:

| API | Translations | Limit |
|-----|--------------|-------|
| [API.Bible](https://scripture.api.bible/) | 2500+ versions | Free tier available |
| [Bible Gateway](https://www.biblegateway.com/) | 200+ versions | Web access |
| [ESV API](https://api.esv.org/) | ESV only | 500 requests/day free |

---

## File Formats

| Format | Description | How to Read |
|--------|-------------|-------------|
| JSON | JavaScript Object Notation | Native in Node.js |
| XML/OSIS | Open Scripture Information Standard | XML parser |
| USFM | Unified Standard Format Markers | USFM parser |
| TSV | Tab-separated values | CSV parser with tab delimiter |
| ThML | Theological Markup Language | XML parser |

---

*"All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness." — 2 Timothy 3:16*
