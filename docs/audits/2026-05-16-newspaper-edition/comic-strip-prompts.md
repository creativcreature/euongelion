# Comic-Strip Generation Prompts — Re-runnable

**Generator:** nanobanana-mcp (Gemini Imagen via Anthropic MCP), session `euangelion-newspaper-edition`.
**Aspect ratios:** `21:9` for daily strips, `4:5` for Sunday color and ads.
**Character continuity:** every prompt after the first is run with `use_image_history: true` so the recurring Jesus character stays visually consistent across the four strips.

To re-run: open a `nanobanana-mcp` session with the conversation ID and ratio above, then paste each prompt verbatim. For the Sunday strip and any strip after #1, set `use_image_history: true` before running so the character is preserved.

---

## Recurring character design — JESUS (the lead)

Across all four strips, JESUS is rendered as a recurring character drawn in the same simplified line-art register as the rest of the cast — never a tonal exception. Specs:

- Adult male, calm composed posture, kind face, short brown beard, small dot eyes
- Modern long coat (or simple long garment that reads as both contemporary and timeless)
- No halo, no nimbus, no overt iconography
- Same proportions as the other adult characters in the strip
- Treated reverently — never gag-driven, never irreverent, never preachy
- Influence register: Schulz late-period Peanuts crossed with Watterson's adult-character handling in *Calvin and Hobbes*

---

## Strip 01 — "The Bus Stop"

**Aspect ratio:** 21:9
**Output:** `public/audits/2026-05-16-newspaper-edition/images/comics/01-bus-stop.png`
**Use image history:** false (anchor)

```
A traditional black-and-white newspaper daily comic strip in the visual register of Charles Schulz late-period Peanuts crossed with Bill Watterson — confident clean ink line, halftone Ben-Day dot shading, cream/off-white newsprint paper background with subtle paper grain, thin black panel borders. ONE long horizontal strip, FOUR panels of equal width.

Recurring character: JESUS — drawn reverently in a simplified line-art register that matches the rest of the strip. Modern long coat, short brown beard, kind composed face, dot eyes, no halo, calm posture. Treat him like Linus's older brother — quiet, observing, gentle. Not cartoony in a way that mocks. Drawn at the same proportions as other adult characters.

PANEL 1: A modern city bus stop bench at evening. A COMMUTER (40s, hunched, wearing a coat) sits alone, staring at a phone, exhausted. Empty sidewalk. Streetlight. No caption, no dialogue.

PANEL 2: JESUS enters the panel from the right and sits down quietly beside the commuter. The commuter doesn't look up. Both face the same direction. No caption, no dialogue.

PANEL 3: They sit in silence side by side. Jesus looks straight ahead, hands folded in his lap. Commuter still on the phone. A small bird lands on the bench between them. No caption.

PANEL 4: Wide shot — the bus arrives at the curb, headlights illuminating both figures. Bottom caption box, hand-lettered all caps: "SOMETIMES PRESENCE IS THE ENTIRE PRAYER."

Pure black ink on cream newsprint. Halftone dot shading for shadows. Classic newspaper-comic-strip hand lettering. The tone is contemplative and reverent — never gag-driven, never irreverent.
```

---

## Strip 02 — "The Late Email"

**Aspect ratio:** 21:9
**Output:** `public/audits/2026-05-16-newspaper-edition/images/comics/02-late-email.png`
**Use image history:** true (continues from Strip 01 for character consistency)

```
Continue the same newspaper daily comic strip style as the previous image — same recurring JESUS character (modern long coat, short brown beard, kind face, dot eyes, drawn reverently in simplified Schulz/Watterson line art register), pure black ink on cream newsprint paper, halftone shading, thin black panel borders, four panels of equal width in one long horizontal strip.

PANEL 1: A small home office at night. A PERSON (30s, woman with hair pulled back, in pajamas) sits at a desk staring at a laptop screen. The room is dark except for the screen glow. A coffee mug. Crumpled paper around the desk. Caption box at top reads: "11:47 PM. SHE HAD WRITTEN THE APOLOGY THREE TIMES."

PANEL 2: Close-up of her hands hovering over the keyboard, the SEND button highlighted on the screen. Her face is anxious. No caption.

PANEL 3: JESUS (the recurring character from the previous strip) stands behind her chair, leaning in to read over her shoulder. He is quiet. His hand rests gently on the back of her chair. He does not speak. No caption.

PANEL 4: She has hit send. Both of them are looking at the screen which now shows "MESSAGE SENT." Bottom caption box reads: "HALF OF GRACE IS JUST CLICKING THE BUTTON."

Same exact comic strip newsprint register as the prior strip. Reverent, contemplative, never gag-driven.
```

