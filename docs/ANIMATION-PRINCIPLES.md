# EUONGELION Animation Principles

**Version:** 1.0
**Last Updated:** January 17, 2026
**Purpose:** Design Sprint Discussion Document

---

## 1. Philosophy: Why Animation Matters

### The Contemplative Case for Motion

Animation in a devotional context is not decoration. It is breath.

When a user opens EUONGELION, they are stepping out of the noise of their day and into a space designed for reflection. Animation should mark that threshold. It should signal: _slow down, you're somewhere different now._

The goal is not to impress or entertain. It is to create a sense of intentionality, to make the digital experience feel crafted and considered rather than cheap and reactive. When the Sistine Chapel ceiling was painted, every brushstroke served the sacred. Our animations serve the same purpose in a digital medium.

### The Balance: Engagement vs. Distraction

Animation exists on a spectrum:

| Too Little                     | Just Right                       | Too Much                         |
| ------------------------------ | -------------------------------- | -------------------------------- |
| Static, lifeless, feels broken | Alive, responsive, supportive    | Distracting, anxious, exhausting |
| User wonders "did it work?"    | User feels held by the interface | User feels performed at          |

Our target is the middle: animation that _serves_ the content rather than competing with it. Every motion should answer the question: **Does this help someone focus on what matters, or does it pull their attention away?**

### Contemplative Pacing vs. Modern Snappiness

Most modern interfaces optimize for speed. Everything is instant, snappy, responsive. This creates a sense of efficiency but also a sense of anxiety. The interface is _fast_ because you should be fast too.

EUONGELION rejects this framing.

Our pacing is intentionally **slower than industry standard** but not sluggish. We aim for a tempo that feels like a deep breath rather than a quick inhale. The user should feel like they have permission to take their time.

**Principle:** When in doubt, slow down. A transition that feels slightly meditative is better than one that feels slightly rushed.

---

## 2. Timing and Easing

### Duration Ranges

| Action Type                                   | Duration                              | Rationale                                                     |
| --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Micro-interactions** (button states, hover) | 150-250ms                             | Quick enough to feel responsive, not instant                  |
| **Element transitions** (cards, panels)       | 300-500ms                             | Time to register change without feeling slow                  |
| **Page transitions**                          | 500-800ms                             | Allows the eye to follow, creates sense of crossing threshold |
| **Content reveals** (scroll-triggered)        | 400-600ms                             | Gentle emergence, not sudden appearance                       |
| **Modal/overlay entrances**                   | 400-600ms                             | Deliberate, not jarring                                       |
| **Loading states**                            | Continuous loops at 2-4 second cycles | Slow enough to not feel frantic                               |

### Easing Curves

**Primary Easing: Ease-Out Cubic**
The default for most animations. Elements begin with momentum and come to rest gracefully, like a stone settling at the bottom of a still pond.

**Entrance Animations: Ease-Out Quart**
Slightly more dramatic deceleration for elements entering the viewport. Creates a sense of arrival.

**Exit Animations: Ease-In Cubic**
Elements accelerate as they leave, creating a sense of departure rather than abrupt disappearance.

**What We Avoid:**

- **Bounce effects:** Playful and childish. Inappropriate for contemplative content.
- **Elastic easing:** Suggests rubber bands and toys. Not the aesthetic.
- **Linear timing:** Mechanical and lifeless. Everything should breathe.
- **Overshoot:** Draws unnecessary attention to the animation itself.

**The Feel We Want:**
Think of incense smoke rising in a cathedral. There is motion, but it is unhurried. It flows rather than snaps.

### Stagger Patterns

When multiple elements animate together (lists, grids, cards), stagger creates visual rhythm.

**Recommended Stagger:**

- 50-80ms between elements for small lists (3-5 items)
- 30-50ms for larger grids (keeps total animation time reasonable)
- Maximum total stagger duration: 400ms (beyond this, later elements feel delayed)

**Direction:**

- Vertical lists: Top to bottom (natural reading order)
- Horizontal grids: Left to right (western reading order)
- Scripture cards: Consider center-out for emphasis

