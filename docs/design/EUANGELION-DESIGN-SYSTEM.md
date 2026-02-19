# Euangelion Design System

Version: 1.0
Status: Publish-ready
Scope: Web + iOS + macOS

## Executive Summary

Euangelion uses an editorial-professional visual language designed to evoke reverence for God while staying practical for daily use. The system balances sacred tone with modern product clarity:

- Personality: Editorial, professional, design-forward
- Primary emotion: Reverence for God
- Audience: Adults 25-55 with broad digital literacy
- Accessibility model: Baseline accessible by default, with additional controls in Settings
- Foundation strategy: Use existing Euangelion tokens as canonical source and normalize for cross-platform usage

This document contains:

1. Full foundations (color, typography, grid, spacing)
2. 30+ component specs with states and accessibility
3. Page and flow patterns
4. Standalone design token JSON for handoff
5. Principles, do/don't guidance, and developer implementation guide

---

## 1. Foundations

### 1.1 Color System

#### 1.1.1 Primary Palette (6 colors)

Reference surfaces:

- Light surface: `#FFFDF8`
- Dark surface: `#0B1420`

| Token      | Hex       | RGB                | HSL                | Contrast on Light | Contrast on Dark | Accessibility Rating                         | Primary Meaning                          |
| ---------- | --------- | ------------------ | ------------------ | ----------------- | ---------------- | -------------------------------------------- | ---------------------------------------- |
| `tehom`    | `#0F1B2E` | `rgb(15,27,46)`    | `hsl(217,51%,12%)` | 16.98:1           | 1.07:1           | AAA on light text; background-only on dark   | Depth, foundation, structural surfaces   |
| `scroll`   | `#FFF8EC` | `rgb(255,248,236)` | `hsl(38,100%,96%)` | 1.04:1            | 17.52:1          | AAA on dark text; background-only on light   | Warm paper, sacred reading surface       |
| `gold`     | `#1F4F82` | `rgb(31,79,130)`   | `hsl(211,61%,32%)` | 8.27:1            | 2.20:1           | AAA on light text; decorative/accent on dark | Action emphasis, faith-forward calls     |
| `burgundy` | `#8E3F3F` | `rgb(142,63,63)`   | `hsl(0,39%,40%)`   | 7.04:1            | 2.58:1           | AAA on light text; accent-only on dark       | Lament, gravity, serious warnings        |
| `olive`    | `#6F8F4F` | `rgb(111,143,79)`  | `hsl(90,29%,44%)`  | 3.61:1            | 5.04:1           | AA large on light; AA text on dark           | Growth, restoration, progress            |
| `shalom`   | `#4D9FB0` | `rgb(77,159,176)`  | `hsl(190,39%,50%)` | 2.99:1            | 6.08:1           | UI/fills on light; AA text on dark           | Guidance, info, peaceful system feedback |

#### 1.1.2 Semantic Colors

| Semantic | Base      | Dark Equivalent | Use                                         | Contrast Guidance                                                         |
| -------- | --------- | --------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Success  | `#5FA067` | `#5FA067`       | Completion, success status, confirmed saves | Use white/dark text pairing by context; not for long body text on light   |
| Warning  | `#B38345` | `#B38345`       | Caution states, pending decisions           | Prefer icon + text pairing for clarity                                    |
| Error    | `#B04B4B` | `#CD6B6B`       | Validation errors, destructive outcomes     | Base passes AA on light text; dark equivalent improves dark mode contrast |
| Info     | `#4D9FB0` | `#75BFD0`       | Neutral guidance and system notices         | Prefer dark text on light cards, light text on dark cards                 |

#### 1.1.3 Dark Mode Equivalents and Ratios

| Semantic Surface Pair  | Ratio   | Rating |
| ---------------------- | ------- | ------ |
| `#E9EEF5` on `#0B1420` | 15.87:1 | AAA    |
| `#C8A56A` on `#0B1420` | 7.97:1  | AAA    |
| `#5FA067` on `#0B1420` | 5.91:1  | AA     |
| `#CD6B6B` on `#0B1420` | 5.21:1  | AA     |
| `#75BFD0` on `#0B1420` | 8.91:1  | AAA    |

#### 1.1.4 Color Usage Rules

1. `tehom` and `scroll` are structural pair colors, not accents.
2. `gold` marks primary action and key wayfinding moments only.
3. Semantic colors never replace hierarchy colors for standard text.
4. On light mode, use darker semantic text tones for body text; keep vivid tones for icons/badges/borders.
5. On dark mode, prefer lifted semantic tones for readability.
6. Avoid using more than two semantic colors in one view.
7. Never encode meaning by color alone; pair with label or icon.

---

### 1.2 Typography

#### 1.2.1 Primary Families

- Editorial family: `Instrument Serif`
- UI family: `Industry`
- Utility fallback family: `Space Grotesk`

#### 1.2.2 Type Roles and Weights

| Role        | Family           | Weight | Primary Use                                 |
| ----------- | ---------------- | ------ | ------------------------------------------- |
| Display     | Instrument Serif | 700    | Hero moments, major devotional headings     |
| Headline    | Instrument Serif | 600    | Section openers                             |
| Title       | Instrument Serif | 500    | Card and module titles                      |
| Body        | Instrument Serif | 400    | Reading content                             |
| Callout     | Industry         | 600    | Action-support text and emphasized guidance |
| Subheadline | Industry         | 500    | Section descriptors                         |
| Footnote    | Industry         | 500    | Supporting metadata                         |
| Caption     | Industry         | 400    | Dense support labels                        |
| Label       | Industry         | 600    | Navigation, chips, controls                 |

