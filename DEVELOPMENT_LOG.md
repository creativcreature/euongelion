# EUONGELION Development Log

## Project Overview

**Project:** Wake Up Zine (Public front door for EUONGELION)
**Stack:** Next.js 15, React 19, Tailwind CSS v4, TypeScript
**Purpose:** Public-facing devotional site featuring 7 series (35 total devotionals)

### Three-Layer Architecture

1. **wokeGod** - The organization (top-level brand)
2. **EUONGELION** - The main devotional brand/project
3. **EUONGELION AI-powered website** - Full platform with AI features (behind authentication)

**Wake Up Zine = Public front door** (no login required)
**AI Platform = Full features** (requires admin cookie or FULL_SITE_ENABLED env var)

---

## Version Control

**Current Version:** v1.0.0
**Git Initialized:** Yes
**Versioning Strategy:** Semantic Versioning (MAJOR.MINOR.PATCH)

### Quick Rollback Commands

```bash
# See all versions
git tag -l

# Rollback to specific version (safe - keeps changes)
git reset --soft v1.0.0

# Rollback to specific version (destructive - discards changes)
git reset --hard v1.0.0

# View changes since version
git log v1.0.0..HEAD --oneline
```

**For detailed versioning documentation, see:** [`VERSIONING.md`](./VERSIONING.md)

### Commit Guidelines

Every change should be committed with format:
```
<type>: <description>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `content:`, `chore:`

---

## Design System

### Aesthetic References
- **Primary:** accordion.net.au (12-column grid, minimal, editorial)
- **Motion:** motion.zajno.com (subtle animations, cubic-bezier easing)

### Typography System (Viewport-Width Based)

All typography uses `clamp()` for fluid responsive scaling:

```css
.vw-heading-xl {
  font-size: clamp(3rem, 8vw, 10rem);
  line-height: 0.9;
}

.vw-heading-lg {
  font-size: clamp(2.5rem, 6vw, 6rem);
  line-height: 0.95;
}

.vw-body-lg {
  font-size: clamp(1.25rem, 1.8vw, 2rem);
  line-height: 1.6;
}

.vw-body {
  font-size: clamp(1rem, 1.2vw, 1.5rem);
  line-height: 1.65;
}

.vw-small {
  font-size: clamp(0.75rem, 0.9vw, 1.125rem);
  line-height: 1.5;
  letter-spacing: 0.05em;
}
```

### Font Families

```css
--font-family-display: Impact, "Arial Black", sans-serif;
--font-family-label: "Helvetica Neue", Arial, sans-serif;
--font-family-serif: "Playfair Display", Georgia, serif;
--font-family-serif-italic: "Playfair Display", Georgia, serif;
```

### Color Palette

```css
--color-cream: #FAF9F6;  /* Background */
--color-gold: #B8860B;   /* Accent (frameworks, headings) */
--color-black: #000000;  /* Text */
--color-gray-400: #999; /* Secondary text */
```

### Motion Principles

```css
* {
  transition-timing-function: cubic-bezier(0.42, 0, 0.04, 1);
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.6s ease forwards;
}

