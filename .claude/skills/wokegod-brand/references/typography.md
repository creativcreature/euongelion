# wokeGod Typography System

**Version:** 1.0  
**Last Updated:** January 16, 2026  
**Purpose:** Complete type specifications for EUANGELION platform

---

## PHILOSOPHY

**Typography as architecture.**

- Sans serif = confidence, clarity, modernity
- Kinfolk masthead = heritage, sophistication
- Hebrew = sacred, ancient, reverence
- Generous spacing = Sabbath rest, theological breathing room

**Reference:** Tandem Co (thetandemco.com) - architectural confidence + editorial restraint

---

## PRIMARY TYPE FAMILIES

### 1. MASTHEAD: Kinfolk-Style Narrow Serif

**Usage:** "EUANGELION" wordmark only

**Font Options (in order of preference):**

- **Editorial New** (Pangram Pangram) - Preferred
- **TT Tsars** (TypeType) - Alternate
- **Didot** (System) - Fallback

**Specifications:**

```
Font: Editorial New (or similar narrow serif)
Weight: Regular or Medium
Tracking: +20 (loose letterspacing)
Case: ALL CAPS or Title Case
Size (Desktop): 48-64px
Size (Mobile): 32-40px
Color: Tehom Black (#1A1612) or God is Gold (#C19A6B)
```

**Usage Rules:**

- Masthead only (site header, email header)
- Never used for body text
- Always generous letterspacing
- Can be overlaid on images (with sufficient contrast)

---

### 2. DISPLAY: Sans Serif System (Primary)

**Usage:** Day numbers, section headers, pull quotes, navigation

**Font Options (in order of preference):**

- **Monument Grotesk** (Pangram Pangram) - Preferred
- **Suisse Int'l** (Swiss Typefaces) - Alternate 1
- **Helvetica Neue** (System) - Fallback

**Why This Font:**

- Architectural, confident
- Wide weight range (Thin → Black)
- Excellent at large sizes
- Modern but timeless
- High readability

**Weight Scale:**

- Thin (100): Day numbers (decorative)
- Light (300): Large display text
- Regular (400): Navigation, captions
- Medium (500): Section headers
- Bold (700): Pull quotes, emphasis
- Black (900): Hero statements (rare)

---

### 3. BODY: Same Sans Serif System

**Usage:** All body text, paragraphs, reading content

**Specifications:**

```
Font: Monument Grotesk (or Suisse Int'l)
Weight: Regular (400)
Size (Desktop): 20-22px
Size (Mobile): 18-20px
Line-height: 1.7 (generous)
Paragraph spacing: 1.5em
Max width: 680px (optimal reading)
Color: Tehom Black (#1A1612)
```

**Why Sans for Body:**

- Cleaner on screens
- Better at small sizes (mobile)
- Matches architectural display system
- Reduces visual noise
- Allows Hebrew/images to stand out

---

### 4. SACRED: Hebrew/Greek Typography

**Usage:** Biblical terms, word studies, sacred language

**Font:**

- **SBL Hebrew** (free, academic standard)
- Source: https://www.sbl-site.org/educational/biblicalfonts.aspx
- Includes diacriticals, vowel points

**Specifications:**

```
Font: SBL Hebrew
Weight: Regular
Size: 28-32px (larger than body for emphasis)
Color: God is Gold (#C19A6B) or Tehom Black
Style: Often centered, isolated in own section
```

**Usage Patterns:**

- Hebrew word on its own line
- Translation beneath in smaller sans
- Pronunciation guide (italic sans, 14px)
- Etymology/meaning in body text below

**Example Layout:**

```
רוּחַ
[ruach]
Spirit • Wind • Breath
```

---

## TYPE SCALE SPECIFICATIONS

### Desktop (1440px+)

