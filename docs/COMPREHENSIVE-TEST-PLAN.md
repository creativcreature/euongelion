# Euangelion Comprehensive Test Plan

**Version:** 1.0
**Date:** 2026-02-15
**Scope:** Full production coverage + iOS App Store submission compliance
**Standards:** PLAN-V3 (18 phases), euan-PLAN-v2, Apple App Store Review Guidelines (Feb 2026), WCAG 2.1 AA, Apple HIG

---

## 1. Test Architecture Overview

### 1.1 Test Layers

| Layer                 | Tool                    | Purpose                                            | Files                                     |
| --------------------- | ----------------------- | -------------------------------------------------- | ----------------------------------------- |
| **Contract Stubs**    | Vitest                  | Validate behavioral logic with pure functions      | `__tests__/*.test.ts`                     |
| **Component**         | Vitest + RTL            | Render real React components, assert DOM output    | `__tests__/*.test.tsx`                    |
| **API Integration**   | Vitest                  | Call real Next.js route handlers, assert responses | `__tests__/*.test.ts`                     |
| **Accessibility**     | Vitest + RTL + axe-core | ARIA, keyboard, screen reader, contrast            | `__tests__/accessibility.test.ts`         |
| **Visual Regression** | (future: Playwright)    | Screenshot comparison at 375/768/1024px            | Pending                                   |
| **Performance**       | (future: Lighthouse CI) | Core Web Vitals, payload size                      | `__tests__/performance-contracts.test.ts` |
| **iOS Compliance**    | Vitest                  | App Store guideline contracts                      | `__tests__/ios-compliance.test.ts`        |
| **E2E**               | (future: Playwright)    | Full browser-based user journeys                   | Pending                                   |

### 1.2 File Organization

```
__tests__/
├── # Layer 1: Core Contract Stubs (existing)
├── slot-engine.test.ts                    # 30 tests
├── daily-bread-api.test.ts                # 18 tests
├── soul-audit-extended.test.ts            # 24 tests
├── auth-consent-session.test.ts           # 25 tests
├── day-locking-extended.test.ts           # 18 tests
├── saves-highlights-archive.test.ts       # 39 tests
├── navigation-routing-shell.test.ts       # 40 tests
├── e2e-scenarios.test.ts                  # 30 tests
│
├── # Layer 2: Security
├── security.test.ts                       # XSS, CSRF, injection, rate limiting, tokens, headers
│
├── # Layer 3: Accessibility
├── accessibility.test.ts                  # Keyboard, ARIA, screen reader, contrast, focus, touch targets
│
├── # Layer 4: iOS App Store Compliance
├── ios-compliance.test.ts                 # Sign in with Apple, IAP, privacy, data deletion, PWA manifest
│
├── # Layer 5: Performance
├── performance-contracts.test.ts          # CWV thresholds, payload limits, bundle size, latency
│
├── # Layer 6: Missing Feature Phases
├── chat-ux.test.ts                        # Phase 10: desktop sidebar, mobile sheet, context, threads
├── left-rail-archive.test.ts              # Phase 11: accordion groups, archive nav, restore
├── public-repository.test.ts              # Phase 12: UGC, moderation, YouTube, vetting
├── monetization-entitlements.test.ts      # Phase 13: subscriptions, IAP, donations, entitlements
├── notifications-reminders.test.ts        # Phase 14: channels, scheduling, quiet hours, permissions
├── help-onboarding-tutorial.test.ts       # Phase 16: FAQ, help hub, walkthrough, tutorial replay
├── admin-moderation.test.ts               # Phase 17: admin routes, role enforcement, audit logs
│
├── # Layer 7: Error Resilience
├── error-resilience.test.ts               # Network, offline, session expiry, concurrent, multi-tab
│
├── # Layer 8: Visual / Theme
├── visual-theme-responsive.test.ts        # Dark/light, responsive, theme toggle, sticky, footer
│
├── # Layer 9: Integration Acceptance
├── integration-acceptance.test.ts         # All 16 V3 acceptance scenarios, cross-feature flows
│
├── # Existing real-code tests
├── smoke.test.tsx
├── shell-header.test.tsx
├── series-data.test.ts
├── devotional-json.test.ts
├── soul-audit-flow.test.ts
├── soul-audit-curation.test.ts
├── soul-audit-edge-cases.test.ts
├── soul-audit-run-token.test.ts
├── soul-audit-consent-token.test.ts
├── soul-audit-schedule.test.ts
├── soul-audit-fallback-options.test.ts
├── day-locking.test.ts
├── api-security.test.ts
├── billing-flash.test.ts
├── chat-guardrails.test.ts
├── chat-response-metadata.test.ts
└── onboarding-variant-content.test.ts
```

