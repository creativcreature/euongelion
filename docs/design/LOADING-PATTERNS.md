# EUONGELION Loading Patterns

**Version:** 1.0
**Last Updated:** January 17, 2026
**Purpose:** Specifications for all loading states across the application

---

## Philosophy

Loading should feel contemplative, not anxious.

In most modern applications, loading states communicate urgency: "We're working as fast as we can!" Spinning circles, bouncing dots, and progress bars all create a sense that the user should be waiting impatiently.

EUONGELION rejects this paradigm.

Our loading states should communicate patience: "Take a breath. Something is coming." The tempo matches the contemplative nature of the content. Users should feel held by the interface, not rushed by it.

---

## The Breath Cycle (Core Loading Pattern)

### Concept

The primary loading indicator is a **breath pulse** - a gentle oscillation that mirrors the rhythm of calm breathing. This pattern is derived from the breath prayer timing (4 seconds inhale, 4-6 seconds exhale) but simplified for loading contexts.

### Specifications

| Property           | Value                                       |
| ------------------ | ------------------------------------------- |
| **Cycle Duration** | 2-3 seconds (full inhale + exhale)          |
| **Opacity Range**  | 60% to 100%                                 |
| **Scale Range**    | 98% to 100% (optional)                      |
| **Easing**         | ease-in-out                                 |
| **Element**        | Gold circle, logo mark, or skeleton shimmer |

### CSS Implementation

```css
@keyframes breath {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.loading-breath {
  animation: breath 2.5s ease-in-out infinite;
}
```

### When to Use

- Initial page loads (before any content renders)
- Content that takes more than 300ms to load
- Image loading (as a pulsing placeholder)
- Async data fetching

### When NOT to Use

- Button loading states (too slow for micro-interactions)
- Instant transitions (use opacity fade instead)

---

## 1. Initial Page Load

### First Paint Target

**Goal:** Show meaningful content within 1.5 seconds on average connections.

### Load Sequence

```
0ms     - HTML document loads
100ms   - Critical CSS applied (background, basic layout)
200ms   - Skeleton layout renders
500ms   - Fonts begin loading
800ms   - Above-fold content hydrates
1500ms  - Full interactivity
```

### Visual Progression

**Phase 1: Immediate (0-200ms)**

```
+--------------------------------------------------+
|                                                  |
|                  [EUONGELION]                    |
|                   Logo Mark                      |
|               (pulsing gently)                   |
|                                                  |
+--------------------------------------------------+
```

**Phase 2: Skeleton (200-800ms)**

```
+--------------------------------------------------+
| [logo] ==================== [====] [====] [icon] |
+--------------------------------------------------+
|                                                  |
|        +----------------------------------+      |
|        |                                  |      |
|        |    ============================  |      |
|        |    ========= (TITLE) =========   |      |
|        |    ============================  |      |
|        |                                  |      |
|        |    --- subtitle skeleton ---     |      |
|        |                                  |      |
|        +----------------------------------+      |
|                                                  |
|   +----------+  +----------+  +----------+      |
|   | ======== |  | ======== |  | ======== |      |
|   | ==== === |  | ==== === |  | ==== === |      |
|   | ======== |  | ======== |  | ======== |      |
|   +----------+  +----------+  +----------+      |
|                                                  |
+--------------------------------------------------+
```

**Phase 3: Content Reveals (800ms+)**

- Skeleton fades out
- Real content fades in from 0 to 100% opacity
- Content may rise slightly (20px translateY)
- Stagger of 50-80ms between elements

### CSS for Initial Load

```css
/* Critical - inline in <head> */
body {
  background: var(--color-scroll);
  opacity: 1;
}

/* Initial loader */
.initial-loader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-scroll);
  z-index: var(--z-max);
}

.initial-loader__mark {
  width: 48px;
  height: 48px;
  animation: breath 2.5s ease-in-out infinite;
}

/* Transition out when content ready */
.initial-loader--hidden {
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease-out;
}
```

---

## 2. Skeleton Patterns