| Element            | Size      | Weight  | Line-Height | Case          |
| ------------------ | --------- | ------- | ----------- | ------------- |
| **Masthead**       | 48-64px   | Regular | 1.1         | ALL CAPS      |
| **Day Number**     | 120-160px | Thin    | 1.0         | 01, 02, 03    |
| **Hero Title**     | 64-80px   | Bold    | 1.1         | Title Case    |
| **Section Header** | 32-48px   | Medium  | 1.2         | UPPERCASE     |
| **Pull Quote**     | 40-56px   | Bold    | 1.3         | Sentence case |
| **Body Large**     | 22px      | Regular | 1.7         | Sentence case |
| **Body Standard**  | 20px      | Regular | 1.7         | Sentence case |
| **Hebrew Term**    | 28-32px   | Regular | 1.3         | As written    |
| **Caption**        | 14-16px   | Regular | 1.5         | Sentence case |
| **Navigation**     | 16px      | Regular | 1.4         | Title Case    |

### Tablet (768-1439px)

| Element            | Size     | Weight  |
| ------------------ | -------- | ------- |
| **Day Number**     | 80-100px | Thin    |
| **Hero Title**     | 48-56px  | Bold    |
| **Section Header** | 28-36px  | Medium  |
| **Pull Quote**     | 32-40px  | Bold    |
| **Body**           | 20px     | Regular |
| **Hebrew Term**    | 24-28px  | Regular |

### Mobile (320-767px)

| Element            | Size    | Weight  |
| ------------------ | ------- | ------- |
| **Masthead**       | 32-40px | Regular |
| **Day Number**     | 60-80px | Thin    |
| **Hero Title**     | 36-42px | Bold    |
| **Section Header** | 24-28px | Medium  |
| **Pull Quote**     | 28-32px | Bold    |
| **Body**           | 18-20px | Regular |
| **Hebrew Term**    | 22-24px | Regular |
| **Caption**        | 13-14px | Regular |

---

## TYPE PAIRING MATRIX

### Primary Combinations

| Context             | Display                       | Body                  | Accent              |
| ------------------- | ----------------------------- | --------------------- | ------------------- |
| **Landing Page**    | Monument Bold 64px            | Monument Regular 22px | Kinfolk 48px (logo) |
| **Day Intro**       | Monument Thin 120px (number)  | Monument Regular 20px | SBL Hebrew 28px     |
| **Reading Section** | Monument Medium 32px (header) | Monument Regular 20px | —                   |
| **Pull Quote**      | Monument Bold 48px            | —                     | —                   |
| **Navigation**      | Monument Regular 16px         | —                     | Kinfolk 40px (logo) |

---

## RESPONSIVE BEHAVIOR

### Breakpoint Strategy

```css
/* Desktop First */
@media (max-width: 1439px) {
  /* Tablet */
}
@media (max-width: 767px) {
  /* Mobile */
}
```

### Scaling Formula

**Desktop → Mobile reduction:**

- Display text: -30% to -50%
- Body text: -10% to -20%
- Line-height: Increase slightly on mobile (+0.1)
- Letter-spacing: Reduce slightly on mobile

**Example:**

```css
/* Desktop */
.day-number {
  font-size: 120px;
}

/* Tablet */
@media (max-width: 1439px) {
  .day-number {
    font-size: 90px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .day-number {
    font-size: 70px;
  }
}
```

---

## SPECIAL TYPOGRAPHY MOMENTS

### 1. Day Number (Tandem-Style)

**Purpose:** Architectural confidence, clear navigation

```
Display: 01, 02, 03, 04, 05
Font: Monument Grotesk Thin
Size: 120-160px (desktop)
Color: Tehom Black or God is Gold
Position: Full-screen section, centered or left-aligned
Animation: Fade in on scroll
```

**Visual Treatment:**

- Huge, impossibly thin weight
- Generous space around
- Often takes up 50-70% of viewport height
- May be partially cropped by section edge (intentional)

---

### 2. Pull Quote (Impact Moment)

**Purpose:** Break up reading, emphasize key insight

```
Font: Monument Grotesk Bold
Size: 40-56px (desktop)
Line-height: 1.3
Style: Italic (if available) or Regular
Color: Tehom Black or God is Gold
Layout: Full-width or offset
Max-width: 800px
```

**Treatment Options:**

