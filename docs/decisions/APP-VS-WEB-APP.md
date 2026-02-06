# Decision Document: Native App vs. Web App

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** DRAFT - Awaiting Founder Decision

---

## 1. Executive Summary

EUONGELION needs a delivery platform for its devotional content. This document evaluates four approaches: web-only (PWA), native apps, cross-platform (React Native), and a phased web-first strategy.

**Why This Decision Matters:**

- Directly impacts MVP timeline (4 weeks)
- Determines development cost and complexity
- Affects how our specific audience discovers and engages with content
- Sets technical direction for the next 6-12 months

**Current Plan:** Next.js web app at wokegod.world

**Key Tension:** Our audience is mobile-first and time-poor, but also skeptical of "yet another app" and values low-friction access.

---

## 2. Audience Considerations

Our four personas have distinct technology patterns that must inform this decision.

### 2.1 Device Preferences by Persona

| Persona                  | Primary Device                               | Usage Pattern                                  | Discovery Method                       |
| ------------------------ | -------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| **The Drifted**          | iPhone/Android, evenly split                 | Stolen moments (commute, lunch, bed)           | Word-of-mouth, text from friend        |
| **The Skeptical Seeker** | Skews iPhone, urban/educated demographic     | Deep-dive sessions, often desktop for research | Social media, podcasts, Google search  |
| **The Stuck Believer**   | Android slightly higher (church demographic) | Morning routine, established habit time        | Church recommendation, Christian media |
| **The Weary Shepherd**   | Mixed, often have both phone and tablet      | Work hours (study), personal time (devotion)   | Professional networks, conferences     |

**Key Insight:** All personas are mobile-first for consumption, but discovery often happens via shareable links (text, social, email).

### 2.2 App Fatigue Analysis

Our audience explicitly told us what they don't want:

> "Another app demanding daily engagement streaks" - AUDIENCE.md

**App Fatigue Indicators:**

- The Drifted: Already feels guilty about abandoned apps; another download = another failure
- The Skeptical Seeker: Allergic to anything that feels like manipulation or lock-in
- The Stuck Believer: Likely has YouVersion, First5, She Reads Truth already installed; app drawer fatigue
- The Weary Shepherd: Values tools that integrate into workflow, not separate silos

**Web Advantage:** "I'll just check this link" is lower commitment than "I'll download this app."

### 2.3 Discovery Patterns

How does our audience find spiritual content?

| Channel                | App Required? | Notes                                |
| ---------------------- | ------------- | ------------------------------------ |
| Text from friend       | No - URL      | "Hey, this really helped me"         |
| Social media share     | No - URL      | Instagram stories, Twitter threads   |
| Google search          | No - URL      | "dealing with grief Christian"       |
| Podcast recommendation | No - URL      | Host shares link in show notes       |
| Church bulletin        | Either        | QR code works for both               |
| App store search       | Yes           | "devotional app" → heavy competition |

**Key Insight:** 5 of 6 primary discovery channels favor URL-based access. App store discovery puts us against YouVersion (500M+ installs), Dwell, First5, and hundreds of others.

### 2.4 Engagement Patterns

What does ongoing engagement look like for each persona?

| Persona                  | Engagement Style               | Implication                                                |
| ------------------------ | ------------------------------ | ---------------------------------------------------------- |
| **The Drifted**          | Sporadic → gradual consistency | Need frictionless re-entry; app icon = reminder of failure |
| **The Skeptical Seeker** | Deep but infrequent            | Need bookmarkable URLs for return visits                   |
| **The Stuck Believer**   | Habitual, routine-based        | Will use app if it's good; URL if that's available         |
| **The Weary Shepherd**   | Professional + personal        | Needs shareable materials; URLs are more useful            |

---

## 3. Option Analysis

### OPTION A: Web App Only (PWA)

**What it is:** Next.js web application at wokegod.world, with Progressive Web App capabilities. Users access via browser; can optionally "install" to home screen.

**Technical Stack:**

- Next.js 16 + React 19 (current plan)
- Service worker for offline capability
- Web app manifest for install prompt
- Push API for notifications (limited on iOS)

**Pros:**