#### 1.2.3 Type Scale by Platform

| Role        | Desktop (1440) | Tablet (768) | Mobile (375) | Letter Spacing   |
| ----------- | -------------- | ------------ | ------------ | ---------------- |
| Display     | 64/68          | 52/56        | 40/44        | -0.02em          |
| Headline    | 48/54          | 40/46        | 34/40        | -0.015em         |
| Title       | 34/40          | 30/36        | 26/32        | -0.01em          |
| Body        | 22/34          | 20/32        | 18/30        | 0                |
| Callout     | 20/30          | 18/28        | 17/26        | 0.01em           |
| Subheadline | 18/26          | 17/25        | 16/24        | 0.01em           |
| Footnote    | 16/24          | 15/22        | 15/22        | 0.02em           |
| Caption     | 15/22          | 14/20        | 14/20        | 0.03em           |
| Label       | 14/20          | 14/20        | 14/20        | 0.08em uppercase |

#### 1.2.4 Font Pairing Strategy

1. Serif for meaning, reflection, and theological depth.
2. Sans for controls, state labels, and dense interaction surfaces.
3. Do not mix two serif roles in the same UI row unless one is clearly subordinate.
4. Keep labels in Industry to preserve interaction scanning speed.

#### 1.2.5 Accessibility Minimums

- Minimum body text: 16px equivalent on mobile
- Minimum supporting text: 14px equivalent
- Minimum interactive label text: 14px equivalent
- Maintain 1.4+ line-height for all small text
- For older-reader comfort mode, raise all body/callout/caption by one step

---

### 1.3 Layout Grid

#### 1.3.1 12-Column Responsive Grid

| Platform | Canvas | Columns                         | Margin | Gutter | Container Max |
| -------- | ------ | ------------------------------- | ------ | ------ | ------------- |
| Desktop  | 1440   | 12                              | 80     | 24     | 1280          |
| Tablet   | 768    | 12                              | 32     | 16     | 704           |
| Mobile   | 375    | 12 logical (4 practical groups) | 16     | 12     | 343           |

Notes:

- Mobile uses 12 logical tracks mapped to 4 grouped spans (`3+3+3+3`) for practical layout.
- Editorial reading width should not exceed 680.

#### 1.3.2 Breakpoints

- `xs`: 0-374
- `sm`: 375-767
- `md`: 768-1023
- `lg`: 1024-1439
- `xl`: 1440+

#### 1.3.3 Safe Areas

- iOS: respect top notch and bottom home indicator with safe-area insets.
- macOS: reserve titlebar-safe top padding for traffic-light controls in native shell contexts.
- Web: apply sticky/fixed bars with explicit safe-area tokens.

---

### 1.4 Spacing System

Base unit: 8px. Supported scale:
`4, 8, 12, 16, 24, 32, 48, 64, 96, 128`

| Step | Use Guidance                                      |
| ---- | ------------------------------------------------- |
| 4    | Hairline adjustments, icon-to-label optical fixes |
| 8    | Dense internal spacing in chips/tables            |
| 12   | Compact control paddings                          |
| 16   | Default vertical rhythm inside cards              |
| 24   | Standard section spacing                          |
| 32   | Group-to-group separation                         |
| 48   | Sub-page section breaks                           |
| 64   | Major layout segmentation                         |
| 96   | Hero and transition spacing                       |
| 128  | Full-page anchors and high-ceremony moments       |

---

## 2. Components (30+)

Each component includes anatomy, states, usage, accessibility, and code-ready metrics.

### 2.1 Navigation Components

#### 1) Global Header

- Anatomy: brand mark, date/time rail, theme toggle, account action, utility slot
- States: default, sticky, compact, hidden-on-scroll, disabled-actions
- Usage: top-level shell on all primary app surfaces
- Do not use: nested inside cards or modal content
- Accessibility: `role="banner"`, keyboard tab order left-to-right, visible focus ring
- Metrics: `height 64`, horizontal padding `24 desktop / 16 mobile`, radius `0`, shadow `none`
- Platform notes: iOS uses safe-top inset; macOS uses titlebar offset token

#### 2) Docking Nav Bar

- Anatomy: nav list, active indicator, dock container, overflow menu
- States: undocked, docked, active tab, disabled tab
- Usage: primary route switching beneath header
- Do not use: intra-card navigation
- Accessibility: `nav` landmark, arrow-key optional roving focus, `aria-current="page"`
- Metrics: `height 48`, item padding `8x12`, indicator thickness `2`
- Platform notes: iOS tab-style adaptation when bottom nav is active

#### 3) Tab Bar

- Anatomy: tab items, icon, label, active marker
- States: default, active, pressed, disabled
- Usage: top-level module switching on compact screens
- Do not use: more than 5 primary tabs
- Accessibility: `role="tablist"`, tab semantics, keyboard arrows
- Metrics: `height 56`, hit target `44 min`, label size `14`
- Platform notes: iOS bottom safe-area padding required

#### 4) Sidebar