.fade-in-delay-1 { animation-delay: 0.1s; }
.fade-in-delay-2 { animation-delay: 0.2s; }
.fade-in-delay-3 { animation-delay: 0.3s; }
.fade-in-delay-4 { animation-delay: 0.4s; }
```

**Intersection Observer** triggers `.fade-in` class when elements enter viewport (threshold: 0.1-0.15)

---

## Tailwind CSS v4 Important Notes

### ⚠️ CRITICAL: Tailwind v4 Syntax Differences

This project uses **Tailwind CSS v4**, which has different syntax than v3:

1. **Custom colors DON'T work as utilities:**
   - ❌ `className="bg-cream text-gold"`
   - ✅ `style={{ backgroundColor: '#FAF9F6', color: '#B8860B' }}`

2. **Theme configuration uses `@theme` directive:**
   ```css
   @theme {
     --color-cream: #FAF9F6;
     --font-family-display: Impact, sans-serif;
   }
   ```

3. **Standard Tailwind utilities still work:**
   - ✅ `className="px-6 py-8 grid md:grid-cols-12"`
   - ✅ `className="hover:text-black transition-colors duration-300"`

---

## Content Structure

### 7 Devotional Series (35 Total Days)

Each series follows **chiastic structure (A-B-C-B'-A')**:
- Days 1 and 5 mirror each other
- Days 2 and 4 mirror each other
- **Day 3 is the pivot** (core revelation, highlighted in gold)

#### Series List

1. **Identity** - "When everything that defined you is shaken, who are you?"
2. **Peace** - "What if peace isn't found by controlling your circumstances?"
3. **Community** - "Who are your people when systems fail?"
4. **Kingdom** - "What if the kingdom you're looking for is already here?" (CENTER)
5. **Provision** - "What if provision isn't about having enough, but sharing what you have?"
6. **Truth** - "How do you know what's real when misinformation is everywhere?"
7. **Hope** - "What if hope isn't optimism, but faithfulness in the dark?"

### Framework: Matthew 6:33

**"Seek first the kingdom, and all these things will be added"**

This biblical framework runs through all 7 series, addressing the apocalyptic anxiety of 2026.

### 2026 Context

All series address contemporary issues:
- Political violence at 1970s levels
- 43% increase in anxiety
- Economic instability (25% purchasing power loss)
- 71% dissatisfied with democracy
- 29% frequently lonely
- 500M tweets/day, deepfakes, misinformation
- 57% pessimistic about 2026

---

## File Structure

### Key Pages

```
src/app/
├── page.tsx                          # Homepage (7 questions)
├── series/[slug]/page.tsx           # Series landing pages
├── devotional/[slug]/page.tsx       # Individual devotional days
├── admin/unlock/page.tsx            # Admin authentication
└── globals.css                       # Design system

middleware.ts                         # Route protection

public/
├── logos/
│   ├── Logo-19.png                  # wokeGod wordmark (black) - CURRENTLY USED
│   ├── Logo-20.png                  # wokeGod icon (gold circle)
│   ├── Logo-21.png                  # wokeGod wordmark (white)
│   └── Logo-23.png                  # wokeGod icon (white)
└── devotionals/
    ├── identity-crisis-day-1.json
    ├── identity-crisis-day-2.json
    ... (35 total devotional JSON files)
```

### Navigation Flow

```
Homepage (/)
  ↓ Click question
Series Landing Page (/series/identity)
  ↓ Click day