| Benefit                | Impact   | Notes                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| Single codebase        | HIGH     | One team, one skill set, one deployment          |
| No app store approval  | HIGH     | Ship features same-day, no 1-7 day review delays |
| Instant updates        | HIGH     | Fix bugs, improve content instantly              |
| Lower development cost | HIGH     | 50-70% less than native                          |
| Universal access       | HIGH     | Works on any device with a browser               |
| Shareable URLs         | CRITICAL | Every devotional, every series has a link        |
| SEO benefits           | HIGH     | Google indexes content; organic discovery        |
| No revenue cut         | MEDIUM   | Apple/Google take 15-30% of in-app purchases     |
| Privacy-friendly       | MEDIUM   | No app tracking, fits audience values            |

**Cons:**

| Limitation               | Impact | Mitigation                                             |
| ------------------------ | ------ | ------------------------------------------------------ |
| iOS push notifications   | MEDIUM | iOS 16.4+ supports PWA push (March 2023)               |
| Less "app-like" feel     | LOW    | Good PWA is indistinguishable from native              |
| No app store discovery   | LOW    | Our audience doesn't search app stores for devotionals |
| Perceived as less "real" | LOW    | Decreasing over time; quality design matters more      |
| Safari limitations       | MEDIUM | Some PWA features limited; improving yearly            |

**Best For:**

- Quick launch (4-week MVP)
- Budget constraints
- Testing product-market fit
- Word-of-mouth growth strategy

---

### OPTION B: Native Apps (iOS + Android)

**What it is:** Separate applications built specifically for each platform. Objective-C/Swift for iOS, Kotlin/Java for Android.

**Pros:**

| Benefit                  | Impact | Notes                                          |
| ------------------------ | ------ | ---------------------------------------------- |
| Full device capabilities | HIGH   | Background sync, health integrations, widgets  |
| Push notifications       | HIGH   | Reliable, system-integrated                    |
| App store presence       | MEDIUM | Discoverability for "devotional app" searchers |
| Offline support          | HIGH   | Full offline capability, predictable           |
| Native performance       | HIGH   | 60fps animations, native gestures              |
| Platform integration     | MEDIUM | Siri shortcuts, CarPlay, Apple Watch           |

**Cons:**

| Limitation                | Impact   | Notes                                             |
| ------------------------- | -------- | ------------------------------------------------- |
| 2-3x development cost     | CRITICAL | Need iOS + Android + Web (3 codebases)            |
| App store approval delays | HIGH     | 1-7 days per update; rejected updates reset clock |
| Separate teams/skills     | HIGH     | Swift + Kotlin + JavaScript expertise needed      |
| Update friction           | MEDIUM   | Users must update app; many don't                 |
| 15-30% revenue cut        | MEDIUM   | Apple/Google take cut of any payments             |
| No SEO                    | HIGH     | Content invisible to search engines               |
| No shareable deep links   | HIGH     | "Download the app first" friction kills sharing   |

**Cost Estimate:**

- iOS development: $50,000-150,000 (agency) or 3-6 months (in-house)
- Android development: $40,000-120,000 (agency) or 3-6 months (in-house)
- Ongoing maintenance: $2,000-5,000/month per platform

**Best For:**

- Established product with proven market fit
- Subscription model requiring reliable payments
- Deep device integrations needed
- Large budget, long timeline

---

### OPTION C: React Native / Expo

**What it is:** Cross-platform framework allowing single codebase to deploy to iOS, Android, and (with React Native Web) browsers.

**Technical Stack:**

- React Native + Expo
- Shared 70-90% codebase between platforms
- Native modules for platform-specific features
- EAS (Expo Application Services) for building/deploying

**Pros:**

| Benefit               | Impact | Notes                                   |
| --------------------- | ------ | --------------------------------------- |
| Single codebase       | HIGH   | JavaScript/TypeScript throughout        |
| Native performance    | MEDIUM | Near-native, occasional limitations     |
| Push notifications    | HIGH   | Full support on both platforms          |
| App store presence    | MEDIUM | Listed in both stores                   |
| React skills transfer | HIGH   | Team already knows React (Next.js)      |
| Expo ecosystem        | HIGH   | Simplified building, testing, deploying |

**Cons:**

| Limitation                    | Impact | Notes                             |
| ----------------------------- | ------ | --------------------------------- |
| Still need app store approval | HIGH   | Same delays as native             |
| Complexity                    | MEDIUM | More moving parts than pure web   |
| Update friction               | MEDIUM | OTA updates help, but limited     |
| Some native limitations       | LOW    | Edge cases require native modules |
| Web experience secondary      | MEDIUM | React Native Web is less mature   |
| Bundle size                   | LOW    | Apps larger than native           |