---

## Strip 03 — "The Walk Home"

**Aspect ratio:** 21:9
**Output:** `public/audits/2026-05-16-newspaper-edition/images/comics/03-walking-home.png`
**Use image history:** true

```
Continue the same newspaper daily comic strip style — same recurring JESUS character from the previous two strips. Pure black ink on cream newsprint, halftone shading, thin panel borders, four panels in one horizontal strip.

PANEL 1: A suburban sidewalk in the afternoon. A small CHILD (about 8 years old, backpack on, head down, scuffing at the pavement) walks home alone. Autumn leaves on the ground. No caption.

PANEL 2: The child kicks a small stone forward. The stone skips down the sidewalk. The child looks slightly less sad now. No caption.

PANEL 3: JESUS appears walking alongside the child, also kicking the same stone. He is unhurried. The child glances over but doesn't seem surprised. No dialogue.

PANEL 4: Wide shot of the two walking together down the long sidewalk, both small in the frame, the sunset behind them. Bottom caption: "HE WALKS ALL THE WAY HOME WITH US. EVEN ON THE BAD DAYS."

Same comic strip newsprint register. Contemplative, gentle. The strip should feel like a quiet Sunday Peanuts.
```

---

## Strip 04 — Sunday color · "The Boat in the Storm"

**Aspect ratio:** 4:5
**Output:** `public/audits/2026-05-16-newspaper-edition/images/comics/04-sunday-color.png`
**Use image history:** true

```
A traditional FULL-COLOR Sunday newspaper comic strip — the kind that ran on the back page of a 1970s Sunday paper. Format: a vertical Sunday strip with a TITLE PANEL at the top reading "EUANGELION SUNDAY" in classic ornate newspaper-comic title lettering, followed by EIGHT story panels arranged in a 2-row grid (4 panels per row) with thin black panel borders. Color: classic Sunday comic palette — cyan, magenta, yellow, black process inks with visible CMYK halftone dot patterns (rosette dot rosette pattern visible on close inspection), slight registration misalignment between color plates (charm-of-old-print effect), cream-yellow Sunday-comic-paper background. Same recurring JESUS character (modern long coat, short brown beard, kind face) from the previous three strips, drawn at the same Schulz/Watterson-influenced register.

TITLE PANEL (full width across top): Decorative banner reading "EUANGELION SUNDAY" — bold sans-serif, with the strip title underneath: "THE BOAT IN THE STORM" — hand-lettered, ornate, vintage Sunday-comic style.

PANEL 1 (top row, left): A modern small rowboat on a calm lake at dawn. A YOUNG WOMAN (early 30s, jeans and sweater) sits at the oars. Jesus is curled up asleep in the stern of the boat under a coat. Calm water, pink-orange sunrise sky. No dialogue.

PANEL 2: Storm clouds gathering. Wind picks up. The woman's hair blows. Jesus still asleep. No dialogue.

PANEL 3: Big waves crash. The boat tilts. The woman grips the gunwale. Jesus still asleep. A speech bubble from the woman: "JESUS!"

PANEL 4 (top row, right): Lightning crack across the sky. The boat half-flooded. The woman shouting now. Speech bubble: "WAKE UP!"

PANEL 5 (bottom row, left): Jesus stirs, sits up calmly. The wind howls around him. He looks at the woman.

PANEL 6: Jesus stands in the boat, one hand raised gently, the other steadying himself. He speaks quietly. Speech bubble: "PEACE. BE STILL."

PANEL 7: The water flattens immediately. The wind dies. The clouds part. The woman, wide-eyed, looks at Jesus. He looks at her.

PANEL 8 (bottom row, right): The boat drifts on flat water at sunset. Both seated, side by side. The woman is dry now. Caption box at the bottom of the panel reads: "WHO IS THIS, THAT EVEN THE WIND AND WAVES OBEY?"

Classic 1970s Sunday-comic CMYK color print with visible halftone dot pattern, slight plate misregistration giving the colors a slight bleed. Reverent tone — never gag-driven.
```

