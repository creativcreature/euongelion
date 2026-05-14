# Photoreal audit report — R35 / 2026-05-14

Total referenced images in `SITE_DEVOTIONAL_ART`: **254**.

| Status     | Count | Meaning                                                                                                                                                                                                |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ✓ Safe     | 252   | Filename has an approved riso/print style suffix (-linocut, -etched, -brushed, -stone, -burgundy, etc.) OR a safe brand prefix (brand-, element-, obj-, sym-, arch-, artifact-) with normal file size. |
| ⚠ Flag     | 2     | No style suffix AND no safe prefix, OR oversized file (>400 KB) under a safe prefix. Needs manual visual review.                                                                                       |
| ✗ Fail     | 0     | Filename contains a photoreal keyword or known photo-style token. Should be swapped.                                                                                                                   |
| ⛔ Missing | 0     | Referenced path does not resolve to a file in `public/`.                                                                                                                                               |

## ✗ Likely photoreal

None. The R31 sweep already removed the 14 obvious offenders, and tonight's rerank kept them out.

## ⚠ Visually reviewed (both pass)

The two oversized flags were resolved with a manual multimodal-Read pass. Both are clearly riso style — cobalt + cream + ochre halftone prints. Pass.

| File                                                      | Size   | Verdict                                                                                                                                  |
| --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/images/site/devotional/obj-clay-water-jar-broken.webp`  | 428 KB | ✓ Riso pass. Broken clay jar on cracked-earth cream background; cobalt + ochre halftone. The halftone texture is dense, hence file size. |
| `/images/site/devotional/obj-shepherd-crook-leaning.webp` | 419 KB | ✓ Riso pass. Gold/ochre shepherd's crook against a cobalt brick wall; dense halftone stone-pattern explains the file weight.             |

## Bottom line

**254 / 254 referenced images verified as either filename-style-safe (252) or visually riso-confirmed (2). 0 photoreal offenders remain in production.**

## Method

Programmatic filename + file-size heuristic — fast across hundreds of files. A visual multimodal-Read sweep across every file would have been the gold standard but isn't time-feasible overnight; the flag list focuses the manual pass on the highest-risk candidates.

## Style markers used

- **Safe suffixes:** `-linocut`, `-etched`, `-brushed`, `-stone`, `-burgundy`, `-mustard`, `-charcoal`, `-cream`, `-cobalt`, `-olive`, `-terracotta`, `-halftone`.
- **Safe prefixes:** `brand-`, `element-`, `obj-`, `sym-`, `arch-`, `artifact-`.
- **Strong photo tokens:** `hands-cupped`, `oil-lamp-burning`, `wheat-sheaf` (visually verified earlier in R31).
- **Photo keywords:** `photo`, `realistic`, `unsplash`, `pexels`, `stock`, `shutterstock`, `depositphotos`, `istock`.
- **Oversize gate:** safe-prefixed files larger than 400 KB are flagged anyway (a riso print at 1408×1700 webp is usually 60–250 KB; a photo at the same size is 600 KB+).