**Cost Estimate:**

- Development: $30,000-80,000 (agency) or 2-4 months (in-house)
- Ongoing: $1,500-3,000/month for both platforms

**Best For:**

- Need app store presence
- Want single codebase
- Team has React experience
- Moderate budget, medium timeline

---

### OPTION D: Web First, Native Later (Recommended Evaluation)

**What it is:** Launch MVP as PWA, validate product-market fit, add native apps in Phase 2 if justified by data.

**Phase 1 (Now - Month 3):**

- Next.js PWA at wokegod.world
- Full feature set via web
- Gather usage data

**Phase 2 (Month 4-6, if warranted):**

- Evaluate: Do users want native apps?
- Build React Native apps if yes
- Maintain web as primary

**Decision Point Criteria:**

- > 10,000 monthly active users requesting app
- Revenue model requires in-app purchases
- Specific features need native (background audio, widgets)

**Pros:**

| Benefit                 | Impact   | Notes                                     |
| ----------------------- | -------- | ----------------------------------------- |
| Fastest to market       | CRITICAL | Meet 4-week MVP timeline                  |
| Test product-market fit | HIGH     | Don't invest in apps for unproven product |
| Lower initial risk      | HIGH     | $X now vs. $XXX later (only if proven)    |
| Learn from real users   | HIGH     | Data-driven decision on native            |
| Web remains valuable    | HIGH     | Even with apps, web serves SEO + sharing  |

**Cons:**

| Limitation                      | Impact | Mitigation                               |
| ------------------------------- | ------ | ---------------------------------------- |
| May need to rebuild some things | LOW    | Good architecture transfers well         |
| Users may expect app            | LOW    | Quality PWA meets expectations           |
| Delayed native features         | MEDIUM | Prioritize based on actual user requests |

**Best For:**

- Startups with limited runway
- Unproven product concepts
- Audience-first approach
- Pragmatic founders

---

## 4. Accessibility Comparison

EUONGELION values accessibility (WCAG 2.1 AA is in MVP scope). Here's how options compare:

| Factor                     | Web App (PWA)                  | Native App                     | Notes                    |
| -------------------------- | ------------------------------ | ------------------------------ | ------------------------ |
| **Screen readers**         | Excellent (with semantic HTML) | Excellent (with proper labels) | Both can excel           |
| **Font scaling**           | CSS-based, browser settings    | OS-based, system-wide          | Both work well           |
| **Color/contrast**         | CSS variables, easy to adjust  | Platform settings              | Web more flexible        |
| **Keyboard navigation**    | Full support                   | Limited/varies                 | Web significantly better |
| **Voice control**          | Browser-dependent              | Full (Siri, Assistant)         | Native wins              |
| **Offline access**         | Service worker                 | Full                           | Native more reliable     |
| **Updates for a11y fixes** | Instant                        | Store delay (1-7 days)         | Web wins significantly   |
| **Reduce motion**          | CSS `prefers-reduced-motion`   | System setting                 | Both support             |
| **Dynamic text**           | Excellent with rem/em          | System-controlled              | Both good                |

**Accessibility Winner:** Web app for rapid iteration on a11y issues; native for deep OS integration.

**For EUONGELION:** Web is better. Our content is primarily text-based. We need to fix a11y issues instantly, not wait for app store approval.

---

## 5. Our Audience Specifically

Mapping decisions to our four personas:

### The Drifted (Sleep Pathway)

- **What matters:** Low friction re-entry, no guilt triggers
- **App or Web?** WEB strongly preferred
- **Reasoning:**
  - A link in a text message = immediate access
  - No download = no commitment = no failure
  - Can engage anonymously first
  - Every devotional is shareable by their friend who sent it

### The Skeptical Seeker (Sleep Pathway)

- **What matters:** Intellectual respect, no manipulation, exploration freedom
- **App or Web?** WEB strongly preferred
- **Reasoning:**
  - Can research without commitment
  - Links are shareable for verification ("check this out")
  - No tracking concerns from app install
  - Content is Google-indexable (they search first)

### The Stuck Believer (Awake Pathway)

