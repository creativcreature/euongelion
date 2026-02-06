# EUONGELION Component Inventory

**Source:** `onboarding-welcome.html` wireframe template
**Purpose:** Comprehensive catalog of UI components for the EUONGELION devotional platform
**Status:** Planning Document - Component Specifications

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Components Found in Template](#2-components-found-in-template)
3. [Component Categories](#3-component-categories)
4. [Extended Component Needs](#4-extended-component-needs)
5. [Component Relationships](#5-component-relationships)
6. [Accessibility Notes](#6-accessibility-notes)
7. [Component Priority Matrix](#7-component-priority-matrix)

---

## 1. Design Tokens

### 1.1 Color Palette

| Token Name    | Value                   | Usage                                                              |
| ------------- | ----------------------- | ------------------------------------------------------------------ |
| `--tehom`     | `#1A1612`               | Primary dark color (deep brown-black), body text, dark backgrounds |
| `--scroll`    | `#F7F3ED`               | Primary light color (warm off-white), page background              |
| `--gold`      | `#C19A6B`               | Accent color, highlights, decorative elements, CTAs                |
| `--secondary` | `rgba(26, 22, 18, 0.5)` | Muted text, subtitles, descriptions                                |

**Semantic Color Notes:**

- "Tehom" = Hebrew for "the deep" - represents spiritual depth
- "Scroll" = Evokes ancient manuscripts, Scripture
- Color palette is intentionally warm, earthy, and reverent

### 1.2 Typography

| Token Name       | Value                       | Usage                                |
| ---------------- | --------------------------- | ------------------------------------ |
| `--font-body`    | `'DM Sans', sans-serif`     | Body text, descriptions, UI elements |
| `--font-display` | `'Playfair Display', serif` | Headings, titles, decorative text    |

**Font Weights Used:**

- DM Sans: 400 (regular), 500 (medium), 700 (bold)
- Playfair Display: 400 (regular), 500 (medium), 700 (bold), plus italics

**Base Font Size:** 17px (html root)

### 1.3 Spacing Scale (Extracted)

| Size | Value             | Context                   |
| ---- | ----------------- | ------------------------- |
| xs   | 0.5rem (8px)      | Gap between icon and text |
| sm   | 0.75rem (12.75px) | Small margins             |
| md   | 1rem (17px)       | Standard spacing          |
| lg   | 1.5rem (25.5px)   | Section gaps              |
| xl   | 2rem (34px)       | Page padding              |
| 2xl  | 2.5rem (42.5px)   | Section margins           |
| 3xl  | 3rem (51px)       | Large gaps                |
| 4xl  | 4rem (68px)       | Hero padding              |
| 5xl  | 5rem (85px)       | Section vertical padding  |

### 1.4 Border Styles

| Style           | Value                           | Usage                        |
| --------------- | ------------------------------- | ---------------------------- |
| Section divider | `1px solid rgba(26,22,18,0.1)`  | Hero bottom border           |
| Subtle divider  | `1px solid rgba(26,22,18,0.08)` | Section bottom borders       |
| Feature accent  | `2px solid var(--gold)`         | Left border on feature cards |

### 1.5 Effects

| Effect             | Value                                 | Usage                     |
| ------------------ | ------------------------------------- | ------------------------- |
| Feature background | `rgba(193, 154, 107, 0.05)`           | Subtle gold tint on cards |
| Text smoothing     | `-webkit-font-smoothing: antialiased` | Crisp text rendering      |
| Transition         | `opacity 0.2s`                        | Button hover states       |

---

## 2. Components Found in Template

### 2.1 Hero Component

**Name:** Hero
**CSS Class:** `.hero`

**Purpose:** Full-viewport opening section that introduces the brand and value proposition.

**Visual Description:**

- Minimum height of 70% viewport
- Centered content, both horizontally and vertically
- Contains logo, title, subtitle, and pronunciation guide
- Bottom border separates from content below

**Structure:**

```
.hero
  .hero-logo         (brand label)
  .hero-title        (main heading, h1)
  .hero-subtitle     (value proposition)
  .hero-pronunciation (optional helper text)
```

**CSS Properties:**

- `min-height: 70vh`
- `display: flex; flex-direction: column; justify-content: center; align-items: center`
- `text-align: center`
- `padding: 4rem 2rem`

**Variants:**

1. **Welcome Hero** (current) - Introductory, logo above title
2. **Devotional Hero** (needed) - Scripture reference, series name
3. **Minimal Hero** (needed) - Reduced height for interior pages

**Responsive Behavior:**

- Title scales from 4.5rem to 3rem on mobile

**Usage Locations:**

- Welcome/onboarding page
- Series landing pages
- Daily devotional pages (simplified variant)

---

### 2.2 Hero Logo

**Name:** Hero Logo / Brand Label
**CSS Class:** `.hero-logo`

**Purpose:** Display brand name or context label above main title.

**Visual Description:**

- Small, uppercase text
- Wide letter spacing (0.25em)
- Gold accent color
- Display font (Playfair)

**CSS Properties:**

- `font-family: var(--font-display)`
- `font-size: 1rem`
- `letter-spacing: 0.25em`
- `text-transform: uppercase`
- `color: var(--gold)`
- `margin-bottom: 3rem`

**Variants:**

1. Gold on light background (default)
2. Gold on dark background (for CTA sections)

---

### 2.3 Hero Title

**Name:** Hero Title
**CSS Class:** `.hero-title`

**Purpose:** Primary page heading, largest text on the page.

**Visual Description:**

- Very large display type
- Playfair Display font
- Normal weight (400) for elegance
- Supports italic emphasis via `<em>` tags

**CSS Properties:**

- `font-family: var(--font-display)`
- `font-size: 4.5rem` (3rem on mobile)
- `font-weight: 400`
- `line-height: 1.1`
- `margin-bottom: 1.5rem`

**Emphasis Pattern:**

- `<em>` tags render in italic for highlighting key words

---

### 2.4 Hero Subtitle

**Name:** Hero Subtitle
**CSS Class:** `.hero-subtitle`

**Purpose:** Supporting value proposition or description below the main title.

**Visual Description:**

- Medium-sized body text
- Secondary (muted) color
- Constrained width for readability

**CSS Properties:**

- `font-size: 1.25rem`
- `line-height: 1.6`
- `color: var(--secondary)`
- `max-width: 500px`

---

### 2.5 Hero Pronunciation

**Name:** Pronunciation Guide
**CSS Class:** `.hero-pronunciation`

**Purpose:** Help users understand unfamiliar terms (Greek/Hebrew words).

**Visual Description:**

- Small helper text
- Muted color for context text
- Emphasized pronunciation in display font

**Structure:**

```
.hero-pronunciation
  (text content)
  span (emphasized pronunciation)
```

**CSS Properties:**

- `margin-top: 2rem`
- `font-size: 0.85rem`
- `color: var(--secondary)`
- Span: `font-family: var(--font-display); font-style: italic; font-size: 1rem; color: var(--tehom)`

**Usage Locations:**

- Welcome page (EUONGELION pronunciation)
- Word study sections in devotionals
- Glossary entries

---

### 2.6 Section Component

**Name:** Section
**CSS Class:** `.section`

**Purpose:** Content container for numbered sections with consistent styling.

**Visual Description:**

- Centered content with max-width
- Generous vertical padding
- Subtle bottom border for separation
- Contains header and content areas

**Structure:**

```
.section
  .section-header
    .section-number
    .section-title
  .section-content
    (various content)
```

**CSS Properties:**

- `max-width: 900px`
- `margin: 0 auto`
- `padding: 5rem 2rem`
- `border-bottom: 1px solid rgba(26,22,18,0.08)`

**Responsive Behavior:**

- Content padding removes on mobile
- Header stacks vertically on mobile

---

### 2.7 Section Header

**Name:** Section Header
**CSS Class:** `.section-header`

**Purpose:** Display section number and title in aligned layout.

**Visual Description:**

- Horizontal layout with baseline alignment
- Number and title side-by-side

**Structure:**

```
.section-header
  .section-number
  .section-title
```

**CSS Properties:**

- `display: flex`
- `align-items: baseline`
- `gap: 1.5rem`
- `margin-bottom: 2.5rem`

**Responsive Behavior:**

- Stacks to column on mobile
- Gap reduces to 0.5rem

---

### 2.8 Section Number

**Name:** Section Number
**CSS Class:** `.section-number`

**Purpose:** Visual ordering indicator for sections.

**Visual Description:**

- Large display numeral
- Gold color with reduced opacity
- Playfair Display font

**CSS Properties:**

- `font-family: var(--font-display)`
- `font-size: 3rem`
- `color: var(--gold)`
- `opacity: 0.5`
- `line-height: 1`

**Format:** Two-digit with leading zero (01, 02, 03)

---

### 2.9 Section Title

**Name:** Section Title
**CSS Class:** `.section-title`

**Purpose:** Heading for each section.

**Visual Description:**

- Display font at medium size
- Normal weight for elegance
- Supports italic emphasis

**CSS Properties:**

- `font-family: var(--font-display)`
- `font-size: 2rem`
- `font-weight: 400`

**Emphasis Pattern:**

- `<em>` tags for highlighting key words

---

### 2.10 Section Content

**Name:** Section Content
**CSS Class:** `.section-content`

**Purpose:** Container for section body content with consistent left offset.

**Visual Description:**

- Left padding aligns content with title (past the number)
- Contains paragraphs and sub-components

**CSS Properties:**

- `padding-left: 4.5rem` (0 on mobile)

**Paragraph Styling:**

- `font-size: 1.1rem`
- `line-height: 1.8`
- `margin-bottom: 1.25em`
- `max-width: 600px`

---

### 2.11 Feature Grid

**Name:** Feature Grid
**CSS Class:** `.features`

**Purpose:** Display multiple features in a horizontal grid layout.

**Visual Description:**

- Three-column grid on desktop
- Equal-width columns
- Consistent gap between items

**CSS Properties:**

- `display: grid`
- `grid-template-columns: repeat(3, 1fr)`
- `gap: 2rem`
- `margin-top: 2rem`

**Responsive Behavior:**

- Single column on mobile (< 800px)

---

### 2.12 Feature Card

**Name:** Feature Card
**CSS Class:** `.feature`

**Purpose:** Highlight a single feature or benefit.

**Visual Description:**

- Subtle gold-tinted background
- Gold left border accent
- Contains title and description

**Structure:**

```
.feature
  .feature-title
  .feature-desc
```

**CSS Properties:**

- `padding: 1.5rem`
- `background: rgba(193, 154, 107, 0.05)`
- `border-left: 2px solid var(--gold)`

**Sub-components:**

- `.feature-title`: `font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem`
- `.feature-desc`: `font-size: 0.9rem; line-height: 1.6; color: var(--secondary)`

---

### 2.13 Steps Grid

**Name:** Steps Grid
**CSS Class:** `.steps`

**Purpose:** Display sequential process steps.

**Visual Description:**

- Four-column grid on desktop
- Center-aligned items
- Narrower gap than feature grid

**CSS Properties:**

- `display: grid`
- `grid-template-columns: repeat(4, 1fr)`
- `gap: 1.5rem`
- `margin-top: 2rem`

**Responsive Behavior:**

- Single column on mobile

---

### 2.14 Step Card

**Name:** Step Card
**CSS Class:** `.step`

**Purpose:** Single step in a process flow.

**Visual Description:**

- Centered content
- Large numbered indicator
- Vertical layout

**Structure:**

```
.step
  .step-number
  .step-title
  .step-desc
```

**CSS Properties:**

- `text-align: center`
- `padding: 1.5rem 1rem`

**Sub-components:**

- `.step-number`: `font-family: var(--font-display); font-size: 2.5rem; color: var(--gold); margin-bottom: 1rem`
- `.step-title`: `font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem`
- `.step-desc`: `font-size: 0.85rem; line-height: 1.5; color: var(--secondary)`

---

### 2.15 Expect Grid

**Name:** Expectation Grid
**CSS Class:** `.expect-grid`

**Purpose:** Two-column grid for listing what users can expect.

**Visual Description:**

- Two equal columns
- Generous gap between items
- Items have bullet indicator

**CSS Properties:**

- `display: grid`
- `grid-template-columns: 1fr 1fr`
- `gap: 3rem`
- `margin-top: 2rem`

**Responsive Behavior:**

- Single column on mobile
- Gap reduces to 2rem

---

### 2.16 Expect Item

**Name:** Expectation Item
**CSS Class:** `.expect-item`

**Purpose:** Single item describing a content element users will encounter.

**Visual Description:**

- Title with gold bullet indicator
- Description text below
- Left padding for description alignment

**Structure:**

```
.expect-item
  h4 (title with ::before bullet)
  p (description)
```

**CSS Properties:**

- Title (`h4`):
  - `font-size: 1rem; font-weight: 700`
  - `margin-bottom: 0.75rem`
  - `display: flex; align-items: center; gap: 0.5rem`
  - `::before` - 8px gold circle

- Description (`p`):
  - `font-size: 0.95rem; line-height: 1.7`
  - `color: var(--secondary)`
  - `padding-left: 1rem`

---

### 2.17 CTA Section

**Name:** Call-to-Action Section
**CSS Class:** `.cta`

**Purpose:** High-contrast section prompting user action.

**Visual Description:**

- Dark background (tehom)
- Light text (scroll)
- Centered content
- Contains title, text, and button

**Structure:**

```
.cta
  .cta-title
  .cta-text
  .cta-button
```

**CSS Properties:**

- `background: var(--tehom)`
- `color: var(--scroll)`
- `padding: 5rem 2rem`
- `text-align: center`

---

### 2.18 CTA Title

**Name:** CTA Title
**CSS Class:** `.cta-title`

**Purpose:** Heading for call-to-action section.

**Visual Description:**

- Display font
- Larger than section titles
- Supports italic emphasis

**CSS Properties:**

- `font-family: var(--font-display)`
- `font-size: 2.5rem`
- `font-weight: 400`
- `margin-bottom: 1.5rem`

---

### 2.19 CTA Text

**Name:** CTA Text
**CSS Class:** `.cta-text`

**Purpose:** Supporting copy for the call-to-action.

**Visual Description:**

- Standard body size
- Slightly reduced opacity
- Centered with max-width

**CSS Properties:**

- `font-size: 1.1rem`
- `line-height: 1.7`
- `max-width: 500px`
- `margin: 0 auto 2rem`
- `opacity: 0.85`

---

### 2.20 CTA Button

**Name:** Primary Button
**CSS Class:** `.cta-button`

**Purpose:** Primary action button.

**Visual Description:**

- Gold background
- Dark text
- Uppercase, tracked lettering
- Generous padding

**CSS Properties:**

- `display: inline-block`
- `padding: 1rem 2.5rem`
- `background: var(--gold)`
- `color: var(--tehom)`
- `font-weight: 700`
- `font-size: 0.85rem`
- `letter-spacing: 0.1em`
- `text-transform: uppercase`
- `text-decoration: none`
- `transition: opacity 0.2s`

**States:**

- Hover: `opacity: 0.9`

**Variants Needed:**

1. Primary (gold background) - current
2. Secondary (outline style)
3. Ghost (text only with underline)
4. Disabled state
5. Loading state

---

### 2.21 Footer

**Name:** Footer
**CSS Class:** `.footer`

**Purpose:** Page footer with minimal branding.

**Visual Description:**

- Centered text
- Small font size
- Muted color

**CSS Properties:**

- `padding: 2rem`
- `text-align: center`
- `font-size: 0.8rem`
- `color: var(--secondary)`

**Content Pattern:**

- Brand name + tagline

---

## 3. Component Categories

### 3.1 Layout Components

| Component       | Class              | Grid/Flex   | Max Width          |
| --------------- | ------------------ | ----------- | ------------------ |
| Hero            | `.hero`            | Flex column | None               |
| Section         | `.section`         | Block       | 900px              |
| Section Content | `.section-content` | Block       | 600px (paragraphs) |
| Feature Grid    | `.features`        | Grid 3-col  | Inherited          |
| Steps Grid      | `.steps`           | Grid 4-col  | Inherited          |
| Expect Grid     | `.expect-grid`     | Grid 2-col  | Inherited          |
| CTA             | `.cta`             | Block       | 500px (content)    |
| Footer          | `.footer`          | Block       | None               |

### 3.2 Typography Components

| Component      | Font    | Size    | Weight | Line Height |
| -------------- | ------- | ------- | ------ | ----------- |
| Hero Title     | Display | 4.5rem  | 400    | 1.1         |
| Hero Subtitle  | Body    | 1.25rem | 400    | 1.6         |
| Hero Logo      | Display | 1rem    | 400    | 1           |
| Section Title  | Display | 2rem    | 400    | 1           |
| Section Number | Display | 3rem    | 400    | 1           |
| CTA Title      | Display | 2.5rem  | 400    | 1           |
| Body Text      | Body    | 1.1rem  | 400    | 1.8         |
| Feature Title  | Body    | 0.9rem  | 700    | 1           |
| Feature Desc   | Body    | 0.9rem  | 400    | 1.6         |
| Step Title     | Body    | 0.85rem | 700    | 1           |
| Step Number    | Display | 2.5rem  | 400    | 1           |

### 3.3 Interactive Components

| Component  | Type        | States         |
| ---------- | ----------- | -------------- |
| CTA Button | Link/Button | Default, Hover |

### 3.4 Content Components

| Component    | Purpose           | Contains                     |
| ------------ | ----------------- | ---------------------------- |
| Feature Card | Highlight benefit | Title + description          |
| Step Card    | Process step      | Number + title + description |
| Expect Item  | Content preview   | Bulleted title + description |

### 3.5 Decorative Components

| Element          | Style                         | Usage                 |
| ---------------- | ----------------------------- | --------------------- |
| Section Divider  | 1px solid rgba(26,22,18,0.08) | Between sections      |
| Feature Border   | 2px solid gold, left          | Accent on cards       |
| Bullet Indicator | 8px gold circle               | List items            |
| Italic Emphasis  | `<em>` in display text        | Key word highlighting |

---

## 4. Extended Component Needs

Components required for the full application but NOT present in the wireframe template.

### 4.1 Navigation Components

#### Header / Navigation Bar

- **Purpose:** Persistent navigation across pages
- **Elements needed:**
  - Logo (link to home)
  - Navigation links (current series, explore, profile)
  - Progress indicator (current day)
  - User menu (settings, logout)
- **States:** Scrolled, transparent, mobile menu open
- **Priority:** MVP Critical

#### Footer (Extended)

- **Purpose:** Full navigation footer
- **Elements needed:**
  - Navigation links
  - Social links
  - Legal links (privacy, terms)
  - Newsletter signup
- **Priority:** MVP Critical

#### Breadcrumbs

- **Purpose:** Show navigation path within series
- **Pattern:** Home > Series Name > Day X
- **Priority:** Nice-to-have

#### Tab Navigation

- **Purpose:** Switch between content sections
- **Usage:** Devotional page sections, settings pages
- **Priority:** Phase 2

---

### 4.2 Form Components

#### Soul Audit Form

- **Purpose:** Initial user questionnaire for series matching
- **Elements needed:**
  - Question display (large, centered)
  - Answer options (selectable cards or radio buttons)
  - Progress indicator
  - Navigation (back/next)
  - Submit button
- **Priority:** MVP Critical

#### Text Input

- **Variants:**
  - Single line (email, name)
  - Multi-line (journal entries, reflections)
  - Password field
- **States:** Default, focus, error, disabled, filled
- **Priority:** MVP Critical

#### Select/Dropdown

- **Purpose:** Option selection
- **Usage:** Settings, preferences
- **Priority:** MVP Critical

#### Checkbox/Toggle

- **Purpose:** Boolean options
- **Usage:** Settings, notification preferences
- **Priority:** MVP Critical

#### Radio Button Group

- **Purpose:** Single selection from options
- **Usage:** Soul Audit answers
- **Priority:** MVP Critical

#### Form Field

- **Purpose:** Wrapper for input + label + error message
- **Structure:** Label, Input, Helper text, Error message
- **Priority:** MVP Critical

#### Search Input

- **Purpose:** Search devotionals or series
- **States:** Empty, focused, with results
- **Priority:** Phase 2

---

### 4.3 Card Components

#### Series Card

- **Purpose:** Display series preview in grid
- **Elements:**
  - Series title
  - Duration (X days)
  - Theme/category
  - Progress indicator (if started)
  - Cover image/illustration (optional)
- **States:** Default, hover, active, completed
- **Priority:** MVP Critical

#### Devotional Preview Card

- **Purpose:** Show devotional in series list
- **Elements:**
  - Day number
  - Title
  - Scripture reference
  - Lock icon (if not yet available)
  - Completion indicator
- **States:** Locked, available, in-progress, completed
- **Priority:** MVP Critical

#### Scripture Card

- **Purpose:** Display Scripture passage prominently
- **Elements:**
  - Reference (book, chapter:verses)
  - Passage text
  - Translation indicator
  - Optional: word study links
- **Priority:** MVP Critical

#### Word Study Card

- **Purpose:** Display Hebrew/Greek word analysis
- **Elements:**
  - Original word (Hebrew/Greek characters)
  - Transliteration
  - Pronunciation guide
  - Definition
  - Scripture context
- **Priority:** MVP Critical

#### Breath Prayer Card

- **Purpose:** Display breath prayer for meditation
- **Elements:**
  - Inhale phrase
  - Exhale phrase
  - Visual separator/indicator
  - Optional: audio button
- **Priority:** MVP Critical

#### Reflection Question Card

- **Purpose:** Display single reflection question
- **Elements:**
  - Question text
  - Optional: journal entry area
  - Optional: save button
- **Priority:** MVP Critical

#### Journal Entry Card

- **Purpose:** Display saved journal entry
- **Elements:**
  - Date
  - Associated devotional reference
  - Entry content
  - Edit/delete actions
- **Priority:** Phase 2

---

### 4.4 Progress Components

#### Series Progress Bar

- **Purpose:** Show completion of current series
- **Elements:**
  - Visual bar
  - Day count (Day X of Y)
  - Percentage (optional)
- **Priority:** MVP Critical

#### Daily Streak Indicator

- **Purpose:** Show consecutive days completed
- **Elements:**
  - Streak count
  - Visual indicator (flame, etc.)
- **Priority:** Nice-to-have

#### Devotional Completion Indicator

- **Purpose:** Mark devotional as read
- **States:** Not started, in progress, completed
- **Priority:** MVP Critical

#### Series Timeline

- **Purpose:** Visual overview of series with day markers
- **Elements:**
  - Day markers (numbered)
  - Current position
  - Completed indicators
  - Locked indicators
- **Priority:** Phase 2

---

### 4.5 Modal/Overlay Components

#### Modal Dialog

- **Purpose:** Focused interaction overlaying content
- **Variants:**
  - Confirmation modal
  - Form modal
  - Full-screen modal (mobile)
- **Elements:**
  - Overlay backdrop
  - Modal container
  - Header with title and close
  - Body content
  - Footer with actions
- **Priority:** MVP Critical

#### Toast/Notification

- **Purpose:** Transient feedback messages
- **Variants:**
  - Success
  - Error
  - Warning
  - Info
- **Elements:**
  - Icon
  - Message text
  - Dismiss button (optional)
  - Auto-dismiss timer
- **Priority:** MVP Critical

#### Tooltip

- **Purpose:** Contextual help on hover
- **Usage:** Hebrew/Greek word hover definitions
- **Priority:** Nice-to-have

#### Popover

- **Purpose:** Contextual content on click
- **Usage:** Additional information, mini-menus
- **Priority:** Phase 2

---

### 4.6 State Components

#### Loading Spinner

- **Purpose:** Indicate content loading
- **Variants:**
  - Page loading
  - Inline loading
  - Button loading
- **Priority:** MVP Critical

#### Skeleton Loader

- **Purpose:** Placeholder during content load
- **Variants:**
  - Text skeleton
  - Card skeleton
  - Image skeleton
- **Priority:** Nice-to-have

#### Empty State

- **Purpose:** Display when no content available
- **Variants:**
  - No search results
  - No journal entries
  - No completed devotionals
- **Elements:**
  - Illustration (optional)
  - Message
  - Action button
- **Priority:** MVP Critical

#### Error State

- **Purpose:** Display when something goes wrong
- **Variants:**
  - Page error (404, 500)
  - Component error
  - Form error
- **Elements:**
  - Error icon/illustration
  - Error message
  - Retry button (if applicable)
- **Priority:** MVP Critical

---

### 4.7 Media Components

#### Avatar

- **Purpose:** User profile image
- **Variants:**
  - Small (header)
  - Medium (profile)
  - Large (settings)
- **Fallback:** Initials or default icon
- **Priority:** Nice-to-have

#### Icon

- **Purpose:** Visual indicators throughout UI
- **Categories needed:**
  - Navigation (home, back, menu)
  - Actions (save, share, copy)
  - States (lock, check, warning)
  - Content (book, prayer, journal)
- **Priority:** MVP Critical

#### Illustration

- **Purpose:** Visual enhancement of states/sections
- **Usage:**
  - Empty states
  - Onboarding
  - Completion celebrations
- **Priority:** Phase 2

---

### 4.8 Devotional-Specific Components

#### Reading Time Indicator

- **Purpose:** Show estimated reading time
- **Format:** "5 min read"
- **Priority:** Nice-to-have

#### Audio Player

- **Purpose:** Listen to devotional content
- **Elements:**
  - Play/pause button
  - Progress bar
  - Time display
  - Speed control
- **Priority:** Phase 2

#### Highlight Tool

- **Purpose:** Mark text in Scripture or content
- **States:** No selection, selection active, highlighted
- **Priority:** Phase 3

#### Bookmark

- **Purpose:** Save devotional for later reference
- **States:** Not bookmarked, bookmarked
- **Priority:** Nice-to-have

#### Share Button

- **Purpose:** Share devotional or quote
- **Options:** Copy link, social share
- **Priority:** Nice-to-have

---

## 5. Component Relationships

### 5.1 Parent/Child Patterns

```
Page
  Header
  Main
    Hero
      Hero Logo
      Hero Title
      Hero Subtitle
      Hero Pronunciation
    Section
      Section Header
        Section Number
        Section Title
      Section Content
        Paragraph (multiple)
        Feature Grid
          Feature Card (multiple)
        Steps Grid
          Step Card (multiple)
        Expect Grid
          Expect Item (multiple)
    CTA Section
      CTA Title
      CTA Text
      CTA Button
  Footer
```

### 5.2 Composition Patterns

#### Card Pattern

Cards are composed of:

- Container (background, border, padding)
- Header (title, optional icon)
- Body (description, content)
- Footer (optional actions)

#### Grid Pattern

Grids are composed of:

- Grid container (columns, gap)
- Grid items (equal or variable width)

#### Section Pattern

Sections are composed of:

- Section container (max-width, padding, border)
- Section header (number, title)
- Section content (paragraphs, sub-components)

### 5.3 Slot Patterns

| Component    | Slots                       |
| ------------ | --------------------------- |
| Section      | header, content             |
| Card         | header, body, footer        |
| Modal        | header, body, footer        |
| Form Field   | label, input, helper, error |
| Feature Card | title, description          |
| Step Card    | number, title, description  |

### 5.4 Variant Patterns

**Button Variants:**

- Intent: primary, secondary, ghost
- Size: small, medium, large
- State: default, hover, focus, active, disabled, loading

**Card Variants:**

- Style: elevated, outlined, flat
- State: default, hover, selected, disabled
- Size: compact, default, expanded

**Text Variants:**

- Style: heading, body, caption, label
- Size: xs, sm, md, lg, xl
- Weight: regular, medium, bold

---

## 6. Accessibility Notes

### 6.1 Global Considerations

- **Color Contrast:** Verify all text meets WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- **Focus Indicators:** All interactive elements must have visible focus states
- **Reduced Motion:** Respect `prefers-reduced-motion` for animations
- **Font Sizing:** Support browser zoom up to 200%
- **Touch Targets:** Minimum 44x44px for touch devices

### 6.2 Component-Specific Accessibility

| Component          | Considerations                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Hero**           | h1 for title; pronunciation can use `<abbr>` with `title` attribute                      |
| **Section**        | Sequential heading levels (h2); sections should have `aria-labelledby` pointing to title |
| **Section Number** | Decorative, hide with `aria-hidden="true"`                                               |
| **Feature Grid**   | Use `role="list"` or semantic `<ul>`                                                     |
| **Step Card**      | Step numbers are decorative; ensure title describes the step                             |
| **CTA Button**     | Clear link text; avoid "click here"; include `aria-label` if text is ambiguous           |
| **Footer**         | Use `<footer>` semantic element                                                          |

### 6.3 Interactive Component Accessibility

| Component      | Requirements                                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| **Button**     | `role="button"` if not `<button>`; keyboard operable; focus visible                  |
| **Link**       | Descriptive text; opens new tab? Add `aria-label` with warning                       |
| **Form Input** | Associated `<label>`; `aria-describedby` for helper/error; `aria-invalid` for errors |
| **Modal**      | Focus trap; `role="dialog"`; `aria-modal="true"`; close with Escape                  |
| **Toast**      | `role="alert"` or `aria-live="polite"`                                               |
| **Tabs**       | `role="tablist"`, `role="tab"`, `role="tabpanel"`; arrow key navigation              |
| **Checkbox**   | Native `<input type="checkbox">` or full ARIA pattern                                |

### 6.4 Keyboard Navigation

| Component | Keys                                                         |
| --------- | ------------------------------------------------------------ |
| Button    | Enter, Space to activate                                     |
| Link      | Enter to activate                                            |
| Modal     | Escape to close; Tab to cycle focus                          |
| Tabs      | Arrow Left/Right to switch; Tab to exit                      |
| Form      | Tab between fields; Enter to submit                          |
| Dropdown  | Enter/Space to open; Arrow keys to navigate; Escape to close |

### 6.5 Screen Reader Considerations

- Use semantic HTML elements whenever possible
- Provide text alternatives for all non-text content
- Ensure form errors are announced
- Section numbers should be hidden from screen readers (decorative)
- Progress indicators should announce current state

---

## 7. Component Priority Matrix

### 7.1 MVP Critical (Must Have for Launch)

**Layout:**

- Hero (basic variant)
- Section
- Section Header
- Section Content
- Footer (basic)

**Typography:**

- All heading styles
- Body text styles
- Label/caption styles

**Interactive:**

- Primary Button
- Secondary Button
- Text Link

**Content:**

- Scripture Card
- Word Study Card
- Breath Prayer Card
- Reflection Question Card
- Series Card
- Devotional Preview Card
- Feature Card (for marketing pages)

**Forms:**

- Text Input
- Multi-line Input
- Radio Button Group
- Checkbox
- Form Field wrapper
- Soul Audit question/answer pattern

**Navigation:**

- Header/Nav Bar
- Mobile Menu

**Feedback:**

- Loading Spinner
- Toast/Notification
- Error State
- Modal (confirmation)

**Progress:**

- Devotional Completion Indicator
- Series Progress Bar

### 7.2 Nice-to-Have (Enhances MVP)

**Layout:**

- Step Grid
- Expect Grid

**Content:**

- Step Card
- Expect Item

**Interactive:**

- Ghost Button
- Tooltip

**States:**

- Skeleton Loader
- Empty State (styled)

**Progress:**

- Daily Streak Indicator
- Reading Time Indicator

**Media:**

- Avatar
- Bookmark

**Social:**

- Share Button

### 7.3 Phase 2 (Post-MVP)

**Navigation:**

- Breadcrumbs
- Tab Navigation
- Search Input

**Content:**

- Journal Entry Card
- Series Timeline

**Interactive:**

- Popover
- Dropdown (enhanced)

**Media:**

- Audio Player
- Illustrations

### 7.4 Phase 3 (Future)

**Content:**

- Highlight Tool
- Annotation System

**Social:**

- Community features
- Discussion components

**Advanced:**

- Data visualization (reading stats)
- Comparison views

---

## Appendix A: CSS Class Naming Convention

Based on the wireframe, the naming convention follows a simplified BEM-like pattern:

| Pattern        | Example                         | Usage                      |
| -------------- | ------------------------------- | -------------------------- |
| Block          | `.hero`, `.section`, `.feature` | Main component             |
| Block-element  | `.hero-title`, `.hero-subtitle` | Element within block       |
| Block-modifier | (not used in wireframe)         | Would be `.hero--centered` |

**Recommended Convention for Implementation:**

- Use kebab-case for class names
- Block names are nouns (`.hero`, `.card`, `.button`)
- Element names describe the element (`.hero-title`, `.card-body`)
- Modifier names describe the variant (`.button--primary`, `.card--elevated`)

---

## Appendix B: Responsive Breakpoints

From the wireframe:

| Breakpoint | Max Width | Changes                                                  |
| ---------- | --------- | -------------------------------------------------------- |
| Mobile     | 800px     | Single column grids, stacked headers, reduced hero title |

**Recommended Full System:**

| Name | Value  | Usage                            |
| ---- | ------ | -------------------------------- |
| sm   | 640px  | Mobile phones                    |
| md   | 768px  | Tablets portrait                 |
| lg   | 1024px | Tablets landscape, small laptops |
| xl   | 1280px | Desktops                         |
| 2xl  | 1536px | Large screens                    |

---

## Appendix C: Component Checklist Template

For each component during implementation, verify:

- [ ] Component renders correctly
- [ ] All variants work
- [ ] Responsive at all breakpoints
- [ ] Keyboard accessible
- [ ] Screen reader tested
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Hover/active states work
- [ ] Loading state (if applicable)
- [ ] Error state (if applicable)
- [ ] Empty state (if applicable)
- [ ] Documentation complete
- [ ] Storybook story created
- [ ] Unit tests passing

---

_Document created from analysis of `onboarding-welcome.html` wireframe template._
_This inventory guides component library creation during implementation._
