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

## Broken Symlinks (legacy — do not restore without audit)

The following are broken symlinks pointing to deleted `euongelion-old` backup. They reference valid data that no longer exists locally:

- `content/reference/bibles/` → `euongelion-old/content/reference/bibles`
- `content/reference/dictionaries/` → `euongelion-old/content/reference/dictionaries`
- `content/reference/lexicons/` → `euongelion-old/content/reference/lexicons`
- `content/reference/stepbible-data/` → `euongelion-old/content/reference/stepbible-data`

⚠️ **Scrollmapper warning:** If bibles symlink is restored, audit all 140+ translations. Many are copyrighted (NIV, ESV, NASB). Only commercially usable: KJV, ASV, WEB, YLT, Darby, BBE (pending US copyright verification).

## Policy

- Content updates inside frozen folders are allowed by owner workflow.
- Structural operations (delete/rename/move) are disallowed.
- Integrity checks enforce folder presence.
- All new commentary additions must include `metadata.json` with license + source URL.
- Commercial use requires public domain or CC license confirmation before download.