- **What matters:** Fresh perspective, depth, rekindled wonder
- **App or Web?** Either works, slight web preference
- **Reasoning:**
  - Already has multiple devotional apps
  - Differentiating quality matters more than platform
  - May prefer web to avoid "another app"
  - Will install if content is valuable

### The Weary Shepherd (Shepherd Pathway)

- **What matters:** Tools for ministry, deep content, personal feeding
- **App or Web?** WEB preferred for professional use
- **Reasoning:**
  - Needs shareable links for congregation
  - Accesses from multiple devices (phone, tablet, desktop)
  - Wants to copy/embed content for teaching
  - URLs are more useful than "download the app"

### Summary: Audience Platform Preference

| Persona              | Web   | Native | Notes                      |
| -------------------- | ----- | ------ | -------------------------- |
| The Drifted          | +++++ | +      | Low friction is everything |
| The Skeptical Seeker | +++++ | +      | Research-first behavior    |
| The Stuck Believer   | +++   | ++     | Quality > platform         |
| The Weary Shepherd   | ++++  | ++     | Shareability critical      |

**Verdict:** 3 of 4 personas strongly prefer web. 1 is neutral.

---

## 6. Competitor Approaches

### YouVersion Bible App

- **Approach:** Native apps (iOS, Android) + Web
- **Downloads:** 500M+
- **Web:** Full-featured bible.com
- **Lesson:** They have BOTH. Web for discovery/sharing, apps for daily engagement.

### She Reads Truth

- **Approach:** Native apps + Web + Print
- **Model:** Subscription ($9.99/month or $59.99/year)
- **Web:** Marketing site, limited content
- **Lesson:** Apps for paying subscribers, web for funnel.

### Dwell (Audio Bible)

- **Approach:** Native apps only
- **Model:** Subscription ($3.99/month or $29.99/year)
- **Web:** Marketing site only
- **Lesson:** Audio-first product requires native for background playback.

### First5

- **Approach:** Native apps + Web
- **Model:** Free (ministry funded)
- **Web:** Full devotional access
- **Lesson:** Web for accessibility, apps for habit formation.

### Lectio 365 (24-7 Prayer)

- **Approach:** Native apps + Web
- **Model:** Free (ministry funded)
- **Web:** Full web app at lectio365.com
- **Lesson:** PWA-style web app works well for devotionals.

### What We Can Learn

1. **Every successful devotional platform has web presence** - Even app-first products maintain web for sharing and SEO.

2. **Native apps are for habit, web is for discovery** - Users find content via web, may move to app for daily use.

3. **Audio-first products need native** - Background playback requires app. Text-first (like EUONGELION) doesn't.

4. **Subscription models push toward native** - App store payments are easier than web payments. But we're free (for now).

5. **PWAs are underutilized in this space** - Opportunity to differentiate with quality web experience.

---

## 7. Cost Comparison

| Approach                     | Initial Dev                                  | Ongoing/Year   | Timeline to MVP      | 1-Year Total     |
| ---------------------------- | -------------------------------------------- | -------------- | -------------------- | ---------------- |
| **Web only (PWA)**           | $5,000-15,000                                | $2,000-6,000   | 4 weeks              | $7,000-21,000    |
| **Native (iOS + Android)**   | $90,000-270,000                              | $24,000-60,000 | 4-8 months           | $114,000-330,000 |
| **React Native**             | $30,000-80,000                               | $18,000-36,000 | 2-4 months           | $48,000-116,000  |
| **Web first + native later** | $5,000-15,000 (now) + $30,000-80,000 (later) | $20,000-42,000 | 4 weeks + 2-4 months | $55,000-137,000  |

**Assumptions:**

- Agency rates for professional development
- Solo founder doing much of the work reduces costs significantly
- Using AI assistance (Claude Code) further reduces development time
- Supabase, Vercel have generous free tiers

**For EUONGELION:**

- Founder is doing development (with AI assistance)
- Budget is constrained
- Timeline is 4 weeks
- Web-only is clearly the right starting point

---

## 8. Recommendation

### Primary Recommendation: OPTION D - Web First (PWA), Native Later (If Justified)

**Rationale:**

1. **Timeline:** 4-week MVP is only achievable with web-only approach. Native adds 2-6 months.

2. **Audience Fit:** 3 of 4 personas prefer web. The 4th is neutral. Zero personas require native.

3. **Discovery:** Our growth model is word-of-mouth + organic search. Both require URLs. App store discovery puts us against giants (YouVersion has 500M installs).