---

## 3. Page Transitions

### Between Devotional Days

Moving from Day 1 to Day 2 should feel like turning a page in a physical book rather than jumping to a new website.

**Recommended Approach: The Gentle Cross-Fade with Subtle Lift**

- Current day content fades down in opacity while shifting slightly upward (suggesting it is receding into the past)
- New day content fades in from slightly below (suggesting it is rising into the present)
- Duration: 600-800ms
- Subtle enough to not feel dramatic, present enough to mark the transition

**Alternative: The Lateral Slide**

- Content slides horizontally (left for forward, right for back)
- Suggests a timeline or sequence
- More literal but potentially more distracting
- Use sparingly if at all

### Entering Reading Mode

When the user enters a focused reading state (tapping into a devotional, opening scripture), the transition should feel like entering a quiet room.

**Recommended Approach:**

- Surrounding UI elements (navigation, secondary content) fade to lower opacity or recede
- The primary content area gently expands or comes forward
- Background may subtly darken or shift (like lowering the lights)
- Duration: 500-700ms

The goal is to create a sense of _enclosure_ around the reading content without dramatic zooming or whooshing.

### Exiting Reading Mode

The reverse should feel like stepping back out into the hall.

**Recommended Approach:**

- Content recedes and surrounding elements return
- Slightly faster than entrance (400-500ms) because the user is ready to move on
- No sudden snapping back to previous state

### Modal and Overlay Animations

**Entrance:**

- Background dims with a subtle fade (300-400ms)
- Modal content rises from slight below center while fading in (400-500ms)
- Scale can go from 95% to 100%, no larger (avoid the "jumping at the screen" effect)

**Exit:**

- Reverse with slightly faster timing
- User-initiated close should be quicker (300ms) to feel responsive to their action

---

## 4. Scroll Animations

### On Parallax

**Use sparingly or not at all.**

Parallax scrolling can create depth but often feels gimmicky and distracting. It works against the contemplative pacing we want. The user should be focused on content, not noticing how clever the scrolling effect is.

**If parallax is used:**

- Apply only to background imagery, never text
- Keep the offset minimal (10-15% of scroll distance)
- Never parallax scripture or primary devotional content

### Content Reveal Patterns

As the user scrolls, content should emerge naturally rather than appearing abruptly.

**Recommended Approach: The Gentle Rise**

- Elements fade in while translating up from 20-30 pixels below their final position
- Duration: 400-600ms
- Trigger when element is 15-20% into the viewport (not at the exact edge)
- Stagger multiple elements if they appear together

**What We Avoid:**

- Slide from left/right (too dynamic, breaks reading flow)
- Zoom in (draws too much attention)
- Rotate in (playful, not appropriate)
- Aggressive bounce or overshoot

**Section Headers and Pull Quotes:**
These may have slightly more presence in their reveal (longer duration, more opacity travel) because they mark important moments in the reading.

### Progress Indicators

Progress through a devotional (both within a day and across the series) should be shown without anxiety.

**Within a Day:**

- A subtle indicator (thin line or gentle glow) that follows scroll position
- Animation should be smooth and continuous, never jumpy
- Fades out after a moment of inactivity (user should focus on content, not the progress bar)

**Across the Series:**

- Day markers that fill or illuminate as completed
- Transition between states should be gentle (300ms fade)
- The incomplete days should not feel like pressure (softer styling, not aggressive "empty" indicators)

### Sticky Elements Behavior

Navigation or progress elements that stick to the viewport as the user scrolls should do so gracefully.

**Recommended Approach:**

- Element does not "snap" into sticky position
- Slight fade or reduction in size as it transitions to sticky state
- Shadow or subtle elevation change to indicate it is now floating
- When returning to natural position, reverse the transition

---

## 5. Micro-interactions

### Button States

Buttons should feel responsive but not flashy.

**Hover (desktop):**

- Subtle shift in background color or border opacity
- Slight scale increase (102-103%, no more)
- Duration: 150-200ms