- Anatomy: section groups, item row, collapse handle, footer utilities
- States: expanded, collapsed, hover-highlight, selected
- Usage: desktop navigation density and admin contexts
- Do not use: mobile full-time navigation
- Accessibility: landmark `nav`, clear collapse toggle name
- Metrics: width `280 expanded / 88 collapsed`, row padding `12x16`
- Platform notes: macOS supports resizable split-view behavior

#### 5) Breadcrumbs

- Anatomy: path items, divider, current-page label
- States: default, hover link, current
- Usage: deep navigation and read contexts
- Do not use: single-depth pages
- Accessibility: `nav` with `aria-label="Breadcrumb"`, current item has `aria-current`
- Metrics: gap `8`, divider spacing `4`, text `14`
- Platform notes: collapse middle items on mobile

#### 6) Bottom Navigation

- Anatomy: 3-5 action slots, icon, label, active underline
- States: default, active, pressed, disabled
- Usage: mobile-first route persistence
- Do not use: desktop primary nav
- Accessibility: focusable items with clear active semantics
- Metrics: height `64` including safe-area, item min width `64`
- Platform notes: iOS home indicator spacing mandatory

### 2.2 Input Components

#### 7) Button Primary

- Anatomy: container, label, optional icon
- States: default, hover, active, disabled, loading
- Usage: single strongest action in a section
- Do not use: tertiary utility actions
- Accessibility: keyboard Enter/Space activation, `aria-busy` when loading
- Metrics: padding `12x20`, radius `8`, shadow `sm`
- Platform notes: iOS touch feedback haptic light

#### 8) Button Secondary

- Anatomy: outlined container, label, optional icon
- States: default, hover, active, disabled
- Usage: alternative action to primary
- Do not use: destructive confirmations
- Accessibility: visible 3:1 border contrast minimum
- Metrics: padding `12x18`, radius `8`, border `1`
- Platform notes: macOS pointer hover emphasis

#### 9) Button Tertiary

- Anatomy: text-only with optional leading icon
- States: default, hover underline, active, disabled
- Usage: lightweight inline actions
- Do not use: irreversible actions
- Accessibility: underlined on focus/hover for discoverability
- Metrics: padding `8x8`, radius `4`, shadow `none`
- Platform notes: iOS uses subtle opacity press state

#### 10) Button Destructive

- Anatomy: filled critical surface + label
- States: default, hover, active, disabled, loading
- Usage: deletion, reset, irreversible transitions
- Do not use: routine navigation
- Accessibility: warning copy nearby, confirmation for high-impact actions
- Metrics: padding `12x20`, radius `8`, border `1`
- Platform notes: iOS action-sheet style for severe consequences

#### 11) Button Icon

- Anatomy: icon-only circular/square control
- States: default, hover, active, disabled
- Usage: compact toolbar controls
- Do not use: unlabeled critical actions
- Accessibility: required `aria-label`
- Metrics: size `40` (min), radius `20`/`8`
- Platform notes: enlarge to `44` minimum on touch devices

#### 12) Button Ghost

- Anatomy: transparent background, subtle border on interaction
- States: default, hover, active, disabled
- Usage: low-visual-priority contextual actions
- Do not use: major conversion steps
- Accessibility: maintain text contrast >= 4.5:1
- Metrics: padding `10x16`, radius `8`
- Platform notes: macOS hover affordance stronger than iOS

#### 13) Text Field

- Anatomy: label, input shell, helper text, validation line
- States: default, focus, filled, error, disabled, readonly
- Usage: short freeform input
- Do not use: long narrative capture
- Accessibility: explicit label association, described-by helper/error
- Metrics: height `48`, padding `12x14`, radius `8`, border `1`
- Platform notes: iOS keyboard type hints; macOS autofill support

#### 14) Textarea

- Anatomy: label, multiline input, helper/error, character count
- States: default, focus, filled, error, disabled
- Usage: reflective writing and journaling
- Do not use: single-token inputs
- Accessibility: supports screen-reader line navigation and count announcements
- Metrics: min-height `128`, padding `12x14`, radius `8`
- Platform notes: iOS dynamic keyboard avoidance for sticky actions

#### 15) Select Dropdown

- Anatomy: label, trigger, selected value, chevron, menu list
- States: closed, open, focus, selected, disabled, error
- Usage: single choice from controlled set
- Do not use: 2-option toggles
- Accessibility: listbox/menu semantics and keyboard arrows
- Metrics: trigger height `48`, menu item height `40`, radius `8`
- Platform notes: iOS may use native picker sheet

#### 16) Multi-select Chips

- Anatomy: chip token, remove icon, selected state surface
- States: unselected, selected, hover, focus, disabled
- Usage: quick filtering and facet selection
- Do not use: long hierarchical taxonomy
- Accessibility: each chip as toggle button with pressed state
- Metrics: chip height `32`, horizontal padding `12`
- Platform notes: scrollable rails on mobile

#### 17) Toggle

- Anatomy: label, switch track, thumb, optional caption
- States: on, off, focus, disabled, loading
- Usage: immediate preference switches
- Do not use: multi-option selection
- Accessibility: `role="switch"`, `aria-checked`
- Metrics: track `44x24`, thumb `20`, spacing `12`
- Platform notes: iOS switch style parity

#### 18) Checkbox

