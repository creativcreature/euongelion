# EUONGELION - Wake Up Zine

**Version:** 1.4.1 | **Status:** 🟢 Live | **URL:** https://euongelion.vercel.app/

---

## Project Overview

EUONGELION (Greek: "Good News") is a modern Christian devotional web app delivering Scripture-based content for contemporary believers. Mission: spiritual formation over engagement metrics. Ship fast, learn, iterate.

**For:** Christians seeking depth in daily devotionals, wrestling with identity, peace, community, provision, truth, hope.

---

## Tech Stack

- **Framework:** Next.js 16.1.2 (App Router), React 19.2.3, TypeScript 5.x
- **Styling:** Tailwind CSS v4, HSL-based color system, GPU-optimized animations
- **State:** React hooks + localStorage (no external state management)
- **Deployment:** Vercel (euongelion.vercel.app)
- **Dev Port:** 3333 (3000-3005 occupied)

---

## Project Structure

```
/src/app              # Pages (page.tsx, /series/[slug], /devotional/[slug], /coming-soon)
├── globals.css       # Design system, dark mode, animations, typography
/src/components       # Navigation.tsx (dark mode inlined), ScrollProgress.tsx
/src/hooks            # useParallax.ts
/src/data             # devotionals.ts (content)
/public/logos         # Logo assets
/.claude              # Agents, skills, settings
CLAUDE.md             # This file
CURRENT_STATUS.md     # Session tracking
```

---

## Design System

### Colors (HSL)
```css
/* Light */
--color-cream: hsl(60, 20%, 97%)      /* Background */
--color-gold: hsl(43, 86%, 38%)       /* Accent */

/* Dark */
--dark-bg-primary: hsl(0, 0%, 10%)
--dark-text-primary: hsl(60, 20%, 97%)
```

### Typography
- **Display:** Impact (all caps, -0.02em tracking)
- **Serif:** Playfair Display (italics for quotes)
- **Body:** Inter
- **Fluid Scale:** `clamp()` for responsive sizing
- **Max-width:** 65ch (Scripture), 75ch (body)

### Animations (Scrollytelling)
5 types: `fade-in`, `slide-in-left`, `slide-in-right`, `scale-in`, `slide-up`
GPU-optimized (transform/opacity only)

---

## Key Features

1. **Dark Mode** - Toggle in top-right, localStorage persistence, system detection
2. **Scrollytelling** - Reading progress bar, scroll animations, staggered delays
3. **Typography** - Balanced, readable, strict Scripture detection (~25% block quotes)
4. **Conversion Pages** - Homepage hero with CTA, coming-soon with social proof
5. **Accessibility** - WCAG 2.1 AA, 44px touch targets, keyboard navigation
6. **Reflection Prompts** - Journal with localStorage, save confirmation

---

## Architecture Decisions

**No External State:** Content-driven app, React hooks + localStorage sufficient.

**Inlined Dark Mode:** Separate component didn't render in production (hydration mismatch). Inlined into Navigation.tsx works reliably.

**HSL Colors:** Easy dark mode - adjust lightness while maintaining hue/saturation.

**No Image Optimization:** Small optimized PNGs, Next.js Image adds complexity without benefit.

**localStorage > Database:** Reflections are personal, privacy-focused. No auth required.

---

## Code Style

### Component Pattern
```typescript
'use client'; // Only when needed

import { useState, useEffect } from 'react';

export default function Component() {
  // 1. State
  const [state, setState] = useState(value);

  // 2. Effects
  useEffect(() => { /* logic */ }, [deps]);

  // 3. Handlers
  const handleClick = () => { /* logic */ };

  // 4. Render
  return <div className="utility-classes">{/* JSX */}</div>;
}
```

### Naming
- Components: PascalCase (`Navigation.tsx`)
- Utilities: camelCase (`useParallax.ts`)
- Pages: kebab-case (`coming-soon`)

### Tailwind Classes
Order: Layout → Position → Size → Space → Typography → Visual → Interactive

---

## Deployment

