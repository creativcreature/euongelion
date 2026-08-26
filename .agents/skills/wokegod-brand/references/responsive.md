# wokeGod Responsive Design System

**Version:** 1.0

## BREAKPOINTS

```css
/* Mobile First Approach */
:root {
  --breakpoint-sm: 640px; /* Large phone */
  --breakpoint-md: 768px; /* Tablet */
  --breakpoint-lg: 1024px; /* Desktop */
  --breakpoint-xl: 1440px; /* Large desktop */
}
```

---

## SCALING STRATEGY

### Typography Scaling

| Element        | Mobile (320px) | Tablet (768px) | Desktop (1440px+) |
| -------------- | -------------- | -------------- | ----------------- |
| Day Number     | 60-80px        | 100-120px      | 120-160px         |
| Hero Title     | 36-42px        | 56-64px        | 64-80px           |
| Section Header | 24-28px        | 36-40px        | 40-48px           |
| Body Text      | 18-20px        | 20-21px        | 20-22px           |
| Caption        | 14-16px        | 16px           | 16px              |

### Spacing Scaling

| Element           | Mobile      | Tablet | Desktop  |
| ----------------- | ----------- | ------ | -------- |
| Section Padding   | 40px        | 60px   | 80-120px |
| Side Margins      | 24px        | 60px   | 120px    |
| Content Max Width | 100% - 48px | 640px  | 680px    |

---

## RESPONSIVE IMAGES

### Srcset Strategy

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg   400w,
    image-800.jpg   800w,
    image-1200.jpg 1200w,
    image-1920.jpg 1920w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 80vw,
    680px"
  alt="Description"
  loading="lazy"
/>
```

### Art Direction (Picture Element)

```html
<picture>
  <source media="(min-width: 1024px)" srcset="desktop.jpg" />
  <source media="(min-width: 640px)" srcset="tablet.jpg" />
  <img src="mobile.jpg" alt="Description" />
</picture>
```

---

## LAYOUT ADAPTATIONS

### Two-Column → Single Column

**Desktop:**

```
┌──────────┬──────────┐
│  Left    │  Right   │
│  Column  │  Column  │
└──────────┴──────────┘
```

**Mobile:**

```
┌────────────────────┐
│  Content Block 1   │
├────────────────────┤
│  Content Block 2   │
└────────────────────┘
```

### Navigation Collapse

**Desktop:** Horizontal menu bar  
**Mobile:** Hamburger menu drawer

---

## PERFORMANCE

### Mobile Optimization

- Images: < 200KB per image
- Total page: < 1MB initial load
- Time to Interactive: < 3s on 3G
- Core Web Vitals:
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1

---

## TESTING DEVICES

- iPhone SE (375x667)
- iPhone 14 Pro (393x852)
- iPad Air (820x1180)
- Desktop (1440x900)
- Desktop (1920x1080)

---

**End of Responsive v1.0**