### General Skeleton Specifications

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Background Base**  | `var(--gray-100)`                                 |
| **Shimmer Gradient** | 90deg, gray-100 to gray-050 to gray-100           |
| **Animation**        | shimmer 1.5s infinite                             |
| **Border Radius**    | Same as final content (var(--radius-sm) for text) |
| **Height**           | Match expected content line-height                |

### Skeleton Shimmer Animation

```css
@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-100) 25%,
    var(--gray-050) 50%,
    var(--gray-100) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

---

### 2.1 Devotional Page Skeleton

```
+--------------------------------------------------+
| [<-]                                    [share]  |
+--------------------------------------------------+
|                                                  |
|    ===== (Day Number) =====                      |
|                                                  |
|    =========================================     |
|    =========================================     |
|    ========= (Hero Title) =========             |
|                                                  |
|    --- series name skeleton ---                  |
|                                                  |
+--------------------------------------------------+
|                                                  |
|  SCRIPTURE                                       |
|  +--------------------------------------------+  |
|  |  ========================================  |  |
|  |  ========================================  |  |
|  |  ========================================  |  |
|  |  =======================================   |  |
|  |                                            |  |
|  |  --- reference ---                         |  |
|  +--------------------------------------------+  |
|                                                  |
|  REFLECTION                                      |
|  ============================================    |
|  ============================================    |
|  ============================================    |
|  ============================================    |
|  ============================================    |
|  =================================               |
|                                                  |
|  WORD STUDY                                      |
|  +--------------------------------------------+  |
|  |     ====== (Hebrew word) ======            |  |
|  |     --- transliteration ---                |  |
|  |     ================================       |  |
|  |     ================================       |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

**Component Details:**

```css
.skeleton-devo-day {
  width: 120px;
  height: 80px;
  margin: 0 auto var(--space-6);
}

.skeleton-devo-title {
  width: 80%;
  height: 48px;
  margin: 0 auto var(--space-4);
}

.skeleton-devo-series {
  width: 200px;
  height: 20px;
  margin: 0 auto;
}

.skeleton-scripture-card {
  padding: var(--space-6);
  background: var(--gray-050);
  border-left: 2px solid var(--gray-100);
}

.skeleton-scripture-line {
  height: 24px;
  margin-bottom: var(--space-3);
  width: 100%;
}

.skeleton-scripture-line:last-child {
  width: 60%;
}

.skeleton-paragraph-line {
  height: 20px;
  margin-bottom: var(--space-2);
  width: 100%;
}

.skeleton-paragraph-line:nth-child(even) {
  width: 95%;
}

.skeleton-paragraph-line:last-child {
  width: 70%;
}
```

---

### 2.2 Series List Skeleton

```
+--------------------------------------------------+
|                                                  |
|    ========= (Page Title) =========              |
|    --- subtitle skeleton ---                     |
|                                                  |
+--------------------------------------------------+
|                                                  |
|  +----------------------+  +----------------------+
|  |  +--------------+    |  |  +--------------+    |
|  |  |              |    |  |  |              |    |
|  |  | (image area) |    |  |  | (image area) |    |
|  |  |              |    |  |  |              |    |
|  |  +--------------+    |  |  +--------------+    |
|  |                      |  |                      |
|  |  ================    |  |  ================    |
|  |  ================    |  |  ================    |
|  |                      |  |                      |
|  |  --- X days ---      |  |  --- X days ---      |
|  |                      |  |                      |
|  +----------------------+  +----------------------+
|                                                  |
|  +----------------------+  +----------------------+
|  |  +--------------+    |  |  +--------------+    |
|  |  |              |    |  |  |              |    |
|  |  | (image area) |    |  |  | (image area) |    |
|  |  |              |    |  |  |              |    |
|  |  +--------------+    |  |  +--------------+    |
|  |                      |  |                      |
|  |  ================    |  |  ================    |
|  |  ================    |  |  ================    |
|  |                      |  |                      |
|  |  --- X days ---      |  |  --- X days ---      |
|  |                      |  |                      |
|  +----------------------+  +----------------------+
|                                                  |
+--------------------------------------------------+
```

**Component Details:**