---

## 2. Security Test Plan

### 2.1 XSS Prevention

- All user text inputs sanitized: Soul Audit response, chat messages, highlight notes, margin notes, bookmark tags, smart topics
- HTML entities escaped in API responses
- Script injection blocked in UGC content (public repository)
- CSP headers prevent inline script execution
- React dangerouslySetInnerHTML never used on user content

### 2.2 CSRF Protection

- All state-mutating endpoints (POST/PUT/DELETE) validate CSRF tokens
- Origin/Referer header checking on API routes
- SameSite cookie attribute set to `Strict` or `Lax`

### 2.3 Rate Limiting

- Per-route rate limits on all API endpoints
- Soul Audit submit: max 3 per hour per session
- Chat: max 30 messages per minute per user
- Save endpoints: max 60 per minute per user
- Auth endpoints: max 5 attempts per minute per IP
- Replace/switch slots: max 10 per hour per user

### 2.4 Authentication Token Security

- JWT/session tokens have TTL expiration
- Expired tokens rejected with 401
- Tampered tokens rejected
- Token rotation on sensitive actions
- Revoked tokens rejected after sign-out

### 2.5 SQL Injection

- All database queries use parameterized queries via Supabase client
- Search/filter inputs sanitized before query construction
- No raw SQL interpolation

### 2.6 Secret Handling

- API keys never exposed in client-side responses
- `SUPABASE_SERVICE_ROLE_KEY` only used server-side
- `ANTHROPIC_API_KEY` never in client bundles
- Environment variables not leaked in error messages

### 2.7 Role-Based Access

- `/admin/*` routes require `admin` role
- RLS policies enforce row-level data isolation
- Users cannot access other users' data via API

### 2.8 Secure Headers

- `Content-Security-Policy` set
- `Strict-Transport-Security` (HSTS) enabled
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 2.9 Session Security

- Session cookies: `httpOnly`, `secure`, `SameSite=Lax`
- Session fixation prevention (new session on auth)
- Idle session timeout

---

## 3. Accessibility Test Plan (WCAG 2.1 AA + Apple HIG)

### 3.1 Keyboard Navigation

- All interactive elements reachable via Tab
- Logical tab order on every page
- Enter/Space activates buttons and links
- Escape closes modals, drawers, and dropdowns
- Arrow keys navigate within composite widgets (tabs, menus, accordions)
- Focus trap within open modals
- No keyboard traps anywhere

### 3.2 Screen Reader (VoiceOver) Compatibility

- All images have `alt` text (or `aria-hidden` for decorative)
- Status badges have `aria-label` (LOCKED, ARCHIVED, CURRENT, COMPLETED, SABBATH)
- Form inputs have associated labels
- Error messages linked to inputs via `aria-describedby`
- Live regions (`aria-live`) for dynamic updates (toasts, counter changes, timer updates)
- Reading order matches visual order
- Heading hierarchy (h1 → h2 → h3) — no skipped levels

### 3.3 ARIA Attributes

- Accordion: `role="region"`, `aria-expanded`, `aria-controls`
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Navigation: `role="navigation"`, `aria-label`
- Breadcrumb: `aria-label="Breadcrumb"`, `aria-current="page"` on last item
- Progress: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Tabs (slot chips): `role="tablist"`, `role="tab"`, `role="tabpanel"`

### 3.4 Color Contrast

- Body text: minimum 4.5:1 ratio (WCAG AA)
- Large text (≥18pt or ≥14pt bold): minimum 3:1 ratio
- UI components and graphical objects: minimum 3:1 ratio
- All 5 highlight colors meet contrast requirements in both light and dark themes
- Placeholder text meets 4.5:1 ratio

### 3.5 Touch Targets (Apple HIG)

- All interactive elements minimum 44×44pt
- Spacing between adjacent targets prevents mis-taps
- No overlapping hit areas

### 3.6 Reduced Motion

- `prefers-reduced-motion: reduce` disables:
  - Chat sidebar slide animation
  - Page transition animations
  - Reader shift animation
  - Parallax effects
  - Auto-playing animations
- Essential animations (loading spinners) still functional

### 3.7 Dynamic Type (iOS)

- Text scales from smallest to largest accessibility sizes
- No text truncation at largest size
- Layout adapts without overlap
- Line spacing proportional to text size

---

## 4. iOS App Store Compliance Test Plan (Feb 2026)

### 4.1 Guideline 4.8 — Sign in with Apple