**Active/Pressed:**

- Brief scale down (98%) to simulate physical press
- Duration: 100ms

**Focus (keyboard navigation):**

- Clear visible ring or outline (accessibility requirement)
- Fade in over 150ms, no jarring outline snap

### Form Inputs

**Focus State:**

- Border or underline shifts from neutral to accent color (God is Gold or a subtle variant)
- Transition: 200-250ms
- Label may animate to smaller size above the input (standard float label pattern)

**Validation Feedback:**

- Success: Gentle color shift to affirmative tone, subtle checkmark fade-in
- Error: Shift to warmer/red tone, icon appearance
- Avoid shaking or aggressive animations for errors (user already feels bad)

### Checkbox and Toggle Animations

**Checkbox:**

- Check mark draws on rather than appearing instantly
- Duration: 200-300ms
- Suggests intentionality, "I am marking this complete"

**Toggle (for settings like dark mode):**

- Knob slides smoothly (250-300ms)
- Background color transitions simultaneously
- No bounce

### Loading States

Loading should feel contemplative, not anxious.

**Recommended Approach: The Breath**

- A subtle pulsing or gentle oscillation
- Opacity cycles between 60% and 100% or similar
- Cycle duration: 2-3 seconds (much slower than typical loading spinners)
- Suggests waiting, not urgency

**What We Avoid:**

- Spinning circles (too mechanical)
- Bouncing dots (too playful)
- Progress bars for indeterminate loading (creates false precision)

**If content is taking longer than expected:**

- After 3-5 seconds, a brief text message may fade in: "Taking a moment..."
- Tone should match brand voice: patient, not apologetic

### Success and Error Feedback

**Success (e.g., journal entry saved):**

- Brief, gentle confirmation
- Subtle scale up and fade out of a success indicator
- Or: content quietly settling into place
- Duration: 300-400ms, then fade over 500ms

**Error:**

- Clear but not alarming
- Icon or message fades in, stays visible until addressed
- No shaking, no red flashing
- The user made a mistake; we don't punish them visually

---

## 6. Typography Animation

### Text Reveal Patterns

Typography is the hero of the EUONGELION aesthetic. When text reveals, it should feel like words appearing on a page, not code executing.

**Body Text:**

- Generally should not animate individually
- Paragraphs may fade in as content blocks during scroll

**Headlines and Section Titles:**

- May fade in with a subtle rise (20px translation over 500ms)
- Playfair Display headlines deserve slightly more presence than DM Sans subheads

**Scripture Passages:**

- Special treatment: slightly longer reveal (600-800ms)
- Consider word-by-word or phrase-by-phrase reveal for key verses (500ms per phrase, 100ms stagger)
- Should feel like the words are being spoken or unscrolled

### Pull Quote Emphasis

Pull quotes are moments of pause. Their animation should create that pause.

**Recommended Approach:**

- Quote fades in more slowly than surrounding content (700-900ms)
- May have a subtle scale animation (from 98% to 100%)
- Attribution line fades in slightly after the quote (200ms delay)
- The em-dash or quotation marks may have their own subtle treatment

### Scripture Appearance

When a scripture passage is revealed or highlighted:

- The transition should feel reverent, not flashy
- Consider a brief background glow or shift (the Scroll White to a slightly warmer tone)
- Text may fade from a lighter opacity to full opacity
- Reference (book, chapter, verse) may appear after the passage with slight delay

### Hebrew/Greek Word Study Reveals

When original language words are shown (for deeper study):

**Initial Appearance:**

- The Hebrew or Greek characters may fade in with a slight scale-up (95% to 100%)
- Duration: 500-600ms

**Transliteration and Definition:**

- Appear in sequence after the original characters
- Stagger: 300ms between each element
- Creates a sense of unfolding meaning

**The Feel:**
Like opening layers of meaning, one at a time. Not dumping information but revealing it.

---

## 7. Interactive Elements

### Breath Prayer Timing Animations

Breath prayers are a core spiritual practice. The animation must support the physiological reality of breathing.

**Inhale Phase:**

