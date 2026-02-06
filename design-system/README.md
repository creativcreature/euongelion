# EUONGELION Design System

**Version:** 1.0
**Last Updated:** January 2026

A comprehensive design token system for the EUONGELION platform.

---

## Philosophy

> **Ownable. Restrained. Biblical.**

- **Six colors total** - Three bold foundation colors, three intentional accents
- **Typography as architecture** - Sans serif confidence, generous white space
- **Dark mode as default** - Tehom (the deep) as primary background
- **Sabbath rest in design** - Generous spacing equals theological breathing room

---

## Quick Start

### Installation

```html
<!-- Import all tokens -->
<link rel="stylesheet" href="/design-system/tokens.css" />
<link rel="stylesheet" href="/design-system/typography.css" />
<link rel="stylesheet" href="/design-system/dark-mode.css" />
```

Or import in your CSS/SCSS:

```css
@import '/design-system/tokens.css';
@import '/design-system/typography.css';
@import '/design-system/dark-mode.css';
```

### Basic Usage

```html
<body>
  <!-- Dark mode is default -->
  <h1 class="hero-title">Wake Up</h1>
  <p class="lead">
    God is already at work. The question is: are you awake to it?
  </p>

  <div class="hebrew-study">
    <span class="hebrew-term">רוּחַ</span>
    <span class="transliteration">[ruach]</span>
    <span class="hebrew-meaning">Spirit, Wind, Breath</span>
  </div>
</body>
```

---

## Files Overview

| File             | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `tokens.css`     | All CSS custom properties (colors, spacing, typography, etc.) |
| `tokens.json`    | Same tokens in JSON format for tooling/JavaScript             |
| `typography.css` | Font definitions, heading scales, text utilities              |
| `dark-mode.css`  | Theme switching and light mode overrides                      |

---

## Color System

### The Bold Three (Foundation)

Use these colors for 95% of all design work.

| Token            | Hex       | Usage                                   |
| ---------------- | --------- | --------------------------------------- |
| `--color-tehom`  | `#1A1612` | Primary background (dark), text (light) |
| `--color-scroll` | `#F7F3ED` | Primary text (dark), background (light) |
| `--color-gold`   | `#C19A6B` | Accents, emphasis, Hebrew terms         |

### The Intentional Three (Rare Accents)

Use sparingly - only when content literally relates to their meaning.

| Token                 | Hex       | When to Use                              |
| --------------------- | --------- | ---------------------------------------- |
| `--color-burgundy`    | `#6B2C2C` | Sacrifice, crucifixion, blood themes     |
| `--color-olive`       | `#6B6B4F` | Wilderness, creation, wrestling with God |
| `--color-shalom-blue` | `#4A5F6B` | Peace, Holy Spirit, baptism, water       |

### Semantic Colors

```css
/* These adapt based on theme */
var(--color-background)      /* tehom (dark) or scroll (light) */
var(--color-foreground)      /* scroll (dark) or tehom (light) */
var(--color-text-primary)    /* Main text */
var(--color-text-secondary)  /* 70% opacity */
var(--color-text-tertiary)   /* 50% opacity */
var(--color-border)          /* 10% opacity */
var(--color-accent)          /* Gold */
```

### Color Hierarchy (60-30-10)

**Dark Mode (Default):**

- 60% Tehom Black (background)
- 30% Scroll White (text)
- 10% God is Gold (emphasis) + rare colors

**Light Mode:**

- 60% Scroll White (background)
- 30% Tehom Black (text)
- 10% God is Gold (emphasis)

### Signature Combination

```css
/* The EUONGELION signature look: Gold on Tehom */
.signature {
  background: var(--color-tehom);
  color: var(--color-gold);
}
```

---

## Typography

### Font Families

| Token                | Font             | Purpose                    |
| -------------------- | ---------------- | -------------------------- |
| `--font-display`     | Monument Grotesk | Headings, UI               |
| `--font-body`        | Monument Grotesk | Body text                  |
| `--font-masthead`    | Editorial New    | "EUONGELION" wordmark only |
| `--font-hebrew`      | SBL Hebrew       | Hebrew/Greek terms         |
| `--font-handwritten` | Caveat           | Margin annotations         |
| `--font-serif`       | EB Garamond      | Fallback serif             |