- Anatomy: box, checkmark, label, helper/error
- States: unchecked, checked, indeterminate, disabled
- Usage: multi-select list and consent confirmation
- Do not use: binary immediate side-effect toggles
- Accessibility: native input semantics and large click target
- Metrics: box `20`, spacing `10`
- Platform notes: macOS supports mixed state in tables/forms

#### 19) Radio Group

- Anatomy: group label, radio item, helper/error
- States: unselected, selected, disabled, error
- Usage: mutually exclusive options
- Do not use: multi-select sets
- Accessibility: grouped with fieldset/legend semantics
- Metrics: control `20`, row gap `12`
- Platform notes: iOS grouped list presentation optional

#### 20) Slider

- Anatomy: rail, fill, thumb, value label, tick marks
- States: idle, drag, focus, disabled
- Usage: range control with immediate visual feedback
- Do not use: exact value entry requiring precision decimals
- Accessibility: keyboard arrow increments and value announcement
- Metrics: rail height `4`, thumb `20`
- Platform notes: iOS haptic step feedback for snapped values

#### 21) Search Field

- Anatomy: icon, input, clear action, optional filter trigger
- States: default, focused, typing, results, empty
- Usage: discoverability and quick retrieval
- Do not use: command execution without preview
- Accessibility: clear button labeled and keyboard Escape support
- Metrics: height `48`, icon box `20`
- Platform notes: iOS search integration in nav bars

#### 22) Stepper

- Anatomy: decrement button, value readout, increment button
- States: default, min reached, max reached, disabled
- Usage: bounded numeric adjustments
- Do not use: freeform text quantity entry
- Accessibility: button labels include resulting value change
- Metrics: control height `40`, button width `40`, gap `8`
- Platform notes: macOS supports key repeat for hold actions

### 2.3 Feedback Components

#### 23) Alert Banner

- Anatomy: icon, title, message, dismiss/action
- States: info, success, warning, error
- Usage: page-level status or interruptions
- Do not use: transient notifications under 3 seconds
- Accessibility: `role="status"` or `role="alert"` by severity
- Metrics: padding `12x16`, radius `8`, border `1`
- Platform notes: iOS top inset aware, macOS non-modal banner

#### 24) Inline Alert

- Anatomy: inline icon, short message, optional link action
- States: info, warning, error
- Usage: form and module-level validation/help
- Do not use: global outages
- Accessibility: linked to control via `aria-describedby`
- Metrics: padding `8x12`, radius `6`
- Platform notes: same semantics across platforms

#### 25) Toast

- Anatomy: container, icon, message, optional action
- States: showing, paused on hover/focus, dismissed
- Usage: non-blocking confirmation and lightweight notices
- Do not use: critical failure requiring decision
- Accessibility: polite live region, focus not stolen
- Metrics: min-height `48`, max-width `420`, radius `10`, shadow `md`
- Platform notes: iOS bottom safe area; macOS top-right stack

#### 26) Modal

- Anatomy: overlay, panel, title, body, actions, close control
- States: closed, opening, open, submitting, error
- Usage: high-focus decisions and form completion
- Do not use: browsing content that can live inline
- Accessibility: `role="dialog"`, focus trap, Escape close
- Metrics: width `560` default, padding `24`, radius `12`, shadow `lg`
- Platform notes: macOS supports resizable modal for long content

#### 27) Sheet

- Anatomy: edge panel, drag handle, title, content region, actions
- States: hidden, partial, expanded
- Usage: mobile contextual tasks and filters
- Do not use: destructive confirmations better handled in modal/alert
- Accessibility: same dialog semantics with proper labels
- Metrics: top radius `16`, padding `16`
- Platform notes: iOS spring motion and drag-to-dismiss

#### 28) Progress Bar

- Anatomy: track, fill, label, percentage
- States: idle, in-progress, success, error
- Usage: determinate workflows
- Do not use: unknown duration tasks
- Accessibility: `role="progressbar"` with value attrs
- Metrics: height `8`, radius `4`
- Platform notes: identical across web/iOS/macOS

#### 29) Progress Ring

- Anatomy: circular track, active arc, center label
- States: idle, progressing, complete
- Usage: compact progress in cards and stats
- Do not use: dense tabular layouts with many rows
- Accessibility: textual alternative required
- Metrics: sizes `24/32/48`
- Platform notes: optional CoreAnimation ring on iOS/macOS

#### 30) Skeleton Screen

- Anatomy: placeholder blocks, shimmer layer, shape map
- States: loading, loaded (removed)
- Usage: maintain spatial continuity while loading
- Do not use: durations under 300ms
- Accessibility: hidden from screen reader with status text elsewhere
- Metrics: radius matches final component, shimmer duration `1200ms`
- Platform notes: disable shimmer in reduce-motion mode

#### 31) Empty State Module

- Anatomy: illustration, title, explanation, primary action, secondary link
- States: no data, no results, no permission
- Usage: guide users out of dead ends
- Do not use: error states requiring support intervention
- Accessibility: concise heading and keyboard-first action order
- Metrics: padding `24`, gap `16`
- Platform notes: iOS centered stack, macOS wider explanatory copy

### 2.4 Data Display Components

#### 32) Editorial Card

- Anatomy: verse, title, summary, metadata, action rail
- States: default, hover, focus, disabled
- Usage: devotional and Soul Audit recommendation surfaces
- Do not use: dense admin tabular data
- Accessibility: full-card button semantics with internal action labels
- Metrics: padding `20`, radius `8`, border `1`, shadow `xs`
- Platform notes: iOS supports full-width card stacks