4. **Budget:** Web-only is 5-15x cheaper. Save resources for content (our actual product).

5. **Risk Reduction:** Don't build apps for an unproven product. Validate first.

6. **Philosophy Alignment:** We said "no apps demanding engagement streaks." A PWA feels like visiting a website, not committing to another app.

### When to Revisit This Decision

Consider native apps when:

- [ ] Monthly active users exceed 10,000 AND
- [ ] > 20% of users request native app AND
- [ ] Specific features require native (background audio, widgets) AND
- [ ] Revenue model justifies app store payment processing

### What We Lose (And Why It's OK)

| Capability         | Lost?     | Acceptable Because                                              |
| ------------------ | --------- | --------------------------------------------------------------- |
| Push notifications | Partially | iOS 16.4+ supports PWA push; we avoid "pressure tactics" anyway |
| App store presence | Yes       | Our audience doesn't search there; we grow via sharing          |
| Widgets            | Yes       | Nice-to-have, not core to devotional experience                 |
| Background audio   | Yes       | We're text-first; audio is Phase 2+ anyway                      |
| Offline reading    | Partially | Service worker provides basic offline; full offline is Phase 2  |

---

## 9. If We Choose Web First (PWA Implementation)

### Required PWA Features (MVP)

#### 9.1 Web App Manifest

```json
{
  "name": "EUONGELION",
  "short_name": "EUONGELION",
  "description": "Daily devotionals for the wandering soul",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1A1612",
  "theme_color": "#C19A6B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

#### 9.2 Service Worker (Basic)

**MVP Scope:**

- Cache app shell (HTML, CSS, JS)
- Cache static assets (fonts, images)
- Provide offline fallback page
- Network-first for API requests

**Phase 2:**

- Cache devotional content for offline reading
- Background sync for progress
- Push notification support

#### 9.3 Install Prompt Strategy

**When to prompt:**

- NEVER on first visit (let them experience content first)
- After completing Day 1 of any series
- Subtle banner, not modal
- Dismissible, don't re-prompt for 30 days

**Install prompt copy:**

> "Add EUONGELION to your home screen for easier access. No app store needed."

#### 9.4 Offline Page

Simple, on-brand page shown when offline and page not cached:

```
You're offline right now.

EUONGELION needs a connection to load new content.

When you're back online, pick up where you left off.

[Retry Connection]
```

### PWA Testing Checklist

- [ ] Manifest is valid (Chrome DevTools > Application)
- [ ] Service worker registers successfully
- [ ] Install prompt appears (after trigger conditions)
- [ ] App works when installed to home screen
- [ ] Offline page displays when disconnected
- [ ] Theme color matches in address bar (mobile)
- [ ] Icons display correctly when installed
- [ ] Deep links work from installed app

---

## 10. Open Questions for Founder

### Must Answer Before Implementation

1. **Push Notifications Philosophy:**
   - MVP-SCOPE.md lists push as a "pressure tactic — avoid"
   - Do we want to enable PWA push for iOS users who opt in?
   - Or stay true to no-push philosophy entirely?

2. **Install Prompt Timing:**
   - Recommend: After Day 1 completion
   - Alternative: After series completion
   - Alternative: Never (let users discover install option)
   - Your preference?

3. **Offline Scope for MVP:**
   - Option A: Offline page only (simpler)
   - Option B: Cache last-viewed devotional (more useful)
   - Option C: Full offline mode (Phase 2 scope)

4. **Domain Confirmation:**
   - wokegod.world is current plan
   - Any concerns with PWA on this domain?
   - Alternative: euongelion.app (available?)

### Can Answer Later

5. **Native Apps Trigger:**
   - What user count/request threshold would justify native?
   - Would you consider React Native or prefer waiting?

6. **Audio Content Plans:**
   - If we add audio devotionals, timing for native reconsideration
   - Current stance: text-first, audio is Phase 2+

7. **Monetization Impact:**
   - If/when subscriptions launch, reconsider app store presence?
   - Web payments vs. app store payments trade-offs

---

## Decision Log

| Date       | Decision         | Rationale               | Owner |
| ---------- | ---------------- | ----------------------- | ----- |
| 2026-01-17 | Document created | Options analysis needed | AI    |
|            |                  |                         |       |

---

_This document will be updated when the founder makes a decision._