---

## Editorial cartoon — "The Stillness Problem"

**Aspect ratio:** 5:4
**Output:** `public/audits/2026-05-16-newspaper-edition/images/editorial/editorial-cartoon.png`
**Use image history:** false

```
A traditional single-panel newspaper editorial cartoon in the visual register of Herblock and Pat Oliphant — pen and ink, crosshatching, heavy black brushwork, on cream-yellow newsprint paper with subtle paper grain. Single rectangular panel with thin black border. Hand-lettered title at the bottom of the cartoon. Hand-signed artist mark in the bottom right corner. NO COLOR — pure black ink on cream paper.

SCENE: A modern living room. A LARGE OVERSTUFFED COUCH dominates the foreground. On the couch sits a figure entirely consumed by their smartphone — the phone glows brightly and casts the figure's whole face in screen-light, eyes wide and glazed. Behind them, sitting on the windowsill of the room, is a small bird (a sparrow). On the wall behind the couch hangs a needlepoint sampler that reads in tiny stitched letters: "BE STILL & KNOW." The needlepoint is crooked. Dust on the windowsill.

In the corner of the cartoon, partially out of frame, is a small wooden table with an open Bible — covered in a thin layer of visible halftone dust. Beside the Bible, a coffee cup left untouched, still steaming faintly.

Bottom caption hand-lettered: "THE STILLNESS PROBLEM."

The cartoon should read as gentle social commentary — not preachy, not snarky. Editorial-cartoon register, contemplative. Tim Harrower would call this a "single point of view" cartoon.
```

---

## Lead-story photograph

**Aspect ratio:** 3:2
**Output:** `public/audits/2026-05-16-newspaper-edition/images/photos/lead-story-photo.png`
**Use image history:** false

```
A black-and-white documentary photograph processed in the style of mid-20th-century newspaper halftone printing — coarse halftone dot pattern visible across all gray tones, slight dot misregistration, cream-yellow newsprint paper background showing through the lightest tones, ink slightly muddy in the deepest blacks. Composition: 3:2 horizontal, taken at eye level, candid documentary register reminiscent of Gordon Parks or Bruce Davidson for LIFE Magazine.

SCENE: An elderly woman, seated alone in the front pew of an empty small-town clapboard church at early morning. Soft window light streams in from the high windows on her right side. She is in her 80s, head covered by a small embroidered head scarf, hands folded in her lap holding a worn cloth-bound Bible. Her eyes are closed. Her face is composed. Wooden pews stretch behind her, all empty. The aisle is wide and unpopulated. A single hymn book is left on a pew nearby. Dust motes visible in the light beam.

The photograph reads as quiet, contemplative, witness-bearing. Newspaper-quality halftone treatment so it prints clean on cream newsprint paper. Approximate quality of a 1960s LIFE Magazine photo essay reproduction.
```

---

## In-character display advertisement

**Aspect ratio:** 4:5
**Output:** `public/audits/2026-05-16-newspaper-edition/images/ads/in-character-ad.png`
**Use image history:** false

(see prompt verbatim in the original turn — saved here so re-runs match)

---

## Liturgical-year infographic

**Aspect ratio:** 4:5
**Output:** `public/audits/2026-05-16-newspaper-edition/images/infographics/liturgical-year-infographic.png`
**Use image history:** false

(see prompt verbatim in the original turn — saved here so re-runs match)

---

## How to re-run a single strip

```bash
# Open an MCP session with the right config
mcp set_aspect_ratio --conversation_id euangelion-newspaper-edition --aspect_ratio 21:9
mcp generate_image \
  --conversation_id euangelion-newspaper-edition \
  --use_image_history true \
  --output_path public/audits/2026-05-16-newspaper-edition/images/comics/0X-new-strip.png \
  --prompt "$(< prompt-from-this-file.txt)"
```

For Strip 01 (the anchor), omit `--use_image_history`. For every strip after, include it so the character stays consistent.

If a strip comes back with weak character continuity, run the strip again with `use_image_history: true` and `reference_images: ["public/audits/2026-05-16-newspaper-edition/images/comics/01-bus-stop.png"]` to re-anchor.
