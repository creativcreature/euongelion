# EUONGELION Dark Mode Specification

**Version:** 1.0
**Created:** January 17, 2026
**Purpose:** Complete implementation guide for dark mode theming
**Status:** Design Sprint - Implementation Ready

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Color Mapping Table](#2-color-mapping-table)
3. [Special Considerations](#3-special-considerations)
4. [CSS Custom Properties](#4-css-custom-properties)
5. [Transition Specification](#5-transition-specification)
6. [Toggle UI](#6-toggle-ui)
7. [Edge Cases](#7-edge-cases)
8. [Implementation Checklist](#8-implementation-checklist)

---

## 1. Philosophy

### Why Dark Mode Matters for a Devotional App

Dark mode is not a concession to modern expectations. It is a continuation of the contemplative design philosophy that defines EUONGELION. The reading conditions matter as much as the typography.

**Nighttime Reading**

Most devotional practice happens at the margins of the day: early morning before sunrise, or late evening before sleep. These are liminal hours, times of transition and reflection. A bright screen in a dark room is jarring, breaking the contemplative state before it can begin. Dark mode honors the rhythm of the day and the physical conditions of devotional practice.

**Eye Strain Reduction**

Extended reading on bright screens causes eye fatigue. Our goal is not efficiency but immersion. A reader who is physically comfortable can stay present with the text longer. Dark mode removes a barrier to deep engagement.

**Battery Conservation**

For users on OLED or AMOLED devices, dark mode significantly reduces battery consumption. This is a practical kindness: the app that drains less battery is the app that remains available when needed.

**Aesthetic Intention**

The Tehom Black (#1A1612) already anchors our visual identity. Dark mode does not introduce a new aesthetic; it reveals what was always present. The warm near-black, the amber gold, the aged parchment cream: these colors were chosen with both modes in mind. In dark mode, Tehom takes the stage, and the content floats within it like words emerging from the deep.

**Spiritual Resonance**

There is theological meaning in darkness. In Genesis 1, the deep (tehom) exists before light. Darkness is not evil but primordial, pregnant with possibility. A devotional app that embraces darkness embraces the full spectrum of the spiritual journey: the bright clarity of revelation and the patient waiting in the unknown.

### Design Principles for Dark Mode

1. **Transformation, not inversion** - We do not simply flip colors. We thoughtfully translate the visual language.
2. **Warmth preserved** - The warm undertones of Tehom Black must remain evident. No cold blue-blacks.
3. **Hierarchy maintained** - The same visual hierarchy must be perceivable in both modes.
4. **Gold remains gold** - The accent color adapts subtly but remains recognizable.
5. **Simultaneous transition** - All elements shift together as one cohesive environment.

---

## 2. Color Mapping Table

### 2.1 Foundation Colors

| Element                    | Light Mode               | Dark Mode                   | Notes                               |
| -------------------------- | ------------------------ | --------------------------- | ----------------------------------- |
| **Background (primary)**   | `#F7F3ED` (Scroll White) | `#1A1612` (Tehom Black)     | Full swap                           |
| **Background (secondary)** | `rgba(26, 22, 18, 0.05)` | `rgba(247, 243, 237, 0.05)` | Subtle surface elevation            |
| **Background (tertiary)**  | `rgba(26, 22, 18, 0.08)` | `rgba(247, 243, 237, 0.08)` | Card backgrounds, containers        |
| **Text (primary)**         | `#1A1612` (Tehom Black)  | `rgba(247, 243, 237, 0.90)` | Scroll White at 90% to reduce glare |
| **Text (secondary)**       | `rgba(26, 22, 18, 0.7)`  | `rgba(247, 243, 237, 0.65)` | Subtitles, descriptions             |
| **Text (tertiary)**        | `rgba(26, 22, 18, 0.5)`  | `rgba(247, 243, 237, 0.45)` | Captions, metadata                  |
| **Text (disabled)**        | `rgba(26, 22, 18, 0.3)`  | `rgba(247, 243, 237, 0.3)`  | Disabled states                     |

### 2.2 Accent Colors

| Element                    | Light Mode                  | Dark Mode                   | Notes                          |
| -------------------------- | --------------------------- | --------------------------- | ------------------------------ |
| **Gold (primary)**         | `#C19A6B`                   | `#C9A574`                   | +5% lightness for visibility   |
| **Gold (hover)**           | `rgba(193, 154, 107, 0.9)`  | `#D4B182`                   | Brighter for dark backgrounds  |
| **Gold (muted)**           | `rgba(193, 154, 107, 0.5)`  | `rgba(201, 165, 116, 0.6)`  | Focus rings, subtle accents    |
| **Gold (background tint)** | `rgba(193, 154, 107, 0.05)` | `rgba(193, 154, 107, 0.08)` | Slight increase for visibility |
| **Highlight/Selection**    | `rgba(193, 154, 107, 0.2)`  | `rgba(193, 154, 107, 0.25)` | Text selection                 |
| **Focus ring**             | `rgba(193, 154, 107, 0.5)`  | `rgba(201, 165, 116, 0.6)`  | Keyboard focus                 |

### 2.3 Theological Accent Colors

| Element               | Light Mode | Dark Mode | Notes                          |
| --------------------- | ---------- | --------- | ------------------------------ |
| **Covenant Burgundy** | `#6B2C2C`  | `#8B4444` | Lightened for dark backgrounds |
| **Gethsemane Olive**  | `#6B6B4F`  | `#8B8B6B` | Lightened for visibility       |
| **Shalom Blue**       | `#4A5F6B`  | `#6A8090` | Lightened for visibility       |

### 2.4 System/Functional Colors

| Element     | Light Mode | Dark Mode | Notes                         |
| ----------- | ---------- | --------- | ----------------------------- |
| **Success** | `#3D6B4F`  | `#5A8B6B` | Muted forest green, lightened |
| **Warning** | `#8B6F3D`  | `#B8935A` | Amber brown, lightened        |
| **Error**   | `#8B3D3D`  | `#B85A5A` | Deep brick, lightened         |
| **Info**    | `#4A5F6B`  | `#6A8090` | Shalom Blue (same as above)   |

### 2.5 Borders and Dividers

| Element                  | Light Mode               | Dark Mode                   | Notes                           |
| ------------------------ | ------------------------ | --------------------------- | ------------------------------- |
| **Border (strong)**      | `rgba(26, 22, 18, 0.2)`  | `rgba(247, 243, 237, 0.15)` | Primary borders                 |
| **Border (medium)**      | `rgba(26, 22, 18, 0.1)`  | `rgba(247, 243, 237, 0.10)` | Section dividers                |
| **Border (subtle)**      | `rgba(26, 22, 18, 0.08)` | `rgba(247, 243, 237, 0.08)` | Hero bottom, subtle lines       |
| **Border (gold accent)** | `2px solid #C19A6B`      | `2px solid #C9A574`         | Feature cards, scripture blocks |

### 2.6 UI Components

| Element                       | Light Mode                 | Dark Mode                   | Notes                       |
| ----------------------------- | -------------------------- | --------------------------- | --------------------------- |
| **Card background**           | `#FFFFFF` or `#F7F3ED`     | `#241F1A`                   | Slightly elevated from base |
| **Card border**               | `rgba(26, 22, 18, 0.08)`   | `rgba(247, 243, 237, 0.08)` | Subtle definition           |
| **Card shadow**               | `rgba(26, 22, 18, 0.08)`   | `rgba(0, 0, 0, 0.3)`        | Deeper shadow in dark mode  |
| **Input background**          | `#FFFFFF`                  | `#1F1B17`                   | Slightly lighter than page  |
| **Input border (default)**    | `rgba(26, 22, 18, 0.2)`    | `rgba(247, 243, 237, 0.15)` | Clear definition            |
| **Input border (focus)**      | `#C19A6B`                  | `#C9A574`                   | Gold accent                 |
| **Input placeholder**         | `rgba(26, 22, 18, 0.4)`    | `rgba(247, 243, 237, 0.35)` | Muted                       |
| **Button (primary bg)**       | `#C19A6B`                  | `#C9A574`                   | Gold button                 |
| **Button (primary text)**     | `#1A1612`                  | `#1A1612`                   | Tehom on gold stays dark    |
| **Button (secondary bg)**     | `transparent`              | `transparent`               | Outline button              |
| **Button (secondary border)** | `#C19A6B`                  | `#C9A574`                   | Gold outline                |
| **Button (secondary text)**   | `#C19A6B`                  | `#C9A574`                   | Gold text                   |
| **Button (ghost text)**       | `#1A1612`                  | `rgba(247, 243, 237, 0.90)` | Text-only button            |
| **Button (disabled)**         | `rgba(193, 154, 107, 0.4)` | `rgba(193, 154, 107, 0.3)`  | Muted gold                  |
| **Toggle track (off)**        | `rgba(26, 22, 18, 0.2)`    | `rgba(247, 243, 237, 0.15)` | Inactive state              |
| **Toggle track (on)**         | `#C19A6B`                  | `#C9A574`                   | Active state                |
| **Toggle knob**               | `#FFFFFF`                  | `#F7F3ED`                   | Scroll White                |

### 2.7 Content Components

| Element                    | Light Mode                  | Dark Mode                   | Notes                |
| -------------------------- | --------------------------- | --------------------------- | -------------------- |
| **Scripture block bg**     | `rgba(193, 154, 107, 0.05)` | `rgba(193, 154, 107, 0.08)` | Subtle gold tint     |
| **Scripture block border** | `2px solid #C19A6B` (left)  | `2px solid #C9A574` (left)  | Gold left border     |
| **Scripture attribution**  | `rgba(26, 22, 18, 0.5)`     | `rgba(247, 243, 237, 0.45)` | Small caps, muted    |
| **Pull quote text**        | `#1A1612`                   | `rgba(247, 243, 237, 0.90)` | Large display text   |
| **Pull quote mark**        | `#C19A6B` @ 30%             | `#C9A574` @ 40%             | Decorative quotation |
| **Hebrew/Greek text**      | `#C19A6B`                   | `#C9A574`                   | Gold for emphasis    |
| **Transliteration**        | `rgba(26, 22, 18, 0.7)`     | `rgba(247, 243, 237, 0.65)` | Italic, secondary    |
| **Footnote number**        | `#C19A6B`                   | `#C9A574`                   | Superscript, gold    |
| **Feature card bg**        | `rgba(193, 154, 107, 0.05)` | `rgba(193, 154, 107, 0.08)` | Subtle gold tint     |
| **Feature card border**    | `2px solid #C19A6B` (left)  | `2px solid #C9A574` (left)  | Gold accent          |
| **Step number**            | `#C19A6B` @ 50%             | `#C9A574` @ 60%             | Large display number |
| **Section number**         | `#C19A6B` @ 50%             | `#C9A574` @ 60%             | Large display number |
| **Expect item bullet**     | `#C19A6B`                   | `#C9A574`                   | 8px gold circle      |

### 2.8 Navigation

| Element                  | Light Mode                  | Dark Mode                   | Notes                      |
| ------------------------ | --------------------------- | --------------------------- | -------------------------- |
| **Header bg**            | `#F7F3ED`                   | `#1A1612`                   | Same as page background    |
| **Header bg (scrolled)** | `rgba(247, 243, 237, 0.95)` | `rgba(26, 22, 18, 0.95)`    | Slight transparency + blur |
| **Nav link (default)**   | `rgba(26, 22, 18, 0.7)`     | `rgba(247, 243, 237, 0.65)` | Secondary text color       |
| **Nav link (active)**    | `#1A1612`                   | `rgba(247, 243, 237, 0.90)` | Primary text color         |
| **Nav link (hover)**     | `#C19A6B`                   | `#C9A574`                   | Gold accent                |
| **Mobile menu bg**       | `#F7F3ED`                   | `#1A1612`                   | Full page overlay          |
| **Footer bg**            | `#F7F3ED`                   | `#1A1612`                   | Same as page               |
| **Footer text**          | `rgba(26, 22, 18, 0.5)`     | `rgba(247, 243, 237, 0.45)` | Muted                      |

### 2.9 Interactive Sections

| Element                  | Light Mode | Dark Mode                   | Notes                         |
| ------------------------ | ---------- | --------------------------- | ----------------------------- |
| **CTA section bg**       | `#1A1612`  | `#0F0D0B`                   | Darker than page for contrast |
| **CTA section text**     | `#F7F3ED`  | `rgba(247, 243, 237, 0.90)` | Inverted                      |
| **CTA button bg**        | `#C19A6B`  | `#C9A574`                   | Gold remains gold             |
| **CTA button text**      | `#1A1612`  | `#1A1612`                   | Dark text on gold             |
| **Breath prayer bg**     | `#1A1612`  | `#1A1612`                   | Already dark (no change)      |
| **Breath prayer text**   | `#F7F3ED`  | `#F7F3ED`                   | Already light (no change)     |
| **Breath prayer circle** | `#C19A6B`  | `#C9A574`                   | Gold animation element        |

### 2.10 Progress and Status

| Element                           | Light Mode              | Dark Mode                   | Notes            |
| --------------------------------- | ----------------------- | --------------------------- | ---------------- |
| **Progress bar track**            | `rgba(26, 22, 18, 0.1)` | `rgba(247, 243, 237, 0.1)`  | Background track |
| **Progress bar fill**             | `#C19A6B`               | `#C9A574`                   | Gold fill        |
| **Completion indicator (empty)**  | `rgba(26, 22, 18, 0.2)` | `rgba(247, 243, 237, 0.15)` | Not completed    |
| **Completion indicator (filled)** | `#C19A6B`               | `#C9A574`                   | Completed        |
| **Lock icon**                     | `rgba(26, 22, 18, 0.3)` | `rgba(247, 243, 237, 0.25)` | Locked content   |
| **Check icon**                    | `#3D6B4F`               | `#5A8B6B`                   | Success green    |

### 2.11 Modals and Overlays

| Element                | Light Mode               | Dark Mode                   | Notes                 |
| ---------------------- | ------------------------ | --------------------------- | --------------------- |
| **Overlay backdrop**   | `rgba(26, 22, 18, 0.5)`  | `rgba(0, 0, 0, 0.6)`        | Darker in dark mode   |
| **Modal bg**           | `#F7F3ED`                | `#241F1A`                   | Elevated surface      |
| **Modal border**       | `rgba(26, 22, 18, 0.1)`  | `rgba(247, 243, 237, 0.08)` | Subtle definition     |
| **Modal shadow**       | `rgba(26, 22, 18, 0.15)` | `rgba(0, 0, 0, 0.4)`        | Deeper in dark mode   |
| **Toast bg (success)** | `#E8F5E9`                | `rgba(90, 139, 107, 0.2)`   | Tinted background     |
| **Toast bg (error)**   | `#FFEBEE`                | `rgba(184, 90, 90, 0.2)`    | Tinted background     |
| **Toast bg (warning)** | `#FFF8E1`                | `rgba(184, 147, 90, 0.2)`   | Tinted background     |
| **Toast bg (info)**    | `#E3F2FD`                | `rgba(106, 128, 144, 0.2)`  | Tinted background     |
| **Tooltip bg**         | `#1A1612`                | `#F7F3ED`                   | Inverted for contrast |
| **Tooltip text**       | `#F7F3ED`                | `#1A1612`                   | Inverted for contrast |

### 2.12 Loading and Skeleton States

| Element                | Light Mode               | Dark Mode                   | Notes             |
| ---------------------- | ------------------------ | --------------------------- | ----------------- |
| **Skeleton base**      | `rgba(26, 22, 18, 0.08)` | `rgba(247, 243, 237, 0.05)` | Base shimmer      |
| **Skeleton highlight** | `rgba(26, 22, 18, 0.15)` | `rgba(247, 243, 237, 0.10)` | Shimmer highlight |
| **Loading pulse**      | `#C19A6B` @ 60-100%      | `#C9A574` @ 60-100%         | Gold breathing    |

---

## 3. Special Considerations

### 3.1 Scripture Passages

Scripture passages receive special visual treatment in both modes.

**Light Mode:**

- Background: `rgba(193, 154, 107, 0.05)` (subtle gold wash)
- Left border: `2px solid #C19A6B`
- Text: Primary text color
- Attribution: Secondary text, small caps

**Dark Mode:**

- Background: `rgba(193, 154, 107, 0.08)` (slightly more visible gold wash)
- Left border: `2px solid #C9A574` (lightened gold)
- Text: Primary text color (90% Scroll White)
- Attribution: Secondary text, small caps

**Transition Behavior:**
The gold border and background tint should transition together with the rest of the page. The border width remains constant; only the color shifts.

### 3.2 Hebrew/Greek Word Cards

These cards present original language terms with transliteration and definitions.

**Structure:**

```
.word-study-card
  .original-text (Hebrew/Greek characters)
  .transliteration (romanized pronunciation)
  .definition (meaning)
  .context (usage in passage)
```

**Light Mode:**

- Card background: Scroll White or subtle gold tint
- Original text: Gold (`#C19A6B`), large display
- Transliteration: Secondary text, italic
- Definition: Primary text
- Context: Secondary text

**Dark Mode:**

- Card background: Elevated surface (`#241F1A`)
- Original text: Lightened gold (`#C9A574`), large display
- Transliteration: Secondary text (65%), italic
- Definition: Primary text (90%)
- Context: Secondary text (65%)

**Font Consideration:**
SBL Hebrew/Greek fonts render equally well in both modes. Ensure the gold color provides sufficient contrast against both backgrounds.

### 3.3 Breath Prayer Sections

Breath prayer sections are **already designed dark**. They use Tehom Black backgrounds in light mode to create visual distinction for the meditative content.

**Light Mode:**

- Background: `#1A1612` (Tehom Black)
- Text: `#F7F3ED` (Scroll White)
- Breathing circle: `#C19A6B` (Gold)

**Dark Mode:**

- Background: `#1A1612` (unchanged)
- Text: `#F7F3ED` (unchanged)
- Breathing circle: `#C9A574` (slightly lightened gold)

**Transition Behavior:**
Because breath prayer sections are already dark, only the gold accent color needs to shift. The background and text colors remain constant. This creates a moment of stability during the theme transition, an anchor point as the rest of the page transforms.

### 3.4 Pull Quotes

Pull quotes are large-format text excerpts designed to create visual pause.

**Light Mode:**

- Text: Tehom Black, large display font
- Quotation mark (decorative): Gold at 30% opacity
- Background: None (inherits page background)

**Dark Mode:**

- Text: Scroll White at 90%, large display font
- Quotation mark (decorative): Lightened gold at 40% opacity
- Background: None (inherits page background)

**Transition:**
The quotation mark may appear to "glow" slightly as the opacity increases during the transition. This is acceptable and even desirable; it draws momentary attention to the contemplative content.

### 3.5 Images

Images require special handling to maintain visual consistency across modes.

**Photography:**

- Apply CSS `filter` adjustment in dark mode to reduce brightness and prevent images from feeling like bright holes in the dark interface.
- Recommended: `filter: brightness(0.9) contrast(1.05);`
- This creates a subtle "lowered lights" effect consistent with the contemplative environment.

**Illustrations (Gold/Tehom):**

- Line art in gold or Tehom may need color adjustment via CSS or SVG styling.
- If SVG: Swap `fill` or `stroke` colors to match the dark mode palette.
- If raster: Provide separate dark mode variants or use CSS filters.

**User-Uploaded Content:**

- Apply the same brightness filter as photography.
- Consider a subtle vignette overlay for consistency.

### 3.6 Progress Indicators

**Series Progress Bar:**

- Track background inverts (dark track in light mode, light track in dark mode)
- Fill remains gold (lightened variant in dark mode)
- No change to behavior or animation

**Devotional Completion Indicators:**

- Empty state uses muted foreground color
- Filled state uses gold
- Check icon uses success green (lightened in dark mode)

**Scroll Progress (if visible):**

- Thin line in gold
- Same lightened gold in dark mode
- Fades out after inactivity (same behavior in both modes)

---

## 4. CSS Custom Properties

### 4.1 Complete Variable Set

```css
:root {
  /* ===========================================
     EUONGELION Design Tokens - Light Mode Default
     =========================================== */

  /* Foundation Colors */
  --color-tehom: #1a1612;
  --color-scroll: #f7f3ed;
  --color-gold: #c19a6b;

  /* Background Colors */
  --bg-primary: var(--color-scroll);
  --bg-secondary: rgba(26, 22, 18, 0.05);
  --bg-tertiary: rgba(26, 22, 18, 0.08);
  --bg-elevated: #ffffff;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --bg-cta: var(--color-tehom);
  --bg-overlay: rgba(26, 22, 18, 0.5);

  /* Text Colors */
  --text-primary: var(--color-tehom);
  --text-secondary: rgba(26, 22, 18, 0.7);
  --text-tertiary: rgba(26, 22, 18, 0.5);
  --text-disabled: rgba(26, 22, 18, 0.3);
  --text-inverse: var(--color-scroll);
  --text-placeholder: rgba(26, 22, 18, 0.4);

  /* Accent Colors */
  --accent-gold: var(--color-gold);
  --accent-gold-hover: rgba(193, 154, 107, 0.9);
  --accent-gold-muted: rgba(193, 154, 107, 0.5);
  --accent-gold-bg: rgba(193, 154, 107, 0.05);
  --accent-gold-bg-strong: rgba(193, 154, 107, 0.1);

  /* Theological Colors */
  --color-burgundy: #6b2c2c;
  --color-olive: #6b6b4f;
  --color-shalom: #4a5f6b;

  /* System Colors */
  --color-success: #3d6b4f;
  --color-warning: #8b6f3d;
  --color-error: #8b3d3d;
  --color-info: var(--color-shalom);

  /* Border Colors */
  --border-strong: rgba(26, 22, 18, 0.2);
  --border-medium: rgba(26, 22, 18, 0.1);
  --border-subtle: rgba(26, 22, 18, 0.08);
  --border-gold: var(--color-gold);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(26, 22, 18, 0.05);
  --shadow-md: 0 4px 6px rgba(26, 22, 18, 0.08);
  --shadow-lg: 0 10px 15px rgba(26, 22, 18, 0.1);
  --shadow-xl: 0 20px 25px rgba(26, 22, 18, 0.12);

  /* Focus States */
  --focus-ring: rgba(193, 154, 107, 0.5);
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  /* Selection */
  --selection-bg: rgba(193, 154, 107, 0.2);
  --selection-text: inherit;

  /* Interactive States */
  --button-primary-bg: var(--accent-gold);
  --button-primary-text: var(--color-tehom);
  --button-primary-hover-bg: var(--accent-gold-hover);
  --button-secondary-bg: transparent;
  --button-secondary-border: var(--accent-gold);
  --button-secondary-text: var(--accent-gold);
  --button-ghost-text: var(--text-primary);
  --button-disabled-bg: rgba(193, 154, 107, 0.4);
  --button-disabled-text: rgba(26, 22, 18, 0.5);

  /* Form Elements */
  --input-border: var(--border-strong);
  --input-border-focus: var(--accent-gold);
  --input-bg: var(--bg-input);

  /* Toggle */
  --toggle-track-off: rgba(26, 22, 18, 0.2);
  --toggle-track-on: var(--accent-gold);
  --toggle-knob: #ffffff;

  /* Progress */
  --progress-track: rgba(26, 22, 18, 0.1);
  --progress-fill: var(--accent-gold);

  /* Skeleton Loading */
  --skeleton-base: rgba(26, 22, 18, 0.08);
  --skeleton-highlight: rgba(26, 22, 18, 0.15);

  /* Image Filter */
  --image-filter: none;

  /* Toast Backgrounds */
  --toast-success-bg: #e8f5e9;
  --toast-error-bg: #ffebee;
  --toast-warning-bg: #fff8e1;
  --toast-info-bg: #e3f2fd;

  /* Tooltip */
  --tooltip-bg: var(--color-tehom);
  --tooltip-text: var(--color-scroll);

  /* Transition */
  --theme-transition-duration: 400ms;
  --theme-transition-easing: ease-in-out;
}

/* ===========================================
   Dark Mode - User Toggle
   =========================================== */

[data-theme='dark'] {
  /* Background Colors */
  --bg-primary: var(--color-tehom);
  --bg-secondary: rgba(247, 243, 237, 0.05);
  --bg-tertiary: rgba(247, 243, 237, 0.08);
  --bg-elevated: #241f1a;
  --bg-card: #241f1a;
  --bg-input: #1f1b17;
  --bg-cta: #0f0d0b;
  --bg-overlay: rgba(0, 0, 0, 0.6);

  /* Text Colors */
  --text-primary: rgba(247, 243, 237, 0.9);
  --text-secondary: rgba(247, 243, 237, 0.65);
  --text-tertiary: rgba(247, 243, 237, 0.45);
  --text-disabled: rgba(247, 243, 237, 0.3);
  --text-inverse: var(--color-tehom);
  --text-placeholder: rgba(247, 243, 237, 0.35);

  /* Accent Colors (lightened for dark backgrounds) */
  --accent-gold: #c9a574;
  --accent-gold-hover: #d4b182;
  --accent-gold-muted: rgba(201, 165, 116, 0.6);
  --accent-gold-bg: rgba(193, 154, 107, 0.08);
  --accent-gold-bg-strong: rgba(193, 154, 107, 0.12);

  /* Theological Colors (lightened) */
  --color-burgundy: #8b4444;
  --color-olive: #8b8b6b;
  --color-shalom: #6a8090;

  /* System Colors (lightened) */
  --color-success: #5a8b6b;
  --color-warning: #b8935a;
  --color-error: #b85a5a;
  --color-info: #6a8090;

  /* Border Colors */
  --border-strong: rgba(247, 243, 237, 0.15);
  --border-medium: rgba(247, 243, 237, 0.1);
  --border-subtle: rgba(247, 243, 237, 0.08);
  --border-gold: #c9a574;

  /* Shadows (deeper in dark mode) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.4);

  /* Focus States */
  --focus-ring: rgba(201, 165, 116, 0.6);

  /* Selection */
  --selection-bg: rgba(193, 154, 107, 0.25);

  /* Interactive States */
  --button-primary-bg: #c9a574;
  --button-primary-text: var(--color-tehom);
  --button-primary-hover-bg: #d4b182;
  --button-secondary-border: #c9a574;
  --button-secondary-text: #c9a574;
  --button-ghost-text: var(--text-primary);
  --button-disabled-bg: rgba(193, 154, 107, 0.3);
  --button-disabled-text: rgba(247, 243, 237, 0.4);

  /* Form Elements */
  --input-border: var(--border-strong);
  --input-border-focus: #c9a574;
  --input-bg: var(--bg-input);

  /* Toggle */
  --toggle-track-off: rgba(247, 243, 237, 0.15);
  --toggle-track-on: #c9a574;
  --toggle-knob: var(--color-scroll);

  /* Progress */
  --progress-track: rgba(247, 243, 237, 0.1);
  --progress-fill: #c9a574;

  /* Skeleton Loading */
  --skeleton-base: rgba(247, 243, 237, 0.05);
  --skeleton-highlight: rgba(247, 243, 237, 0.1);

  /* Image Filter */
  --image-filter: brightness(0.9) contrast(1.05);

  /* Toast Backgrounds */
  --toast-success-bg: rgba(90, 139, 107, 0.2);
  --toast-error-bg: rgba(184, 90, 90, 0.2);
  --toast-warning-bg: rgba(184, 147, 90, 0.2);
  --toast-info-bg: rgba(106, 128, 144, 0.2);

  /* Tooltip (inverted) */
  --tooltip-bg: var(--color-scroll);
  --tooltip-text: var(--color-tehom);
}

/* ===========================================
   Dark Mode - System Preference
   =========================================== */

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    /* Background Colors */
    --bg-primary: var(--color-tehom);
    --bg-secondary: rgba(247, 243, 237, 0.05);
    --bg-tertiary: rgba(247, 243, 237, 0.08);
    --bg-elevated: #241f1a;
    --bg-card: #241f1a;
    --bg-input: #1f1b17;
    --bg-cta: #0f0d0b;
    --bg-overlay: rgba(0, 0, 0, 0.6);

    /* Text Colors */
    --text-primary: rgba(247, 243, 237, 0.9);
    --text-secondary: rgba(247, 243, 237, 0.65);
    --text-tertiary: rgba(247, 243, 237, 0.45);
    --text-disabled: rgba(247, 243, 237, 0.3);
    --text-inverse: var(--color-tehom);
    --text-placeholder: rgba(247, 243, 237, 0.35);

    /* Accent Colors (lightened for dark backgrounds) */
    --accent-gold: #c9a574;
    --accent-gold-hover: #d4b182;
    --accent-gold-muted: rgba(201, 165, 116, 0.6);
    --accent-gold-bg: rgba(193, 154, 107, 0.08);
    --accent-gold-bg-strong: rgba(193, 154, 107, 0.12);

    /* Theological Colors (lightened) */
    --color-burgundy: #8b4444;
    --color-olive: #8b8b6b;
    --color-shalom: #6a8090;

    /* System Colors (lightened) */
    --color-success: #5a8b6b;
    --color-warning: #b8935a;
    --color-error: #b85a5a;
    --color-info: #6a8090;

    /* Border Colors */
    --border-strong: rgba(247, 243, 237, 0.15);
    --border-medium: rgba(247, 243, 237, 0.1);
    --border-subtle: rgba(247, 243, 237, 0.08);
    --border-gold: #c9a574;

    /* Shadows (deeper in dark mode) */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.15);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.25);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.4);

    /* Focus States */
    --focus-ring: rgba(201, 165, 116, 0.6);

    /* Selection */
    --selection-bg: rgba(193, 154, 107, 0.25);

    /* Interactive States */
    --button-primary-bg: #c9a574;
    --button-primary-text: var(--color-tehom);
    --button-primary-hover-bg: #d4b182;
    --button-secondary-border: #c9a574;
    --button-secondary-text: #c9a574;
    --button-ghost-text: var(--text-primary);
    --button-disabled-bg: rgba(193, 154, 107, 0.3);
    --button-disabled-text: rgba(247, 243, 237, 0.4);

    /* Form Elements */
    --input-border: var(--border-strong);
    --input-border-focus: #c9a574;
    --input-bg: var(--bg-input);

    /* Toggle */
    --toggle-track-off: rgba(247, 243, 237, 0.15);
    --toggle-track-on: #c9a574;
    --toggle-knob: var(--color-scroll);

    /* Progress */
    --progress-track: rgba(247, 243, 237, 0.1);
    --progress-fill: #c9a574;

    /* Skeleton Loading */
    --skeleton-base: rgba(247, 243, 237, 0.05);
    --skeleton-highlight: rgba(247, 243, 237, 0.1);

    /* Image Filter */
    --image-filter: brightness(0.9) contrast(1.05);

    /* Toast Backgrounds */
    --toast-success-bg: rgba(90, 139, 107, 0.2);
    --toast-error-bg: rgba(184, 90, 90, 0.2);
    --toast-warning-bg: rgba(184, 147, 90, 0.2);
    --toast-info-bg: rgba(106, 128, 144, 0.2);

    /* Tooltip (inverted) */
    --tooltip-bg: var(--color-scroll);
    --tooltip-text: var(--color-tehom);
  }
}
```

### 4.2 Transition Application

```css
/* ===========================================
   Theme Transition Styles
   =========================================== */

/* Elements that should transition */
html,
body,
.hero,
.section,
.cta,
.footer,
.card,
.feature,
.step,
.expect-item,
.modal,
.toast,
input,
textarea,
select,
button,
a {
  transition:
    background-color var(--theme-transition-duration)
      var(--theme-transition-easing),
    color var(--theme-transition-duration) var(--theme-transition-easing),
    border-color var(--theme-transition-duration) var(--theme-transition-easing),
    box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
}

/* Images with filter transition */
img:not([data-no-filter]),
picture img,
.image-container img {
  transition: filter var(--theme-transition-duration)
    var(--theme-transition-easing);
  filter: var(--image-filter);
}

/* SVG icons that change color */
svg,
.icon {
  transition:
    fill var(--theme-transition-duration) var(--theme-transition-easing),
    stroke var(--theme-transition-duration) var(--theme-transition-easing);
}

/* Disable transitions during initial load to prevent flash */
html.no-transitions,
html.no-transitions * {
  transition: none !important;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
```

### 4.3 Usage Examples

```css
/* Background application */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Card styling */
.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
}

/* Scripture block */
.scripture-block {
  background-color: var(--accent-gold-bg);
  border-left: 2px solid var(--border-gold);
  color: var(--text-primary);
}

.scripture-attribution {
  color: var(--text-tertiary);
}

/* Button styling */
.button-primary {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
}

.button-primary:hover {
  background-color: var(--button-primary-hover-bg);
}

/* Input styling */
input,
textarea {
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
}

input:focus,
textarea:focus {
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring);
}

input::placeholder {
  color: var(--text-placeholder);
}

/* Hebrew/Greek text */
.original-text {
  color: var(--accent-gold);
}

/* Progress bar */
.progress-track {
  background-color: var(--progress-track);
}

.progress-fill {
  background-color: var(--progress-fill);
}

/* Toast notifications */
.toast-success {
  background-color: var(--toast-success-bg);
  border-left: 3px solid var(--color-success);
}

.toast-error {
  background-color: var(--toast-error-bg);
  border-left: 3px solid var(--color-error);
}
```

---

## 5. Transition Specification

### 5.1 Timing

| Property     | Value       | Rationale                                      |
| ------------ | ----------- | ---------------------------------------------- |
| **Duration** | 400-500ms   | Perceptible but not slow; contemplative pacing |
| **Easing**   | ease-in-out | Smooth acceleration and deceleration           |
| **Delay**    | 0ms         | All elements begin simultaneously              |

### 5.2 What Animates Together

**Simultaneous Transition (all at once):**

- Page background color
- All text colors
- All border colors
- Card backgrounds
- Button colors
- Input fields
- Navigation elements
- Footer
- Overlays and modals (if open)

**Reason:** Theme changes should feel like a single environmental shift, not a sequence of element updates. The user perceives the room dimming or brightening, not individual objects changing color.

### 5.3 What Does NOT Animate

**Static during transition:**

- Breath prayer sections (already dark)
- Images (filter change is subtle and continuous)
- Gold accent (shifts but remains perceptibly gold)
- Typography size, weight, or family
- Layout or spacing
- Scroll position

### 5.4 Preventing Flash

**Problem:** During theme transition, intermediate states can create a brief flash of white or black if elements transition at different speeds or in sequence.

**Solution:**

1. **Single transition trigger:** All CSS custom properties are defined on `:root` or `[data-theme]`. Changing the data attribute triggers all transitions simultaneously.

2. **No intermediate colors:** Colors transition directly from light to dark values. No elements should ever display #FFFFFF or #000000 during transition.

3. **JavaScript coordination:**

```javascript
// Theme toggle handler
function toggleTheme() {
  const html = document.documentElement
  const currentTheme = html.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

  // Apply new theme
  html.setAttribute('data-theme', newTheme)

  // Persist preference
  localStorage.setItem('theme', newTheme)
}
```

### 5.5 Initial Load (No Flash)

**Problem:** On initial page load, if the user prefers dark mode but the CSS loads with light mode first, there will be a flash of light content.

**Solution:**

```html
<!-- In <head>, before any CSS -->
<script>
  ;(function () {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    const theme = stored || (prefersDark ? 'dark' : 'light')

    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.add('no-transitions')
  })()
</script>

<!-- After DOM ready -->
<script>
  document.addEventListener('DOMContentLoaded', function () {
    // Remove no-transitions class after a brief delay
    setTimeout(function () {
      document.documentElement.classList.remove('no-transitions')
    }, 100)
  })
</script>
```

This script:

1. Runs before CSS, preventing flash
2. Sets the correct theme immediately
3. Disables transitions during initial load
4. Re-enables transitions after DOM is ready

---

## 6. Toggle UI

### 6.1 Placement Options

**Primary Placement: Header/Navigation**

- Location: Right side of header, near user menu
- Visibility: Always visible on desktop
- Mobile: Inside hamburger menu or persistent in header
- Priority: High (users expect to find it here)

**Secondary Placement: Settings Page**

- Location: Appearance section of user settings
- Visibility: Accessible from profile/settings
- Include: System preference option
- Priority: Required (canonical location)

**Optional Placement: Footer**

- Location: Footer utility links area
- Visibility: Always visible
- Purpose: Alternative access point

**NOT Recommended:**

- Floating action button (too prominent for theme toggle)
- Sidebar (EUONGELION does not use sidebars)
- Within content (breaks reading flow)

### 6.2 Toggle Component Specification

**Visual Design:**

```
Light Mode (sun icon):
  ○───────○
  [  ●    ]  <-- knob on left

Dark Mode (moon icon):
  ○───────○
  [    ●  ]  <-- knob on right
```

**States:**

- Default: Shows current mode
- Hover: Subtle scale increase (102%)
- Focus: Gold focus ring
- Active: Knob slides to opposite position
- Disabled: Reduced opacity (0.5)

**Animation:**

- Knob slide: 250-300ms, ease-in-out
- Track color: Transitions with knob
- Icon crossfade: 200ms (if using icons)

### 6.3 Icon States

**Option A: Sun/Moon Icons**

```
Light mode active: ☀ (sun icon)
Dark mode active: ☽ (moon icon)
```

- Sun icon: 2px stroke, gold color
- Moon icon: 2px stroke, gold color
- Transition: Crossfade or morph

**Option B: Toggle with Label**

```
Light mode: [ Light | ● Dark ]
Dark mode:  [ Light ● | Dark ]
```

- Underline or background indicates active
- Text: Secondary color for inactive, primary for active
- Gold accent for active indicator

**Option C: Simple Toggle (No Icons)**

```
○─────────●
```

- Minimalist, relies on visual context
- Track changes color with theme
- Knob position indicates state

**Recommendation:** Option A (Sun/Moon) for header placement, Option B for settings page.

### 6.4 System Preference Detection

```javascript
// Theme management
const ThemeManager = {
  STORAGE_KEY: 'theme',

  init() {
    // Check for stored preference
    const stored = localStorage.getItem(this.STORAGE_KEY)

    if (stored) {
      this.setTheme(stored)
    } else {
      // Use system preference
      this.syncWithSystem()
    }

    // Listen for system changes
    this.watchSystem()
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(this.STORAGE_KEY, theme)
    this.updateToggle(theme)
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    this.setTheme(next)
  },

  syncWithSystem() {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    const theme = prefersDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    // Do NOT store - allow system to control
    this.updateToggle(theme)
  },

  watchSystem() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    mediaQuery.addEventListener('change', (e) => {
      // Only sync if no stored preference
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.syncWithSystem()
      }
    })
  },

  clearPreference() {
    localStorage.removeItem(this.STORAGE_KEY)
    this.syncWithSystem()
  },

  updateToggle(theme) {
    const toggle = document.querySelector('[data-theme-toggle]')
    if (toggle) {
      toggle.setAttribute('aria-checked', theme === 'dark')
      // Update icons, labels, etc.
    }
  },
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init()
})
```

### 6.5 Settings Page Options

**Theme Section in Settings:**

```
Appearance
──────────────────────────────────────

Theme
○ Light
○ Dark
● System (follow device settings)

[Preview of current theme below]
```

**Three-Way Selection:**

1. **Light** - Always light mode, ignores system
2. **Dark** - Always dark mode, ignores system
3. **System** - Follows device preference (default)

When "System" is selected:

- Clear localStorage preference
- Listen to `prefers-color-scheme` media query
- Update automatically when system changes

### 6.6 Accessibility

**ARIA Attributes:**

```html
<button
  type="button"
  role="switch"
  aria-checked="false"
  aria-label="Dark mode"
  data-theme-toggle
>
  <span class="toggle-track">
    <span class="toggle-knob"></span>
  </span>
  <span class="sr-only"> Toggle dark mode. Currently light mode. </span>
</button>
```

**Keyboard Support:**

- Space/Enter: Toggle theme
- Focus visible: Gold ring

**Screen Reader Announcement:**
When toggled, announce: "Dark mode enabled" or "Light mode enabled"

---

## 7. Edge Cases

### 7.1 Images with Transparency

**Problem:** PNG images with transparent backgrounds may have halos or look incorrect when the page background changes.

**Solutions:**

1. **Avoid transparency for photos:** Use solid backgrounds that work in both modes.

2. **Provide dual assets:**
   - `image-light.png` (transparent, for light mode)
   - `image-dark.png` (transparent, for dark mode)
   - Swap via CSS:

   ```css
   .logo {
     background-image: url('logo-light.svg');
   }

   [data-theme='dark'] .logo {
     background-image: url('logo-dark.svg');
   }
   ```

3. **Add background to image container:**

   ```css
   .image-with-transparency {
     background-color: var(--bg-card);
     padding: 1rem;
     border-radius: 4px;
   }
   ```

4. **Use `<picture>` element:**
   ```html
   <picture>
     <source srcset="image-dark.png" media="(prefers-color-scheme: dark)" />
     <img src="image-light.png" alt="Description" />
   </picture>
   ```

### 7.2 User-Uploaded Content

**Problem:** Users may upload images or content that looks poor in dark mode.

**Solutions:**

1. **Apply consistent filter:**

   ```css
   .user-content img {
     filter: var(--image-filter);
   }
   ```

2. **Provide override option:**
   Allow users to disable image filtering for specific content if needed.

3. **Add subtle vignette:**

   ```css
   .user-content-container::after {
     content: '';
     position: absolute;
     inset: 0;
     pointer-events: none;
     background: radial-gradient(
       ellipse at center,
       transparent 70%,
       var(--bg-primary) 100%
     );
     opacity: 0.3;
   }
   ```

4. **Background padding:**
   Wrap user images in a container with the card background to provide visual separation.

### 7.3 Print Mode

**Requirement:** Print output must always use light mode colors regardless of screen theme.

```css
@media print {
  :root,
  [data-theme='dark'] {
    /* Force light mode colors for print */
    --bg-primary: #f7f3ed;
    --bg-secondary: rgba(26, 22, 18, 0.05);
    --bg-tertiary: rgba(26, 22, 18, 0.08);
    --bg-card: #ffffff;

    --text-primary: #1a1612;
    --text-secondary: rgba(26, 22, 18, 0.7);
    --text-tertiary: rgba(26, 22, 18, 0.5);

    --accent-gold: #c19a6b;
    --border-gold: #c19a6b;
    --border-subtle: rgba(26, 22, 18, 0.08);

    /* Remove filters */
    --image-filter: none;
  }

  /* Remove transitions for print */
  * {
    transition: none !important;
  }

  /* Hide theme toggle in print */
  [data-theme-toggle] {
    display: none !important;
  }
}
```

### 7.4 Email Content

**Requirement:** Email HTML must always use light mode colors because:

1. Email clients have inconsistent dark mode support
2. Many email clients auto-invert colors, causing issues
3. Light backgrounds are more universally readable

**Email-Specific Styles:**

```html
<!-- Email template -->
<style>
  /* Always light mode in email */
  body {
    background-color: #f7f3ed !important;
    color: #1a1612 !important;
  }

  .email-card {
    background-color: #ffffff !important;
    border: 1px solid rgba(26, 22, 18, 0.08) !important;
  }

  .email-gold {
    color: #c19a6b !important;
  }

  .email-secondary {
    color: rgba(26, 22, 18, 0.7) !important;
  }
</style>
```

**Email Dark Mode Meta Tag (Optional):**

To prevent email clients from auto-inverting:

```html
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
```

### 7.5 Embedded Content (iframes)

**Problem:** Embedded content (videos, third-party widgets) will not respond to theme changes.

**Solutions:**

1. **Dark borders/containers:**

   ```css
   .embed-container {
     background-color: var(--bg-tertiary);
     padding: 1rem;
     border-radius: 4px;
   }
   ```

2. **Use dark variants when available:**
   - YouTube: Add `?theme=dark` for dark player
   - Google Maps: Use dark theme styling
   - Other embeds: Check for theme parameters

3. **Overlay with instructions:**
   For embeds that clash badly, consider an overlay that says "View in light mode" with a link.

### 7.6 Code Blocks / Syntax Highlighting

**If displaying code (future feature):**

- Provide separate light and dark syntax themes
- Use CSS variables for syntax colors
- Ensure both themes have sufficient contrast

```css
/* Light mode syntax */
:root {
  --code-bg: #f5f2ed;
  --code-text: #1a1612;
  --code-keyword: #6b2c2c;
  --code-string: #3d6b4f;
  --code-comment: rgba(26, 22, 18, 0.5);
}

/* Dark mode syntax */
[data-theme='dark'] {
  --code-bg: #1f1b17;
  --code-text: rgba(247, 243, 237, 0.9);
  --code-keyword: #b85a5a;
  --code-string: #5a8b6b;
  --code-comment: rgba(247, 243, 237, 0.45);
}
```

### 7.7 Browser Extension Conflicts

**Problem:** Some browser extensions (dark mode forcers, accessibility tools) may conflict with our dark mode implementation.

**Mitigation:**

1. **Use specific selectors:** Our `[data-theme="dark"]` is explicit and unlikely to be overridden.

2. **Meta tag hint:**

   ```html
   <meta name="color-scheme" content="light dark" />
   ```

   This tells the browser we handle both modes, reducing extension interference.

3. **Document for support:** If users report issues, suggest disabling conflicting extensions for the site.

### 7.8 Partial Page Updates (SPA Navigation)

**Problem:** In single-page applications, theme state must persist across client-side navigation.

**Solution:**

1. Theme state lives on `<html>` element, which persists across SPA navigation.
2. Theme manager initializes once on app load.
3. Components read from CSS variables, which update automatically.
4. No component-level theme state needed.

### 7.9 Server-Side Rendering (SSR)

**Problem:** Server cannot know user's theme preference on first render.

**Solutions:**

1. **Cookie-based preference:**
   Store theme in cookie, read on server, render correct theme.

2. **Critical CSS approach:**
   Inline the theme detection script in `<head>` (as shown in Section 5.5) to set theme before CSS renders.

3. **Flash prevention:**
   Use `visibility: hidden` on `<body>` until theme is determined, then reveal.

   ```css
   body.theme-loading {
     visibility: hidden;
   }
   ```

   ```javascript
   // After theme is set
   document.body.classList.remove('theme-loading')
   ```

---

## 8. Implementation Checklist

### 8.1 Phase 1: Foundation

- [ ] Add CSS custom properties to global stylesheet
- [ ] Add `[data-theme="dark"]` override rules
- [ ] Add `@media (prefers-color-scheme: dark)` fallback
- [ ] Implement flash prevention script in `<head>`
- [ ] Test all foundation colors in both modes

### 8.2 Phase 2: Components

- [ ] Update all card components
- [ ] Update all button variants
- [ ] Update all form inputs
- [ ] Update navigation/header
- [ ] Update footer
- [ ] Update modal/overlay components
- [ ] Update toast/notification components
- [ ] Update progress indicators
- [ ] Update loading/skeleton states

### 8.3 Phase 3: Content

- [ ] Scripture blocks
- [ ] Hebrew/Greek word cards
- [ ] Pull quotes
- [ ] Breath prayer sections (verify no change needed)
- [ ] Feature cards
- [ ] Step cards
- [ ] Section headers

### 8.4 Phase 4: Toggle UI

- [ ] Design toggle component
- [ ] Implement toggle in header
- [ ] Implement settings page options
- [ ] Add ARIA attributes
- [ ] Test keyboard navigation
- [ ] Test screen reader announcements

### 8.5 Phase 5: Edge Cases

- [ ] Audit all images for transparency issues
- [ ] Implement image filter
- [ ] Create print stylesheet override
- [ ] Document email template requirements
- [ ] Test with browser dark mode extensions

### 8.6 Phase 6: Testing

- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test on Firefox
- [ ] Test on Chrome/Edge
- [ ] Test reduced motion preference
- [ ] Test high contrast mode
- [ ] Test color contrast (WCAG AA)
- [ ] Test transition smoothness
- [ ] Test persistence across sessions
- [ ] Test system preference changes
- [ ] Test SPA navigation (if applicable)

### 8.7 Phase 7: Documentation

- [ ] Update component library documentation
- [ ] Add Storybook stories for both themes
- [ ] Document color mapping for designers
- [ ] Create design file with dark mode swatches

---

## Appendix A: Color Contrast Verification

All text/background combinations must meet WCAG 2.1 AA standards:

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

### Light Mode Contrast Ratios

| Text            | Background       | Ratio  | Pass                 |
| --------------- | ---------------- | ------ | -------------------- |
| Tehom (#1A1612) | Scroll (#F7F3ED) | 13.8:1 | Yes                  |
| Secondary (70%) | Scroll (#F7F3ED) | 8.2:1  | Yes                  |
| Tertiary (50%)  | Scroll (#F7F3ED) | 5.1:1  | Yes                  |
| Gold (#C19A6B)  | Tehom (#1A1612)  | 5.4:1  | Yes                  |
| Gold (#C19A6B)  | Scroll (#F7F3ED) | 2.5:1  | No (decorative only) |

### Dark Mode Contrast Ratios

| Text            | Background      | Ratio  | Pass             |
| --------------- | --------------- | ------ | ---------------- |
| Scroll 90%      | Tehom (#1A1612) | 11.8:1 | Yes              |
| Secondary (65%) | Tehom (#1A1612) | 6.4:1  | Yes              |
| Tertiary (45%)  | Tehom (#1A1612) | 3.9:1  | Yes (large text) |
| Gold (#C9A574)  | Tehom (#1A1612) | 5.8:1  | Yes              |

**Note:** Gold on Scroll White fails contrast in light mode. Gold text should only be used on dark backgrounds or for decorative purposes where text is also available in a high-contrast color.

---

## Appendix B: Quick Reference Card

### Essential Variables

```css
/* Background */
var(--bg-primary)      /* Page background */
var(--bg-card)         /* Card/elevated background */
var(--bg-input)        /* Form input background */

/* Text */
var(--text-primary)    /* Body text */
var(--text-secondary)  /* Subtitles, descriptions */
var(--text-tertiary)   /* Captions, metadata */

/* Accents */
var(--accent-gold)     /* Primary accent */
var(--accent-gold-bg)  /* Gold-tinted backgrounds */

/* Borders */
var(--border-subtle)   /* Dividers, card borders */
var(--border-gold)     /* Accent borders */

/* Interactive */
var(--button-primary-bg)   /* Primary button */
var(--button-primary-text) /* Primary button text */
var(--input-border-focus)  /* Focused input border */
var(--focus-ring)          /* Focus ring color */
```

### Theme Toggle

```javascript
// Toggle theme
document.documentElement.setAttribute('data-theme', 'dark')

// Check current theme
const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

// Clear preference (use system)
localStorage.removeItem('theme')
```

---

**End of Document**

_Prepared for Design Sprint: January 18, 2026_
_Implementation-ready specification for EUONGELION dark mode theming_
