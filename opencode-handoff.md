# Euangelion Typography & Color System Overhaul

**Document Version:** 1.0  
**Date:** February 11, 2026  
**Status:** Ready for Implementation  
**Assigned:** Claude / Codex

---

## Executive Summary

The Euangelion design system needs a typography and color overhaul to align with the new visual direction: **illuminated manuscript meets newspaper meets scroll**. The current system feels fractured, cold, and inconsistent because:

1. **Mixed fonts fracture the reading experience** — Sans-serif headings over serif body creates cognitive dissonance
2. **Flat color lacks sacred atmosphere** — No glow, depth, or stained glass richness
3. **Multiple typography systems confuse hierarchy** — No unified voice

**The fix:** Commit to **Instrument Serif as the only font** (except microscopic details), use **upright vs italic for hierarchy**, and enrich the palette with **gold spectrum + stained glass colors + illumination effects**.

---

## Design Philosophy

### Core Principles

| Principle                   | Implementation                                       |
| --------------------------- | ---------------------------------------------------- |
| **Serif-only typography**   | Instrument Serif for all headings, body, labels, nav |
| **Upright/italic contrast** | Hierarchy through font style, not font family        |
| **Sacred atmosphere**       | Gold glows, stained glass accents, paper textures    |
| **Newspaper structure**     | Date line, masthead, section headers, gold rules     |
| **Manuscript heritage**     | Drop caps, ornamental dividers, illuminated effects  |
| **Scroll unveiling**        | Content reveals on scroll, seamless flow             |

### The "Intrigue" System

Instead of sans-serif vs serif contrast, use **regular vs italic within Instrument Serif**:

```
DAILY <em>bread</em> FOR THE <em>cluttered, hungry</em> SOUL
        ↑ italic for emphasis, creates visual intrigue
```

---

## Font Stack

### Current Problem

```css
/* Conflicting — display/body use sans, only serif uses serif */
--font-family-display: var(--font-inter, 'Inter', sans-serif);
--font-family-body: var(--font-inter, 'Inter', sans-serif);
--font-family-serif: var(--font-instrument-serif, serif);
```

### Fixed Implementation

Add to `src/app/globals.css` in the `:root` block:

```css
:root {
  /* ============================================
     SINGLE FONT — Instrument Serif
     ============================================ */
  --font-instrument-serif:
    'Instrument Serif', Georgia, 'Times New Roman', serif;
  --font-family: var(--font-instrument-serif);

  /* Micro details only (page numbers, timestamps < 10px) */
  --font-microscopic: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* ============================================
     FONT VARIATIONS
     ============================================ */
  --font-regular: var(--font-family);
  --font-italic: var(--font-family);
  --font-small-caps: var(--font-family);
}
```

### Typography Utility Classes

Replace all existing `.text-*`, `.type-*`, `.headline-*` utilities with this unified system:

```css
/* ============================================
   TYPOGRAPHY UTILITIES — Instrument Serif Only
   ============================================ */

/* Base */
.font-serif {
  font-family: var(--font-family) !important;
}
.font-serif-italic {
  font-family: var(--font-family) !important;
  font-style: italic !important;
}
.font-small-caps {
  font-family: var(--font-family) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.12em !important;
  font-size: 0.85em !important;
}
.font-microscopic {
  font-family: var(--font-microscopic) !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.05em !important;
}

/* ============================================
   SIZING — Fluid clamp system
   ============================================ */
.text-mega {
  font-size: clamp(4rem, 12vw, 10rem);
  line-height: 0.9;
  letter-spacing: 0.02em;
}
.text-display {
  font-size: clamp(2.5rem, 6vw, 5rem);
  line-height: 1;
  letter-spacing: 0.02em;
}
.text-heading-xl {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.05;
}
.text-heading-lg {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.1;
}
.text-heading-md {
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  line-height: 1.2;
.text-body-lg {
  font-size: clamp(1.125rem, 1.5vw, 1.375rem);
  line-height: 1.7;
}
.text-body {
  font-size: clamp(1rem, 1.2vw, 1.25rem);
  line-height: 1.7;
}
.text-small {
  font-size: clamp(0.875rem, 1vw, 1rem);
  line-height: 1.6;
}
.text-caption {
  font-size: clamp(0.75rem, 0.85vw, 0.875rem);
  line-height: 1.5;
  letter-spacing: 0.05em;
}
.text-label {
  font-size: clamp(0.7rem, 0.8vw, 0.8rem);
  line-height: 1.4;
  letter-spacing: 0.1em;
}

/* ============================================
   INTRIGUE — Italic emphasis within headlines
   ============================================ */
.intrigue {
  font-style: italic !important;
}
.intrigue-light {
  font-style: italic !important;
  opacity: 0.85;
}

/* ============================================
   TYPOGRAPHY CRAFT
   ============================================ */
.type-prose {
  font-feature-settings:
    'liga' 1,
    'clig' 1,
    'kern' 1;
  font-variant-ligatures: common-ligatures;
  font-variant-numeric: oldstyle-nums proportional-nums;
  hanging-punctuation: first last;
}

/* ============================================
   DROP CAP
   ============================================ */
.drop-cap::first-letter {
  font-family: var(--font-family) !important;
  font-size: 5rem;
  float: left;
  line-height: 0.7;
  padding-right: 0.12em;
  margin-top: 0.05em;
  font-weight: 400;
  color: var(--color-gold);
}
@media (max-width: 768px) {
  .drop-cap::first-letter { font-size: 4rem; }
}

/* ============================================
   SELECTION
   ============================================ */
::selection {
  background-color: var(--color-gold);
  color: var(--color-tehom);
}
```