Individual Devotional (/devotional/identity-crisis-day-1)
```

---

## Logo Usage

### Current Implementation

**Navigation:** wokeGod logo (Logo-19.png) centered at top
- Size: `w-40 h-10`
- Position: `justify-center` (absolute positioned Sign In on right)
- Priority loading: `priority` prop on Next.js Image component

### Dark Mode (Future)

Logo files exist for light/dark variants:
- **Light mode:** Logo-19.png (wordmark), Logo-20.png (icon)
- **Dark mode:** Logo-21.png (wordmark), Logo-23.png (icon)

---

## Authentication & Middleware

### Public Routes (No Auth Required)

```typescript
const PUBLIC_ROUTES = [
  '/',                    // Homepage
  '/devotional',          // All devotionals
  '/admin/unlock',        // Unlock page
  '/api/admin/unlock',    // API endpoint
]
```

### Hidden Routes (Admin Only)

```typescript
const HIDDEN_ROUTES = [
  '/blog',
  '/courses',
  '/community',
  '/dashboard',
  '/shop',
  '/resources',
  '/archive',
  '/about',
  '/series',       // OLD EUONGELION series pages (not Wake Up Zine)
  '/search',
  '/bookmarks',
  '/wake-up',      // Old wake-up page (replaced by homepage)
]
```

### Access Control

Hidden routes visible when:
- Cookie `euongelion_admin=true` exists, OR
- Environment variable `FULL_SITE_ENABLED=true`

Otherwise returns 404.

---

## Chronological Changes

### Session 1: Initial Transformation

**Date:** Previous session (before context compaction)

1. Applied accordion.net.au aesthetic
2. Implemented viewport-width typography system
3. Created 35 devotional JSON files (7 series × 5 days)
4. Added motion.zajno.com subtle animations
5. Integrated Intersection Observer for scroll-based fade-ins

### Session 2: Homepage Language Fix

**Issues Found:**
- Header said "EUONGELION" but should show wokeGod logo
- Main heading said "HAVEL AUDIT" instead of "EUONGELION"
- Missing explanation of what EUONGELION is

**Changes Made:**
1. Integrated wokeGod Logo-19.png into navigation
2. Changed main heading to "EUONGELION" with pronunciation guide
3. Added description explaining project purpose and 2026 context
4. Listed 7 questions with links

**Files Modified:**
- `src/app/page.tsx`

### Session 3: Series Landing Pages

**User Request:**
- Center wokeGod logo at top
- Create individual landing pages for each of 7 series
- Each question should link to series page (not directly to day 1)
- Write series introductions
- Keep running development log

**Changes Made:**

1. **Centered wokeGod logo** (`src/app/page.tsx`)
   - Changed `justify-between` to `justify-center`
   - Made Sign In link absolute positioned

2. **Created `/src/app/series/[slug]/page.tsx`**
   - Dynamic routing for 7 series
   - Full `SERIES_DATA` object with:
     - `title` - Series name
     - `question` - Main question
     - `introduction` - Brief summary of 5-day journey
     - `context` - 2026 apocalyptic context
     - `framework` - Biblical framework (Matthew 6:33 variants)
     - `days[]` - Array of 5 days with titles and slugs
   - Layout matches homepage aesthetic
   - Day 3 highlighted in gold (pivot point)
   - Sidebar explaining chiastic structure

3. **Updated homepage links** (`src/app/page.tsx`)
   - Changed series slugs from `identity-crisis-day-1` to `identity`
   - Updated links from `/devotional/{slug}` to `/series/{slug}`

4. **Created DEVELOPMENT_LOG.md** (this file)

**Files Modified:**
- `src/app/page.tsx` (centered logo, updated links)
- `src/app/series/[slug]/page.tsx` (created)
- `DEVELOPMENT_LOG.md` (created)

---

## Series Introductions (Reference)

### Identity
**Introduction:** "Your country, your job, your security—all unstable. So who are you, really? This 5-day journey explores what remains when the labels fall away."

**Context:** "In 2026, political violence is at 1970s levels. Your job title doesn't guarantee security anymore. The definitions that once told you who you were are fracturing. This series asks the uncomfortable question: if you're not what you do, what you earn, or what country you belong to—then who are you?"

**Days:**
1. When everything shakes
2. The narrative breaks
3. You are whose you are (PIVOT)
4. Living from identity
5. What remains

### Peace
**Introduction:** "You've tried to control everything. And you're exhausted. This 5-day journey explores a different kind of peace—one that doesn't depend on your circumstances."

**Context:** "43% more anxious than last year. You refresh the news obsessively, doomscrolling to see if your world is still intact. You try to manage every variable, control every outcome. But the tighter you grip, the less peace you have."

**Days:**
1. The illusion of control
2. The exhaustion of managing
3. Peace the world can't give (PIVOT)
4. Practicing surrender
5. Peace as gift

### Community
**Introduction:** "Institutions are failing. Networks are transactional. 29% are frequently lonely. This 5-day journey explores covenant community—the kind that remains when everything else collapses."

**Context:** "71% are dissatisfied with democracy. The systems you trusted are fracturing. Your professional network disappears when you lose your job. Your contacts ghost you in crisis. In a world of transactional relationships, who actually stays?"

**Days:**
1. When systems fail
2. The loneliness epidemic
3. You're not meant to be alone (PIVOT)
4. Covenant in practice
5. Who remains

### Kingdom (CENTER SERIES)
**Introduction:** "You've been searching for refuge in politics, economics, and curated spirituality. You're exhausted. This 5-day journey reveals the kingdom that's been here all along."

**Context:** "You voted, donated, argued online. You optimized your finances, stockpiled savings. You sampled Buddhism, mindfulness, astrology. You've been looking for a kingdom that won't collapse. But you've been looking in empires."

**Days:**
1. Searching in wrong places
2. The exhaustion of empires
3. The kingdom is here (PIVOT)
4. Seeking first
5. Everything else added

### Provision
**Introduction:** "47.9M are food insecure while others stockpile. This 5-day journey explores God's backwards economy: sharing creates abundance, hoarding creates scarcity."

**Context:** "Inflation has eaten 25% of your purchasing power. You're stockpiling, building contingencies, trying to have enough. But the fear of scarcity is making you hoard. And the hoarding is making you emptier."

**Days:**
1. The scarcity mindset
2. Fear drives hoarding
3. God's backwards economy (PIVOT)
4. Mutual aid in practice
5. When you share, needs are met

### Truth
**Introduction:** "Deepfakes. AI-generated content. Partisan bubbles. You can't trust anything. This 5-day journey moves from information overload to knowing the one who is true."

**Context:** "You're drowning in 500M tweets per day. Deepfakes are indistinguishable from reality. 60-73% encounter misinformation daily. You don't know what's real anymore. And the hypervigilance is exhausting you."

**Days:**
1. Drowning in information
2. Can't trust yourself
3. Truth is a person (PIVOT)
4. From information to wisdom
5. Truth was searching for you

### Hope
**Introduction:** "57% are pessimistic about 2026. Optimism is dead. Toxic positivity fails. This 5-day journey explores resurrection hope—the kind that enters darkness instead of denying it."

**Context:** "Climate crisis. Political violence. Economic collapse. Everything feels apocalyptic. Toxic positivity says 'stay positive!' But that's not working. This series offers something different: hope that's honest about the dark."

**Days:**
1. Optimism is dead
2. Grief is holy
3. Hope enters darkness (PIVOT)
4. Practicing faithfulness
5. Resurrection promise

---

## Design Patterns & Conventions

### Grid System (12-Column)

```tsx
<div className="grid md:grid-cols-12 gap-8 md:gap-16">
  <div className="md:col-span-10 md:col-start-2">
    {/* Content centered, 10 columns wide, offset by 1 */}
  </div>
