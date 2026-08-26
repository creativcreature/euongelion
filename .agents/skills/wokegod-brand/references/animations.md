# wokeGod Animation System

**Version:** 1.0

## PHILOSOPHY

Animations should feel intentional, smooth, respectful - never gimmicky.

## TIMING

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 200ms;
  --duration-base: 400ms;
  --duration-slow: 600ms;
}
```

## SCROLL-TRIGGERED ANIMATIONS

### Fade In + Slide Up

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition:
    opacity 600ms var(--ease-out),
    transform 600ms var(--ease-out);
}
.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

## INTERACTION ANIMATIONS

### Button Hover

```css
button:hover {
  transform: translateY(-2px);
}
```

### Expandable Section

```css
.expand-content {
  max-height: 0;
  transition: max-height 400ms ease-out;
}
.is-open {
  max-height: 2000px;
}
```

## PERFORMANCE

- Use transform & opacity only (GPU accelerated)
- Respect reduced motion preference
- 60fps on mobile

## REDUCED MOTION (CRITICAL)

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

**End of Animations v1.0**