---

## Typography Hierarchy Reference

### The Upright/Italic System

| Element             | Style                     | Purpose                 |
| ------------------- | ------------------------- | ----------------------- |
| **Date line**       | Small caps, regular       | Anchors the day         |
| **Masthead**        | Massive, regular, tracked | Screaming headline      |
| **Tagline**         | Italic                    | Whisper under masthead  |
| **Nav links**       | Italic                    | Inviting, not demanding |
| **Section headers** | Regular (large)           | Structure               |
| **Emphasis words**  | Italic (within headers)   | Intrigue                |
| **Body text**       | Regular                   | Reading flow            |
| **Scripture**       | Italic                    | Sacred quotation        |
| **Pull quotes**     | Italic (large)            | Focus                   |
| **Labels/captions** | Small caps, regular       | Metadata                |
| **Footnote/micro**  | Microscopic sans          | Utility only            |

### Example Usage

```tsx
// "THE WORD BEFORE WORDS" — regular with intrigue
<h1 className="font-serif text-mega tracking-widest">
  THE <span className="intrigue">WORD</span> BEFORE <span className="intrigue">WORDS</span>
</h1>

// "Daily Bread" — simple contrast
<h2 className="font-serif text-heading-xl">
  DAILY <span className="intrigue">bread</span>
</h2>

// "Something to hold onto" — tagline
<p className="font-serif-italic text-body-lg text-secondary">
  Something to hold onto.
</p>
```

---

## Color Palette Expansion

### Current (Flat)

```css
--color-tehom: #1a1612;
--color-scroll: #f7f3ed;
--color-gold: #c19a6b;
```

### Expanded (Sacred Atmosphere)

Add to `src/app/globals.css`:

```css
/* ============================================
   CORE — Unchanged
   ============================================ */
--color-tehom: #1a1612;
--color-scroll: #f7f3ed;
--color-gold: #c19a6b;
--color-gold-rgb: 193, 154, 107;

/* ============================================
   GOLD SPECTRUM — For illumination
   ============================================ */
--color-gold-light: #d4af7f; /* Highlight */
--color-gold-bright: #e8c992; /* Glow */
--color-gold-deep: #8b6914; /* Shadow/engraved */
--color-gold-ghost: rgba(193, 154, 107, 0.08); /* Background wash */

/* ============================================
   STAINED GLASS — For sacred accents
   ============================================ */
--color-glass-blue: #3d5a80; /* Heaven/truth */
--color-glass-wine: #8b3a3a; /* Blood/sacrifice */
--color-glass-purple: #5c4d6b; /* Royalty/kingdom */
--color-glass-emerald: #4a6b4a; /* Life/growth */
--color-glass-amber: #b8860b; /* Divine presence */

/* Stained glass light variants */
--color-glass-blue-light: #5c7a9e;
--color-glass-wine-light: #a85555;
--color-glass-purple-light: #7a6b8a;
--color-glass-emerald-light: #6b8a6b;

/* ============================================
   TEXTURE — Paper & parchment
   ============================================ */
--color-parchment: #2a2420; /* Slightly lighter than tehom */
--color-parchment-light: #3a332e;

/* ============================================
   ILLUMINATION — Glow effects
   ============================================ */
--color-illumination: #f4e4bc; /* Light through glass */
--color-glow-warm: rgba(244, 228, 188, 0.12);
--color-glow-gold: rgba(193, 154, 107, 0.2);
--color-glow-glass: rgba(61, 90, 128, 0.1);

/* ============================================
   SEMANTIC — Semantic color tokens
   ============================================ */
--color-text-primary: var(--color-scroll);
--color-text-secondary: rgba(247, 243, 237, 0.75);
--color-text-tertiary: rgba(247, 243, 237, 0.5);
--color-text-muted: rgba(247, 243, 237, 0.35);

--color-border-subtle: rgba(247, 243, 237, 0.08);
--color-border-medium: rgba(247, 243, 237, 0.15);
--color-border-strong: rgba(247, 243, 237, 0.25);

--color-surface-wash: rgba(193, 154, 107, 0.03);
--color-surface-raised: rgba(247, 243, 237, 0.03);
```

