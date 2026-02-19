# Reference Folders Index

These folders are preserved and must not be deleted, renamed, or moved by automation or cleanup passes.

## Frozen folders

1. `/Users/meltmac/Documents/app-projects/external/euangelion/user-references`
2. `/Users/meltmac/Documents/app-projects/external/euangelion/docs/user refmat`

## Commentary Library (added Feb 18 2026)

All content in `content/reference/commentaries/` is public domain, cleared for commercial use.
Each subfolder contains: plain `.txt` files + `metadata.json` (author info, license, source URLs, citation format).

| Subfolder                        | Author                           | Works Count             | Status                                 |
| -------------------------------- | -------------------------------- | ----------------------- | -------------------------------------- |
| `commentaries/augustine/`        | Augustine of Hippo (354–430)     | 4                       | ✅ Public Domain                       |
| `commentaries/brother-lawrence/` | Brother Lawrence (c.1614–1691)   | 1                       | ✅ Public Domain                       |
| `commentaries/calvin/`           | John Calvin (1509–1564)          | 2                       | ✅ Public Domain                       |
| `commentaries/douglass/`         | Frederick Douglass (c.1817–1895) | 3                       | ✅ Public Domain                       |
| `commentaries/edwards/`          | Jonathan Edwards (1703–1758)     | 4                       | ✅ Public Domain                       |
| `commentaries/gill/`             | John Gill (1697–1771)            | 0 local (metadata only) | ✅ Public Domain — see StudyLight link |
| `commentaries/henry/`            | Matthew Henry (1662–1714)        | 0 local (metadata only) | ✅ Public Domain — see CCEL link       |
| `commentaries/luther/`           | Martin Luther (1483–1546)        | 4                       | ✅ Public Domain                       |
| `commentaries/murray/`           | Andrew Murray (1828–1917)        | 22                      | ✅ Public Domain                       |
| `commentaries/spurgeon/`         | Charles Spurgeon (1834–1892)     | 5                       | ✅ Public Domain                       |
| `commentaries/thomas-a-kempis/`  | Thomas à Kempis (c.1380–1471)    | 1                       | ✅ Public Domain                       |
| `commentaries/tozer/`            | A.W. Tozer (1897–1963)           | 1 (Pursuit of God ONLY) | ✅ Public Domain                       |
| `commentaries/wesley/`           | John Wesley (1703–1791)          | 4                       | ✅ Public Domain                       |
| `commentaries/whitefield/`       | George Whitefield (1714–1770)    | 1                       | ✅ Public Domain                       |

**Bulk download script:** `scripts/download-commentary-library.sh`

## Bible Translations (added Feb 19 2026)

`content/reference/bibles/` — real directory (broken symlink replaced)

| Subfolder             | Contents                                     | License           | Commercial |
| --------------------- | -------------------------------------------- | ----------------- | ---------- |
| `bibles/open-bibles/` | 10 English PD translations + 38 multilingual | All Public Domain | ✅ Yes     |
| `bibles/BSB/`         | Berean Standard Bible (CC0, download script) | CC0 Public Domain | ✅ Yes     |

### English Translations in open-bibles

KJV, ASV, WEB, WEBBE, YLT, DARBY, **BBE** (confirmed PD — 1965 edition no copyright notice), DRA (Douay-Rheims), OEB-CW, OEB-US

**BSB download:** `bash scripts/download-bsb.sh` or use API at runtime: `https://bible.helloao.org/api/BSB/{BOOK}/{CHAPTER}.json`

## Lexicons (added Feb 19 2026)

`content/reference/lexicons/` — real directory (broken symlink replaced)

| Subfolder                 | Contents                                              | License                 | Commercial |
| ------------------------- | ----------------------------------------------------- | ----------------------- | ---------- |
| `lexicons/morphhb/`       | OpenScriptures Morphologically Tagged Hebrew Bible    | Free use w/ attribution | ✅ Yes     |
| `lexicons/HebrewLexicon/` | BDB Outline (BrownDriverBriggs.xml, HebrewStrong.xml) | Free use w/ attribution | ✅ Yes     |
| `lexicons/strongs/`       | Strong's Hebrew + Greek Dictionaries                  | Public Domain           | ✅ Yes     |
| `lexicons/Abbott-Smith/`  | Abbott-Smith Manual Greek Lexicon of the NT (1922)    | CC0 Public Domain       | ✅ Yes     |

See `content/reference/lexicons/README.md` for detailed usage notes.

## STEPBible-Data (added Feb 19 2026)

`content/reference/stepbible-data/STEPBible-Data/` — real directory (broken symlink replaced)

| File                           | License          | Commercial |
| ------------------------------ | ---------------- | ---------- |
| TBESG, TBESH, TFLSJ (Lexicons) | CC BY 4.0        | ✅ Yes     |
| TIPNR, TEGMC, TEHMC            | CC BY 4.0        | ✅ Yes     |
| **TTESV (ESV Tagged Bible)**   | **CC BY-NC 4.0** | ❌ **NO**  |

**WARNING:** Never use TTESV commercially. ESV is Crossway copyright + NC restriction.

## Legacy — All Broken Symlinks Now Replaced

All four broken symlinks from the deleted `euongelion-old` backup have been replaced with real directories:

- `content/reference/bibles/` ← now real
- `content/reference/lexicons/` ← now real
- `content/reference/stepbible-data/` ← now real
- `content/reference/dictionaries/` ← now real (empty — restore content as needed)

The old Scrollmapper data (140+ translations) is NOT restored. The open-bibles repo replaces it with properly licensed PD translations only.

## Policy

- Content updates inside frozen folders are allowed by owner workflow.
- Structural operations (delete/rename/move) are disallowed.
- Integrity checks enforce folder presence.
- All new commentary additions must include `metadata.json` with license + source URL.
- Commercial use requires public domain or CC license confirmation before download.
- **Never store TTESV or any other CC BY-NC content in a commercial product.**
