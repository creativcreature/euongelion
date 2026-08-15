# Series master prompt preamble — FOUNDER APPROVED 2026-08-15

Founder approved the output of this exact preamble on 2026-08-15 ("this set works")
after two rounds of correction. Do not alter it without a new founder review.

Assembled as: `PREAMBLE` + `\n\nSUBJECT: ` + subject + `\n\n` + `CROP_CLAUSE`.
Subjects live in `series-image-subjects.json`. Rendered by `build-prompts.mjs`.

Model `gpt_image_2`, `aspect_ratio: "1:1"`, `quality: "high"`, `resolution: "2k"`
→ 2048×2048 master, 7 credits each. Higgsfield plan cap is **8 concurrent jobs**.

---

## PREAMBLE

FULL BLEED — CRITICAL: the artwork fills the entire frame edge to edge, corner to corner. NO paper margin, NO cream or white border, NO print edge, NO frame, NO vignette.

FULLY DEVELOPED FRAME — CRITICAL: this is a complete illustrated scene, NOT an isolated subject on blank paper. EVERY region of the frame carries rendered artwork — the sky has cloud structure and halftone gradient, the ground has texture, the distance has landscape. There is NO blank cream void anywhere, NO empty background, NO subject floating on bare paper. Quiet areas may be faint and low contrast but they are always PRINTED, never empty.

Risograph screen-print illustration in strict two-color duotone: deep cobalt ultramarine blue ink on warm cream paper. Heavy visible Ben-Day halftone dots forming every tone, paper grain, slight misregistration leaving a faint crimson offset edge on some contours. No gray tones — every shadow is blue dot density. Flat printed poster aesthetic, no photorealism. Absolutely no text, letters, numbers or words.

PEOPLE — CRITICAL: figures are REGION- AND PERIOD-SPECIFIC, never a generic Western default. This is an ancient Levantine / Judean setting: Middle Eastern Semitic people, dark hair, dark brows, dark eyes, some with dark beards. Period dress ONLY — rough woven tunic, draped mantle, head cloth or veil, sandals or bare feet. NO modern clothing.
SKIN TONE IS CRITICAL AND MUST BE VISIBLE IN THE PRINT: skin is brown to deep brown and is therefore rendered in DENSE blue halftone, clearly and obviously DARKER in value than the cream paper ground. Skin must NEVER be left as bare cream paper and must never read as pale or light — in this duotone, unprinted paper means white skin, which is WRONG.
ABSOLUTELY NOT: European, Anglo, Nordic or generic AI white faces, pale skin, light or blonde hair, modern haircuts.
Faces stay anonymous through POSE — seen from behind, in profile, head bowed, or shadowed by a head covering. NEVER a blacked-out featureless void where a face should be. A visible face is fine when it is genuinely region-accurate.

## CROP_CLAUSE

COMPOSITION FOR CROPPING: hold the subject and the golden light together in the central square region so a tall 9:16 crop and a wide 1.91:1 crop keep both. Keep the outer 15% quieter but FULLY PAINTED — never blank paper. Nothing meaningful in any corner or near any edge.

---

## Modern-dress variant

Only for series whose content is explicitly contemporary. Replace the PEOPLE block with:

PEOPLE — CRITICAL: the people shown are visibly DIVERSE — Black, Brown, Middle Eastern, East Asian, South Asian and white people together. NEVER an all-white cast, and white people are not excluded. Skin tones across the group must span light to deep brown and are rendered as HALFTONE DOT DENSITY — darker skin is denser blue dots, clearly darker in value than the cream ground. Skin must NEVER be left as bare cream paper. Faces stay anonymous through POSE — from behind, in profile, or bowed. NEVER a blacked-out featureless void.

---

## Why each clause exists (do not drop these)

| Clause | Defect it fixes |
|---|---|
| FULL BLEED | 17 of 21 masters came back with a cream paper border. `sharp.trim()` could not remove it — the gradient is too soft. |
| FULLY DEVELOPED FRAME | Subjects floated on blank cream. Founder: "no stark nothing backgrounds." An earlier "leave quiet discardable margin" clause caused this — it read as permission to leave the frame empty. |
| PEOPLE / region + period | Unspecified period defaults to contemporary Western. Produced a boy in a sweatshirt and jeans. |
| SKIN AS PRINTED VALUE | **The critical one.** In cobalt-on-cream duotone the cream paper is the only other ink, so unprinted skin *is* white skin. Naming an ethnicity without forcing dot density still outputs a white person. |
| Faces by pose | Founder dislikes blacked-out faces; anonymity must come from posture, angle and head covering. A visible region-accurate face is acceptable. |
| CROP_CLAUSE | One 2048² master derives all 10 site + social ratios. Saliency cropping destroyed meaning (it kept a hand and deleted the kneeling figure), so composition must do the work instead. |

## Verification gate — run before install

1. **Border** — sample 3 pixels down each edge of the 1408×768 centre crop; all must be ink, not paper.
2. **Blank paper** — bare-paper coverage across the whole frame must be ~0%.
3. **Figures** — open the image and confirm period dress, dense-dot skin, no blacked-out faces.

A build passing 1 and 2 can still fail 3. Step 3 is a human look, not a measurement.