</div>
```

### Intersection Observer Pattern

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
        }
      });
    },
    { threshold: 0.1 }
  );

  const elements = document.querySelectorAll('.observe-fade');
  elements.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}, []);
```

### Navigation Component

```tsx
<nav className="flex items-center justify-center px-6 md:px-12 lg:px-20 py-8 relative">
  <Link href="/">
    <div className="relative w-40 h-10 cursor-pointer">
      <Image
        src="/logos/Logo-19.png"
        alt="wokeGod"
        fill
        className="object-contain"
        priority
      />
    </div>
  </Link>
  <Link
    href="/admin/unlock"
    className="absolute right-6 md:right-12 lg:right-20 text-gray-400 hover:text-black transition-colors duration-300 vw-small"
  >
    Sign In
  </Link>
</nav>
```

### Day 3 Highlighting (Pivot Point)

```tsx
<div className={`${day.day === 3 ? 'md:bg-gray-50 md:-mx-8 md:px-8' : ''}`}>
  <span style={{ color: day.day === 3 ? '#B8860B' : '#999' }}>
    DAY {day.day}
  </span>
</div>
```

---

## Pending Features

### Dark Mode Implementation
- Logo files exist (Logo-21.png, Logo-23.png for white variants)
- Need theme toggle component
- CSS variable switching for colors
- Persist user preference (localStorage)

### Contextual Images
- Use nano-banana for devotional images
- Dithered ink aesthetic
- Generate images contextual to each devotional theme
- Place in illustration panels (already structured in JSON)