### Type Scale

| Token         | Size  | Usage        |
| ------------- | ----- | ------------ |
| `--text-10xl` | 160px | Day numbers  |
| `--text-8xl`  | 80px  | Hero titles  |
| `--text-5xl`  | 48px  | H1, masthead |
| `--text-3xl`  | 32px  | H2, sections |
| `--text-xl`   | 22px  | Body large   |
| `--text-lg`   | 20px  | Body default |
| `--text-base` | 16px  | UI text      |
| `--text-sm`   | 14px  | Captions     |

### Pre-built Typography Classes

```html
<!-- Headings -->
<h1 class="hero-title">Hero Title</h1>
<h2 class="section-header">SECTION HEADER</h2>

<!-- Day Number (architectural, thin) -->
<span class="day-number">01</span>

<!-- Pull Quote -->
<blockquote class="pull-quote">"God is already at work."</blockquote>

<!-- Hebrew Word Study -->
<div class="hebrew-study">
  <span class="hebrew-term">חֶסֶד</span>
  <span class="transliteration">[chesed]</span>
  <span class="hebrew-meaning">Steadfast Love, Mercy</span>
</div>

<!-- Masthead (wordmark only) -->
<h1 class="masthead">EUONGELION</h1>

<!-- Body text with optimal width -->
<div class="prose">
  <p>Your body text here...</p>
</div>
```

---

## Spacing

### Base Unit

4px base unit, 8px grid system.

### Scale

| Token         | Value | Usage           |
| ------------- | ----- | --------------- |
| `--space-xs`  | 8px   | Tight spacing   |
| `--space-sm`  | 16px  | Close elements  |
| `--space-md`  | 24px  | Comfortable     |
| `--space-lg`  | 40px  | Generous        |
| `--space-xl`  | 60px  | Expansive       |
| `--space-2xl` | 80px  | Section padding |
| `--space-3xl` | 120px | Full breath     |

### Max Widths

```css
--max-width-reading: 680px; /* Optimal reading line length */
--max-width-content: 800px; /* Content containers */
--max-width-display: 1200px; /* Wide layouts */
```

---

## Theme Switching

### Dark Mode (Default)

No additional classes needed - dark is the default.

### Light Mode

```html
<html data-theme="light"></html>
```

### Auto (System Preference)

```html
<html data-theme="auto"></html>
```

### JavaScript Toggle

```javascript
function setTheme(theme) {
  document.documentElement.classList.add('no-transition')
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('euongelion-theme', theme)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition')
    })
  })
}

// Initialize
const savedTheme = localStorage.getItem('euongelion-theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)
```

### Content-Based Themes

Certain content works better with specific modes:

```html
<!-- Hope/Resurrection content - use light -->
<section data-content-theme="hope">...</section>

<!-- Lament/Wilderness content - use dark -->
<section data-content-theme="lament">...</section>
```

---

## Shadows

| Token            | Usage              |
| ---------------- | ------------------ |
| `--shadow-sm`    | Subtle elevation   |
| `--shadow-md`    | Cards, dropdowns   |
| `--shadow-lg`    | Modals, popovers   |
| `--shadow-focus` | Focus rings (gold) |
| `--shadow-glow`  | Gold glow effect   |

---

## Transitions

### Durations

| Token               | Value | Usage                |
| ------------------- | ----- | -------------------- |
| `--duration-fast`   | 150ms | Micro-interactions   |
| `--duration-base`   | 200ms | Standard transitions |
| `--duration-slow`   | 400ms | Emphasis             |
| `--duration-slower` | 600ms | Page transitions     |