```bash
# Development
npm run dev  # Port 3333

# Production
npm run build
vercel --prod

# Force Deploy (skip cache)
vercel --prod --force --yes
```

### Git Workflow
1. Make changes, test locally
2. Commit: `feat:` | `fix:` | `docs:` | `style:` | `refactor:`
3. Push (auto-deploys to Vercel)
4. Verify production URL

---

## Quality Standards

- **Performance:** LCP <2.5s, FID <100ms, CLS <0.1
- **Accessibility:** WCAG 2.1 AA minimum
- **Browsers:** Chrome/Edge/Safari/Firefox (last 2 versions), iOS 14+, Android 10+

---

## Critical Lessons (v1.4.1)

### 1. Dark Mode Implementation
**Problem:** ThemeToggle component didn't render in production.
**Solution:** Inline logic into Navigation.tsx.
**Lesson:** Hydration mismatches are subtle. Simpler is better for client features.

### 2. Scripture Detection
**Problem:** 80% of text styled as block quotes.
**Solution:** Strict detection - only fully-quoted passages.
**Lesson:** Test heuristics against real content. Assumptions fail.

### 3. Logo Dark Mode
**Problem:** Logos inverted/colorized.
**Solution:** Explicit CSS: `filter: none !important` on logo images.
**Lesson:** Dark mode affects everything. Be explicit about exceptions.

### 4. Deployment Caching
**Problem:** Changes deployed but not visible.
**Solution:** `vercel --prod --force --yes`
**Lesson:** Vercel cache is aggressive. Force rebuild when needed.

### 5. Elite UX
**Problem:** "Functional" to "polished" is 80% of work.
**Solution:** HSL colors, design tokens, semantic classes, WCAG compliance.
**Lesson:** Professional UX is 50+ small refinements, not one big change.

---

## Important Constraints

- **Port 3333:** Required (3000-3005 occupied)
- **No Database:** All data static in devotionals.ts
- **No Auth:** No user accounts
- **No Analytics:** Privacy-focused
- **Logos:** Prevent filters (`filter: none !important`)
- **Scripture:** Strict detection (quoted + length check)

---

## Claude Code Rules

### Investigation First
1. Read relevant files
2. Understand patterns
3. Check similar solutions
4. Identify side effects

### Explain Work
After tool use:
- Files changed and why
- What changes accomplish
- Patterns/decisions
- Follow-up items

### Parallel Tools
Execute independent operations simultaneously (read multiple files, run searches).

### Be Proactive
- Fix only what's requested
- Document other issues
- Ask before major changes

### Commit Discipline
- Logical units of work
- Clear "why" messages
- Never commit secrets
- Conventional format

### Testing
- Test dark mode on style changes
- Verify mobile responsiveness
- Check accessibility
- Test production URL before done

---

## Key Files

**Core:**
- `src/app/globals.css` - Design system
- `src/components/Navigation.tsx` - Nav with dark mode
- `src/data/devotionals.ts` - Content

**Docs:**
- `CURRENT_STATUS.md` - Session tracking
- `CLAUDE_CODE_SETUP.md` - Setup guide
- `VISUAL_IMPROVEMENTS.md` - Typography redesign
- `ELITE_UX_AUDIT.md` - UX principles
- `DEPLOYMENT_SUCCESS.md` - Deploy guide

**Config:**
- `package.json` - Port 3333
- `.claude/settings.json` - Permissions
- `.gitignore` - Excludes Claude Code cache

---

## Known Issues

**Resolved:**
- ✅ Dark mode toggle
- ✅ Logo colorization
- ✅ Typography sizing
- ✅ Block quote percentage
- ✅ Production visibility

**Pending:**
- ⏳ Devotional revision (awaiting user input)
- ⏳ Color contrast audit (gold on cream)
- ⏳ Parallax effects (hook exists, not applied)

---

## URLs

- **Production:** https://euongelion.vercel.app/
- **Dashboard:** https://vercel.com/james-projects-5d824c1e/euongelion

---

**Last Updated:** 2026-01-22 | **v1.4.1** | **Status:** 🟢 Production Ready

*"Daily bread for the cluttered, hungry soul."*
