# EUONGELION Brand Refinement

**Version:** 1.0
**Created:** January 17, 2026
**Purpose:** Strategic brand documentation for design sprint

---

## 1. BRAND ESSENCE

### Core Identity (3-5 Words)

**"Ancient depth, modern clarity."**

Alternative expressions:

- Sacred wisdom made accessible
- Theological rigor with warmth
- Deep faith, beautiful form

### Emotional Territory

**Primary Emotions We Cultivate:**

- **Wonder** — Encountering something vast and beautiful
- **Stillness** — The Sabbath rest of unhurried reading
- **Recognition** — "This is what I've been looking for"
- **Reverence** — Approaching something holy
- **Belonging** — Not alone in this journey

**Secondary Emotions (Contextual):**

- Challenge (when confronting hard truths)
- Conviction (when called to change)
- Comfort (when processing grief or struggle)
- Curiosity (when exploring Hebrew/Greek)

**Emotions We Avoid:**

- Anxiety or urgency ("You're behind!")
- Guilt or shame ("You should be better")
- Overwhelm (too much, too fast)
- Superficial positivity ("Everything's fine!")

### Intellectual Territory

**We Operate In:**

- Etymology and linguistic precision (Hebrew, Greek, Aramaic)
- Historical-grammatical hermeneutics
- PaRDeS framework (four levels of interpretation)
- Narrative theology (the meta-story of God)
- Christocentric interpretation (Jesus as the thread)
- Church history and tradition (standing on shoulders)

**We Respect But Don't Compete With:**