- Centered with generous top/bottom padding
- Left-aligned with gold vertical bar
- Overlaid on faded image (high contrast)
- Preceded by oversized quotation mark (gold)

---

### 3. Hebrew Word Study (Sacred Isolation)

**Purpose:** Create reverent pause, highlight ancient language

```
Layout: Full-screen section or inset card
Hebrew term: 32px, centered, gold
Transliteration: 16px, sans regular, gray
Translation: 18px, sans medium, black
Spacing: 40px between each element
Background: Scroll White or subtle texture
```

**Example Layout:**

```
[Full-screen section with generous padding]

            חֶסֶד
           [chesed]
    Steadfast Love • Mercy • Covenant Loyalty

[Body text explanation follows below]
```

---

### 4. Handwritten Annotation (Ship of Theseus Layer)

**Purpose:** Margin notes, editorial asides, "someone was here before"

**Font Options:**

- **Caveat** (Google Fonts) - handwritten script
- **Kalam** (Google Fonts) - casual handwritten
- **Real scanned handwriting** (PNG overlays)

```
Font: Caveat Regular
Size: 16-18px
Color: rgba(26, 22, 18, 0.6) [faded black]
Position: Margin, rotated slightly (-2° to +2°)
Usage: Rare (1-2 per devotional maximum)
```

**Content Types:**

- Hebrew word fragment
- Cross-reference note ("see John 3:16")
- Personal prayer snippet
- Editorial aside ("This changed everything for me")

---

## ACCESSIBILITY SPECIFICATIONS

### Minimum Requirements (WCAG 2.1 AA)

**Contrast Ratios:**

- Body text (20px): Minimum 4.5:1 against background
- Large text (24px+): Minimum 3:1 against background
- Gold on white: Passes at 18px+ only
- Black on white: Passes at all sizes

**Readable Sizes:**

- Never below 16px for body text
- Never below 14px for captions
- Optimal: 20-22px for long-form reading

**Line Length:**

- Optimal: 60-70 characters per line
- Max width: 680px at 20px body size
- Never full-width paragraphs (causes eye strain)

**Line Height:**

- Body text: Minimum 1.5, optimal 1.7
- Headings: 1.1-1.3
- Captions: 1.4-1.5

---

## FONT LOADING STRATEGY

### Web Font Performance

**Priority Loading:**

1. Load Monument Grotesk Regular first (body text)
2. Load Monument Grotesk Bold second (headings)
3. Load SBL Hebrew third (specialty)
4. Load Kinfolk/Editorial last (masthead only)

**Fallback Stack:**

```css
/* Primary Sans */
font-family: 'Monument Grotesk', 'Helvetica Neue', Arial, sans-serif;

/* Masthead Serif */
font-family: 'Editorial New', 'Didot', 'Bodoni', serif;

/* Hebrew */
font-family: 'SBL Hebrew', 'Times New Roman', serif;

/* Handwritten */
font-family: 'Caveat', 'Comic Sans MS', cursive;
```

**FOUT Prevention:**

- Use `font-display: swap` for body fonts
- Use `font-display: optional` for decorative fonts
- Ensure fallback fonts have similar x-height
- Test loading on slow connections

---

## IMPLEMENTATION EXAMPLES

### CSS Custom Properties

```css
:root {
  /* Font Families */
  --font-display: 'Monument Grotesk', sans-serif;
  --font-body: 'Monument Grotesk', sans-serif;
  --font-masthead: 'Editorial New', serif;
  --font-hebrew: 'SBL Hebrew', serif;
  --font-handwritten: 'Caveat', cursive;

  /* Font Sizes (Desktop) */
  --text-masthead: 3rem; /* 48px */
  --text-day-number: 10rem; /* 160px */
  --text-hero: 5rem; /* 80px */
  --text-h1: 3rem; /* 48px */
  --text-h2: 2rem; /* 32px */
  --text-h3: 1.5rem; /* 24px */
  --text-body-large: 1.375rem; /* 22px */
  --text-body: 1.25rem; /* 20px */
  --text-small: 0.875rem; /* 14px */
  --text-hebrew: 2rem; /* 32px */

  /* Line Heights */
  --leading-tight: 1.1;
  --leading-snug: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
  --tracking-wider: 0.1em;
}
```

