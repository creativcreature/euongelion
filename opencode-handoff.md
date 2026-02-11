# EUANGELION

## The Typography & Color Revolution

---

> _"Design is not just what it looks like and feels like. Design is how it works. We've been making it work wrong."_

---

## The Problem

Right now, when someone opens Euangelion, they feel something is off. They can't put their finger on it. The typography fights itself. The colors feel flat. The sacred atmosphere the content deserves simply isn't there.

We've been decorating a cathedral with office furniture.

---

## The Vision

What if opening Euangelion felt like unwrーリング a precious manuscript? What if every letter breathed with the weight of centuries, every headline whispered with intention, every color glowed like light through stained glass?

This isn't an update. This is a **renaissance**.

---

## Why Typography Matters

Typography isn't just "what font to use."

Typography is **the voice of your words**. It's how someone feels before they read a single sentence. It's the difference between a tract and a treasure.

For 1,500 years, the Church understood this. Every missal, every breviary, every illuminated manuscript was crafted so that the **form** would prepare the soul for the **content**.

We're bringing that wisdom to the digital age.

---

## The Revolution

### 1. ONE FONT. THAT'S IT.

Every great design project in history eventually finds its voice. We've found ours.

```
Instrument Serif.
```

Not a "mix." Not a "contrast." Not a "deliberate pairing."

**Just one font. Used brilliantly.**

Every headline. Every body paragraph. Every label. Every navigation item. Every piece of text on the site will speak with one voice—the voice of a 15th-century printer who knew that sacred words deserve sacred form.

_And we're going to make one font do more than most designers get from five._

---

### 2. THE INTRIGUE SYSTEM

Here’s what most designers don't understand: **contrast isn't about font families.**

You want emphasis? Use italics. You want structure? Use size. You want hierarchy? Use space.

We've invented what we call **The Intrigue System**—a way of using a single font to create tension, rhythm, and visual interest that draws the eye exactly where you want it.

```
DAILY <em>bread</em> FOR THE <em>cluttered, hungry</em> SOUL
```

The upright letters form the structure. The italic words create **intrigue**. The reader's eye pauses there. Those words become memorable.

_That's not decoration. That's architecture._

---

### 3. GOLD THAT GLOWS

We've been using gold as a flat color.

That's like using a sunset as a paint sample.

Gold in Euangelion will:

- **Glow** from text, not just sit there
- **Bleed** into backgrounds with subtle illumination
- **Pulse** gently, like candlelight in a sanctuary
- **Layer** with stained glass accents that feel like light through cathedral windows

We're not adding colors. We're adding **atmosphere**.

---

### 4. STAINED GLASS THEOLOGY

Every color in our palette will carry meaning:

| Color             | Meaning                      | Usage                 |
| ----------------- | ---------------------------- | --------------------- |
| **Deep Blue**     | Heaven, truth, the divine    | Scripture, revelation |
| **Wine Red**      | Blood, sacrifice, communion  | Passion, atonement    |
| **Royal Purple**  | Kingdom, royalty, priesthood | Authority, calling    |
| **Emerald Green** | Life, growth, the Spirit     | Formation, fruit      |

When a user sees blue, they feel they're encountering truth.
When they see wine, they feel the weight of sacrifice.
When they see purple, they feel the dignity of their calling.

_This isn't decoration. This is preaching with pixels._

---

### 5. PAPER THAT BREATHES

The background won't be flat. It won't be solid.

It will be **parchment**. Subtle. Texture that suggests centuries of faithful readers. Grain that catches the light like vellum.

Every scroll deserves a worthy surface.

---

## What We're Building

### Components That Disappear

Every UI element will feel like it's part of the content, not decoration around it:

- **Navigation** that feels like marginalia in an ancient manuscript
- **Headers** that scream without shouting
- **Drop caps** that glow like gold leaf
- **Dividers** that feel like ornamental borders in a Book of Hours

### A Reading Experience

Not a "website." A **reading experience**.

When someone opens Euangelion, they shouldn't think "nice design."
They should think "this feels like scripture."

And then they should forget about the design entirely.

---

## The Technical Reality

Here's what we're actually doing:

### Font Stack

```css
:root {
  --font-family: 'Instrument Serif', Georgia, serif;
  --font-microscopic: system-ui; /* Only for timestamps, page numbers < 10px */
}
```

**One font variable. Everything else is styling, not family.**

### Color System

```css
--color-gold-light: #d4af7f; /* Glow */
--color-gold-bright: #e8c992; /* Shine */
--color-gold-deep: #8b6914; /* Shadow */
--color-glass-blue: #3d5a80; /* Truth */
--color-glass-wine: #8b3a3a; /* Sacrifice */
--color-glass-purple: #5c4d6b; /* Kingdom */
--color-glass-emerald: #4a6b4a; /* Life */
```

### Typography Utilities

```css
.font-serif {
  font-family: var(--font-family);
}
.font-serif-italic {
  font-family: var(--font-family);
  font-style: italic;
}
.font-small-caps {
  font-family: var(--font-family);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.intrigue {
  font-style: italic;
} /* The magic */
```

### New Components

```tsx
// Headline with intrigue
<Headline>
  THE <Em>WORD</Em> BEFORE <Em>WORDS</Em>
</Headline>
```

---

## The Implementation

We're doing this in phases because excellence takes time:

### Phase 1: Foundation

- Reset font stack to single variable
- Add complete color palette
- Add illumination CSS effects

### Phase 2: Typography System

- Consolidate all utility classes
- Create Headline and Em components
- Remove MixedHeadline (the old way)

### Phase 3: Component Migration

- Update every module
- Update navigation
- Update all pages

### Phase 4: Polish

- Add paper texture
- Refine every transition
- Test on every device

### Phase 5: Perfection

- Build
- Validate
- Ship

---

## The Promise

When we're done:

Someone will open Euangelion on a Tuesday morning.
The masthead will glow softly.
The date line will anchor their day.
The first headline will arrest their attention.
The first paragraph will feel like a prayer.

And they won't think about design.
They'll think about God.

---

## The Call

This isn't a CSS refactor.

This is a **statement** that sacred content deserves sacred form.
This is a **commitment** to excellence in every pixel.
This is a **refusal** to let digital ugliness cheapen eternal truth.

---

> _"Details matter. It's worth waiting to get it right."_
> — Steve Jobs

---

## Let's Build This.

`opencode-handoff.md` is ready.
The vision is clear.
The path is defined.

Now we make it real.

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**The Work Begins:** Now

---

_Euangelion_  
_Daily bread for the cluttered, hungry soul._