- Visual expansion (a circle or shape grows)
- Duration: 4 seconds (standard)
- Easing: ease-in-out (smooth acceleration and deceleration)
- Accompanying text: "Breathe in" or the first half of the prayer

**Hold Phase (optional):**

- Visual stillness
- Duration: 2-4 seconds
- Subtle pulsing may indicate "stay here"

**Exhale Phase:**

- Visual contraction
- Duration: 6-8 seconds (exhalation is naturally longer)
- Easing: ease-in-out
- Accompanying text: "Breathe out" or second half of the prayer

**Overall:**

- The animation should lead the user, not follow them
- Pacing should feel natural, not forced
- User should be able to adjust timing in settings

### Journal Entry Save Feedback

When a user saves their reflection or journal entry:

**Recommended Approach:**

- Brief affirmation that does not interrupt the contemplative state
- The save button may subtly shift (color or icon change)
- A quiet confirmation: "Saved" appears and fades after 2 seconds
- No celebrations, no confetti, no "Great job!"

**The Feel:**
Like closing a physical journal. Quiet satisfaction, not applause.

### Share Button Behavior

Sharing is encouraged but not pushed.

**Inactive State:**

- Present but subtle (lower visual hierarchy)

**On Hover/Focus:**

- Gentle elevation, slight color shift

**On Tap/Click:**

- Share options expand or appear in a dropdown/modal
- Transition: 300-400ms
- Options should not fly in from off-screen

**After Sharing:**

- Brief, quiet confirmation
- "Shared" or subtle checkmark
- No fanfare

### Navigation Interactions

**Menu Items:**

- Underline or indicator bar slides to selected item
- Duration: 200-300ms
- Smooth follow, not instant jump

**Back Navigation:**

- Arrow may have subtle hover animation (slight leftward shift)
- Indicates direction of travel

**Breadcrumbs:**

- Current location distinguished by opacity or weight, not animation
- Clicking a crumb triggers page transition (see Page Transitions section)

---

## 8. Dark Mode Transitions

### How Colors Shift

Dark mode is not an inversion; it is a transformation. The colors should shift in a way that maintains warmth and contemplative quality.