- Academic biblical scholarship (we're accessible, not peer-reviewed)
- Seminary education (we're devotional, not curricular)
- Systematic theology textbooks (we're narrative, not exhaustive)

### Spiritual Territory

**Our Theological Posture:**

- Orthodox Christianity (Nicene, Chalcedonian)
- Protestant evangelical heritage with ecumenical respect
- High view of Scripture (authoritative, inspired)
- Jesus-centered (all roads lead to Him)
- Pneumatologically aware (Spirit-filled, not Spirit-chaotic)
- Eschatologically hopeful (already/not yet)

**We Inhabit:**

- The space between ancient text and modern life
- The intersection of head and heart
- The rhythm of daily spiritual practice
- The journey from ignorance to wisdom

---

## 2. BRAND PERSONALITY

### If EUONGELION Were a Person

**Demographics:**

- Late 30s to early 50s
- Has graduate education but wears it lightly
- Could quote Calvin and also knows current music
- Has traveled, read widely, lived through struggle

**Archetype:**
The Wise Mentor who was once a seeker. Think: a seminary professor who teaches from lived experience, not just books. A writer whose prose has been refined by grief. Someone who has sat with dying people and still believes in resurrection.

**They Would Be:**

- The friend you call at 2 AM with theological questions
- The person who gives you a book instead of platitudes
- Someone who listens longer than they speak
- A host who makes space for silence at the table
- An artist who believes beauty is serious work

**They Would NOT Be:**

- A performance preacher seeking applause
- A celebrity Christian building a personal brand
- An academic who talks over people's heads
- A motivational speaker with easy answers
- A religious gatekeeper who loves rules more than people

### Voice Characteristics

**Tone Spectrum:**

| Warm ←——————→ Cool                                 |
| :------------------------------------------------- | ------------: |
| Approachable                                       | Authoritative |
| **EUONGELION sits at 60% warm, 40% authoritative** |

**Voice Qualities:**

- **Confident, not arrogant** — We know what we believe but remain curious
- **Intimate, not casual** — Close like a letter, not sloppy like a text
- **Dense, not verbose** — Every word earns its place
- **Reverent, not stuffy** — Awe without pretension
- **Direct, not aggressive** — Clear statements, no hedging or preaching

### What EUONGELION Would Say

**Would Say:**

- "The Hebrew word here is _chesed_—and there's no English equivalent."
- "This is hard. Let's sit with it."
- "The Church has wrestled with this for two thousand years."
- "Notice what the text doesn't say."
- "Take your time. There's no rush."
- "You're not behind. You're here."

**Would Never Say:**

- "Just trust God and everything will work out!"
- "The Bible is simple—anyone can understand it."
- "Don't question—just believe."
- "The original language doesn't really matter."
- "This devotional takes only 3 minutes!"
- "Your best life starts now!"
- Anything with an exclamation point in every sentence

### How EUONGELION Makes People Feel

**First Encounter:**
"This feels different. It's beautiful but not pretentious. Serious but not cold. I want to stay here."

**After One Week:**
"I'm learning things I've never heard before. The Hebrew word studies are fascinating. This takes longer than I expected, but I don't mind."

**After One Month:**
"This is shaping how I read the Bible. I'm starting to see the connections. It feels like discipleship, not just content."

**After One Year:**
"I'm a different person. I see God differently. I understand Scripture differently. This became part of my daily rhythm."

---

## 3. VISUAL IDENTITY EXPANSION

### Current Color System

**The Bold Three (Foundation):**
| Name | Hex | Character |
|------|-----|-----------|
| **Tehom Black** | #1A1612 | Deep void, ancient leather, authority |
| **Scroll White** | #F7F3ED | Parchment rest, expensive paper, breathing room |
| **God is Gold** | #C19A6B | Divine emphasis, illuminated manuscripts, glory |

**The Intentional Three (Theological Accents):**
| Name | Hex | When to Use |
|------|-----|-------------|
| **Covenant Burgundy** | #6B2C2C | Sacrifice, cross, blood, Passover |
| **Gethsemane Olive** | #6B6B4F | Wilderness, wrestling, creation, dust |
| **Shalom Blue** | #4A5F6B | Spirit, peace, water, baptism |

### Secondary Colors Needed

**Functional Grays (Derived from Tehom):**

```css
--gray-900: #1a1612; /* Tehom Black */
--gray-700: rgba(26, 22, 18, 0.7); /* Secondary text */
--gray-500: rgba(26, 22, 18, 0.5); /* Tertiary text */
--gray-300: rgba(26, 22, 18, 0.3); /* Disabled states */
--gray-100: rgba(26, 22, 18, 0.1); /* Borders, dividers */
--gray-050: rgba(26, 22, 18, 0.05); /* Subtle backgrounds */
```

**System Colors (Functional Only):**

```css
--success: #3d6b4f; /* Muted forest green, not tech green */
--warning: #8b6f3d; /* Amber brown, harmonizes with gold */
--error: #8b3d3d; /* Deep brick, not fire-engine red */
--info: #4a5f6b; /* Shalom Blue (dual purpose) */
```

**Highlight/Selection:**

```css
--highlight: rgba(193, 154, 107, 0.2); /* Gold at 20% for text selection */
--focus-ring: rgba(193, 154, 107, 0.5); /* Gold at 50% for focus states */
```

### Gradient Treatments

**Approved Gradients:**

1. **Scroll Fade** (Hero backgrounds)

   ```css
   background: linear-gradient(180deg, #f7f3ed 0%, rgba(247, 243, 237, 0) 100%);
   ```

2. **Tehom Vignette** (Image overlays)

   ```css
   background: radial-gradient(
     ellipse at center,
     transparent 0%,
     rgba(26, 22, 18, 0.7) 100%
   );
   ```

3. **Gold Shimmer** (Rare, decorative only)
   ```css
   background: linear-gradient(135deg, #c19a6b 0%, #d4af7f 50%, #c19a6b 100%);
   ```

**Gradient Rules:**

- No rainbow gradients ever
- No neon or vibrant gradients
- Gradients should be subtle, almost invisible
- Primary use: fading images into backgrounds
- Never use gradients on text

### Texture and Pattern Language

**Approved Textures:**

1. **Paper Grain**
   - Subtle noise overlay (2-5% opacity)
   - Adds warmth to digital surfaces
   - Use: Backgrounds, cards, headers

2. **Parchment Crease**
   - Very subtle fold lines (near-invisible)
   - Creates "ancient document" feeling
   - Use: Special feature moments, hero sections

3. **Linen Weave**
   - Fine textile pattern
   - Adds tactile quality
   - Use: Cards, elevated surfaces

**Texture Rules:**

- Always subtle (5% opacity maximum)
- Never distract from content
- Use sparingly—negative space is preferred
- Test on both light and dark modes

**Pattern Guidance:**

- No geometric patterns
- No decorative borders
- No iconographic patterns (crosses, doves, etc.)
- If pattern is needed, use typography as pattern (Hebrew letterforms)

---

## 4. TYPOGRAPHY REFINEMENT

### Current System

| Role         | Font             | Fallback                |
| ------------ | ---------------- | ----------------------- |
| Masthead     | Editorial New    | Playfair Display, Didot |
| Display/Body | Monument Grotesk | DM Sans, Helvetica Neue |
| Hebrew/Greek | SBL Hebrew       | Times New Roman         |
| Handwritten  | Caveat           | (rare use only)         |

### Hierarchy Levels (Defined)

**Level 1: MASTHEAD**

```
Font: Editorial New
Size: 48-64px (desktop), 32-40px (mobile)
Weight: Regular
Tracking: +20 (loose)
Case: ALL CAPS
Use: "EUONGELION" wordmark only—nowhere else
```

**Level 2: DAY NUMBER**

```
Font: Monument Grotesk
Size: 120-160px (desktop), 60-80px (mobile)
Weight: Thin (100)
Color: Tehom Black or God is Gold
Use: Architectural display, section markers
```

**Level 3: HERO TITLE**

```
Font: Monument Grotesk
Size: 64-80px (desktop), 36-42px (mobile)
Weight: Bold (700)
Line-height: 1.1
Use: Primary page/section titles
```

**Level 4: SECTION HEADER**

```
Font: Monument Grotesk
Size: 32-48px (desktop), 24-28px (mobile)
Weight: Medium (500)
Case: UPPERCASE (optional)
Accent: Gold underline or left bar
Use: Major content sections
```

**Level 5: SUBSECTION**

```
Font: Monument Grotesk
Size: 24-28px (desktop), 20-22px (mobile)
Weight: Medium (500)
Use: Content subsections, module headers
```

**Level 6: BODY LARGE**

```
Font: Monument Grotesk
Size: 22px (desktop), 20px (mobile)
Weight: Regular (400)
Line-height: 1.7
Max-width: 680px
Use: Essay opening paragraphs, important statements
```

**Level 7: BODY**

```
Font: Monument Grotesk
Size: 20px (desktop), 18px (mobile)
Weight: Regular (400)
Line-height: 1.7
Max-width: 680px
Use: Primary reading content
```

**Level 8: CAPTION/SMALL**

```
Font: Monument Grotesk
Size: 14-16px (desktop), 13-14px (mobile)
Weight: Regular (400)
Color: Secondary (70% opacity)
Use: Citations, footnotes, metadata
```

### Special Use Cases

**Hebrew/Greek Terms:**

```
Font: SBL Hebrew
Size: 28-32px (larger than body)
Color: God is Gold
Display: Centered, isolated, with transliteration below
Treatment: Sacred isolation—generous whitespace around
```

**Scripture Quotations:**

```
Font: Monument Grotesk (same as body)
Size: Same as body
Style: Set apart with gold left border
Background: Subtle gold tint (5% opacity)
Attribution: Small caps, secondary color
```

**Pull Quotes:**

```
Font: Monument Grotesk
Size: 40-56px
Weight: Bold (700)
Line-height: 1.3
Optional: Decorative quotation mark in gold
```

**Transliterations:**

```
Font: Monument Grotesk
Size: 16px
Style: Italic
Format: [brackets]
Example: [chesed]
```

**Footnote Numbers:**

```
Style: Superscript
Size: 12px
Color: God is Gold
Interaction: Click to expand
```

### Responsive Typography Scale

**Base Size Scaling:**

```css
/* Desktop (1440px+) */
html {
  font-size: 17px;
}

/* Tablet (768-1439px) */
html {
  font-size: 16px;
}

/* Mobile (320-767px) */
html {
  font-size: 15px;
}
```

**Fluid Typography (Alternative):**

```css
html {
  font-size: clamp(15px, 1vw + 14px, 17px);
}
```

---

## 5. IMAGERY DIRECTION

### Photography Style

**Subject Matter:**

- Natural light, often golden hour or overcast
- Landscapes: deserts, olive groves, ancient ruins, still waters
- Objects: worn leather books, scrolls, bread, wine, oil lamps
- Hands: working, praying, turning pages, breaking bread
- Architecture: stone arches, ancient doorways, empty tombs

**Technical Qualities:**

- High dynamic range (rich shadows, warm highlights)
- Desaturated palette (not vivid, not Instagram-filtered)
- Cinematic aspect ratios (2.35:1, 16:9)
- Film grain acceptable (not digital noise)
- Natural depth of field (not artificial bokeh)

**Color Treatment:**

- Warm undertones (amber, ochre, umber)
- Lifted blacks (not true black)
- Muted greens (olive, sage, not lime)
- No oversaturation
- No heavy color grading

**Composition:**

- Rule of thirds, but broken intentionally
- Negative space is welcome
- Subjects often off-center or partially cropped
- Horizon lines low (expansive sky) or absent
- Human figures often anonymous (backs, silhouettes)

**Photographers to Reference (Not Imitate):**

- Sebastiao Salgado (gravitas, humanity)
- Gregory Crewdson (cinematic staging)
- Todd Hido (melancholy light)
- Wolfgang Tillmans (intimate observation)

### Illustration Style (If Any)

**Approach:** Minimal, almost absent. If illustration is required:

**Style Direction:**

- Line art only (single weight, continuous line)
- Gold or Tehom Black on Scroll White
- Abstract/symbolic rather than literal
- Reference: ancient manuscript marginalia
- Never cartoon, never cutesy, never clip-art

**Acceptable Subjects:**

- Lamb (the logo mark)
- Simple botanical elements (olive branch, wheat)
- Symbolic geometry (chiasm diagram, circle)
- Hebrew letterforms as visual elements

**Not Acceptable:**

- Illustrated people with faces
- Detailed scenes or narratives
- Anything that looks mass-produced
- Icons that look like app icons

### Icon Style

**System Icons (Functional):**

- Simple, 2px stroke weight
- Single color (Tehom Black or Scroll White)
- Consistent 24px grid
- Rounded corners (2px radius)
- No filled icons except for active states
- Reference: Phosphor Icons (thin weight)

**Content Icons (Rare):**

- Gold stroke on Tehom background
- 48px or larger
- Used for feature highlights only
- Same minimalist line style

### What to Avoid in Imagery

**Never Use:**

- Stock photos of people praying with hands clasped
- Sunsets with text overlaid
- Doves, rainbows, or obvious religious symbols
- Cheesy light rays from heaven
- Happy diverse group photos
- Coffee shop Bible study aesthetics
- "Woman journaling on couch" type images
- Anything that looks like a church flyer
- Generic inspirational quote graphics
- AI-generated images (detectable, uncanny)

---

## 6. LOGO/WORDMARK CONSIDERATIONS

### Current State

**Primary Mark:**

- "EUONGELION" wordmark in Editorial New
- All caps, letterspaced
- Used in site header, email header

**Symbol Mark:**

- Lamb illustration (details TBD)
- Gold on Tehom, or Tehom on Scroll
- Eyes emphasized

**Tagline:**

- "Daily bread for hungry souls"
- May appear beneath wordmark

### Variations Needed

**1. Primary Horizontal (Default)**

```
EUONGELION
[lamb mark to left, optional]
```

**2. Stacked/Vertical**

```
[lamb mark]
EUONGELION
```

**3. Wordmark Only**

```
EUONGELION
[no lamb, for tight spaces]
```

**4. Symbol Only**

```
[lamb mark alone, for favicon, app icon]
```

**5. With Tagline**

```
EUONGELION
Daily bread for hungry souls
```

**6. Monochrome Versions**

- All Tehom Black (for light backgrounds)
- All Scroll White (for dark backgrounds)
- All Gold (for signature applications)

**7. Minimum Size**

- Wordmark: 120px width minimum
- Symbol: 32px width minimum
- Below minimum: use symbol only

### Usage Guidelines

**Clear Space:**

- Minimum clear space = height of "E" in wordmark
- Nothing should intrude into this zone

**Background Requirements:**

- Gold mark requires Tehom Black or Scroll White background
- Never place on busy images without solid container
- If on image, use darkened overlay first

**Partner Lock-ups:**

- "A wokeGod project" may appear beneath
- Never equal size—EUONGELION always dominant
- Consistent spacing rules apply

**Prohibited Modifications:**

- Do not stretch, distort, or rotate
- Do not change letterspacing
- Do not add effects (shadows, glows, outlines)
- Do not use unapproved colors
- Do not place on clashing backgrounds
- Do not recreate in different fonts

---

## 7. TONE OF VOICE

### Writing Style Guide

**Sentence Level:**

- Prefer short sentences. Then a longer one for rhythm.
- Use fragments sparingly. For emphasis.
- Vary sentence length deliberately
- Lead with the strong word
- End on the important word

**Paragraph Level:**

- One idea per paragraph
- Generous paragraph breaks
- White space is punctuation
- Don't bury the insight

**Structure Level:**

- PaRDeS flow: surface → symbolic → homiletical → mystical
- Chiastic structure: mirror the opening in the closing
- Plant seeds early that bloom later
- End with invitation, not conclusion

### Vocabulary Preferences

**Preferred Words:**
| Instead of... | Use... |
|---------------|--------|
| Relationship with God | Walk with God, know God |
| Doing life together | Community, fellowship |
| Unpack | Explore, examine, consider |
| Share | Offer, invite, speak |
| Amazing | (avoid—overused) |
| Impactful | Formative, significant |
| Journey | Path, way, walk |
| Intentional | Deliberate, purposeful |
| Authentic | True, honest, real |
| Season | Time, period, chapter |

**Words We Own:**

- Tehom (the deep, the void)
- PaRDeS (four-level interpretation)
- Soul Audit (our diagnostic)
- Deep Dive (our essay format)
- The Meta-Story (the thread of God's narrative)

**Words We Use Precisely:**

- Gospel (not generically "good news")
- Grace (not mere kindness)
- Faith (not blind belief)
- Repentance (not just feeling sorry)
- Sanctification (the ongoing process)

### Sentence Structure Patterns

**The Hebrew Pattern:**
"The word is _chesed_. It means covenant loyalty—steadfast love that doesn't quit. There's no English equivalent."

**The Story Entry:**
"In 1974, a Japanese soldier walked out of the Philippine jungle. He didn't know the war had ended."

**The Quiet Assertion:**
"This changes everything. Slowly. Over time. Day by day."

**The Direct Address:**
"You're not behind. You're here. That's enough."

**The Reversal:**
"We think we're reading the Bible. But the Bible is reading us."

### On-Brand vs. Off-Brand Copy

**ON-BRAND:**

> "The Hebrew word _shuv_ appears over a thousand times in the Old Testament. It means 'return.' Not progress—return. The assumption is that you've wandered. The invitation is to come back."

**OFF-BRAND:**

> "Today we're going to unpack an amazing Hebrew word that will totally transform your quiet time! Get ready for some incredible insights!"

---

**ON-BRAND:**

> "Take your time. This devotional is meant to be read slowly. If you only get through half, that's fine. The goal isn't completion—it's encounter."

**OFF-BRAND:**

> "This quick 5-minute devo will jumpstart your day with the spiritual boost you need! Don't miss out!"

---

**ON-BRAND:**

> "Grief doesn't follow a timeline. Neither does God's comfort. Show up today with whatever you have. It's enough."

**OFF-BRAND:**

> "If you're struggling with grief, just remember that God is in control and everything happens for a reason! Keep your chin up!"

---

## 8. BRAND TOUCHPOINTS

### App/Web Experience

**General Principles:**

- Feels like reading a beautiful book, not using an app
- Navigation should disappear when reading
- Generous margins, never cramped
- Dark mode as thoughtful as light mode
- Animation is subtle and purposeful (no bouncing)
- Loading states are calm (no spinners—use opacity fade)

**Home/Landing:**

- Editorial feel, not dashboard feel
- Current series prominent
- Progress acknowledged, not gamified
- No notification badges or urgency cues

**Reading Experience:**

- Full-screen immersion
- Typography takes center stage
- No floating elements while reading
- Scroll progress optional (subtle line, not percentage)
- Print-friendly by default

**Navigation:**

- Minimal, essential only
- Hidden when not needed
- Never more than 2 levels deep
- Clear wayfinding without breadcrumbs

### Email Communications

**Visual Style:**

- Plain, minimal HTML (no heavy templates)
- Scroll White background
- Tehom Black text
- Gold accents sparingly
- Logo small, top-left
- Maximum width: 600px

**Content Style:**

- Subject lines: direct, no clickbait
- Opening: human, never "Hey [Name]!"
- Body: single purpose per email
- Closing: warm but not saccharine
- Footer: minimal, legal only

**Email Types:**

- **Daily Devotional** — Title, first paragraph, "Continue reading" link
- **Series Launch** — Brief intro, what to expect, begin button
- **Welcome** — What this is, how it works, first step
- **Milestone** — Acknowledgment without fanfare ("Day 30. You're here.")

### Social Media Presence

**Visual Approach:**

- Quote cards: Tehom Black with gold/scroll text
- Photography: landscape, atmospheric, no faces
- Hebrew word studies: large Hebrew, translation
- Never: selfies, event photos, promotional urgency

**Content Approach:**

- Single insight from devotional
- Hebrew word of the day
- Questions that invite reflection
- Scripture without commentary
- Never: trends, memes, hot takes, controversy

**Platform Considerations:**

- Instagram: Visual first, square and vertical formats
- X/Twitter: Text-forward, single sentences
- Threads: Longer thoughts, thread format
- No TikTok presence (doesn't fit brand)

### Print/PDF Exports

**Devotional PDFs:**

- Designed for print (margins for binding)
- Typography preserved from web
- Images placed intentionally
- Page breaks at natural pauses
- Include citation block at end

**Paper Stock Recommendations (for print partners):**

- Uncoated, warm white (French Paper, Mohawk)
- 80-100lb text weight
- Subtle texture preferred
- Never glossy

**Print-Specific Considerations:**

- Tehom Black may need K100 enrichment
- Gold may need metallic ink or PMS match
- Test contrast on chosen paper
- Consider single-color printing (Tehom only) for cost

---

## 9. COMPETITIVE POSITIONING

### What Makes EUONGELION Different

**From YouVersion/Bible App:**
| YouVersion | EUONGELION |
|------------|------------|
| Many plans, shallow coverage | Few series, deep essays |
| 5-minute time investment | 15-20 minute immersion |
| Social features, gamification | Solo contemplative experience |
| Breadth of content partners | Single voice, curated vision |
| Mass market, accessible | Hungry souls, depth-seekers |

**From She Reads Truth / He Reads Truth:**
| SRT/HRT | EUONGELION |
|---------|------------|
| Aesthetic lifestyle brand | Sacred, architectural restraint |
| Pink/millennial palette | Tehom/Scroll/Gold restraint |
| Community journaling focus | Individual formation focus |
| Multiple contributors | Unified theological voice |
| Products/subscription model | Content as the product |

**From Dwell / Pray.com:**
| Dwell/Pray | EUONGELION |
|------------|------------|
| Audio-first, listening | Reading-first, studying |
| Passive consumption | Active engagement (reflection, journaling) |
| Calming ambiance | Theological weight |
| Meditation approach | Devotional/discipleship approach |
| Contemporary worship culture | Ancient future synthesis |

### Visual Differentiation

**Our Visual Position:**

- More restrained than any competitor
- More typographically sophisticated
- Less "product," more "publication"
- Ancient + modern (not purely contemporary)
- Premium without being pretentious

**We Look Like:**

- A beautifully designed theology journal
- An illuminated manuscript for the 21st century
- Kinfolk Magazine meets The Gospel Coalition
- If Apple designed a devotional app

**We Don't Look Like:**

- A church app
- A meditation app
- A Christian lifestyle brand
- A tech startup
- A Bible study workbook

### Experience Differentiation

**We Offer:**

- Essays, not bullet points
- Word studies, not just applications
- Stories that make you stop
- Time that feels well-spent
- A curriculum, not a buffet

**Others Offer:**

- Quick hits of inspiration
- Community and accountability
- Variety and choice
- Audio and video
- Social features

**Our Unique Combination:**
No one else combines:

1. Deep Hebrew/Greek scholarship with...
2. Beautiful narrative prose and...
3. Premium editorial design and...
4. Daily rhythm discipline and...
5. Christocentric meta-story framework

---

## 10. BRAND DON'TS

### What Would Break the Brand

**Visual Violations:**

- Using any color outside the approved palette
- Crowding content (insufficient whitespace)
- Generic stock photography
- Low-resolution or compressed images
- Inconsistent typography (wrong fonts, weights)
- Busy backgrounds that compete with text
- Neon or high-saturation colors
- Glossy, plastic-looking design
- Dark patterns or manipulative UI

**Tone Violations:**

- Exclamation points in every sentence
- Casual language that undermines gravity
- Judgmental or condemning tone
- Prosperity gospel implications
- Political partisanship
- Cultural war engagement
- Celebrity Christianity references
- Trendy slang or internet speak

**Experience Violations:**

- Notification spam
- Gamification (streaks, badges, leaderboards)
- Social comparison features
- Pressure to upgrade/subscribe
- Difficulty exiting or pausing
- Complexity where simplicity serves

### Visual Mistakes to Avoid

**Typography:**

- Justified text with rivers
- Text smaller than 16px for reading
- Poor line length (too wide or too narrow)
- Insufficient line-height
- ALL CAPS for body text
- Decorative fonts for content

**Color:**

- Gold text on Scroll White (fails contrast)
- Pure black (#000000) instead of Tehom
- Pure white (#FFFFFF) instead of Scroll
- Vibrant accent colors
- Multiple accent colors competing

**Layout:**

- Centered body text (always left-aligned)
- Floating elements over reading content
- Sidebars during reading
- Modal interruptions
- Banner ads or promotions during reading

**Imagery:**

- Stretched or distorted images
- Heavy filters or effects
- Watermarked images
- Obviously AI-generated images
- Inconsistent image treatment across pages

### Tone Mistakes to Avoid

**Too Casual:**

> "Hey! So glad you're here. We're gonna have an awesome time digging into some super cool stuff today!"

**Too Academic:**

> "In contradistinction to the Septuagint rendering, the Masoretic text preserves a morphologically distinct form that suggests..."

**Too Preachy:**

> "You need to understand that if you don't apply this truth, you're missing out on God's blessing for your life!"

**Too Prosperity:**

> "God wants you to live your best life! Unlock your destiny through these kingdom principles!"

**Too Vague:**

> "God is good. Life is a journey. Trust the process."

### Cliches to Avoid

**Verbal Cliches:**

- "God showed up"
- "In this season"
- "Guard your heart"
- "Do life together"
- "Lean into"
- "Unpack"
- "Such a blessing"
- "God is good all the time"
- "Let go and let God"
- "Everything happens for a reason"
- "When God closes a door..."
- "Just have faith"
- "I'm blessed"

**Visual Cliches:**

- Hands reaching toward light
- Person on mountaintop
- Open Bible with coffee
- Sunset with text
- Dove in flight
- Cross on hill
- Light breaking through clouds
- Water reflection of cross
- Praying silhouette

---

## 11. MOOD BOARD DESCRIPTION

### What a EUONGELION Mood Board Would Include

**Color Palette Samples:**

- Tehom Black swatch (slightly warm black)
- Scroll White swatch (warm cream, expensive paper)
- God is Gold swatch (amber, not yellow)
- Ancient parchment textures
- Leather book binding colors
- Olive wood tones

**Typography References:**

- Kinfolk Magazine mastheads
- Vintage theological book covers
- Ancient manuscript letterforms
- Hebrew calligraphy (square script)
- Swiss design type specimens
- Monument Grotesk type samples

**Photography Direction:**

- Israeli/Mediterranean landscapes
- Dead Sea scrolls (texture, color)
- Ancient stone architecture
- Golden hour desert light
- Worn leather-bound books
- Bread, wine, olive oil (elemental)
- Hands at work (anonymous)

**Material/Texture References:**

- Uncoated paper stocks
- Linen and cotton textiles
- Hammered gold leaf
- Worn leather
- Stone and clay
- Olive wood grain
- Ancient papyrus

**Publication References:**

- Kinfolk Magazine (editorial restraint, typography)
- Cereal Magazine (photography, negative space)
- Monocle (confidence, authority)
- The Paris Review (literary weight)
- Apartamento (warmth, authenticity)

### Artists/Designers That Inspire

**Designers:**

- Massimo Vignelli (clarity, restraint, systems)
- Wim Crouwel (grid, typography)
- Bruce Mau (ambitious minimalism)
- Studio Dumbar (editorial sophistication)
- Pentagram (various—conceptual rigor)

**Artists:**

- Makoto Fujimura (sacred art, gold leaf, Japanese technique)
- Anselm Kiefer (weight, materiality, history)
- James Turrell (light, space, transcendence)
- Mark Rothko (color field, spiritual depth)
- Eyvind Earle (stylized landscapes, reverence)

**Photographers:**

- Sebastiao Salgado (humanity, gravitas)
- Hiroshi Sugimoto (stillness, timelessness)
- Nadav Kander (landscape as psychology)
- Todd Hido (melancholy, atmosphere)
- Rinko Kawauchi (intimate, luminous)

**Architects:**

- Tadao Ando (concrete, light, spirituality)
- Peter Zumthor (materiality, phenomenology)
- John Pawson (sacred minimalism)
- Louis Kahn (light, monumentality)

### Textures, Materials, Eras

**Textures:**

- Laid paper (visible fibers)
- Canvas weave
- Stone grain
- Aged leather patina
- Cracked clay
- Oxidized bronze
- Hammered metal

**Materials:**

- Uncoated paper (French Paper, Mohawk)
- Full-grain leather
- Olive wood
- Natural linen
- Hand-hammered gold
- Fired clay/terracotta
- Raw wool

**Eras:**

- Ancient Near East (materiality, craft)
- Medieval manuscripts (illumination, marginalia)
- Swiss Modernism (grid, clarity, type)
- 1960s editorial design (confident, bold)
- Contemporary Scandinavian (restraint, warmth)

**NOT These Eras:**

- Victorian (too ornate)
- Art Nouveau (too decorative)
- 1980s (too bold/primary)
- 1990s minimalism (too cold)
- 2010s flat design (too generic)

---

## Summary for Design Sprint

**Key Tensions to Resolve:**

1. Ancient authority vs. modern accessibility
2. Theological weight vs. warm approachability
3. Premium restraint vs. inviting openness
4. Deep content vs. scannable format

**Core Visual Principles:**

1. Typography is the hero
2. Negative space is sacred
3. Color is earned (mostly Tehom/Scroll/Gold)
4. Every element serves the content
5. If in doubt, remove it

**Core Verbal Principles:**

1. Dense, not verbose
2. Warm, not casual
3. Confident, not arrogant
4. Direct, not preachy
5. Reverent, not stuffy

**The Litmus Test:**
Does this feel like something you'd want to spend 20 minutes with? Does it make you slow down? Does it treat you like an intelligent adult who's also hungry for God?

---

**End of Document**

_Prepared for Design Sprint: January 18, 2026_