```css
.skeleton-series-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}

@media (max-width: 768px) {
  .skeleton-series-grid {
    grid-template-columns: 1fr;
  }
}

.skeleton-series-card {
  padding: var(--space-4);
  border: var(--border-subtle);
  border-radius: var(--radius-lg);
}

.skeleton-series-image {
  aspect-ratio: 16/9;
  width: 100%;
  margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
}

.skeleton-series-title {
  height: 24px;
  width: 80%;
  margin-bottom: var(--space-2);
}

.skeleton-series-meta {
  height: 16px;
  width: 100px;
}
```

---

### 2.3 Settings Page Skeleton

```
+--------------------------------------------------+
| [<-] Settings                                    |
+--------------------------------------------------+
|                                                  |
|  ACCOUNT                                         |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [>]            |  |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [>]            |  |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [>]            |  |
|  +--------------------------------------------+  |
|                                                  |
|  PREFERENCES                                     |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [toggle]       |  |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [toggle]       |  |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [dropdown]     |  |
|  +--------------------------------------------+  |
|                                                  |
|  READING                                         |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [slider]       |  |
|  +--------------------------------------------+  |
|  |  [===]  ==================  [toggle]       |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

**Component Details:**

```css
.skeleton-settings-section {
  margin-bottom: var(--space-8);
}

.skeleton-settings-title {
  height: 14px;
  width: 100px;
  margin-bottom: var(--space-4);
  text-transform: uppercase;
}

.skeleton-settings-row {
  display: flex;
  align-items: center;
  padding: var(--space-4) 0;
  border-bottom: var(--border-subtle);
}

.skeleton-settings-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  margin-right: var(--space-4);
}

.skeleton-settings-label {
  flex: 1;
  height: 20px;
}

.skeleton-settings-control {
  width: 48px;
  height: 24px;
  border-radius: var(--radius-full);
}
```

---

### 2.4 Journal Entry List Skeleton

```
+--------------------------------------------------+
|                                                  |
|    Your Journal                                  |
|    --- subtitle ---                              |
|                                                  |
+--------------------------------------------------+
|                                                  |
|  +--------------------------------------------+  |
|  |  ===== (date) =====                        |  |
|  |  ========================================  |  |
|  |  ========================================  |  |
|  |  ==========================                |  |
|  |                                            |  |
|  |  --- series / day reference ---            |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  |  ===== (date) =====                        |  |
|  |  ========================================  |  |
|  |  ========================================  |  |
|  |  ==========================                |  |
|  |                                            |  |
|  |  --- series / day reference ---            |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  |  ===== (date) =====                        |  |
|  |  ========================================  |  |
|  |  ========================================  |  |
|  |  ==========================                |  |
|  |                                            |  |
|  |  --- series / day reference ---            |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

---

## 3. Button Loading States

Buttons require faster, more immediate feedback than page-level loading.

### Primary Button Loading

| State        | Visual                                                            |
| ------------ | ----------------------------------------------------------------- |
| **Default**  | Full opacity, normal cursor                                       |
| **Loading**  | Reduced opacity (80%), spinner replaces text or appears beside it |
| **Disabled** | 40% opacity, no cursor change                                     |

### Loading Indicator Options

**Option A: Spinner replaces text**

```
+---------------------------+
|      [====spinner====]    |
+---------------------------+
```

**Option B: Spinner beside text**

```
+---------------------------+
|    [o]  Saving...         |
+---------------------------+
```

**Option C: Dots animation (contemplative)**

```
+---------------------------+
|      Saving . . .         |   (dots animate sequentially)
+---------------------------+
```

### Recommended: The Quiet Pulse

Rather than a spinning indicator, use a subtle opacity pulse on the button itself:

```css
.button--loading {
  pointer-events: none;
  cursor: wait;
}

.button--loading .button__text {
  animation: pulse-subtle 1s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* For buttons that replace text with loading message */
.button--loading .button__text--default {
  display: none;
}

.button--loading .button__text--loading {
  display: inline;
}
```

### Button Loading Text