### Easing

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* Default */
--ease-bounce: cubic-bezier(0.16, 1, 0.3, 1); /* Scroll animations */
```

### Pre-built Transitions

```css
transition: var(--transition-colors); /* Color changes */
transition: var(--transition-transform); /* Movement */
transition: var(--transition-fade-in); /* Scroll reveal */
```

---

## Components

### Button

```css
.button {
  height: var(--button-height); /* 48px */
  padding: 0 var(--button-padding-x); /* 24px */
  border-radius: var(--button-radius); /* 4px */
  font-weight: var(--button-font-weight);
}
```

### Input

```css
.input {
  height: var(--input-height); /* 48px */
  padding: 0 var(--input-padding-x);
  border-radius: var(--input-radius);
  font-size: var(--input-font-size);
}
```

### Touch Target

All interactive elements should have minimum 44px touch target:

```css
.interactive {
  min-height: var(--touch-target-min); /* 44px */
  min-width: var(--touch-target-min);
}
```

---

## Accessibility

### Contrast Ratios (WCAG 2.1 AA)

| Combination     | Ratio  | Status          |
| --------------- | ------ | --------------- |
| Tehom on Scroll | 12.4:1 | AAA             |
| Gold on Tehom   | 5.8:1  | AA              |
| Gold on Scroll  | 2.1:1  | Decorative only |
| Scroll on Tehom | 12.4:1 | AAA             |

### Key Guidelines

- Minimum body text: 18px
- Minimum caption text: 14px
- Line length: 60-70 characters (max 680px)
- Line height: 1.7 for body text
- Touch targets: 44px minimum
- Focus indicators: 2px gold outline

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Using with Tailwind CSS

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        tehom: '#1A1612',
        scroll: '#F7F3ED',
        gold: '#C19A6B',
        burgundy: '#6B2C2C',
        olive: '#6B6B4F',
        shalom: '#4A5F6B',
      },
      fontFamily: {
        display: ['Monument Grotesk', 'Helvetica Neue', 'sans-serif'],
        masthead: ['Editorial New', 'Didot', 'serif'],
        hebrew: ['SBL Hebrew', 'Times New Roman', 'serif'],
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '40px',
        xl: '60px',
        '2xl': '80px',
        '3xl': '120px',
      },
      maxWidth: {
        reading: '680px',
        content: '800px',
        display: '1200px',
      },
    },
  },
}
```

---

## Using tokens.json

For JavaScript/TypeScript tooling:

```javascript
import tokens from './design-system/tokens.json'

// Access colors
const tehom = tokens.color.foundation.tehom.$value // "#1A1612"

// Access typography
const bodyFont = tokens.typography.fontFamily.body.$value

// Access spacing
const spacingLg = tokens.spacing.semantic.lg.$value // "40px"
```

---

## Do's and Don'ts

### Do

- Use sans serif for 95% of content
- Keep Kinfolk/serif for masthead only
- Make Hebrew terms larger + gold
- Use generous line-height (1.7 for body)
- Limit to 3 font families max
- Allow white space around type
- Use the signature gold-on-tehom combination

### Don't

- Mix serif + sans in body text
- Use Kinfolk font for anything but "EUONGELION"
- Make body text smaller than 18px
- Use more than 2 weights in one section
- Crowd text (needs breathing room)
- Use gold on cream for text (fails contrast)
- Make line length exceed 680px

---

## References

**Design Inspiration:**

- Tandem Co (thetandemco.com) - Architectural sans, confident scaling
- Kinfolk Magazine - Elegant serif masthead
- Medium.com - Optimal reading specifications

**Fonts:**

- Monument Grotesk: https://pangrampangram.com/products/monument-grotesk
- Editorial New: https://pangrampangram.com/products/editorial-new
- SBL Hebrew: https://www.sbl-site.org/educational/biblicalfonts.aspx
- EB Garamond: https://fonts.google.com/specimen/EB+Garamond
- Caveat: https://fonts.google.com/specimen/Caveat

---

## Version History

### v1.0 (January 2026)

- Initial release
- Complete color system with semantic tokens
- Typography scale with responsive breakpoints
- Spacing system based on 4px/8px grid
- Dark mode as default with light mode overrides
- Accessibility-first approach

---

**End of Design System Documentation**