#### 33) Utility Card

- Anatomy: title, key value, helper, optional action
- States: default, highlighted, warning, disabled
- Usage: account, settings, status modules
- Do not use: long-form reading
- Accessibility: heading hierarchy and actionable controls labeled
- Metrics: padding `16`, radius `8`, border `1`
- Platform notes: macOS can host utility cards in two-column grids

#### 34) Table

- Anatomy: header row, body rows, sort controls, pagination
- States: default, sorted, row hover, selected, empty
- Usage: admin and operational data
- Do not use: content-first devotional reading
- Accessibility: semantic table structure, sortable headers announce state
- Metrics: row height `48`, cell padding `12x16`
- Platform notes: iOS fallback to stacked list at small widths

#### 35) List Row

- Anatomy: leading visual, text stack, trailing meta/action
- States: default, pressed, selected, disabled
- Usage: feed items and settings lists
- Do not use: complex multi-column comparisons
- Accessibility: row acts as single interactive target when possible
- Metrics: min-height `56`, padding `12x16`
- Platform notes: iOS grouped inset style optional

#### 36) Stat Tile

- Anatomy: value, label, delta, period tag
- States: neutral, positive, negative
- Usage: KPI snapshots
- Do not use: precise analytics requiring deep charts
- Accessibility: include text equivalents for color-coded deltas
- Metrics: padding `16`, radius `8`, border `1`
- Platform notes: macOS dashboard-friendly compact variants

#### 37) Trend Metric

- Anatomy: sparkline, value, trend label, baseline marker
- States: up, down, flat, unavailable
- Usage: directional insight at a glance
- Do not use: final decisions requiring full-scale chart
- Accessibility: trend described in plain text
- Metrics: sparkline height `40`, padding `12`
- Platform notes: iOS keep line contrast high in bright environments

#### 38) Timeline Rail

- Anatomy: axis, nodes, labels, current marker
- States: past, current, upcoming, locked
- Usage: devotional progression and cycle sequencing
- Do not use: random access dashboards
- Accessibility: sequential reading order and state labels
- Metrics: node size `12`, line width `2`, gap `24`
- Platform notes: horizontal compact rail on mobile

#### 39) Accordion

- Anatomy: trigger row, chevron, content panel
- States: collapsed, expanded, disabled
- Usage: progressive disclosure and FAQ blocks
- Do not use: critical hidden controls
- Accessibility: button semantics with `aria-expanded`
- Metrics: row height `48`, content padding `12x16`
- Platform notes: same pattern across platforms

#### 40) Badge / Chip

- Anatomy: label, optional icon/dot
- States: neutral, info, success, warning, error
- Usage: compact statuses and filters
- Do not use: long textual explanations
- Accessibility: avoid color-only meaning
- Metrics: height `24-28`, horizontal padding `10-12`
- Platform notes: iOS chips need larger touch containers when interactive

#### 41) Tag

- Anatomy: token text, remove icon
- States: default, focus, removed
- Usage: user-generated categorization
- Do not use: mandatory high-impact selection
- Accessibility: remove control has explicit label
- Metrics: height `30`, gap `8`
- Platform notes: macOS supports keyboard remove/backspace behavior

#### 42) Key-Value Block

- Anatomy: key column, value column, optional helper
- States: default, emphasized, error
- Usage: settings summaries and account data display
- Do not use: read-heavy body prose
- Accessibility: semantic description list where possible
- Metrics: row gap `12`, column gap `16`
- Platform notes: stack vertically on narrow mobile widths

### 2.5 Media Components

#### 43) Image Container

- Anatomy: media frame, caption, credit, fallback state
- States: loading, loaded, failed
- Usage: article and card media
- Do not use: decorative-only images without alt strategy
- Accessibility: alt text required, decorative images empty alt
- Metrics: radius `8`, border `1`
- Platform notes: iOS uses progressive image loading for bandwidth

#### 44) Gallery Strip

- Anatomy: viewport, media items, nav controls, index
- States: idle, dragging, selected, disabled controls
- Usage: grouped reference imagery
- Do not use: single-image displays
- Accessibility: keyboard arrow navigation and labels
- Metrics: item gap `12`, control size `40`
- Platform notes: swipe-first interaction on iOS

#### 45) Video Player Shell

- Anatomy: poster, play control, scrubber, time, caption toggle
- States: idle, playing, paused, buffering, ended
- Usage: teaching and walkthrough media
- Do not use: auto-play with sound
- Accessibility: caption support and keyboard transport controls
- Metrics: controls height `44`, overlay gradient `top+bottom`
- Platform notes: iOS native full-screen handoff support

#### 46) Avatar

- Anatomy: circle frame, initials/image, presence ring
- States: default, online, offline, unavailable
- Usage: account identity and social attribution
- Do not use: anonymous theological content where identity is irrelevant
- Accessibility: descriptive alt/name pairing
- Metrics: sizes `24/32/40/56`, radius `50%`
- Platform notes: same across platforms

#### 47) Illustration Container

- Anatomy: framed canvas, thematic background, caption
- States: default, loading, reduced-motion static
- Usage: empty states and theological storytelling anchors
- Do not use: as substitute for core interaction cues
- Accessibility: text equivalent of illustration intent
- Metrics: padding `16`, radius `12`, border `1`
- Platform notes: reduce-motion disables parallax effects