| Action   | Default Text | Loading Text    |
| -------- | ------------ | --------------- |
| Save     | "Save"       | "Saving..."     |
| Submit   | "Submit"     | "Submitting..." |
| Continue | "Continue"   | "Continuing..." |
| Begin    | "Begin"      | "Starting..."   |
| Sign In  | "Sign In"    | "Signing in..." |

---

## 4. Form Submission States

### Inline Form (e.g., Journal Entry)

**State Flow:**

```
1. Idle         -> User types
2. Saving       -> Auto-save or submit triggered
3. Saved        -> Brief confirmation
4. Idle         -> Returns to normal
```

**Visual Representation:**

```
IDLE:
+--------------------------------------------------+
| Write your reflection...                         |
|                                                  |
|                                                  |
|                                                  |
|                                          [Save]  |
+--------------------------------------------------+

SAVING:
+--------------------------------------------------+
| Your reflection text here...                     |
|                                                  |
|                                                  |
|                                                  |
|                                    [Saving...]   |
+--------------------------------------------------+
                                         ^ pulsing

SAVED:
+--------------------------------------------------+
| Your reflection text here...                     |
|                                                  |
|                                                  |
|                                                  |
|                                    [v] Saved     |
+--------------------------------------------------+
                                         ^ fades after 2s

IDLE (returns):
+--------------------------------------------------+
| Your reflection text here...                     |
|                                                  |
|                                                  |
|                                                  |
|                                          [Save]  |
+--------------------------------------------------+
```

### Full-Page Form (e.g., Soul Audit, Settings)

**Submission Overlay:**

When submitting significant forms, a subtle overlay prevents interaction:

```css
.form--submitting::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(247, 243, 237, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 200ms ease-out;
}

.form--submitting .form__loader {
  /* Centered loader element */
  animation: breath 2.5s ease-in-out infinite;
}
```

---

## 5. Image Loading

### The Blur-Up Pattern

Images load in stages to prevent layout shift and provide visual feedback.

**Stage 1: Placeholder (Immediate)**

- Low-resolution thumbnail (10-20px wide, heavily compressed)
- Scaled up with CSS blur filter
- Matches aspect ratio of final image

**Stage 2: Blur Transition (On Load)**

- Full-resolution image loads behind
- Blur filter animates from 20px to 0
- Opacity transitions from 0 to 1

**Stage 3: Final (Complete)**

- Full-resolution visible
- Placeholder removed from DOM

### CSS Implementation

```css
.image-container {
  position: relative;
  overflow: hidden;
  background: var(--gray-050);
}

.image-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.1); /* Hide blur edges */
  transition: opacity 400ms ease-out;
}

.image-full {
  position: relative;
  width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity 400ms ease-out;
}

.image-full--loaded {
  opacity: 1;
}

.image-container--loaded .image-placeholder {
  opacity: 0;
}
```

### Aspect Ratio Placeholder

Prevent layout shift with aspect-ratio containers:

```css
.image-container {
  aspect-ratio: 16 / 9; /* or 4/3, 1/1, etc. */
  background: var(--gray-050);
}

/* Fallback for older browsers */
.image-container::before {
  content: '';
  display: block;
  padding-top: 56.25%; /* 16:9 ratio */
}
```

### Color Placeholder Alternative

For images with dominant colors known ahead of time:

```css
.image-container {
  background: var(--placeholder-color, var(--gray-050));
}

/* Set via inline style or CSS variable */
<div class="image-container" style="--placeholder-color: #8B7355;">
```

---

## 6. Contemplative Loading (Extended Wait States)

For loading states that last more than 3 seconds, provide additional context.

### Timing Thresholds

| Duration | User Experience                   |
| -------- | --------------------------------- |
| 0-300ms  | No loading indicator needed       |
| 300ms-2s | Standard skeleton/breath loader   |
| 2-5s     | Add reassuring message            |
| 5s+      | Add progress indication or action |

### Extended Load Messages

Messages appear after 3-5 seconds of loading:

