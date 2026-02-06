# Color System

**Version:** 1.0

---

## PHILOSOPHY

**Ownable. Restrained. Biblical.**

Six colors total:

- Three **BOLD** (foundation, used everywhere)
- Three **INTENTIONAL** (rare, theological accents)

---

## THE BOLD THREE (Foundation)

### Tehom Black (Shadow Black)

The deep, the void, the beginning.

```css
--color-tehom-black: #1a1612;
/* RGB: 26, 22, 18 */
/* CMYK: 0, 15, 31, 90 */
```

**Usage:** Primary text, backgrounds, illustrations, authority
**Character:** Slightly warm (brown undertones), ancient leather feel

---

### Scroll White (Sabbath Cream)

Rest, parchment, breathing room.

```css
--color-scroll-white: #f7f3ed;
/* RGB: 247, 243, 237 */
/* CMYK: 0, 2, 4, 3 */
```

**Usage:** Backgrounds, negative space, readability
**Character:** Warm but not yellow, expensive paper stock

---

### God is Gold (Gilead Gold)

Glory, divine emphasis, signature moments.

```css
--color-god-is-gold: #c19a6b;
/* RGB: 193, 154, 107 */
/* CMYK: 0, 20, 45, 24 */
```

**Usage:** Highlights, Scripture emphasis, Hebrew terms, lamb's eyes
**Character:** Warm amber, illuminated manuscripts

---

## THE INTENTIONAL THREE (Rare Accents)

### Covenant Burgundy

Blood, sacrifice, cross.

```css
--color-covenant-burgundy: #6b2c2c;
/* RGB: 107, 44, 44 */
/* Dark mode lifted: #B85555 */
```

**Usage:** Sacrifice themes, crucifixion, Old Testament weight
**When:** Content is literally about blood/sacrifice/cross

---

### Gethsemane Olive

Garden, wrestling, earth.

```css
--color-gethsemane-olive: #6b6b4f;
/* RGB: 107, 107, 79 */
/* Dark mode lifted: #9D9D7A */
```

**Usage:** Wilderness, creation, struggle, humility
**When:** Content is about wrestling with God, creation, dust

---

### Shalom Blue

Peace, Spirit, water.

```css
--color-shalom-blue: #4a5f6b;
/* RGB: 74, 95, 107 */
/* Dark mode lifted: #7A9AAB */
```

**Usage:** Jesus' words, Holy Spirit, baptism, peace
**When:** Content is about peace, Spirit, water themes

---

## COLOR HIERARCHY: 60-30-10

### Light Mode (Default)

```
60% → Scroll White (background)
30% → Tehom Black (text, structure)
10% → God is Gold (emphasis)
  └── 8% gold + 2% split among burgundy/olive/blue
```

### Dark Mode

```
60% → Tehom Black (background)
30% → Scroll White (text)
10% → God is Gold (emphasis)
  └── Use lifted versions of rare colors
```

---

## SIGNATURE COMBINATION

**Your Hermès orange, your Tiffany blue:**

```css
/* Gilead Gold on Tehom Black */
.signature {
  background: var(--color-tehom-black);
  color: var(--color-god-is-gold);
}
```

Use for:

- Lamb illustrations
- Hebrew text on dark backgrounds
- Crown marks
- "WAKE" cards

---

## WHEN TO USE RARE COLORS BOLDLY

**Default:** 95% of content uses Bold Three only.

**Covenant Burgundy can dominate when:**

- Crucifixion/sacrifice content
- Good Friday series
- Communion reflection
- Passover themes

**Gethsemane Olive can dominate when:**

- Wilderness/40 days content
- Creation narratives
- Jacob wrestling
- Exile/wandering themes

**Shalom Blue can dominate when:**

- Sermon on the Mount
- Baptism content
- Holy Spirit/Pentecost
- "Be still and know" themes

---

## CSS CUSTOM PROPERTIES

```css
:root {
  /* Bold Three */
  --color-tehom-black: #1a1612;
  --color-scroll-white: #f7f3ed;
  --color-god-is-gold: #c19a6b;

  /* Intentional Three */
  --color-covenant-burgundy: #6b2c2c;
  --color-gethsemane-olive: #6b6b4f;
  --color-shalom-blue: #4a5f6b;

  /* Semantic */
  --color-text-primary: var(--color-tehom-black);
  --color-text-secondary: rgba(26, 22, 18, 0.7);
  --color-background: var(--color-scroll-white);
  --color-accent: var(--color-god-is-gold);
  --color-border: rgba(26, 22, 18, 0.1);
}

[data-theme='dark'] {
  --color-text-primary: var(--color-scroll-white);
  --color-text-secondary: rgba(247, 243, 237, 0.7);
  --color-background: var(--color-tehom-black);
  --color-border: rgba(247, 243, 237, 0.1);

  /* Lifted rare colors for dark mode */
  --color-covenant-burgundy: #b85555;
  --color-gethsemane-olive: #9d9d7a;
  --color-shalom-blue: #7a9aab;
}
```

---

## TAILWIND CONFIG

```javascript
// tailwind.config.js
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
    },
  },
}
```

Usage:

```html
<div class="bg-scroll text-tehom">
  <h1 class="text-gold">Glory</h1>
</div>
```

---

## CONTRAST RATIOS (WCAG 2.1 AA)

| Foreground   | Background   | Ratio  | Pass?                        |
| ------------ | ------------ | ------ | ---------------------------- |
| Tehom Black  | Scroll White | 12.4:1 | ✅ AAA                       |
| God is Gold  | Tehom Black  | 5.8:1  | ✅ AA                        |
| God is Gold  | Scroll White | 2.1:1  | ❌ (use for decoration only) |
| Scroll White | Tehom Black  | 12.4:1 | ✅ AAA                       |

**Rule:** Gold on cream is decorative only. For text, use gold on black or black on cream.

---

## THEMATIC DEFAULTS

| Series Theme         | Default Mode |
| -------------------- | ------------ |
| Hope/Resurrection    | Light        |
| Gospel/New Testament | Light        |
| "Wake up" moments    | Light        |
| Ecclesiastes/Lament  | Dark         |
| Wilderness           | Dark         |
| Wrestling/struggle   | Dark         |

User can always toggle, but default sets the tone.
