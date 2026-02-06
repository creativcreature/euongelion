# EUONGELION Icon Requirements

**Version:** 1.0
**Last Updated:** January 17, 2026
**Purpose:** Complete icon inventory for design and development

---

## Icon System Overview

### Design Specifications

| Property          | Value                                       |
| ----------------- | ------------------------------------------- |
| **Grid Size**     | 24x24px (base)                              |
| **Stroke Weight** | 2px (consistent)                            |
| **Corner Radius** | 2px (rounded caps and joins)                |
| **Color**         | Single color (inherits from context)        |
| **Style**         | Outline by default, solid for active states |
| **Reference**     | Phosphor Icons (thin weight)                |

### Color Usage

| Context          | Color Token                 |
| ---------------- | --------------------------- |
| Light background | `--color-tehom` (#1A1612)   |
| Dark background  | `--color-scroll` (#F7F3ED)  |
| Accent/emphasis  | `--color-gold` (#C19A6B)    |
| Disabled         | `--gray-300` (30% opacity)  |
| Error state      | `--color-error` (#8B3D3D)   |
| Success state    | `--color-success` (#3D6B4F) |

### Size Variants

| Size                 | Dimensions | Usage                                     |
| -------------------- | ---------- | ----------------------------------------- |
| **Small (sm)**       | 16x16px    | Inline with text, badges, compact UI      |
| **Default (md)**     | 24x24px    | Standard UI elements, buttons, navigation |
| **Large (lg)**       | 32x32px    | Feature highlights, empty states          |
| **Extra Large (xl)** | 48x48px    | Marketing features, onboarding            |

---

## 1. Navigation Icons

Icons used for app-wide navigation and wayfinding.

| Icon Name         | Context/Usage                  | Style         | Size   | Notes                               |
| ----------------- | ------------------------------ | ------------- | ------ | ----------------------------------- |
| **home**          | Bottom nav, header nav         | Outline/Solid | md     | House shape, simple roof            |
| **explore**       | Bottom nav, discover section   | Outline/Solid | md     | Compass or grid pattern             |
| **user**          | Profile access, account        | Outline/Solid | md     | Person silhouette, head + shoulders |
| **settings**      | Settings access                | Outline       | md     | Gear/cog shape                      |
| **menu**          | Mobile hamburger menu          | Outline       | md     | Three horizontal lines              |
| **menu-close**    | Close mobile menu              | Outline       | md     | X mark                              |
| **back**          | Navigate back                  | Outline       | md     | Left-pointing chevron or arrow      |
| **forward**       | Navigate forward               | Outline       | md     | Right-pointing chevron or arrow     |
| **chevron-up**    | Expand/collapse, scroll to top | Outline       | sm, md | Upward pointing chevron             |
| **chevron-down**  | Expand/collapse, dropdowns     | Outline       | sm, md | Downward pointing chevron           |
| **chevron-left**  | Carousel, navigation           | Outline       | sm, md | Left pointing chevron               |
| **chevron-right** | Carousel, navigation           | Outline       | sm, md | Right pointing chevron              |
| **external-link** | Links opening new tabs         | Outline       | sm     | Arrow pointing out of box           |

---

## 2. Action Icons

Icons representing user actions and interactions.

| Icon Name           | Context/Usage               | Style         | Size   | Notes                         |
| ------------------- | --------------------------- | ------------- | ------ | ----------------------------- |
| **search**          | Search input, search action | Outline       | md     | Magnifying glass              |
| **close**           | Close modals, dismiss       | Outline       | md, sm | X mark                        |
| **check**           | Completion, confirmation    | Outline/Solid | sm, md | Checkmark                     |
| **plus**            | Add items, expand           | Outline       | md     | Plus sign                     |
| **minus**           | Remove items, collapse      | Outline       | md     | Minus sign                    |
| **share**           | Share devotional/quote      | Outline       | md     | Arrow pointing up from box    |
| **copy**            | Copy to clipboard           | Outline       | sm, md | Two overlapping rectangles    |
| **print**           | Print devotional            | Outline       | md     | Printer shape                 |
| **download**        | Download PDF                | Outline       | md     | Arrow pointing down into tray |
| **bookmark**        | Save for later              | Outline/Solid | md     | Bookmark flag shape           |
| **bookmark-filled** | Saved state                 | Solid         | md     | Filled bookmark               |
| **heart**           | Like/favorite (if used)     | Outline/Solid | md     | Heart shape                   |
| **edit**            | Edit journal entry          | Outline       | sm, md | Pencil                        |
| **delete**          | Delete entry                | Outline       | sm, md | Trash can                     |
| **undo**            | Undo action                 | Outline       | md     | Curved arrow left             |
| **redo**            | Redo action                 | Outline       | md     | Curved arrow right            |
| **refresh**         | Reload content              | Outline       | md     | Circular arrows               |
| **more**            | More options menu           | Outline       | md     | Three horizontal dots         |
| **more-vertical**   | More options (vertical)     | Outline       | md     | Three vertical dots           |

---

## 3. Content Icons

Icons representing content types within the devotional experience.

| Icon Name            | Context/Usage         | Style   | Size   | Notes                        |
| -------------------- | --------------------- | ------- | ------ | ---------------------------- |
| **scripture**        | Scripture passages    | Outline | md, lg | Open book                    |
| **scripture-closed** | Scripture reference   | Outline | md     | Closed book                  |
| **prayer**           | Breath prayer section | Outline | md, lg | Praying hands or candle      |
| **journal**          | Journal/reflection    | Outline | md, lg | Notebook with pen            |
| **journal-entry**    | Individual entry      | Outline | md     | Single page                  |
| **audio**            | Audio player          | Outline | md     | Speaker with waves           |
| **audio-muted**      | Muted state           | Outline | md     | Speaker with X               |
| **play**             | Play audio            | Solid   | md     | Triangle pointing right      |
| **pause**            | Pause audio           | Solid   | md     | Two vertical bars            |
| **word-study**       | Hebrew/Greek study    | Outline | md, lg | Aleph (א) or stylized letter |
| **reflection**       | Reflection question   | Outline | md     | Question mark in bubble      |
| **quote**            | Pull quote            | Outline | md     | Quotation marks              |
| **series**           | Series/collection     | Outline | md     | Stacked cards or folder      |
| **calendar**         | Daily schedule        | Outline | md     | Calendar grid                |
| **clock**            | Reading time          | Outline | sm, md | Clock face                   |
| **list**             | List view             | Outline | md     | Bulleted list                |
| **grid**             | Grid view             | Outline | md     | 2x2 grid                     |

---

## 4. State Icons

Icons indicating status, progress, or conditions.

| Icon Name                | Context/Usage               | Style   | Size | Notes                     |
| ------------------------ | --------------------------- | ------- | ---- | ------------------------- |
| **lock**                 | Locked content (future day) | Outline | md   | Padlock closed            |
| **unlock**               | Available content           | Outline | md   | Padlock open              |
| **check-circle**         | Completed devotional        | Solid   | md   | Circle with checkmark     |
| **check-circle-outline** | Available to complete       | Outline | md   | Empty circle              |
| **progress**             | In progress                 | Outline | md   | Circle with partial fill  |
| **circle**               | Not started                 | Outline | sm   | Empty circle              |
| **circle-dot**           | Current/active              | Outline | sm   | Circle with center dot    |
| **alert**                | Warning state               | Outline | md   | Triangle with exclamation |
| **error**                | Error state                 | Outline | md   | Circle with X             |
| **info**                 | Information                 | Outline | md   | Circle with i             |
| **success**              | Success state               | Outline | md   | Circle with check         |
| **loading**              | Loading indicator           | Outline | md   | Spinner (animated)        |
| **offline**              | Offline state               | Outline | md   | Cloud with X              |
| **sync**                 | Syncing                     | Outline | md   | Two curved arrows         |

---

## 5. Form/Input Icons

Icons used within form elements and inputs.

| Icon Name          | Context/Usage   | Style   | Size | Notes             |
| ------------------ | --------------- | ------- | ---- | ----------------- |
| **eye**            | Show password   | Outline | md   | Open eye          |
| **eye-off**        | Hide password   | Outline | md   | Eye with slash    |
| **email**          | Email input     | Outline | md   | Envelope          |
| **user-input**     | Username field  | Outline | md   | Person silhouette |
| **calendar-input** | Date picker     | Outline | md   | Calendar          |
| **dropdown**       | Select dropdown | Outline | sm   | Chevron down      |
| **clear**          | Clear input     | Outline | sm   | X in circle       |
| **valid**          | Field validated | Solid   | sm   | Small checkmark   |
| **invalid**        | Field error     | Solid   | sm   | Small X           |

---

## 6. Media Control Icons

Icons for audio player and media playback.

| Icon Name         | Context/Usage  | Style   | Size   | Notes                    |
| ----------------- | -------------- | ------- | ------ | ------------------------ |
| **play**          | Play button    | Solid   | md, lg | Filled triangle          |
| **pause**         | Pause button   | Solid   | md, lg | Two vertical bars        |
| **stop**          | Stop playback  | Solid   | md     | Filled square            |
| **skip-back**     | Skip backward  | Outline | md     | Triangle + line, left    |
| **skip-forward**  | Skip forward   | Outline | md     | Triangle + line, right   |
| **rewind**        | Rewind 15s     | Outline | md     | Circular arrow with "15" |
| **fast-forward**  | Forward 15s    | Outline | md     | Circular arrow with "15" |
| **volume-high**   | Full volume    | Outline | md     | Speaker with 3 waves     |
| **volume-medium** | Medium volume  | Outline | md     | Speaker with 2 waves     |
| **volume-low**    | Low volume     | Outline | md     | Speaker with 1 wave      |
| **volume-mute**   | Muted          | Outline | md     | Speaker with X           |
| **speed**         | Playback speed | Outline | md     | Gauge or "1x"            |

---

## 7. Decorative/Feature Icons

Larger icons used for visual emphasis, features, and marketing.

| Icon Name        | Context/Usage      | Style   | Size   | Notes                    |
| ---------------- | ------------------ | ------- | ------ | ------------------------ |
| **lamp**         | Word study feature | Outline | lg, xl | Oil lamp (ancient style) |
| **scroll**       | Scripture feature  | Outline | lg, xl | Rolled scroll            |
| **wheat**        | Daily bread theme  | Outline | lg, xl | Wheat stalk              |
| **olive-branch** | Peace/blessing     | Outline | lg, xl | Olive branch with leaves |
| **flame**        | Spirit/passion     | Outline | lg, xl | Candle flame             |
| **water**        | Baptism/cleansing  | Outline | lg, xl | Water drops or wave      |
| **mountain**     | Wilderness/journey | Outline | lg, xl | Mountain silhouette      |
| **star**         | Guidance/hope      | Outline | lg, xl | Simple star shape        |
| **sunrise**      | New day/hope       | Outline | lg, xl | Sun rising over horizon  |
| **path**         | Journey/walk       | Outline | lg, xl | Winding path             |

---

## 8. Empty State Icons

Larger illustrative icons for empty or error states.

| Icon Name           | Context/Usage      | Style   | Size | Notes                   |
| ------------------- | ------------------ | ------- | ---- | ----------------------- |
| **empty-journal**   | No journal entries | Outline | xl   | Blank notebook          |
| **empty-bookmarks** | No saved items     | Outline | xl   | Empty bookmark          |
| **empty-search**    | No search results  | Outline | xl   | Magnifying glass with ? |
| **no-connection**   | Offline state      | Outline | xl   | Broken cloud            |
| **error-page**      | 404/500 errors     | Outline | xl   | Broken page             |
| **welcome**         | Onboarding         | Outline | xl   | Open arms or door       |

---

## 9. Accessibility Icons

Icons specifically for accessibility features and controls.

| Icon Name         | Context/Usage      | Style   | Size | Notes                 |
| ----------------- | ------------------ | ------- | ---- | --------------------- |
| **text-size**     | Font size control  | Outline | md   | "Aa" with arrows      |
| **text-increase** | Increase text      | Outline | md   | A with plus           |
| **text-decrease** | Decrease text      | Outline | md   | A with minus          |
| **contrast**      | High contrast mode | Outline | md   | Half-filled circle    |
| **dark-mode**     | Dark mode toggle   | Outline | md   | Moon                  |
| **light-mode**    | Light mode toggle  | Outline | md   | Sun                   |
| **reading-mode**  | Focus mode         | Outline | md   | Book with focus lines |

---

## 10. Social/Sharing Icons (Minimal Set)

Only if social sharing is implemented.

| Icon Name       | Context/Usage     | Style   | Size | Notes               |
| --------------- | ----------------- | ------- | ---- | ------------------- |
| **link**        | Copy link         | Outline | md   | Chain link          |
| **twitter-x**   | Share to X        | Outline | md   | X logo              |
| **facebook**    | Share to Facebook | Outline | md   | F logo              |
| **email-share** | Share via email   | Outline | md   | Envelope with arrow |
| **message**     | Share via message | Outline | md   | Speech bubble       |

---

## Implementation Notes

### File Format Recommendations

| Format               | Usage                                           |
| -------------------- | ----------------------------------------------- |
| **SVG**              | Primary format - scalable, styleable via CSS    |
| **SVG Sprite**       | Bundle commonly used icons for performance      |
| **React Components** | If using React, consider icon component library |

### Icon Component API (Suggested)

```jsx
<Icon
  name="scripture"
  size="md" // "sm" | "md" | "lg" | "xl"
  color="gold" // "tehom" | "scroll" | "gold" | "inherit"
  filled={false} // boolean - outline vs solid
  className="..." // additional classes
  aria-label="..." // accessibility label
/>
```

### Accessibility Requirements

1. **All icons must have accessible labels** via `aria-label` or accompanying text
2. **Decorative icons** should use `aria-hidden="true"`
3. **Interactive icons** (buttons) need focus states with `--shadow-focus`
4. **Color is not the only indicator** - combine with shape/text
5. **Minimum touch target**: 44x44px for interactive icons

### Icon Library Recommendations

Consider these icon sets for baseline, then customize as needed:

1. **Phosphor Icons** (preferred) - closest to desired aesthetic
   - Weight: Thin (1.5px) or Light (2px)
   - MIT License
   - https://phosphoricons.com

2. **Lucide** - fork of Feather Icons
   - Consistent 24px grid
   - MIT License
   - https://lucide.dev

3. **Heroicons** - by Tailwind team
   - 24px outline and solid
   - MIT License
   - https://heroicons.com

### Custom Icons Required

These icons may need custom design as they are specific to EUONGELION:

| Icon              | Description                     | Notes                              |
| ----------------- | ------------------------------- | ---------------------------------- |
| **word-study**    | Hebrew Aleph or stylized letter | Represents original language study |
| **breath-prayer** | Stylized breath/wind            | For breath prayer feature          |
| **pardes**        | Four layers symbol              | For PaRDeS interpretation levels   |
| **lamb**          | EUONGELION lamb mark            | Simplified version of logo         |
| **tehom**         | Deep water/void                 | For brand-specific use             |

---

## Icon Checklist

For each icon during implementation, verify:

- [ ] SVG optimized (SVGO or similar)
- [ ] Proper viewBox (0 0 24 24 for standard size)
- [ ] No hardcoded colors (use currentColor)
- [ ] Consistent stroke width (2px)
- [ ] Proper stroke-linecap and stroke-linejoin
- [ ] Accessible label provided
- [ ] Works in both light and dark mode
- [ ] Touch target meets minimum size
- [ ] Focus state visible for interactive use

---

## Total Icon Count Summary

| Category           | Count   |
| ------------------ | ------- |
| Navigation         | 13      |
| Actions            | 20      |
| Content            | 16      |
| State              | 14      |
| Form/Input         | 10      |
| Media Controls     | 12      |
| Decorative/Feature | 10      |
| Empty States       | 6       |
| Accessibility      | 7       |
| Social/Sharing     | 5       |
| **Total**          | **113** |

---

**End of Document**