---

## Illumination Effects

Add to `src/app/globals.css`:

```css
/* ============================================
   GOLD GLOW — Text
   ============================================ */
.text-glow-gold {
  color: var(--color-gold-light);
  text-shadow:
    0 0 20px rgba(193, 154, 107, 0.3),
    0 0 40px rgba(193, 154, 107, 0.15);
}
.text-glow-warm {
  color: var(--color-illumination);
  text-shadow:
    0 0 25px rgba(244, 228, 188, 0.25),
    0 0 50px rgba(244, 228, 188, 0.1);
}

/* ============================================
   GOLD GLOW — Container
   ============================================ */
.glow-gold {
  box-shadow:
    0 0 30px rgba(193, 154, 107, 0.15),
    0 0 60px rgba(193, 154, 107, 0.08),
    inset 0 0 40px rgba(244, 228, 188, 0.03);
}
.glow-warm {
  box-shadow:
    0 0 40px rgba(244, 228, 188, 0.1),
    inset 0 0 60px rgba(244, 228, 188, 0.04);
}

/* ============================================
   STAINED GLASS BORDER
   ============================================ */
.glass-border-blue {
  border: 1px solid var(--color-glass-blue);
  box-shadow:
    0 0 20px rgba(61, 90, 128, 0.2),
    inset 0 0 30px rgba(61, 90, 128, 0.05);
}
.glass-border-wine {
  border: 1px solid var(--color-glass-wine);
  box-shadow:
    0 0 20px rgba(139, 58, 58, 0.2),
    inset 0 0 30px rgba(139, 58, 58, 0.05);
}
.glass-border-purple {
  border: 1px solid var(--color-glass-purple);
  box-shadow:
    0 0 20px rgba(92, 77, 107, 0.2),
    inset 0 0 30px rgba(92, 77, 107, 0.05);
}

/* ============================================
   GOLD RULES — Horizontal dividers
   ============================================ */
.rule-gold-thin {
  border: none;
  border-top: 1px solid var(--color-gold);
  opacity: 0.2;
}
.rule-gold-medium {
  border: none;
  border-top: 2px solid var(--color-gold);
  opacity: 0.3;
}
.rule-gold-thick {
  border: none;
  border-top: 3px solid var(--color-gold);
  opacity: 0.4;
}

/* ============================================
   PAPER TEXTURE OVERLAY
   ============================================ */
.texture-paper {
  background-image: url('/textures/paper-grain.png');
  background-repeat: repeat;
  opacity: 0.4;
  pointer-events: none;
}

/* ============================================
   ILLUMINATED CONTAINER
   ============================================ */
.illuminated-box {
  background: linear-gradient(
    180deg,
    var(--color-gold-ghost) 0%,
    transparent 50%,
    var(--color-gold-ghost) 100%
  );
  border-left: 3px solid var(--color-gold);
  padding: 2rem;
}
```

---

## Stained Glass Color Utilities

```css
/* Text colors */
.text-glass-blue {
  color: var(--color-glass-blue);
}
.text-glass-wine {
  color: var(--color-glass-wine);
}
.text-glass-purple {
  color: var(--color-glass-purple);
}
.text-glass-emerald {
  color: var(--color-glass-emerald);
}
.text-glass-amber {
  color: var(--color-glass-amber);
}

/* Background washes */
.bg-glass-blue-wash {
  background: linear-gradient(
    135deg,
    rgba(61, 90, 128, 0.08) 0%,
    transparent 50%,
    rgba(61, 90, 128, 0.03) 100%
  );
}
.bg-glass-wine-wash {
  background: linear-gradient(
    135deg,
    rgba(139, 58, 58, 0.06) 0%,
    transparent 50%,
    rgba(139, 58, 58, 0.02) 100%
  );
}

/* Border accents */
.border-glass-blue {
  border-color: var(--color-glass-blue);
}
.border-glass-wine {
  border-color: var(--color-glass-wine);
}
.border-glass-purple {
  border-color: var(--color-glass-purple);
}
.border-glass-emerald {
  border-color: var(--color-glass-emerald);
}
```