---

## 3. Patterns

### 3.1 Page Templates

#### Landing Page

- Hero with devotional value proposition
- Primary CTA + secondary route to Soul Audit
- Featured editorial cards and trust section

#### Dashboard

- Daily progress and next devotional day
- Quick actions and saved paths
- Secondary insight rail for reminders

#### Settings

- Grouped by Account, Reading, Accessibility, Privacy
- Settings-driven accessibility profile controls
- Explicit save feedback and recovery states

#### Profile

- Identity, streak/progress summary, activity snapshots
- Export/privacy actions
- Connected account controls

#### Completion (Checkout-equivalent)

- Used for subscription/upgrade completion or devotional plan activation
- Confirmation state, next step action, receipt/meta block

### 3.2 User Flows

#### Onboarding

1. Entry -> value statement
2. Optional account setup
3. Soul Audit start
4. Option selection
5. First devotional day activation

#### Authentication

- Soft prompt for optional account creation
- Hard gate only for persistent account-bound actions
- Recovery via magic-link and OAuth providers

#### Search and Filtering

- Search field with instant feedback
- Chips for filters
- Empty/no-results path with clear reset action

#### Empty State Patterns

- No data yet
- No results for current filters
- Data removed or unavailable

### 3.3 Feedback Patterns

- Success: explicit confirmation with next step CTA
- Error: clear action and plain-language recovery
- Loading: skeleton first, spinner as secondary
- Empty: instructional, not apologetic

---

## 4. Tokens

The structure below is a standalone handoff JSON schema and initial token payload.