### Example Component Classes

```css
/* Day Number */
.day-number {
  font-family: var(--font-display);
  font-size: var(--text-day-number);
  font-weight: 100;
  line-height: var(--leading-tight);
  color: var(--color-black);
}

/* Hero Title */
.hero-title {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: 700;
  line-height: var(--leading-tight);
  color: var(--color-black);
}

/* Body Text */
.body-text {
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 400;
  line-height: var(--leading-relaxed);
  color: var(--color-black);
  max-width: 680px;
}

/* Hebrew Term */
.hebrew-term {
  font-family: var(--font-hebrew);
  font-size: var(--text-hebrew);
  font-weight: 400;
  line-height: var(--leading-snug);
  color: var(--color-gold);
  text-align: center;
}

/* Pull Quote */
.pull-quote {
  font-family: var(--font-display);
  font-size: 3.5rem; /* 56px */
  font-weight: 700;
  line-height: var(--leading-snug);
  color: var(--color-black);
  max-width: 800px;
}

/* Annotation */
.annotation {
  font-family: var(--font-handwritten);
  font-size: 1.125rem; /* 18px */
  font-weight: 400;
  color: rgba(26, 22, 18, 0.6);
  transform: rotate(-1.5deg);
}
```

---

## DESIGN TOKENS (For Development)

```json
{
  "typography": {
    "fontFamily": {
      "display": "Monument Grotesk, Helvetica Neue, sans-serif",
      "body": "Monument Grotesk, Helvetica Neue, sans-serif",
      "masthead": "Editorial New, Didot, serif",
      "hebrew": "SBL Hebrew, Times New Roman, serif",
      "handwritten": "Caveat, cursive"
    },
    "fontSize": {
      "masthead": "3rem",
      "dayNumber": "10rem",
      "hero": "5rem",
      "h1": "3rem",
      "h2": "2rem",
      "h3": "1.5rem",
      "bodyLarge": "1.375rem",
      "body": "1.25rem",
      "small": "0.875rem",
      "hebrew": "2rem"
    },
    "fontWeight": {
      "thin": 100,
      "light": 300,
      "regular": 400,
      "medium": 500,
      "bold": 700,
      "black": 900
    },
    "lineHeight": {
      "tight": 1.1,
      "snug": 1.3,
      "normal": 1.5,
      "relaxed": 1.7
    },
    "letterSpacing": {
      "tight": "-0.02em",
      "normal": "0",
      "wide": "0.05em",
      "wider": "0.1em"
    }
  }
}
```

---

## USAGE GUIDELINES

### DO:

✅ Use sans serif for 95% of content  
✅ Keep Kinfolk/serif for masthead only  
✅ Make Hebrew terms larger + gold  
✅ Use generous line-height (1.7 for body)  
✅ Limit fonts to 3 families max  
✅ Scale dramatically between mobile/desktop  
✅ Use thin weight for day numbers (architectural)  
✅ Allow white space around type

### DON'T:

❌ Mix serif + sans in body text  
❌ Use Kinfolk font for anything but "EUANGELION"  
❌ Make body text smaller than 18px  
❌ Use more than 2 weights in one section  
❌ Crowd text (needs breathing room)  
❌ Use decorative fonts for readability  
❌ Ignore contrast ratios  
❌ Make line length exceed 680px

---

## REFERENCES

**Inspiration:**

- Tandem Co (thetandemco.com) - architectural sans, confident scaling
- Medium.com - optimal reading specs
- Kinfolk Magazine - elegant serif masthead
- Swiss Typography - grid + restraint

**Fonts:**

- Monument Grotesk: https://pangrampangram.com/products/monument-grotesk
- Editorial New: https://pangrampangram.com/products/editorial-new
- Suisse Int'l: https://www.swisstypefaces.com/fonts/suisse/
- SBL Hebrew: https://www.sbl-site.org/educational/biblicalfonts.aspx

---

**End of Typography System v1.0**