---

## Component Updates

### 1. Replace MixedHeadline with Headline

Create `src/components/Headline.tsx`:

```tsx
interface HeadlineProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  size?: 'mega' | 'display' | 'heading-xl' | 'heading-lg' | 'heading-md'
  className?: string
  children: React.ReactNode
}

/**
 * Simple serif headline with optional italic emphasis.
 * Use <em> for intrigue/emphasis within the headline.
 */
export default function Headline({
  as: Tag = 'h2',
  size = 'heading-md',
  className = '',
  children,
}: HeadlineProps) {
  const sizeClass = `text-${size}`

  return (
    <Tag className={`font-serif ${sizeClass} ${className}`}>{children}</Tag>
  )
}

/**
 * Wrap words you want to emphasize/italicize
 */
export function Em({ children }: { children: React.ReactNode }) {
  return <span className="intrigue">{children}</span>
}
```

**Usage:**

```tsx
<Headline as="h1" size="display">
  THE <Em>WORD</Em> BEFORE <Em>WORDS</Em>
</Headline>

<Headline as="h2" size="heading-lg">
  DAILY <Em>bread</Em> FOR THE <Em>cluttered, hungry</Em> SOUL
</Headline>
```

### 2. Navigation.tsx

**Current:** Uses `text-label` (sans)  
**Fixed:**

```tsx
<Link
  href="/"
  className="font-serif-italic text-caption text-secondary hover:text-gold transition-colors"
>
  Home
</Link>
```

### 3. TeachingModule.tsx

**Current:** Uses `text-display` (sans) for headings  
**Fixed:**

```tsx
{
  module.heading && (
    <h3 className="font-serif text-heading-md mb-10">{module.heading}</h3>
  )
}
```

### 4. ScriptureModule.tsx

**Current:** Uses `text-label` (sans) for reference  
**Fixed:**

```tsx
<p className="font-small-caps text-label text-tertiary">
  {module.reference} ({translation})
</p>
```

### 5. PullQuote.tsx

**Current:** Uses `font-family-display` (sans)  
**Fixed:**

```tsx
<p className="font-serif-italic text-heading-md leading-relaxed">
  {typographer(children)}
</p>
```

### 6. All Other Modules

Systematically review and update:

- `StoryModule.tsx`
- `ReflectionModule.tsx`
- `BridgeModule.tsx`
- `ComprehensionModule.tsx`
- `VocabModule.tsx`
- `ProfileModule.tsx`
- `InsightModule.tsx`
- `PrayerModule.tsx`
- `TakeawayModule.tsx`
- `ResourceModule.tsx`
- And all new modules (Chronology, Geography, Visual, Art, Voice, etc.)

---

## Implementation Phases

### Phase 1: Foundation

| Task                 | File                  | Changes                                    |
| -------------------- | --------------------- | ------------------------------------------ |
| Reset font stack     | `src/app/globals.css` | Remove Inter references, single font       |
| Add color tokens     | `src/app/globals.css` | Gold spectrum, stained glass, illumination |
| Add illumination CSS | `src/app/globals.css` | Glows, rules, texture utilities            |

### Phase 2: Typography Utilities

| Task                      | File                          | Changes                                              |
| ------------------------- | ----------------------------- | ---------------------------------------------------- |
| Consolidate utilities     | `src/app/globals.css`         | Replace all `.text-*`, `.type-*` with unified system |
| Create Headline component | `src/components/Headline.tsx` | Replace MixedHeadline                                |
| Create Em component       | `src/components/Em.tsx`       | For intrigue emphasis                                |
| Update typographer        | `src/lib/typographer.ts`      | Ensure serif-only output                             |

### Phase 3: Component Migration

| Task                     | File                                         | Changes           |
| ------------------------ | -------------------------------------------- | ----------------- |
| Update Navigation        | `src/components/Navigation.tsx`              | Serif italic nav  |
| Update TeachingModule    | `src/components/modules/TeachingModule.tsx`  | Serif headings    |
| Update ScriptureModule   | `src/components/modules/ScriptureModule.tsx` | Serif labels      |
| Update PullQuote         | `src/components/PullQuote.tsx`               | Serif quote text  |
| Remove MixedHeadline     | `src/components/MixedHeadline.tsx`           | Delete or archive |
| Update all other modules | `src/components/modules/*.tsx`               | Systematic review |