- **Required:** If app offers Google sign-in, must offer Sign in with Apple as equivalent option
- Privacy-focused login: limits data to name + email, allows private relay email
- Sign in with Apple button follows Apple's design guidelines
- Token revocation on account deletion (Sign in with Apple REST API)

### 4.2 Guideline 3.1 — In-App Purchase

- All digital goods (themes, sticker packs) use Apple IAP on iOS
- Subscriptions use auto-renewable subscription type
- Restore Purchases button present and functional
- Purchase prices shown before confirmation
- Subscription terms clearly displayed (price, period, free trial terms)
- No external payment links on iOS (or compliant with StoreKit external link entitlement)
- Credits/in-game currencies do not expire
- Receipt validation on server side

### 4.3 Guideline 3.1.2 — Subscriptions

- Clear pricing: "$2.99/month" displayed before purchase
- Free trial: terms stated, auto-conversion disclosed
- Easy cancellation: link to iOS subscription management
- Grace period handling for failed renewals
- Subscription status reflected in real-time

### 4.4 Guideline 5.1 — Privacy

- **Privacy Policy URL:** Accessible from app and App Store listing
- **Privacy Manifest:** Required file listing all data collected, usage, linking, and tracking
- **App Tracking Transparency:** ATT prompt before any tracking (analytics optional, default OFF)
- **Data Minimization:** Only collect data necessary for functionality
- **Account Deletion:** In-app account deletion mechanism (mandatory since June 2022)
- **Data Deletion:** All user data deletable within 30 days of request
- **Privacy Nutrition Labels:** Accurate declaration of:
  - Data collected (name, email, usage data, diagnostics)
  - Data linked to user identity
  - Data used for tracking (none, by default)

### 4.5 Guideline 1.2 — User-Generated Content

- Content moderation system for public repository
- Report mechanism for objectionable content
- Block/mute user capability
- Content filtered before display
- Moderation response time < 2 minutes (automated vetting)

### 4.6 Guideline 2.1 — App Completeness

- No placeholder content in production
- No "coming soon" features visible
- All links functional
- No test/debug UI in production build
- No crashes on any supported device

### 4.7 Guideline 4.2 — Minimum Functionality

- App provides value beyond a repackaged website
- Native features: push notifications, offline reading, haptic feedback
- Genuine native container if submitting via WebView wrapper

### 4.8 Guideline 2.3 — Accurate Metadata

- App name matches content
- Screenshots represent actual functionality
- Description accurate and current
- Age rating reflects content (religious content, UGC)

### 4.9 AI Service Consent (2026 Requirement)

- If using external AI (Anthropic Claude), consent modal must specify:
  - AI provider name
  - Data types sent to AI
  - User must consent before AI features activate
- Age rating questionnaire completed (deadline: Jan 31, 2026)

### 4.10 PWA / Web App Requirements

- `manifest.json` with proper icons (180×180 apple-touch-icon minimum)
- Splash screen configuration
- `display: "standalone"` mode
- Orientation handling (portrait primary, landscape optional)
- Service worker for offline capability
- No browser-specific UI visible
- Safe area insets respected (notch, home indicator)
- Status bar handling (dark/light)

---

## 5. Performance Test Plan

### 5.1 Core Web Vitals (Hard Gates)

| Metric  | Target  | Page                                 |
| ------- | ------- | ------------------------------------ |
| LCP     | < 2.5s  | Home, Daily Bread, Devotional Reader |
| FID/INP | < 100ms | All interactive pages                |
| CLS     | < 0.1   | All pages                            |
| TTFB    | < 800ms | All API routes                       |
| TTI     | < 3.5s  | Home, Daily Bread                    |

### 5.2 Bundle & Payload

| Metric                                 | Target                       |
| -------------------------------------- | ---------------------------- |
| Initial JS bundle                      | < 200KB gzipped              |
| API response: `/api/daily-bread/state` | < 10KB                       |
| API response: `/api/soul-audit/submit` | < 5KB                        |
| Image optimization                     | WebP/AVIF, lazy loading      |
| Font loading                           | `font-display: swap`, subset |

### 5.3 Query Latency

| Query                      | Target             |
| -------------------------- | ------------------ |
| Library index (1000 items) | < 200ms            |
| Daily bread state          | < 100ms            |
| Soul audit submit          | < 2s (AI included) |
| Bookmark/highlight CRUD    | < 50ms             |

---

## 6. Feature Phase Test Coverage

### Phase 10: Chat UX