```json
{
  "$schema": "https://euangelion.app/schemas/design-tokens/v1.json",
  "meta": {
    "name": "Euangelion Design Tokens",
    "version": "1.0.0",
    "platforms": ["web", "ios", "macos"]
  },
  "color": {
    "brand": {
      "tehom": { "value": "#0F1B2E" },
      "scroll": { "value": "#FFF8EC" },
      "gold": { "value": "#1F4F82" },
      "burgundy": { "value": "#8E3F3F" },
      "olive": { "value": "#6F8F4F" },
      "shalom": { "value": "#4D9FB0" }
    },
    "semantic": {
      "success": { "value": "#5FA067" },
      "warning": { "value": "#B38345" },
      "error": { "value": "#B04B4B" },
      "info": { "value": "#4D9FB0" }
    },
    "surface": {
      "light": {
        "bg": "#FFFDF8",
        "fg": "#121D30",
        "text": {
          "primary": "#121D30",
          "secondary": "rgba(18,29,48,0.76)",
          "tertiary": "rgba(18,29,48,0.58)",
          "muted": "rgba(18,29,48,0.44)"
        },
        "border": "rgba(18,29,48,0.14)",
        "borderStrong": "rgba(18,29,48,0.24)",
        "hover": "rgba(18,29,48,0.06)",
        "active": "rgba(18,29,48,0.12)"
      },
      "dark": {
        "bg": "#0B1420",
        "fg": "#E9EEF5",
        "accent": "#C8A56A",
        "text": {
          "primary": "#E9EEF5",
          "secondary": "rgba(233,238,245,0.82)",
          "tertiary": "rgba(233,238,245,0.68)",
          "muted": "rgba(233,238,245,0.52)"
        },
        "border": "rgba(233,238,245,0.20)",
        "borderStrong": "rgba(233,238,245,0.36)",
        "hover": "rgba(233,238,245,0.08)",
        "active": "rgba(233,238,245,0.13)"
      }
    },
    "state": {
      "default": {},
      "hover": {},
      "active": {},
      "disabled": { "opacity": 0.52 },
      "focus": { "ring": "rgba(31,79,130,0.36)" },
      "error": { "ring": "#B04B4B" },
      "loading": { "skeleton": "rgba(127,127,127,0.18)" }
    }
  },
  "typography": {
    "fontFamily": {
      "display": "Instrument Serif",
      "body": "Instrument Serif",
      "ui": "Industry",
      "fallback": "Space Grotesk"
    },
    "roles": {
      "display": {
        "desktop": {
          "size": 64,
          "lineHeight": 68,
          "letterSpacing": -0.02,
          "weight": 700
        },
        "tablet": {
          "size": 52,
          "lineHeight": 56,
          "letterSpacing": -0.02,
          "weight": 700
        },
        "mobile": {
          "size": 40,
          "lineHeight": 44,
          "letterSpacing": -0.02,
          "weight": 700
        }
      },
      "headline": {
        "desktop": {
          "size": 48,
          "lineHeight": 54,
          "letterSpacing": -0.015,
          "weight": 600
        },
        "tablet": {
          "size": 40,
          "lineHeight": 46,
          "letterSpacing": -0.015,
          "weight": 600
        },
        "mobile": {
          "size": 34,
          "lineHeight": 40,
          "letterSpacing": -0.015,
          "weight": 600
        }
      },
      "title": {
        "desktop": {
          "size": 34,
          "lineHeight": 40,
          "letterSpacing": -0.01,
          "weight": 500
        },
        "tablet": {
          "size": 30,
          "lineHeight": 36,
          "letterSpacing": -0.01,
          "weight": 500
        },
        "mobile": {
          "size": 26,
          "lineHeight": 32,
          "letterSpacing": -0.01,
          "weight": 500
        }
      },
      "body": {
        "desktop": {
          "size": 22,
          "lineHeight": 34,
          "letterSpacing": 0,
          "weight": 400
        },
        "tablet": {
          "size": 20,
          "lineHeight": 32,
          "letterSpacing": 0,
          "weight": 400
        },
        "mobile": {
          "size": 18,
          "lineHeight": 30,
          "letterSpacing": 0,
          "weight": 400
        }
      },
      "callout": {
        "desktop": {
          "size": 20,
          "lineHeight": 30,
          "letterSpacing": 0.01,
          "weight": 600
        },
        "tablet": {
          "size": 18,
          "lineHeight": 28,
          "letterSpacing": 0.01,
          "weight": 600
        },
        "mobile": {
          "size": 17,
          "lineHeight": 26,
          "letterSpacing": 0.01,
          "weight": 600
        }
      },
      "subheadline": {
        "desktop": {
          "size": 18,
          "lineHeight": 26,
          "letterSpacing": 0.01,
          "weight": 500
        },
        "tablet": {
          "size": 17,
          "lineHeight": 25,
          "letterSpacing": 0.01,
          "weight": 500
        },
        "mobile": {
          "size": 16,
          "lineHeight": 24,
          "letterSpacing": 0.01,
          "weight": 500
        }
      },
      "footnote": {
        "desktop": {
          "size": 16,
          "lineHeight": 24,
          "letterSpacing": 0.02,
          "weight": 500
        },
        "tablet": {
          "size": 15,
          "lineHeight": 22,
          "letterSpacing": 0.02,
          "weight": 500
        },
        "mobile": {
          "size": 15,
          "lineHeight": 22,
          "letterSpacing": 0.02,
          "weight": 500
        }
      },
      "caption": {
        "desktop": {
          "size": 15,
          "lineHeight": 22,
          "letterSpacing": 0.03,
          "weight": 400
        },
        "tablet": {
          "size": 14,
          "lineHeight": 20,
          "letterSpacing": 0.03,
          "weight": 400
        },
        "mobile": {
          "size": 14,
          "lineHeight": 20,
          "letterSpacing": 0.03,
          "weight": 400
        }
      },
      "label": {
        "desktop": {
          "size": 14,
          "lineHeight": 20,
          "letterSpacing": 0.08,
          "weight": 600
        },
        "tablet": {
          "size": 14,
          "lineHeight": 20,
          "letterSpacing": 0.08,
          "weight": 600
        },
        "mobile": {
          "size": 14,
          "lineHeight": 20,
          "letterSpacing": 0.08,
          "weight": 600
        }
      }
    },
    "minimums": {
      "mobileBody": 16,
      "mobileSupport": 14,
      "interactiveLabel": 14
    }
  },
  "spacing": {
    "base": 8,
    "scale": {
      "4": 4,
      "8": 8,
      "12": 12,
      "16": 16,
      "24": 24,
      "32": 32,
      "48": 48,
      "64": 64,
      "96": 96,
      "128": 128
    }
  },
  "radius": {
    "sm": 2,
    "md": 4,
    "lg": 8,
    "xl": 12,
    "pill": 999
  },
  "elevation": {
    "xs": "0 1px 2px rgba(15,27,46,0.16)",
    "sm": "0 2px 4px rgba(15,27,46,0.14)",
    "md": "0 4px 8px rgba(15,27,46,0.18)",
    "lg": "0 8px 16px rgba(15,27,46,0.24)",
    "xl": "0 16px 32px rgba(15,27,46,0.30)"
  },
  "motion": {
    "duration": {
      "fast": 150,
      "base": 200,
      "moderate": 300,
      "slow": 400,
      "slower": 600
    },
    "easing": {
      "out": "cubic-bezier(0,0,0.2,1)",
      "in": "cubic-bezier(0.4,0,1,1)",
      "inOut": "cubic-bezier(0.4,0,0.2,1)",
      "bounce": "cubic-bezier(0.16,1,0.3,1)"
    },
    "reducedMotion": {
      "enabled": true,
      "nonEssentialAnimations": "off"
    }
  },
  "zIndex": {
    "base": 0,
    "raised": 1,
    "dropdown": 10,
    "sticky": 100,
    "fixed": 200,
    "overlay": 300,
    "modal": 400,
    "popover": 500,
    "tooltip": 600,
    "toast": 700,
    "max": 9999
  },
  "layout": {
    "grid": {
      "web": {
        "desktop": {
          "width": 1440,
          "columns": 12,
          "margin": 80,
          "gutter": 24,
          "container": 1280
        },
        "tablet": {
          "width": 768,
          "columns": 12,
          "margin": 32,
          "gutter": 16,
          "container": 704
        },
        "mobile": {
          "width": 375,
          "columns": 12,
          "margin": 16,
          "gutter": 12,
          "container": 343
        }
      },
      "ios": {
        "compact": { "columns": 4, "margin": 16, "gutter": 12 },
        "regular": { "columns": 12, "margin": 24, "gutter": 16 }
      },
      "macos": {
        "windowed": { "columns": 12, "margin": 32, "gutter": 16 }
      }
    },
    "safeArea": {
      "ios": {
        "topInset": "env(safe-area-inset-top)",
        "bottomInset": "env(safe-area-inset-bottom)"
      },
      "macos": { "titlebarInset": 28 },
      "web": { "topInset": 0, "bottomInset": 0 }
    }
  },
  "component": {
    "button": {
      "primary": { "height": 48, "paddingX": 20, "radius": 8 },
      "secondary": { "height": 48, "paddingX": 18, "radius": 8 },
      "tertiary": { "height": 40, "paddingX": 8, "radius": 4 },
      "destructive": { "height": 48, "paddingX": 20, "radius": 8 },
      "icon": { "size": 40, "radius": 20 },
      "ghost": { "height": 44, "paddingX": 16, "radius": 8 }
    },
    "field": {
      "text": { "height": 48, "paddingX": 14, "radius": 8 },
      "textarea": { "minHeight": 128, "padding": 12, "radius": 8 },
      "search": { "height": 48, "radius": 8 }
    },
    "feedback": {
      "toast": { "minHeight": 48, "radius": 10 },
      "modal": { "width": 560, "radius": 12, "padding": 24 },
      "sheet": { "radiusTop": 16, "padding": 16 }
    },
    "card": {
      "editorial": { "padding": 20, "radius": 8 },
      "utility": { "padding": 16, "radius": 8 }
    }
  }
}
```

