# EUONGELION Image Strategy

**Version:** 1.0
**Last Updated:** January 17, 2026
**Purpose:** Complete visual image strategy for the EUONGELION devotional platform

---

## Philosophy

**Poster meets newspaper. Museum meets manuscript.**

Images in EUONGELION exist to:

1. Create contemplative stillness
2. Support theological weight
3. Evoke emotional resonance without manipulation
4. Never distract from the Word

The visual approach is **editorial, not evangelical.** Think gallery exhibition catalog, not church bulletin. Think illuminated manuscript, not stock photo library.

**Reference Artists:**

- Caravaggio (single-source lighting, subjects emerging from darkness)
- Rembrandt (intimate, weathered, human)
- Georges de La Tour (candlelit contemplation)

---

## 1. Image Categories

### Hero Images

**Purpose:** Series covers, feature images, day opening screens

**Characteristics:**

- Full-bleed, edge-to-edge
- 16:9 aspect ratio (desktop), 4:5 (mobile art direction)
- Dramatic chiaroscuro lighting
- Single focal point
- Space for text overlay (clear top or bottom third)

**Resolution:** Minimum 1920 x 1080px
**File size target:** 100-150KB (WebP)

---

### Inline Devotional Images

**Purpose:** Support reading, break up text, visualize metaphors

**Characteristics:**

- Contained within content column (max 680px width)
- 3:2 or 1:1 aspect ratio
- Objects, hands, natural elements
- Never compete with body text

**Resolution:** Minimum 1200 x 800px
**File size target:** 60-80KB (WebP)

---

### Background Textures/Patterns

**Purpose:** Subtle visual interest without distraction

**Types:**

- Parchment grain (aged paper feel)
- Fabric weave (linen, rough cloth)
- Stone surface (ancient, weathered)
- Gold leaf fragments (rare, accent only)

**Application:**

- 5-15% opacity
- Never full-saturation
- Used on section dividers, Hebrew word cards, pull quote backgrounds

**Format:** PNG with transparency or CSS repeating patterns
**Resolution:** 400-800px tiles

---

### Icon System

**Purpose:** Navigation, UI feedback, module type indicators

**Style:**

