# wokeGod Layout Templates

**Version:** 1.0  
**Last Updated:** January 16, 2026

## PHILOSOPHY

Layouts should feel like turning pages in a sacred manuscript - intentional, spacious, contemplative.

---

## CORE LAYOUTS

### 1. FULL-VIEWPORT HERO

**Purpose:** Day opening, major section breaks

**Structure:**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         DAY NUMBER              │
│           01                    │
│                                 │
│       Title of Day              │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Specs:**

- Height: 100vh
- Content: Vertically + horizontally centered
- Max width: 1200px
- Padding: 60px (desktop), 24px (mobile)
- Background: Scroll White or full-bleed image

---

### 2. READING COLUMN

**Purpose:** Body text, main content

**Structure:**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    Paragraph text       │   │
│  │    with generous        │   │
│  │    line-height          │   │
│  │                         │   │
│  │    Next paragraph       │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Specs:**

- Max width: 680px
- Font: 20-22px, line-height 1.7
- Margins: Auto (centered)
- Paragraph spacing: 1.5em
- Side padding: 60px (desktop), 24px (mobile)

---

### 3. PULL QUOTE

**Purpose:** Key statement, highlight, pause

**Structure:**

```
┌─────────────────────────────────┐
│                                 │
│     "A profound statement       │
│      that needs space           │
│      to breathe."               │
│                                 │
│      — Attribution              │
│                                 │
└─────────────────────────────────┘
```

**Specs:**

- Height: 60-80vh
- Font: 40-56px bold
- Max width: 800px
- Centered
- Isolation: 120px top/bottom padding
- Optional: Background image (subtle, darkened)

---

### 4. HEBREW WORD CARD

**Purpose:** Hebrew/Greek study sections

**Structure:**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │         אָלֶף             │   │
│  │        ALEPH            │   │
│  │                         │   │
│  │    Strength, Ox,        │   │
│  │    First, Leader        │   │
│  │                         │   │
│  │  [Click to expand]      │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Specs:**

- Hebrew: 48-64px, SBL Hebrew font
- Transliteration: 24px, uppercase
- Definition: 18px
- Card: 480px max width, centered
- Border: 1px God is Gold
- Padding: 40px
- Background: Scroll White or subtle texture

---

### 5. IMAGE + CAPTION

**Purpose:** Full-bleed hero or inset photography

**Structure (Full-bleed):**

```
┌─────────────────────────────────┐
│█████████████████████████████████│
│█████████████████████████████████│
│█████████  IMAGE  ███████████████│
│█████████████████████████████████│
│█████████████████████████████████│
│                                 │
│     Caption text centered       │
│                                 │
└─────────────────────────────────┘
```