### Phase 4: Visual Polish

| Task                     | File                                                         | Changes                        |
| ------------------------ | ------------------------------------------------------------ | ------------------------------ |
| Add paper texture        | `public/textures/paper-grain.png`                            | Subtle noise overlay (64x64px) |
| Update homepage          | `src/app/page.tsx`                                           | New typography + color system  |
| Update devotional reader | `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` | Full system application        |
| Update series pages      | `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`         | Full system application        |

### Phase 5: Validation

| Task          | Command                        | Expected                                           |
| ------------- | ------------------------------ | -------------------------------------------------- |
| Type check    | `npm run type-check`           | 0 errors                                           |
| Lint          | `npm run lint`                 | 0 warnings                                         |
| Build         | `npm run build`                | Success                                            |
| Visual review | Browser check at `npm run dev` | Typography unified, colors rich, atmosphere sacred |

---

## Visual Before/After

### Before (Current)

```
DAILY BREAD FOR THE CLUTTERED, HUNGRY SOUL
↑ Sans uppercase (harsh, no intrigue)

The Spirit of God was hovering over the waters...
↑ Sans body (disconnected from headings)

Flat gold color, no glow, cold atmosphere
```

### After (New)

```
DAILY <em>bread</em> FOR THE <em>cluttered, hungry</em> SOUL
↑ All serif, upright + italic contrast, intriguing rhythm

The Spirit of God was hovering over the waters...
↑ All serif, unified voice, sacred atmosphere

Gold glows, stained glass accents, paper texture, warm illumination
```

---

## Key Design Principles to Maintain

1. **Instrument Serif everywhere** — No exceptions (except micro)
2. **Upright + italic for hierarchy** — No font family contrast
3. **Gold spectrum** — Light to deep for depth
4. **Stained glass accents** — Blue, wine, purple, emerald
5. **Glow effects** — Sacred illumination, not flat color
6. **Paper texture** — Subtle overlay for warmth
7. **Consistent spacing** — 8px baseline grid
8. **Old-style numerals** — OpenType features always on

---

## Files to Create

| File                          | Purpose                   |
| ----------------------------- | ------------------------- |
| `src/components/Headline.tsx` | Replace MixedHeadline     |
| `src/components/Em.tsx`       | Italic emphasis component |

## Files to Modify

| File                                                         | Changes                                     |
| ------------------------------------------------------------ | ------------------------------------------- |
| `src/app/globals.css`                                        | Complete rewrite of font/color/token system |
| `src/components/Navigation.tsx`                              | Serif italic nav links                      |
| `src/components/PullQuote.tsx`                               | Serif quote text                            |
| `src/components/MixedHeadline.tsx`                           | Delete (replaced by Headline)               |
| `src/components/modules/TeachingModule.tsx`                  | Serif headings                              |
| `src/components/modules/ScriptureModule.tsx`                 | Serif labels                                |
| `src/components/modules/*.tsx`                               | All other modules                           |
| `src/app/page.tsx`                                           | Full typography update                      |
| `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` | Full typography update                      |
| `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`         | Full typography update                      |

## Files to Delete

| File                               | Reason                    |
| ---------------------------------- | ------------------------- |
| `src/components/MixedHeadline.tsx` | Replaced by Headline + Em |

## Assets to Create

| Asset                             | Location             | Purpose               |
| --------------------------------- | -------------------- | --------------------- |
| `public/textures/paper-grain.png` | 64x64px subtle noise | Paper texture overlay |

---

## Validation Checklist

- [ ] Date line uses serif small caps
- [ ] Masthead is massive serif with gold glow
- [ ] All headings are serif (no sans anywhere)
- [ ] Nav links are serif italic
- [ ] Body text is serif
- [ ] Italic is used for emphasis within headlines ("intrigue")
- [ ] Gold has visible glow in UI
- [ ] Stained glass colors appear in appropriate contexts
- [ ] Paper texture is visible on backgrounds
- [ ] Gold rules separate sections
- [ ] Drop caps are gold
- [ ] All tests pass (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)

---

## Reference Sites

- **Newspaper layout:** https://www.seaharvest.net.au/
- **Typography + integration:** https://divinalingua.it/en
- **Scroll integration:** https://ironhill.au/

---

## Questions for Clarification

1. Should light mode be maintained, or should we go dark-only?
2. What specific stained glass colors should be used for which contexts?
3. Should the paper texture be visible on mobile, or only desktop?
4. Are the ornamental dividers (❧ ✦ ※) still desired?

---

_Document prepared for implementation handoff. Questions? Reach out before beginning work._
