# wokeGod Component Library

**Version:** 1.0  
**Last Updated:** January 16, 2026

## PURPOSE

Reusable UI components that maintain brand consistency across all touchpoints.

---

## NAVIGATION COMPONENTS

### 1. Primary Navigation

**Purpose:** Main site navigation (sticky header)

**Elements:**

- EUANGELION wordmark (Kinfolk serif, 24px)
- Menu items (Monument Grotesk, 16px)
- Current section indicator (2px gold underline)

**Behavior:**

- Sticky on scroll
- Smart hide/show (hide on scroll down, show on scroll up)
- Transparent background until scroll (then Scroll White 95% opacity)

### 2. Day Selector

**Purpose:** Jump between devotional days

**Elements:**

- Numbered list (01-06)
- Current day highlighted (God is Gold)
- Compact, fixed position (bottom-right mobile, right desktop)

**Behavior:**

- Smooth scroll to selected day
- Keyboard accessible (arrow keys)

---

## CONTENT COMPONENTS

### 3. Hebrew Word Card

**Purpose:** Interactive Hebrew/Greek study

**States:**

- Collapsed: Hebrew text + transliteration
- Expanded: + Definition, root meaning, cross-references

**Interaction:**

- Click to expand/collapse
- 400ms transition
- Focus state visible

### 4. Pull Quote Block

**Purpose:** Highlight key statements

**Variations:**

- Text only (large, centered)
- With background image (text overlay)
- With attribution (Scripture reference)

**Styling:**

- 40-56px font size
- 120px vertical padding
- Optional vignette on images

### 5. Reflection Question Card

**Purpose:** Prompts for meditation

**Elements:**

- Question number (60px thin, gold)
- Question text (24-28px)
- Optional: Text input for journaling

**Behavior:**

- Fade in on scroll
- Stagger animation (100ms delay between cards)

### 6. Image Gallery

**Purpose:** Multiple images in series

**Layouts:**

- Single: Full-width hero
- Two: Side-by-side 50/50
- Three: Masonry grid
- Four: 2x2 grid

**Behavior:**

- Lazy load (loading="lazy")
- Click to lightbox view
- Swipe navigation (mobile)

---

## INTERACTION COMPONENTS

### 7. Expandable Section

**Purpose:** "Go Deeper" collapsible content

**States:**

- Collapsed: Button with ↓ arrow
- Expanded: Content visible, ↑ arrow

**Animation:**

- Max-height transition 400ms
- Content fades in 200ms (delayed 100ms)
- Border appears on expansion

### 8. Modal Overlay

**Purpose:** Prayer, journaling, full-screen content

**Elements:**

- Darkened backdrop (rgba(0,0,0,0.8))
- Content card (max 800px, centered)
- Close button (top-right, 44px target)

**Behavior:**

- Scroll lock on body
- ESC key closes
- Click outside closes
- Focus trap (tab stays within modal)

### 9. Toast Notification

**Purpose:** Feedback messages (saved, copied, etc.)

**Variations:**

- Success (green accent)
- Info (blue accent)
- Warning (amber accent)
- Error (red accent)

**Behavior:**

- Slide in from bottom
- Auto-dismiss after 3s
- Swipe down to dismiss (mobile)

---

## FORM COMPONENTS

### 10. Text Input

**Purpose:** Soul Audit, journaling, responses

**States:**

- Default: Light border (rgba 0.2)
- Focus: Gold border (2px)
- Error: Red border + message
- Disabled: Gray background

**Styling:**

- 48px height (accessible)
- 18px font size
- 16px padding

### 11. Textarea

**Purpose:** Long-form responses

**Features:**

- Auto-resize (grows with content)
- Character count (optional)
- Save draft (localStorage)

### 12. Button

**Purpose:** Primary actions

**Variations:**

- Primary: God is Gold background, white text
- Secondary: Transparent, gold border, gold text
- Text: No background, underline on hover

**States:**

- Default, Hover, Active, Focus, Disabled
- 48px height (touch-friendly)
- 600ms transition on all states

---

## MEDIA COMPONENTS

### 13. Video Player

**Purpose:** Embedded teaching videos

**Features:**

- Custom controls (brand-styled)
- Captions support
- Lazy load (poster image first)
- Keyboard controls (space, arrows)

### 14. Audio Player

**Purpose:** Narrated devotionals, prayers

**Features:**

- Minimal player bar
- Play/pause, skip 15s, speed control
- Timestamp display
- Sticky (follows scroll)

### 15. Image Lightbox

**Purpose:** Full-screen image viewing

**Features:**

- Click image to expand
- Dark background
- Close button + ESC key
- Swipe to navigate (if gallery)
- Zoom in/out (pinch, double-click)

---

## FEEDBACK COMPONENTS

### 16. Loading Spinner

**Purpose:** Async content loading

**Style:**

- Minimal circle animation
- God is Gold color
- 40px diameter
- Centered in container

### 17. Skeleton Loader

**Purpose:** Content placeholder while loading

**Elements:**

- Gray blocks matching content structure
- Pulsing animation (1.5s loop)
- Maintains layout (no shift when content loads)

### 18. Progress Indicator

**Purpose:** Multi-step forms, series progress

**Types:**

- Bar: Horizontal fill (2px height)
- Stepper: Numbered circles with connecting lines
- Percentage: Simple "3/6 complete" text

---

## ACCESSIBILITY REQUIREMENTS

All components must:

- [ ] Meet WCAG 2.1 AA contrast ratios
- [ ] Support keyboard navigation
- [ ] Include ARIA labels
- [ ] Have focus indicators (2px gold outline)
- [ ] Work with screen readers
- [ ] Support reduced motion preference
- [ ] Have 44px minimum touch targets

---

## COMPONENT API

### Hebrew Word Card Example

**Props:**

```javascript
{
  hebrew: "אָלֶף",
  transliteration: "ALEPH",
  definition: "Strength, Ox, First, Leader",
  root: "Strong's H505",
  expanded: false,
  onToggle: function
}
```

**Usage:**

```jsx
<HebrewWordCard
  hebrew="אָלֶף"
  transliteration="ALEPH"
  definition="Strength, Ox, First, Leader"
/>
```

---

## CSS CUSTOM PROPERTIES

Components use shared design tokens:

```css
:root {
  /* Colors */
  --color-tehom-black: #1a1612;
  --color-scroll-white: #f7f3ed;
  --color-god-is-gold: #c19a6b;

  /* Typography */
  --font-display: 'Monument Grotesk', sans-serif;
  --font-body: 'Monument Grotesk', sans-serif;
  --font-hebrew: 'SBL Hebrew', serif;

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 40px;
  --space-xl: 60px;
  --space-2xl: 80px;
  --space-3xl: 120px;

  /* Transitions */
  --transition-fast: 200ms;
  --transition-base: 400ms;
  --transition-slow: 600ms;
  --easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## TESTING CHECKLIST

Before deploying components:

- [ ] Tested on Chrome, Safari, Firefox, Edge
- [ ] Tested on iOS, Android
- [ ] Keyboard navigation works
- [ ] Screen reader announces properly
- [ ] Reduced motion respected
- [ ] Touch targets 44px minimum
- [ ] No layout shift (CLS < 0.1)
- [ ] Fast interaction (< 100ms response)
- [ ] Works offline (if applicable)
- [ ] Responsive 320px - 1920px

---

**End of Components v1.0**