**Structure (Inset):**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │█████████████████████████│   │
│  │██████  IMAGE  ██████████│   │
│  │█████████████████████████│   │
│  └─────────────────────────┘   │
│                                 │
│     Caption text centered       │
│                                 │
└─────────────────────────────────┘
```

**Specs:**

- Aspect ratio: 16:9 (hero), 3:2 (featured), 4:5 (portrait)
- Caption: 16px, centered, rgba(0,0,0,0.6)
- Margins: 60px above/below (full-bleed), 40px (inset)
- Lazy load: loading="lazy"

---

### 6. TWO-COLUMN COMPARISON

**Purpose:** Before/After, Old Testament/New Testament parallels

**Structure:**

```
┌─────────────────────────────────┐
│  ┌──────────┐   ┌──────────┐   │
│  │          │   │          │   │
│  │  LEFT    │   │  RIGHT   │   │
│  │  COLUMN  │   │  COLUMN  │   │
│  │          │   │          │   │
│  └──────────┘   └──────────┘   │
└─────────────────────────────────┘
```

**Specs:**

- Desktop: 50/50 split, 40px gap
- Tablet: 50/50, 24px gap
- Mobile: Stacked, full width
- Each column: 18-20px text, 1.6 line-height
- Divider: Optional 1px line (rgba 0.2)

---

### 7. EXPANDABLE SECTION

**Purpose:** "Go Deeper" dropdowns, optional content

**Structure (Collapsed):**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │  Explore Deeper ↓       │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Structure (Expanded):**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │  Explore Deeper ↑       │   │
│  │                         │   │
│  │  Hidden content that    │   │
│  │  reveals when clicked.  │   │
│  │  Can be any length.     │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Specs:**

- Button: 48px height (accessible touch target)
- Font: 18px, Monument Grotesk
- Icon: Simple arrow, 16px
- Animation: 400ms ease-out, max-height transition
- Border: 1px God is Gold (expanded state)
- Padding: 24px (content)

---

### 8. NUMBERED LIST (Reflection Questions)

**Purpose:** Series of prompts, steps, questions

**Structure:**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │  01. First question     │   │
│  │      that makes you     │   │
│  │      pause?             │   │
│  │                         │   │
│  │  02. Second question    │   │
│  │      for reflection?    │   │
│  │                         │   │
│  │  03. Third question     │   │
│  │      to consider?       │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Specs:**

- Number: 60px Monument Grotesk Thin, God is Gold
- Question: 24-28px, line-height 1.5
- Spacing: 80px between items
- Max width: 680px
- Alignment: Left-aligned

---

### 9. STICKY PROGRESS BAR

**Purpose:** Scroll progress indicator

**Structure:**

```
┌─────────────────────────────────┐
│███████████─────────────────────│ ← Gold bar (50% progress)
│                                 │
│  Content below                  │
│                                 │
└─────────────────────────────────┘
```

**Specs:**

- Height: 2px
- Color: God is Gold
- Position: Fixed top
- Z-index: 1000
- Width: % of scroll progress
- Smooth: transition 100ms linear

---

### 10. NEXT DAY TEASER

**Purpose:** End-of-day preview, encourage continuation

**Structure:**

```
┌─────────────────────────────────┐
│                                 │
│     Tomorrow:                   │
│     Day 02                      │
│                                 │
│     "Preview of next theme"     │
│                                 │
│     [Continue →]                │
│                                 │
└─────────────────────────────────┘
```

**Specs:**

- Height: 60vh
- Text: Centered, 32-40px
- Button: 48px height, God is Gold background
- Padding: 80px top/bottom

---

## RESPONSIVE BEHAVIOR

### Desktop (1440px+)

- Max content width: 1200px (display), 680px (reading)
- Side margins: 120px
- Vertical spacing: 120px between sections

### Tablet (768px - 1439px)

- Max content width: 960px (display), 640px (reading)
- Side margins: 60px
- Vertical spacing: 80px between sections

### Mobile (320px - 767px)

- Max content width: 100% minus 24px margins
- Side margins: 24px
- Vertical spacing: 60px between sections
- Two-column layouts stack
- Font sizes scale down (see typography.md)

---

## ACCESSIBILITY

### Keyboard Navigation

- Tab order follows visual hierarchy
- Skip-to-content link (first tab)
- Focus indicators visible (2px God is Gold outline)

### Touch Targets

- Minimum 44x44px (all interactive elements)
- Spacing: 8px minimum between targets

### Color Contrast

- All text meets WCAG 2.1 AA (4.5:1 minimum)
- God is Gold on Scroll White: 4.8:1 ✅
- Tehom Black on Scroll White: 16.1:1 ✅

---

## IMPLEMENTATION NOTES

**CSS Grid for Layouts:**

```css
.container {
  display: grid;
  grid-template-columns:
    [full-start] 1fr
    [content-start] minmax(0, 680px) [content-end]
    1fr [full-end];
}

.full-width {
  grid-column: full;
}
.content {
  grid-column: content;
}
```

**Consistent Spacing:**

```css
:root {
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 40px;
  --space-xl: 60px;
  --space-2xl: 80px;
  --space-3xl: 120px;
}
```

---

## TESTING CHECKLIST

- [ ] All layouts tested at 320px, 768px, 1440px
- [ ] Keyboard navigation works
- [ ] Touch targets 44px minimum
- [ ] No horizontal scroll on mobile
- [ ] Images lazy-load properly
- [ ] Text remains readable at all sizes
- [ ] Expandables animate smoothly
- [ ] Progress bar updates accurately

---

**End of Layout Templates v1.0**
