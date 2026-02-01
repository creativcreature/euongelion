# EUONGELION Full Teardown Audit
**Date:** 2026-02-01 05:15 UTC
**Auditor:** Milos

---

## Executive Summary

The current "Wake Up Zine" site has several issues preventing Google-level quality. This audit identifies root causes and provides fixes.

---

## Critical Issues

### 1. Dark Mode Not Working ❌ CRITICAL

**Symptoms:**
- Theme toggle visible in navigation
- Toggle click doesn't visually change the site
- Some elements might change, others don't

**Root Cause:**
The site uses Tailwind v4 with CSS-first configuration (`@import "tailwindcss"` + `@theme` block) but also has a tailwind.config.ts. These might conflict.

Additionally, the `@theme` block defines custom properties that aren't automatically applied in dark mode - they define separate `--dark-*` variables but don't switch them.

**Fix Required:**
```css
/* In globals.css, add at the end of @layer base */
html.dark {
  --bg-primary: var(--dark-bg-primary);
  --bg-secondary: var(--dark-bg-secondary);
  --text-primary: var(--dark-text-primary);
  --text-secondary: var(--dark-text-secondary);
  --border-subtle: var(--dark-border-subtle);
}

html.dark body {
  background-color: var(--dark-bg-primary);
  color: var(--dark-text-primary);
}
```

### 2. CSS Architecture Conflict ⚠️ HIGH

**Issue:**
- Tailwind v4 uses `@import "tailwindcss"` for CSS-first config
- But project also has `tailwind.config.ts`
- The `@theme` block in globals.css should replace config, but both exist

**Recommendation:**
Either:
a) Remove tailwind.config.ts and use only CSS-first (Tailwind v4 way)
b) Remove `@theme` block and use only config (Tailwind v3 way)

Currently doing both causes confusion.

### 3. Hardcoded Colors in Components ⚠️ MEDIUM

**Issue:**
Many components use hardcoded color values instead of theme variables:
- `bg-[#FAF9F6]` instead of `bg-cream`
- `bg-[#1a1a1a]` instead of Tailwind dark classes
- `text-[#B8860B]` instead of `text-gold`

**Impact:**
- Inconsistent theming
- Harder to maintain
- Dark mode won't apply to these

### 4. Tailwind v4 + Dark Mode ⚠️ HIGH

**Issue:**
Tailwind v4 changed how dark mode works. The `darkMode: 'class'` in config might not be respected when using CSS-first approach.

**Fix:**
In globals.css, add to `@theme`:
```css
@theme {
  --dark-mode: class;
}
```

Or use the CSS-only approach:
```css
@media (prefers-color-scheme: dark) { ... }
```

---

## Performance Issues

### 5. No Image Optimization

- Images in `/public` not using Next.js Image optimization
- No lazy loading configuration
- No blur placeholders

### 6. Large Bundle

- 89 TypeScript files
- Not all may be code-split properly
- Should audit imports

---

## Accessibility Issues

### 7. Skip Link Hidden

Skip to content link exists but may not be visible on focus in all browsers.

### 8. Focus States

Custom focus states defined but need testing.

---

## Architecture Issues

### 9. Mixed Patterns

- Some pages use `'use client'`, some don't
- Inconsistent data fetching patterns
- Mix of localStorage and placeholder Supabase calls

### 10. API Routes

- Only `/api/chat` and `/api/admin/unlock` exist
- Documented routes `/api/soul-audit`, `/api/daily-bread`, `/api/progress` don't exist
- Soul Audit works via localStorage fallback

---

## Recommendations

### Immediate (Fix Tonight)

1. **Fix dark mode** - Add proper CSS variable switching for dark mode
2. **Test thoroughly** - Verify on actual browser
3. **Remove debug button** - The red "Clear All Data" button should be hidden by default

### Short-term

1. Consolidate CSS approach (pick Tailwind v4 CSS-first OR config)
2. Replace hardcoded colors with theme variables
3. Implement actual API routes

### Platform Build (Separate)

Build the AI platform as a separate Next.js project to avoid breaking Wake Up Zine. Then integrate when stable.

---

## File-by-File Dark Mode Issues

### layout.tsx
```tsx
// Current (won't fully work with toggle):
className={`... bg-[#FAF9F6] dark:bg-[#1a1a1a] ...`}

// The dark: variant requires html to have 'dark' class - this IS set
// But the initial flash might show light theme
```

### page.tsx (homepage)
```tsx
// Uses custom classes like:
bg-[#FAF9F6] dark:bg-[#1a1a1a]  // Should work
className="text-gray-900 dark:text-gray-100"  // Should work
```

### Navigation.tsx
```tsx
// Toggle DOES add/remove 'dark' class on html
// But menu overlay uses hardcoded: backgroundColor: '#FAF9F6'
// This won't respect dark mode!
```

---

## Fix Priority

1. **Navigation menu hardcoded colors** → High priority
2. **CSS variable switching** → High priority  
3. **Test in browser** → Required before declaring fixed

---

**Next Step:** Fix the dark mode issues systematically, test, commit.