```
+--------------------------------------------------+
|                                                  |
|                                                  |
|                   [===]                          |
|                (breathing)                       |
|                                                  |
|              Taking a moment...                  |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

**Message Rotation (if very long):**

```javascript
const loadingMessages = [
  'Taking a moment...',
  'Preparing your devotional...',
  'Almost there...',
  'Worth the wait...',
]
```

**CSS for message appearance:**

```css
.loading-message {
  opacity: 0;
  transform: translateY(10px);
  transition: all 400ms ease-out;
}

.loading-message--visible {
  opacity: 1;
  transform: translateY(0);
}

.loading-message__text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
}
```

### Error Recovery

If loading fails after timeout:

```
+--------------------------------------------------+
|                                                  |
|                                                  |
|                   [!]                            |
|                                                  |
|        Something didn't load correctly.          |
|                                                  |
|              [ Try Again ]                       |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

---

## 7. Reduced Motion Considerations

All loading patterns must respect `prefers-reduced-motion`.

### Adaptations

| Pattern          | Standard                  | Reduced Motion           |
| ---------------- | ------------------------- | ------------------------ |
| Breath pulse     | Scale + opacity animation | Opacity only, slower     |
| Skeleton shimmer | Horizontal shimmer        | Static gray or slow fade |
| Blur-up images   | Animated blur removal     | Instant reveal           |
| Page transitions | Slide + fade              | Fade only or instant     |
| Button loading   | Pulsing text              | Static "Loading..." text |

### CSS Implementation

```css
@media (prefers-reduced-motion: reduce) {
  .loading-breath {
    animation: pulse-static 3s ease-in-out infinite;
  }

  @keyframes pulse-static {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  .skeleton {
    animation: none;
    background: var(--gray-100);
  }

  .image-placeholder {
    filter: none;
    transition: opacity 100ms;
  }

  .image-full {
    transition: opacity 100ms;
  }
}
```

---

## 8. Loading Pattern Reference Table

| Context            | Pattern           | Duration   | Indicator Type            |
| ------------------ | ----------------- | ---------- | ------------------------- |
| Initial page load  | Skeleton + breath | 500-1500ms | Logo pulse, then skeleton |
| Devotional content | Skeleton          | 300-800ms  | Text/card skeletons       |
| Series list        | Skeleton grid     | 300-800ms  | Card skeletons            |
| Settings page      | Skeleton rows     | 200-500ms  | Row skeletons             |
| Button action      | Inline            | 200-2000ms | Text change + pulse       |
| Form submission    | Overlay           | 500-3000ms | Subtle overlay + loader   |
| Image loading      | Blur-up           | Variable   | Blur placeholder          |
| Extended wait      | Contemplative     | 3000ms+    | Message + breath          |
| Audio loading      | Inline            | 200-1000ms | Play button pulse         |
| Search results     | Skeleton          | 300-800ms  | Result skeletons          |

---

## 9. Implementation Checklist

For each loading state:

- [ ] Loading indicator appears within 300ms
- [ ] Layout does not shift when content loads
- [ ] Skeleton matches approximate final layout
- [ ] Transition to loaded state is smooth (400-600ms fade)
- [ ] Reduced motion alternative exists
- [ ] Loading state is accessible (aria-busy, aria-live)
- [ ] Error state exists for timeout/failure
- [ ] Mobile performance tested
- [ ] Dark mode appearance verified

---

## 10. Accessibility Requirements

### ARIA Attributes

```html
<!-- Loading container -->
<div role="status" aria-busy="true" aria-label="Loading devotional content">
  <!-- Skeleton content -->
</div>

<!-- When loaded -->
<div role="status" aria-busy="false">
  <!-- Real content -->
</div>
```

### Screen Reader Announcements

```javascript
// Announce loading start
announceToScreenReader('Loading devotional...')

// Announce loading complete
announceToScreenReader('Devotional loaded.')

// Announce loading error
announceToScreenReader('Failed to load. Please try again.')
```

### Focus Management

- After loading completes, focus should not jump unexpectedly
- If user initiated action (button click), focus should move to result
- Skeleton content should not be focusable

---

**End of Document**

_"Loading should feel like waiting for something good, not waiting in line."_