### Progressive Web App Features
- Service worker for offline access
- App manifest
- Install prompt

---

## Known Issues & Limitations

### Middleware Blocking Old Series Pages

The `/series/[slug]/[day]/page.tsx` file exists but is blocked by middleware:
- Old EUONGELION series pages are in `HIDDEN_ROUTES`
- File contains stubbed functions (returns null)
- New Wake Up Zine series pages at `/series/[slug]/page.tsx` are NOT blocked
- Devotional days at `/devotional/[slug]/page.tsx` are public

**Solution:** The new series landing pages circumvent this by using a different route pattern.

### Image Component Warnings (Non-Critical)

Next.js may warn about missing `width` and `height` on images using `fill` prop. This is expected behavior when using responsive images.

---

## Future Claude Sessions: Quick Start

**To catch up on this project:**

1. Read this `DEVELOPMENT_LOG.md` file
2. Understand the three-layer architecture (wokeGod → EUONGELION → Wake Up Zine)
3. Note Tailwind v4 syntax (use inline styles for custom colors)
4. Review viewport-width typography classes (`.vw-heading-xl`, `.vw-body-lg`, etc.)
5. Understand navigation flow (homepage → series → day)
6. Check middleware.ts for public/hidden routes
7. Reference series introductions above for content tone

**Key files to read:**
- `src/app/page.tsx` (homepage)
- `src/app/series/[slug]/page.tsx` (series landing pages)
- `src/app/devotional/[slug]/page.tsx` (devotional days)
- `src/app/globals.css` (design system)
- `middleware.ts` (route protection)

**Design principles:**
- Minimal, editorial, accordion.net.au aesthetic
- Subtle motion from motion.zajno.com
- Viewport-width responsive typography
- Scroll-based fade-in animations
- 12-column grid with centered content
- Matthew 6:33 framework addressing 2026 apocalyptic anxiety

---

## Changelog

### v1.0.2 (2026-01-21) - Bug Fix: Parsing Error & TypeScript Types

**Git Tag:** `v1.0.2`
**Commit:** `20a79c6`

**Bug Fixes:**
- Fixed ECMAScript parsing error in `src/app/series/[slug]/page.tsx`
- Converted all string properties from single quotes to double quotes with proper escaping
- Created missing `src/types/index.ts` with core type definitions
- Added `description` property to `Series` interface

**Files Modified:** 2 files (129 insertions, 65 deletions)

**Status:**
- Parsing error: RESOLVED ✓
- TypeScript compilation: PASSING ✓
- Build now completes successfully

**Rollback Command:**
```bash
git reset --hard v1.0.2
```

### v1.0.1 (2026-01-21) - Documentation: Versioning System

**Git Tag:** `v1.0.1`
**Commit:** `6558c68`

**Documentation:**
- Created comprehensive `VERSIONING.md` with rollback procedures
- Updated `DEVELOPMENT_LOG.md` with version control section
- Documented semantic versioning strategy and commit guidelines

**Files Modified:** 2 files (466 insertions, 3 deletions)

### v1.0.0 (2026-01-21) - Initial Wake Up Zine Release

**Git Tag:** `v1.0.0`
**Commit:** `a6df53f`

**Features:**
- Centered wokeGod logo in navigation
- Created series landing pages (`/src/app/series/[slug]/page.tsx`)
- Wrote introductions for all 7 series
- Updated homepage links to point to series pages
- Created development log file (`DEVELOPMENT_LOG.md`)
- Set up git versioning with semantic versioning strategy
- Created versioning documentation (`VERSIONING.md`)
- Tagged initial baseline commit as v1.0.0

**Files Modified:** 104 files (8,200 insertions, 419 deletions)

**Rollback Command:**
```bash
git reset --hard v1.0.0
```

---

**Last Updated:** 2026-01-21
**Current Version:** v1.0.2
**Current Status:** Build compiling successfully. Series landing pages functional with proper TypeScript types. Dark mode and contextual images pending.
