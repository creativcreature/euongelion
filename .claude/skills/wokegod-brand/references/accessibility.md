# wokeGod Accessibility Standards

**Version:** 1.0

## WCAG 2.1 AA COMPLIANCE

All wokeGod content MUST meet WCAG 2.1 Level AA standards.

## COLOR CONTRAST

### Brand Color Contrast Ratios

- **Tehom Black on Scroll White:** 16.1:1 ✅
- **God is Gold on Scroll White:** 4.8:1 ✅

## KEYBOARD NAVIGATION

### Required Shortcuts

- Tab/Shift+Tab, Enter/Space, Escape, Arrow keys

### Focus Indicators

- 2px solid God is Gold outline (never remove)

## SCREEN READERS

### ARIA Labels Required

```html
<button aria-label="Expand study">↓</button>
<nav aria-label="Primary navigation"></nav>
```

## TOUCH TARGETS

- Minimum 44x44px for all interactive elements
- 8px spacing between targets

## REDUCED MOTION

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

## TESTING CHECKLIST

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Contrast ratios meet WCAG AA
- [ ] Touch targets 44px minimum
- [ ] Reduced motion respected

**End of Accessibility v1.0**