- Desktop: FAB → right sidebar, reader shifts left, state persists
- Mobile: FAB → full-screen modal (bottom sheet)
- Context restricted to devotional + local corpus (no web retrieval)
- Chat notes save with day linkage + optional text anchor
- Selection-to-chat carries selected text + context
- Multiple threads, searchable/filterable index
- Chat history persistence across navigation

### Phase 11: Left Rail & Archive IA

- Accordion groups: Today+7, Bookmarks, Highlights, Notes, Chat History, Archive, Trash
- Archive as first-class nav destination
- Restore controls within archive accordion
- Nested items per section

### Phase 12: Public Repository & Moderation

- UGC default private until explicit publish
- Automated soft-vetting pipeline (safety, plagiarism, citation)
- Moderation SLA < 2 minutes
- Discover feed with filters, search, sorting
- YouTube allowlist enforcement
- Video placement rules (intro vs end)
- Only owner-embeddable videos

### Phase 13: Monetization & Entitlements

- Subscription: $2.99/mo via Stripe (web) + Apple IAP (iOS)
- One-off store: themes $0.99, sticker packs $0.49
- Theme/sticker catalog display
- Donation model: non-tax-deductible, 60/25/15 allocation
- Transparency dashboard (public + personal)
- Cross-platform entitlement sync
- Purchase validation and restore

### Phase 14: Notifications & Reminders

- Channels: in-app, email (Resend), push (Firebase/APNs)
- Default 7 AM local schedule
- Quiet hours suppression (10 PM - 7 AM)
- Push permission prompt after first devotional completion
- Per-day/series reminder controls
- Notification preferences persistence

### Phase 16: Help & Onboarding Tutorial

- Searchable FAQ in Help hub
- Categories: Getting Started, Soul Audit, Daily Bread, Reading, Saves, Settings
- Homepage Q+A linked to Help hub
- First-devotional guided walkthrough (step overlays)
- Tutorial skippable
- Tutorial replayable from Settings and Help

### Phase 17: Admin & Moderation

- Protected `/admin/*` routes
- Single `admin` role enforcement
- YouTube allowlist CRUD
- Publication moderation queue (approve/reject)
- Public feed controls
- Transparency metrics admin
- Audit logs for all moderation actions

---

## 7. Error Resilience Test Plan

### 7.1 Network Failures

- API fetch timeout handling (5s default)
- Retry with exponential backoff (max 3 retries)
- Offline detection + user notification
- Graceful degradation: cached content shown when offline
- Error boundary catches render failures

### 7.2 Session Management

- Expired session → re-auth prompt (not crash)
- Stale session detection on API calls
- Session resume after browser close/reopen
- Token refresh before expiration

### 7.3 Direct URL Hits

- `/soul-audit/results` without valid run → redirect to `/soul-audit`
- `/daily-bread` without auth → show empty state with CTAs
- Deep links to specific devotional days → handle missing progress gracefully

### 7.4 Concurrent Operations

- Multi-tab slot activation → last-write-wins + toast refresh
- Concurrent save operations → no data loss
- Concurrent audit submissions → proper session isolation
- BroadcastChannel / storage event sync between tabs

### 7.5 Error Boundary

- Root error boundary catches unhandled errors
- Per-route error boundaries for graceful degradation
- Error UI includes retry action
- Error logging to monitoring service

---

## 8. Visual & Theme Test Plan

### 8.1 Dark / Light Mode

- Dark mode renders correctly (all pages)
- Light mode renders correctly (all pages)
- System theme auto-detection works
- Theme toggle persists across sessions
- No flash of wrong theme on load
- Highlight colors meet contrast in both themes

### 8.2 Responsive Layouts

- **375px (mobile):** Single column, full-width reading, no side borders
- **768px (tablet):** Adapted grid, appropriate spacing
- **1024px+ (desktop):** Full newspaper layout, multi-column where specified

### 8.3 Component Rendering

- Homepage hero swaps: audit (no active) vs. continue CTA (active devotional)
- Consent banner renders with correct buttons
- Footer renders 4 columns with all links
- Breadcrumbs render on all non-home pages
- Slot chips render with correct status badges
- Day list shows lock/archived badges correctly
- Replace-slot 2-step confirmation modal renders
- Wake-Up masthead renders (separate visual surface)

---

## 9. V3 Acceptance Scenario Matrix