**Color Mapping:**
| Light Mode | Dark Mode |
|------------|-----------|
| Scroll White (#F7F3ED) background | Tehom Black (#1A1612) background |
| Tehom Black text | Scroll White text (slightly reduced opacity: 90%) |
| God is Gold accents | God is Gold accents (may be slightly more saturated for visibility) |

**The Transition:**

- All color shifts happen simultaneously
- Duration: 400-500ms
- Easing: ease-in-out
- No element-by-element stagger (would feel fragmented)

### Timing for Theme Changes

**User-Initiated (toggle switch):**

- Immediate response after toggle animation completes
- Total time from tap to complete transition: 600-800ms

**System-Following (if respecting OS preference):**

- May be slightly longer (800-1000ms) since user did not explicitly request it
- Should not be jarring if user is mid-read

**Important:**

- The transition should never flash (going through white or black intermediate)
- All elements should move together as one cohesive shift
- Reading progress, position, and context should be maintained

---

## 9. Performance Considerations

### What to Animate

**Safe, Performant Properties:**

- `opacity` - GPU-accelerated, minimal repaints
- `transform: translate()` - GPU-accelerated, no layout recalculation
- `transform: scale()` - GPU-accelerated, no layout recalculation
- `filter: blur()` (use sparingly) - can be GPU-accelerated but expensive

### What to Avoid

**Expensive Properties:**

- `width`, `height` - triggers layout recalculation
- `margin`, `padding` - triggers layout recalculation
- `top`, `left`, `right`, `bottom` - triggers layout (use transform instead)
- `box-shadow` (animating) - expensive repaint
- `background-color` (less expensive but not free)

**General Guidance:**

- Limit simultaneous animations to 3-4 elements
- Use `will-change` sparingly and only when needed
- Remove animation triggers when elements are off-screen
- Test on lower-powered devices (not just development machines)

### Reduced Motion Preferences

**Respecting `prefers-reduced-motion`:**

This is not optional. Some users have vestibular disorders, motion sensitivity, or simply prefer less animation. Our design must accommodate them.

**When reduced motion is preferred:**

- Replace all motion with simple opacity fades or instant transitions
- Eliminate parallax entirely
- Breath prayer animations may need alternative visual feedback (color shifts instead of expansion)
- Page transitions become cross-fades only (no translation)
- Scroll reveals become simple fades or are eliminated

**Implementation Principle:**
Design the reduced-motion version first. It should be fully functional and still beautiful. Then add motion as enhancement.

---

## 10. Reference Examples

### Editorial/Contemplative Sites to Study

**The New York Times Long-Form Features:**
Scroll-driven reveals that let photography and typography breathe. Animations support the reading experience without competing with it. Notice how text appears just before you need to read it, not with dramatic flourish.

**Apple Product Pages (specific sections):**
The scroll-triggered animations are polished but often too flashy for our purposes. However, the _timing_ and _easing_ are instructive. Elements come to rest with confidence. Study their micro-interactions on buttons and form elements.

**Stripe Press:**
Beautiful typography treatment. Animations are subtle and serve legibility. Notice how little animation is actually needed when the static design is strong.

**Medium's Reading Experience:**
The focus mode, estimated reading time, and progress indicator. Simple, functional, unobtrusive. The interface supports rather than performs.

**Headspace App (with caveats):**
The breath animations and meditation timers are instructive for our breath prayer feature. However, their overall aesthetic is more playful than ours. Extract the timing patterns, not the visual style.

**Museum and Gallery Websites:**
Sites for contemplative art spaces often get the pacing right. Elements appear slowly. There is no rush. The architecture of the space is reflected in the architecture of the digital experience.

### Anti-Examples: What NOT to Do

**Aggressive Scroll-jacking:**
Sites that take control of your scroll and force you through an animation sequence. The user should always feel in control.

**Bouncing/Elastic Effects:**
App store landing pages with bouncing elements and playful overshoots. This energy is wrong for contemplative content.

**Particle Effects and Complex Animations:**
Background particles, floating elements, complex SVG path animations. These demand attention and computation.

**Loading Screens with Jokes:**
"Hang tight, we're doing the thing!" with dancing icons. Our loading states should be quiet, not performative.

**Celebratory Micro-interactions:**
Confetti on completion, fireworks on signup, animations that congratulate the user excessively. We are not Duolingo. Completing a devotional is its own reward.

**Instant Everything:**
Sites that are so fast that transitions feel absent. While performance is important, the absence of any transition can feel jarring and cheap. A moment of breath between states is valuable.

**Autoplay Video with Sound:**
Never. Not even once. Not even muted. User initiates media consumption.

---

## Summary: The EUONGELION Animation Ethos

| Principle                     | Application                                        |
| ----------------------------- | -------------------------------------------------- |
| **Breath, not bounce**        | Easing that settles, not springs                   |
| **Arrival, not entrance**     | Elements come to rest, not land with impact        |
| **Service, not performance**  | Animation supports content, never competes         |
| **Patience, not urgency**     | Slower than industry standard, never sluggish      |
| **Accessibility, not option** | Reduced motion is fully designed, not afterthought |
| **Craft, not flash**          | Subtle excellence over obvious showiness           |

---

## For Design Sprint Discussion

This document is intentionally conceptual. It describes _what animations should feel like_ rather than providing implementation code.

In the design sprint, we should:

1. **Prototype key transitions** in a tool like Figma, Principle, or Framer
2. **Test timing on actual devices** (especially mobile)
3. **Gather feedback** on whether the pacing feels contemplative or slow
4. **Define the reduced-motion experience** in equal detail
5. **Prioritize ruthlessly** - which animations are essential vs. nice-to-have

The goal is not to animate everything. The goal is to animate the right things, at the right speed, in the right way.

---

_"Excellence as offering. Motion as breath. Everything serves the Word."_

---

**End of Document v1.0**