---

## 5. Public Interfaces / Contracts

```ts
export interface DesignTokenSet {
  color: Record<string, unknown>
  type: Record<string, unknown>
  space: Record<string, number>
  radius: Record<string, number>
  shadow: Record<string, string>
  motion: Record<string, unknown>
  layout: Record<string, unknown>
  component: Record<string, unknown>
}

export interface AccessibilityPreferences {
  textScale: 'default' | 'large' | 'xlarge'
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean
}

export interface ComponentSpec {
  id: string
  name: string
  anatomy: string[]
  states: Array<
    'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'error'
  >
  usage: {
    whenToUse: string[]
    whenNotToUse: string[]
  }
  a11y: {
    aria: string[]
    keyboard: string[]
    focus: string[]
  }
  metrics: {
    padding: string
    margin: string
    radius: string
    shadow: string
  }
  platformNotes: {
    web: string[]
    ios: string[]
    macos: string[]
  }
}
```

---

## 6. Documentation Standards

### 6.1 Design Principles

#### Principle 1: Sacred Clarity

- Keep theological depth and practical clarity in balance.
- Example: serif devotional text with sans action labels.

#### Principle 2: Reverent Hierarchy

- The most spiritually meaningful content should read first, controls second.
- Example: verse/title hierarchy in editorial cards before utility metadata.

#### Principle 3: Quiet Confidence

- Motion and accent should guide, not perform.
- Example: subtle hover lift and focus rings instead of loud animations.

### 6.2 Do and Don't (10 examples)

1. Do: Use one primary CTA per section.  
   Don't: Place two visually equal primary CTAs side by side.
2. Do: Use serif for content meaning and reflection.  
   Don't: Render all UI labels in serif.
3. Do: Keep support text >= 14px equivalent.  
   Don't: Use micro text below readable thresholds.
4. Do: Pair semantic color with icon/label.  
   Don't: Communicate status by color alone.
5. Do: Preserve 44px minimum touch targets.  
   Don't: Shrink icon buttons below finger-safe dimensions.
6. Do: Use skeletons for >300ms loading.  
   Don't: flash spinner for instant transitions.
7. Do: Use sticky nav only for persistent context.  
   Don't: stack multiple sticky bars without hierarchy.
8. Do: Keep modal flows task-focused.  
   Don't: force long reading content into modal panels.
9. Do: Respect reduced-motion preference.  
   Don't: animate decorative elements when reduced motion is on.
10. Do: Keep reset/destructive actions visually separated from positive flow.  
    Don't: place destructive actions adjacent to primary CTA without spacing and confirmation context.

### 6.3 Developer Implementation Guide

#### Token Consumption Rules

1. Use semantic tokens in components, not raw hex values.
2. Use platform-specific token branches only for platform behavior differences.
3. Reference state tokens for hover/active/focus/disabled; never hand-tune per component.

#### Naming Conventions

- Foundation: `color.brand.gold`, `typography.roles.body.mobile`
- Component: `component.button.primary.height`
- Platform: `layout.grid.web.desktop`

#### Accessibility Enforcement Checklist

- Text contrast meets WCAG targets per role
- Focus-visible treatment always present
- Keyboard path complete for all interactive controls
- ARIA roles/labels complete for non-native patterns
- Minimum touch targets preserved

#### Platform Adaptation Guidance

- Web: prioritize responsive 12-column composition and browser keyboard parity.
- iOS: respect safe-area insets, native motion expectations, and touch-first patterns.
- macOS: support pointer precision, denser sidebars, and keyboard-heavy workflows.

---

## 7. Validation and QA Scenarios

1. Foundation validation

- Verify contrast matrix for palette and semantic pairs on light/dark surfaces.
- Verify typography minimums on 375px viewport.

2. Component completeness

- Every component has anatomy, states, usage rules, accessibility, and metrics.

3. Cross-platform parity

- Each component lists web/iOS/macOS adaptation notes.
- Safe-area behavior documented for iOS and macOS titlebar contexts.

4. Token integrity

- JSON structure validates for all required top-level groups.
- Interactive state token coverage exists for all key components.

5. Documentation quality

- Sections are complete and publication-ready.
- Executive summary, full spec, and token handoff are all in this single artifact.