- Line-based, single-weight stroke
- Tehom Black (#1A1612) or God is Gold (#C19A6B)
- Minimal, architectural
- No fill, no gradients, no shadows

**Sizes:**

- 16px (inline text)
- 24px (navigation)
- 32px (module headers)
- 48px (featured/hero)

**Format:** SVG only (never raster for icons)

---

### User-Generated Content

**Purpose:** Journal prompts, reflection inputs, personal notes

**Treatment:**

- No images required (typography-focused)
- If user uploads: apply brand treatment automatically
- Fallback: abstract texture or solid Scroll White

**Acceptance criteria (for uploads):**

- Minimum 800px width
- No modern clutter (phones, logos, screens)
- Passes style filter or flagged for review

---

### Social Share Cards

**Purpose:** Open Graph images for link previews

**Specifications:**

- 1200 x 630px (standard OG ratio)
- EUONGELION wordmark (Kinfolk serif, top-center)
- Day/series title (Monument Grotesk Bold)
- Background: Tehom Black or Hero image with 60% dark overlay
- Text: Scroll White (#F7F3ED)

**Template structure:**

```
┌─────────────────────────────────┐
│          EUONGELION             │
│                                 │
│      "Series or Day Title"      │
│                                 │
│      Day 01 of 05               │
└─────────────────────────────────┘
```

---

## 2. Visual Style

### Photography vs. Illustration vs. Abstract

| Content Type          | Primary Medium    | Rationale                               |
| --------------------- | ----------------- | --------------------------------------- |
| **Hero images**       | Photography       | Emotional weight, immediate recognition |
| **Word studies**      | Abstract/Texture  | Let Hebrew text be the visual focus     |
| **Story modules**     | Photography       | Human connection, tangible              |
| **Doctrinal content** | Abstract/Minimal  | Ideas don't need literal imagery        |
| **Games/Interactive** | Line illustration | Clarity, playfulness-with-restraint     |
| **Fallback**          | Typography only   | When imagery would distract             |

**Default:** Photography with Caravaggio treatment
**Exception:** Abstract when no fitting photograph exists

---

### Color Treatment

**All images entering the system receive standard processing:**

1. **Desaturation:** -25% to -40%
   - Purpose: Mute modern colors, create timeless feel
   - Exception: Already muted images

2. **Contrast:** +10% to +20%
   - Deepen blacks
   - Protect highlights from clipping
   - Create depth and drama

3. **Color grading:**
   - Warm midtones (+5% amber)
   - OR cool shadows (+5% slate blue)
   - Never both

4. **Vignette:** 10-15%
   - Large, feathered edges
   - Draws eye to center

5. **Grain:** 5-10%
   - Fine, film-like
   - Hides digital artifacts

**Integration with palette:**

| Brand Color                     | Image Usage                        |
| ------------------------------- | ---------------------------------- |
| **Tehom Black (#1A1612)**       | Deep shadows, background voids     |
| **Scroll White (#F7F3ED)**      | Highlight areas, text overlays     |
| **God is Gold (#C19A6B)**       | Accent highlights, rare warm tones |
| **Covenant Burgundy (#6B2C2C)** | Sacrifice themes only              |
| **Gethsemane Olive (#6B6B4F)**  | Creation/wilderness themes only    |
| **Shalom Blue (#4A5F6B)**       | Peace/Spirit themes only           |

---

### Mood/Tone

**Contemplative, not cheery.**

| DO                          | DON'T                |
| --------------------------- | -------------------- |
| Quiet, reverent             | Bright, energetic    |
| Dramatic but not theatrical | Flat, evenly lit     |
| Emotional weight            | Sentimentality       |
| Ancient, timeless           | Trendy, dated        |
| Serious joy                 | Saccharine happiness |
| Real, weathered             | Polished, stock      |

**Lighting principles:**

- Single-source (window, candle, spotlight)
- High contrast (deep shadows + bright highlights)
- Directional, intentional
- Chiaroscuro effect

**Never:**

- Multiple light sources
- Harsh shadows (looks cheap)
- Blown-out whites
- Fill flash aesthetic

---

### Cultural Sensitivity

**Diverse representation in biblical imagery:**

**Principles:**

1. Historical accuracy matters less than theological truth
2. Jesus was Middle Eastern, not European
3. The early church was multiethnic
4. Avoid reinforcing Western defaults

**Guidelines for human figures:**

- When depicting biblical characters: diverse skin tones, features
- When depicting hands in prayer: variety of skin tones over time
- When depicting modern applications: reflect global church
- Avoid tokenism: not every image needs representation; rotate over time

**Avoid:**

- Blonde/blue-eyed Jesus
- All-white biblical scenes
- Ethnic stereotyping
- Exoticizing non-Western cultures

**Prefer:**

- Objects over people (bread, oil, stone, water)
- Hands without visible faces
- Silhouettes and shadows
- When faces necessary: historical accuracy for region

---

## 3. AI Image Generation Approach

### When to Use AI-Generated Images

**Use AI when:**

- No suitable stock/licensed image exists
- Specific theological concept needs visualization
- Creating abstract textures or patterns
- Generating consistent series imagery

**Prefer other sources when:**

- High-quality stock matches brand style
- Historical art/paintings available (public domain)
- Simple abstract can be designed directly

---

### Style Prompts That Match the Brand

**Base prompt structure:**

```
A photograph in the style of Caravaggio, single-source lighting,
dramatic chiaroscuro, subject emerging from darkness,
[SUBJECT DESCRIPTION], muted earth tones, desaturated,
film grain texture, museum-quality lighting, generous negative space
```

**Negative prompt (always include):**

```
Avoid: modern objects, bright colors, multiple light sources,
flat lighting, CGI look, digital artifacts, lens flare,
bokeh overload, stock photo aesthetic, posed, theatrical
```

---

### Consistency Guidelines

**To maintain visual coherence:**

1. **Same base prompt** for all series images
2. **Same post-processing** pipeline applied
3. **Same aspect ratios** across same category
4. **Color grade** to match brand palette
5. **Review against existing library** before publishing

**Batch generation:**

- Generate 3-5 options per concept
- Review for brand alignment
- Select best, archive others
- Apply identical post-processing

---

### What NOT to Generate (AI "Tells" to Avoid)

**Reject images with:**

| AI Tell                    | Why It Fails                            |
| -------------------------- | --------------------------------------- |
| **Overly smooth skin**     | Looks plastic, not human                |
| **Perfect symmetry**       | Feels uncanny                           |
| **Impossible anatomy**     | Hands with wrong fingers, twisted limbs |
| **Muddled text/letters**   | AI can't render legible text            |
| **Too many details**       | Cluttered, unfocused                    |
| **Uncanny eyes**           | Off-putting, distracting                |
| **Inconsistent lighting**  | Multiple shadows, wrong reflections     |
| **Anachronistic elements** | Modern objects in ancient scenes        |
| **Over-rendered faces**    | Jesus portraits especially              |

**Best practice:**

- Avoid generating human faces when possible
- Favor objects, hands, landscapes, textures
- Use close-ups where face would be off-frame
- When people necessary: silhouettes, partial views

---

## 4. Imagery by Content Type

### Onboarding Series

**Visual approach:** Warm welcome, low barrier

| Screen         | Image Type            | Notes                                |
| -------------- | --------------------- | ------------------------------------ |
| Welcome        | Hero (abstract light) | Light breaking through, not specific |
| Soul Audit     | No image              | Typography focus, form-first         |
| Match Reveal   | Series hero           | User's matched series image          |
| Account Prompt | Minimal               | Wordmark + subtle texture only       |

**Mood:** Inviting but not eager. Calm. Safe.

---

### Through-the-Bible Devotionals

**Visual approach:** Literary, scholarly, ancient

| Module Type           | Preferred Image                     |
| --------------------- | ----------------------------------- |
| **Genesis-Exodus**    | Desert landscapes, stars, fire      |
| **Historical books**  | Architecture, ruins, weapons        |
| **Wisdom literature** | Objects (scrolls, oil lamps, bread) |
| **Prophets**          | Dramatic skies, wilderness, cities  |
| **Gospels**           | Roads, hands, bread/wine, light     |
| **Epistles**          | Writing implements, scrolls, ships  |
| **Revelation**        | Abstract, gold, cosmic, light       |

**Character depiction:**

- Prefer symbolic over literal
- Objects associated with figure (Moses: staff, tablets)
- Silhouettes and shadows
- Hands/feet without full figures

---

### Audience-Specific Series

**Grief:**

- Muted, low-key lighting
- Empty spaces, chairs, doorways
- Hands holding objects (letters, jewelry)
- Water, rain, mist

**Doubt:**

- Liminal spaces (doorways, bridges, crossroads)
- Fog, unclear horizons
- Single candle in darkness
- Cracked surfaces

**Anger:**

- High contrast, dramatic shadows
- Storm imagery (restrained, not chaotic)
- Fists, tension in hands
- Fire (controlled, not raging)

**Anxiety:**

- Overwhelmed desks, clutter (breaking the rule intentionally)
- Then: open space, clear horizon
- Progression from chaos to calm
- Breath imagery (wind, open windows)

**Joy:**

- Light through windows
- Morning imagery
- Tables with bread/wine
- Harvest, abundance (subtle)

---

### Doctrinal Content

**Visual approach:** Abstract, restrained, idea-focused

**Principles:**

- Let concepts stand without literal imagery
- Use geometric patterns sparingly
- Typography can be the visual
- White space as meaning

**When images are used:**

- Trinitarian content: light refracting, water states
- Incarnation: shadow becoming flesh, doorways
- Atonement: lamb imagery (tasteful, not gory)
- Resurrection: dawn, stone rolled away, garden

**Avoid:**

- Clip art theology
- Diagram aesthetics
- Infographic overload

---

### Apologetics Content

**Visual approach:** Intellectual, evidence-based aesthetic

**Preferred imagery:**

- Ancient manuscripts, Dead Sea Scroll fragments
- Archaeological sites (restrained, not tourist-y)
- Maps (aged, not modern digital)
- Scientific imagery (restrained, not textbook)

**For historical reliability:**

- Ancient texts, papyri
- Museum artifacts (properly lit)

**For philosophical arguments:**

- Abstract, conceptual
- Light/shadow playing on surfaces
- Empty spaces prompting thought

---

## 5. Image Placement Patterns

### Where Images Appear in Devotional Layout

**Section Patterns:**

```
HERO (Full-bleed, 100vh)
├── Day number (typography over image or solid)
├── Optional: Hero image with text overlay
└── Title + subtitle

READING SECTION
├── Body text (680px max width)
├── Inline image (optional, 680px width)
├── Inline image (inset, floated, 300-400px)
└── More body text

PULL QUOTE (Full-bleed or padded)
├── Quote text (large, centered)
├── Background: subtle image (30% opacity) OR solid
└── Attribution

HEBREW WORD STUDY
├── Background: texture (parchment) OR solid
├── Hebrew text (large, gold or black)
├── Translation + pronunciation
└── No competing imagery

REFLECTION SECTION
├── Questions (typography-first)
├── Journal input area
└── Optional: subtle background texture

PRAYER CLOSING
├── Text (centered, spacious)
├── Background: dark (Tehom) with subtle texture
└── No literal imagery
```

---

### Size Ratios and Crops

| Image Type             | Aspect Ratio | Desktop Size   | Mobile Size       |
| ---------------------- | ------------ | -------------- | ----------------- |
| **Hero (full-bleed)**  | 16:9         | 1920 x 1080    | 1080 x 1350 (4:5) |
| **Featured**           | 3:2          | 1200 x 800     | 800 x 533         |
| **Inline (contained)** | 3:2          | 680 x 453      | 100% width        |
| **Inline (inset)**     | 1:1 or 4:3   | 300-400px      | Hidden or stacked |
| **Portrait**           | 4:5          | 800 x 1000     | 100% width        |
| **Background texture** | 1:1          | 800 x 800 tile | Same              |

**Cropping guidelines:**

- Focal point in center third
- Allow for text overlay space
- Mobile crops may differ from desktop (art direction)
- Never crop essential meaning out of frame

---

### Relationship to Text

**Text + Image Hierarchy:**

1. **Text over image** (hero/full-bleed)
   - Requires 40-60% dark overlay
   - Text: Scroll White
   - Minimum 4.5:1 contrast ratio
   - Text in center 60% of image

2. **Text beside image** (two-column, rare)
   - 50/50 split on desktop
   - Stack on mobile (image first)
   - Equal visual weight

3. **Text above/below image** (standard inline)
   - 60px margin above and below image
   - Caption: 14-16px, centered, secondary color
   - Clear separation from body text

4. **Image as background** (subtle)
   - 10-20% opacity
   - Never compete with text
   - User shouldn't consciously notice it

---

### Mobile Considerations

**Mobile-first image strategy:**

- **Hero images:** Art-direct for portrait (4:5) separate from desktop landscape
- **Inline images:** Full-width on mobile (no floats)
- **Inset images:** Stack above/below text (don't float)
- **Background textures:** Reduce opacity further (5-10%)
- **Touch targets:** 44px minimum around interactive images

**Performance:**

- Serve smaller images to mobile (srcset)
- Lazy load below-fold images
- Use WebP with JPEG fallback
- Maximum 60KB per mobile image

**Breakpoint handling:**

```html
<picture>
  <source media="(min-width: 768px)" srcset="hero-landscape.webp" />
  <source media="(max-width: 767px)" srcset="hero-portrait.webp" />
  <img src="hero-landscape.jpg" alt="Description" loading="lazy" />
</picture>
```

---

## 6. Texture & Pattern Library

### Parchment/Scroll Textures

**Purpose:** Hebrew word cards, pull quote backgrounds, section dividers

**Characteristics:**

- Aged paper grain
- Subtle variation (not uniform)
- Warm undertones (aligns with Scroll White)
- Never yellowed or "treasure map" looking

**Application:**

- 5-15% opacity over Scroll White
- Or used as section background at full opacity

**Generation prompt:**

```
Aged parchment texture, subtle paper grain, warm cream tones,
even lighting, no stains, no dramatic aging, slight fiber
visibility, museum-quality document scan aesthetic
```

---

### Gold Leaf Effects

**Purpose:** Rare accent, Hebrew emphasis, signature moments

**Characteristics:**

- Imperfect, hand-applied look
- Subtle crackle and variation
- Not shiny/reflective (matte gold)
- Fragments, not solid blocks

**Application:**

- Behind Hebrew letters (10-20% opacity)
- Border accents (1-2px fragments)
- Pull quote decorative elements (rare)

**Avoid:**

- Solid gold blocks
- Metallic shine effects
- Gradients mimicking gold
- Overuse (special moments only)

**Generation prompt:**

```
Gold leaf fragment texture, hand-applied imperfection,
matte finish, crackled surface, illuminated manuscript style,
scattered fragments, not solid, aged patina, museum artifact
```

---

### Subtle Geometric Patterns

**Purpose:** Doctrinal content backgrounds, interactive modules

**Characteristics:**

- Single-line weight
- Tehom Black or God is Gold lines
- 2-5% opacity
- Based on sacred geometry (optional)

**Pattern types:**

- Intersecting lines (not busy)
- Hexagonal (creation motif)
- Vesica piscis (Christ symbol, very subtle)
- Simple grid (architectural)

**Application:**

- Full-section background
- Behind form inputs
- Interactive game modules

---

### Light/Shadow Treatments

**Purpose:** Hero overlays, transition effects, depth

**Types:**

1. **Gradient overlay (vertical)**

   ```css
   background: linear-gradient(
     to bottom,
     rgba(26, 22, 18, 0) 0%,
     rgba(26, 22, 18, 0.7) 100%
   );
   ```

2. **Radial vignette**

   ```css
   background: radial-gradient(
     ellipse at center,
     rgba(26, 22, 18, 0) 0%,
     rgba(26, 22, 18, 0.3) 100%
   );
   ```

3. **Light leak (rare accent)**
   - Amber/gold tint from corner
   - Very subtle (5-10% opacity)
   - Used on testimonial sections

---

## 7. No-Image Strategy

### When Typography Alone Is Sufficient

**Use typography-only when:**

| Scenario                        | Rationale                              |
| ------------------------------- | -------------------------------------- |
| **Reflection questions**        | User should focus inward, not at image |
| **Prayer sections**             | Words ARE the experience               |
| **Simple comprehension checks** | Imagery would distract from task       |
| **Doctrinal definitions**       | Ideas don't need illustration          |
| **Journal prompts**             | User's words become the content        |

**Typography as visual element:**

- Oversized day numbers (120-160px thin weight)
- Massive pull quotes (40-56px bold)
- Hebrew terms (28-32px, gold)
- Generous white space around text

---

### White Space as Visual Element

**Sabbath aesthetic:**

White space is not empty. It is:

- Theological breathing room
- Visual rest
- Emphasis through absence
- Trust that less is more

**Implementation:**

- 120px+ between major sections
- 60px margins around contained images
- Never fill space just because it's there
- Let single elements command attention

**Rule of thumb:** If you're wondering whether to add an image, you probably don't need one.

---

### When Minimalism Serves Better Than Imagery

**Minimalism preferred for:**

1. **Deep theological content**
   - Ideas are abstract; imagery can literalize
   - Let reader's imagination engage
   - Text carries weight

2. **Prayer and meditation**
   - External imagery can distract
   - Inner focus required
   - Silence has visual analog (emptiness)

3. **Transitions between days**
   - Simple day number + title
   - Clean break, not visual overload
   - Reset before next section

4. **User response moments**
   - Journal, reflection, commitment
   - User becomes the content creator
   - Interface should recede

---

## 8. Technical Requirements

### File Formats

| Format   | Use Case                   | Notes                                  |
| -------- | -------------------------- | -------------------------------------- |
| **WebP** | All web images (primary)   | Best compression, broad support        |
| **JPEG** | Fallback for WebP          | Safari older versions                  |
| **PNG**  | Transparency needed        | Textures, overlays, icons              |
| **SVG**  | All icons, simple graphics | Scalable, tiny file size               |
| **AVIF** | Future consideration       | Even better than WebP, limited support |

**Never use:**

- GIF (for static images)
- BMP
- TIFF
- RAW (source files only, not deployment)

---

### Size/Resolution Guidelines

| Image Type              | Minimum Resolution | Target File Size |
| ----------------------- | ------------------ | ---------------- |
| **Hero (1920w)**        | 1920 x 1080        | < 150KB          |
| **Featured (1200w)**    | 1200 x 800         | < 100KB          |
| **Inline (680w)**       | 680 x 453          | < 60KB           |
| **Thumbnail (400w)**    | 400 x 267          | < 30KB           |
| **Mobile hero (1080w)** | 1080 x 1350        | < 100KB          |
| **OG/Social (1200w)**   | 1200 x 630         | < 80KB           |

**Resolution rules:**

- Always 72 DPI (web-optimized)
- 2x resolution for retina (serve via srcset)
- Never upscale low-resolution sources

---

### Compression Approach

**JPEG/WebP quality settings:**

| Priority        | Quality | Use Case                        |
| --------------- | ------- | ------------------------------- |
| **High detail** | 80-85%  | Hero images, art module         |
| **Standard**    | 75-80%  | Inline images, featured         |
| **Efficient**   | 70-75%  | Background textures, thumbnails |

**WebP settings:**

- Quality: 75-80%
- Method: 6 (best compression)
- Resize first, then compress

**Tools:**

- Squoosh.app (manual, precise control)
- Sharp (Node.js automation)
- ImageMagick (CLI batch processing)

---

### Lazy Loading Considerations

**Implementation:**

```html
<img src="image.webp" alt="Description" loading="lazy" decoding="async" />
```

**Above-the-fold exceptions:**

- Hero images: load immediately (no lazy)
- First inline image: load immediately
- Day number backgrounds: load immediately

**Below-the-fold:**

- All other images: lazy load
- Trigger: 200px before entering viewport

**Skeleton loading:**

- Show gray placeholder matching aspect ratio
- Fade in image when loaded (200ms transition)
- Prevent layout shift (CLS < 0.1)

---

### Alt Text Strategy

**Structure:**

```
[Subject] [Action/State] [Context if relevant]
```

**Good examples:**

- "Loaf of bread on rough wooden table"
- "Hands cupped around flickering candle flame"
- "Morning light streaming through window onto empty chair"
- "Ancient stone archway with sunlight visible beyond"

**Bad examples:**

- "Image" (too vague)
- "Bread" (too brief)
- "A beautiful and evocative photograph of artisanal sourdough..." (too verbose)
- "Hero image for Day 1" (doesn't describe content)

**Guidelines:**

- 125 characters maximum
- Describe what's visible, not interpretation
- No "image of" or "photo of" prefix
- Include relevant details for context
- For decorative images: `alt=""` (empty, not omitted)

**Theological content:**

- Describe object, not meaning ("Lamb resting in grass" not "Jesus as sacrifice")
- Let devotional text provide interpretation
- Avoid presuming user's takeaway

---

## 9. Sample AI Prompts

### Hero Image: General Devotional

```
A photograph in the style of Caravaggio, single-source window light,
dramatic chiaroscuro, simple wooden table with single loaf of bread,
half-broken, crumbs visible, deep shadows surrounding subject,
muted earth tones, desaturated palette, film grain texture,
generous negative space on left for text overlay, museum-quality lighting,
contemplative atmosphere, timeless

Avoid: modern objects, bright colors, multiple light sources,
flat lighting, food photography aesthetic, styled, cluttered
```

---

### Hero Image: Grief Series

```
A photograph in the style of Caravaggio, single-source lighting
from left, empty wooden chair beside window, thin curtain diffusing
morning light, shadows falling across empty seat, single dried
flower on windowsill, deep blacks in corners, muted tones,
desaturated, film grain, profound stillness, museum gallery aesthetic

Avoid: people, bright colors, cheerful, cluttered, obvious grief
symbols, tears, staged sadness
```

---

### Hero Image: Wilderness/Doubt

```
A photograph in the style of Caravaggio, single-source light
breaking through fog, narrow dirt path disappearing into mist,
rocky terrain, sparse vegetation, single bare tree silhouette,
dramatic contrast between light and dark, desaturated earth
tones, film grain, liminal space, threshold feeling

Avoid: clear destination, sunny, colorful, busy landscape,
multiple paths, people
```

---

### Inline Image: Hands in Prayer

```
Close-up photograph of weathered hands clasped in prayer,
Caravaggio-style single-source lighting from above,
visible age and texture in skin, simple clothing visible at
edge of frame, deep shadows, warm undertones, muted palette,
intimate and reverent, no face visible, film grain

Avoid: young/smooth hands, bright lighting, multiple light
sources, full figure visible, religious jewelry, posed stock
photo feel
```

---

### Abstract Texture: Parchment Background

```
Macro photograph of aged parchment paper texture, even lighting,
cream and warm beige tones, subtle fiber visibility, slight
grain and variation but not dramatic aging, no stains or marks,
museum document preservation aesthetic, seamless tileable

Avoid: yellowed, treasure map aesthetic, burnt edges, obvious
wear, dramatic aging, visible text or writing
```

---

### Abstract Texture: Gold Leaf Fragment

```
Macro photograph of gold leaf fragments on dark surface,
imperfect hand-applied look, matte finish with subtle crackle,
scattered pieces not solid coverage, illuminated manuscript
reference, aged patina, museum artifact aesthetic, sparse
and deliberate placement

Avoid: shiny metallic, solid gold block, perfect application,
modern gold paint, gradient effect
```

---

### Hero Image: Resurrection/Hope

```
A photograph in the style of Caravaggio, dawn light breaking
through garden foliage, single stone rolled aside (edge of frame),
morning dew visible on plants, dramatic contrast between
shadow and emerging light, muted greens and gold tones,
film grain, atmosphere of awakening, not bright but brightening

Avoid: empty tomb center-frame, angels, figures, obvious Easter
imagery, bright daylight, cheerful, artificial
```

---

### Inline Image: Ancient Scroll/Manuscript

```
Photograph of ancient manuscript fragment, Caravaggio-style
lighting from one side, Hebrew or Greek text partially visible,
aged parchment texture, shadows across surface, museum display
aesthetic, scholarly and reverent, authentic antiquity,
muted brown and cream tones

Avoid: readable modern text, fake aging, treasure map aesthetic,
full document, bright even lighting
```

---

### Hero Image: Creation/Cosmos

```
Abstract photograph suggesting cosmos, single light source
emanating from darkness, subtle gold and black palette,
not literal space imagery, more suggestion than depiction,
particles or dust visible in light beam, Caravaggio aesthetic
applied to abstract concept, profound darkness with emerging light

Avoid: NASA imagery, stars and galaxies, blue tones, science
fiction aesthetic, obvious space, Earth imagery
```

---

### Inline Image: Simple Object Study

```
A photograph in the style of Caravaggio, single oil lamp
on rough wooden surface, flame providing only light source,
surrounding deep shadows, warm amber glow on nearby surfaces,
ancient clay lamp design, muted earth palette, film grain,
museum still life quality

Avoid: multiple objects, bright lighting, modern lamp design,
cluttered composition, obvious religious staging
```

---

## 10. Anti-Patterns

### What to Avoid

**Stock Photo Cliches:**

| Cliche                            | Why It Fails                    | Alternative                              |
| --------------------------------- | ------------------------------- | ---------------------------------------- |
| Hands reaching to sunset          | Overdone, saccharine            | Hands in prayer, simple object           |
| Person on mountaintop arms raised | Triumphalist, not contemplative | Silhouette from behind, smaller in frame |
| Open Bible with coffee            | Instagram aesthetic, dated      | Scroll/manuscript fragment               |
| Cross against sky                 | Clip art energy                 | Shadows, negative space, absence         |
| Diverse group smiling             | Corporate, not intimate         | Individual moments of devotion           |
| Light rays through clouds         | Obvious, theatrical             | Natural window light indoors             |
| Running through field             | Action-oriented, not still      | Seated, waiting posture                  |
| Tear on cheek                     | Manipulative                    | Empty chair, wilted flower               |

---

**Generic "Christian" Imagery:**

| Avoid                    | Why                               | Instead                                |
| ------------------------ | --------------------------------- | -------------------------------------- |
| Dove silhouettes         | Clip art, generic                 | Abstract light, wind imagery           |
| Literal crosses          | Too obvious, can cheapen          | Shadow of cross, architectural element |
| Shepherd with lambs      | Literal, dated                    | Hands of care, simple pastoral scene   |
| Praying hands (standard) | Overdone, sterile                 | Real weathered hands, imperfect        |
| Jesus portraits          | AI can't do this well; subjective | Objects associated with Jesus, symbols |
| Crown of thorns          | Can be gory, theatrical           | Single thorn, subtle shadow            |

---

**Technical Anti-Patterns:**

| Problem               | Why                            | Solution                              |
| --------------------- | ------------------------------ | ------------------------------------- |
| Low resolution images | Look amateur, pixelate         | Minimum 1200px width                  |
| Heavy file sizes      | Slow load, poor UX             | Compress to targets above             |
| Wrong aspect ratio    | Layout breaks                  | Use consistent ratios per type        |
| Missing alt text      | Accessibility failure          | Always describe content               |
| Text in images        | Can't translate, scales poorly | Text as HTML over images              |
| Animated GIFs         | Distract, dated                | Static images or subtle CSS animation |
| Auto-playing video    | Invasive, data-heavy           | Poster image with play button         |

---

**Style Anti-Patterns:**

| Problem                  | Why                      | Fix                              |
| ------------------------ | ------------------------ | -------------------------------- |
| Bright, saturated colors | Off-brand, stock feel    | Desaturate -25% minimum          |
| Multiple light sources   | Confusing, AI tell       | Single-source lighting           |
| Flat lighting            | No drama, no depth       | High contrast, directional       |
| Busy backgrounds         | Distraction from subject | Generous negative space          |
| Modern objects in frame  | Breaks timelessness      | Remove or choose different image |
| Over-processed HDR       | Looks fake, dated        | Natural processing               |
| Heavy filters            | Instagram 2014 aesthetic | Subtle treatment only            |

---

**Content Anti-Patterns:**

| Problem                     | Why                      | Solution                       |
| --------------------------- | ------------------------ | ------------------------------ |
| Images that tell, not show  | Heavy-handed theology    | Let devotional text interpret  |
| Every section has image     | Visual overload          | Strategic restraint            |
| No visual variation         | Monotonous               | Vary ratios, placements        |
| Imagery that limits meaning | Closes interpretation    | Abstract or suggestive         |
| Cultural assumptions        | Western defaults         | Diverse or object-focused      |
| Violence/gore               | Traumatic, inappropriate | Implication, shadow, aftermath |
| Sentimentality              | Manipulative             | Honest emotion                 |

---

## Implementation Checklist

### For Every Image Entering System:

- [ ] Minimum resolution met (1200px+ width)
- [ ] Passes style criteria (Caravaggio aesthetic)
- [ ] Single-source lighting
- [ ] Muted/desaturated palette
- [ ] No modern clutter
- [ ] Clear focal point
- [ ] Generous negative space
- [ ] Treatment applied (desaturate, contrast, vignette)
- [ ] Cropped to appropriate ratio
- [ ] Compressed to target file size
- [ ] WebP + JPEG versions generated
- [ ] Responsive sizes generated (1920, 1200, 800)
- [ ] Alt text written (125 chars max)
- [ ] Mobile version considered (art direction if needed)
- [ ] Lazy loading configured (below-fold)
- [ ] Tested at 320px, 768px, 1440px
- [ ] WCAG contrast met if text overlay

---

## References

### Visual Inspiration

- Caravaggio: "The Calling of St. Matthew," "Supper at Emmaus"
- Rembrandt: "Return of the Prodigal Son," self-portraits
- Georges de La Tour: Candlelit scenes
- Contemporary: Joey L, Platon (lighting reference)
- Editorial: Kinfolk Magazine, Cereal Magazine

### Technical Resources

- Unsplash: https://unsplash.com (curated searches)
- Pexels: https://pexels.com
- Image optimization: https://squoosh.app
- WebP conversion: https://cloudconvert.com

### Internal References

- `/docs/PHILOSOPHY.md` - Design as worship philosophy
- `/.claude/skills/wokegod-brand/references/photography.md` - Full photography specs
- `/.claude/skills/wokegod-brand/references/colors.md` - Color palette details
- `/.claude/skills/wokegod-brand/references/typography.md` - Type system
- `/content/drafts/onboarding/html/onboarding-welcome.html` - Wireframe aesthetic

---

**End of IMAGE-STRATEGY.md v1.0**

_Images serve the Word. The Word does the work._