| #   | Scenario                                                   | Test File                                                 |
| --- | ---------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Logged-out user runs audit, sees results, gets soft prompt | `integration-acceptance.test.ts`                          |
| 2   | Save action triggers hard auth gate + post-auth merge      | `integration-acceptance.test.ts`                          |
| 3   | Audit returns 5 options with 1 typed-confirm reroll        | `integration-acceptance.test.ts`                          |
| 4   | Activation obeys 3-slot model + replacement UX             | `integration-acceptance.test.ts`                          |
| 5   | Active devotional shows 7 days; locked teaser works        | `integration-acceptance.test.ts`                          |
| 6   | Non-active series: Day 1 preview only                      | `integration-acceptance.test.ts`                          |
| 7   | Highlights: color changes + note flow + contrast           | `integration-acceptance.test.ts`                          |
| 8   | Chat mobile sheet: read-only content peek                  | `chat-ux.test.ts`                                         |
| 9   | Archive/delete/restore preserves linked artifacts          | `integration-acceptance.test.ts`                          |
| 10  | Donation dashboard: correct personal/global splits         | `monetization-entitlements.test.ts`                       |
| 11  | Theme/sticker purchases sync web+iOS                       | `monetization-entitlements.test.ts`                       |
| 12  | Public publish blocks until vetting passes                 | `public-repository.test.ts`                               |
| 13  | YouTube renders only from allowlisted channels             | `public-repository.test.ts`                               |
| 14  | Sticky header/nav/scroll on every page + viewport          | `visual-theme-responsive.test.ts`                         |
| 15  | No dead links in nav/footer/help/legal                     | `integration-acceptance.test.ts`                          |
| 16  | Performance + accessibility gates pass                     | `performance-contracts.test.ts` + `accessibility.test.ts` |

---

## 10. iOS Submission Pre-Flight Checklist

Before any App Store submission, ALL must pass:

- [ ] Sign in with Apple functional alongside Google auth
- [ ] All IAP products configured in App Store Connect
- [ ] Restore Purchases button works
- [ ] Subscription terms displayed clearly
- [ ] Privacy Policy URL accessible
- [ ] Privacy Manifest file present and accurate
- [ ] ATT prompt shown before any analytics tracking
- [ ] Account deletion mechanism works (in-app)
- [ ] All user data deletable within 30 days
- [ ] Content moderation active for UGC
- [ ] Report mechanism for objectionable content
- [ ] AI consent modal shows provider + data types
- [ ] Age rating questionnaire completed
- [ ] No placeholder content
- [ ] No crashes on iPhone SE, iPhone 15, iPhone 16 Pro Max
- [ ] VoiceOver navigation works on all screens
- [ ] Dynamic Type scales correctly
- [ ] All touch targets ≥ 44pt
- [ ] Safe area insets respected (notch, home indicator)
- [ ] PWA manifest valid with correct icons
- [ ] Offline mode shows cached content
- [ ] Push notification permission requested at correct time
- [ ] No external payment links on iOS (or proper entitlement)
- [ ] `npm run verify:ios-readiness` passes

---

## 11. Test Execution Strategy

### CI Pipeline (Every Push)

```bash
npm run type-check
npm run lint
npm test                              # All vitest tests
npm run verify:production-contracts
npm run verify:tracking
```

### Pre-Release Gate (Before Deploy)

```bash
npm run verify:ios-readiness
npm run build
# Lighthouse CI on key pages
# Accessibility audit (axe-core)
```

### Manual QA Checklist (Before App Store Submission)

- Test on physical iPhone SE (smallest screen)
- Test on physical iPhone 16 Pro Max (largest screen)
- Test with VoiceOver enabled
- Test with Dynamic Type at maximum
- Test with reduced motion enabled
- Test with high contrast enabled
- Test offline scenarios (airplane mode)
- Test push notification flow end-to-end
- Test IAP purchase + restore flow
- Test account creation + deletion flow

---

## 12. Total Test Count Target

| Category                       | File Count | Est. Tests |
| ------------------------------ | ---------- | ---------- |
| Core contract stubs (existing) | 8          | 224        |
| Existing real-code tests       | 17         | 71         |
| Security                       | 1          | ~50        |
| Accessibility                  | 1          | ~60        |
| iOS Compliance                 | 1          | ~55        |
| Performance                    | 1          | ~30        |
| Chat UX (Phase 10)             | 1          | ~35        |
| Left Rail (Phase 11)           | 1          | ~25        |
| Public Repository (Phase 12)   | 1          | ~35        |
| Monetization (Phase 13)        | 1          | ~40        |
| Notifications (Phase 14)       | 1          | ~25        |
| Help/Tutorial (Phase 16)       | 1          | ~20        |
| Admin (Phase 17)               | 1          | ~30        |
| Error Resilience               | 1          | ~40        |
| Visual/Theme                   | 1          | ~35        |
| Integration Acceptance         | 1          | ~45        |
| **TOTAL**                      | **40**     | **~820**   |
