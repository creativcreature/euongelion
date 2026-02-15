# EUONGELION — Sprint Plan

**Version:** 1.0
**Last Updated:** January 16, 2026

---

## Overview

**Duration:** 4 Weeks
**Goal:** MVP launch on wokegod.world
**Focus:** The lost and wandering

---

## Parallel Tracks

The sprint runs four parallel workstreams that converge in Week 4:

```
Week 1        Week 2        Week 3        Week 4
──────────────────────────────────────────────────
TECHNICAL ─────────────────────────────> Integration
VISUAL ────────────────────────────────> Integration
CONTENT ───────────────────────────────> Integration
ILLUSTRATION ──────────────────────────> Integration
                                              │
                                              ▼
                                         LAUNCH
```

---

## Week 1: Foundation

### Technical Track (ARCHITECT)

| Task               | Description                                             | Dependencies        |
| ------------------ | ------------------------------------------------------- | ------------------- |
| Database schema    | Implement Supabase tables for users, sessions, progress | Supabase configured |
| Auth system        | Magic link flow with Supabase Auth                      | Database schema     |
| Content data model | JSON schema for series/days/modules                     | None                |
| API routes stub    | Soul Audit, series, progress endpoints                  | Database schema     |

**Deliverable:** Working auth flow, database ready

### Visual Track (DESIGNER)

| Task                   | Description                                  | Dependencies     |
| ---------------------- | -------------------------------------------- | ---------------- |
| Design tokens          | Finalize colors, typography, spacing in code | Brand references |
| Component library plan | Identify all UI components needed            | MVP scope review |
| Dark mode system       | CSS variables for theme switching            | Design tokens    |
| Layout system          | Grid, containers, responsive breakpoints     | Design tokens    |

**Deliverable:** Design system foundation, component checklist

### Content Track (WRITER)

| Task             | Description                               | Dependencies  |
| ---------------- | ----------------------------------------- | ------------- |
| Series 1 draft   | Complete 5-day series for "Sleep" pathway | PHILOSOPHY.md |
| Series 2 draft   | Complete 5-day series for "Awake" pathway | PHILOSOPHY.md |
| Module templates | Establish patterns for each of 12 modules | Content model |

**Deliverable:** 2 series drafted, module patterns documented

### Illustration Track (ARTIST)

| Task                       | Description                                      | Dependencies           |
| -------------------------- | ------------------------------------------------ | ---------------------- |
| Visual style finalization  | Lock down Caravaggio treatment parameters        | Photography references |
| Prompt library             | Create reusable prompts for common themes        | Visual style           |
| Hero image tests           | Generate 3-5 test images, evaluate against brand | Prompt library         |
| Color treatment automation | Define post-processing workflow                  | Test images            |

**Deliverable:** Visual style locked, prompt templates ready

---

## Week 2: Core Build

### Technical Track (ARCHITECT)

| Task                 | Description                                    | Dependencies     |
| -------------------- | ---------------------------------------------- | ---------------- |
| Soul Audit flow      | Question → Claude API → Match → Account prompt | API routes, Auth |
| Day-gating logic     | 7 AM timezone unlock, date calculations        | User preferences |
| Progress tracking    | Start, complete, resume functionality          | Database, Auth   |
| Series browse/detail | List all series, preview before starting       | Content model    |

**Deliverable:** Core user journey functional (without UI polish)

### Visual Track (DESIGNER)

| Task                 | Description                           | Dependencies   |
| -------------------- | ------------------------------------- | -------------- |
| Navigation component | Header, menu, logo placement          | Layout system  |
| Soul Audit UI        | Question input, loading, match reveal | Design tokens  |
| Daily Bread modules  | 12 module component designs           | Component list |
| Settings page        | Sabbath, theme, timezone controls     | Design tokens  |

**Deliverable:** All page layouts designed, core components built

### Content Track (WRITER)

| Task                  | Description                                    | Dependencies       |
| --------------------- | ---------------------------------------------- | ------------------ |
| Series 3 draft        | Third series                                   | Module templates   |
| Series 4 draft        | Fourth series                                  | Module templates   |
| Series 1-2 review     | Polish and finalize first two                  | WRITER self-review |
| Public language audit | Apply PUBLIC-FACING-LANGUAGE.md to all content | Language doc       |

**Deliverable:** 4 series drafted, 2 finalized

### Illustration Track (ARTIST)

| Task                   | Description                             | Dependencies        |
| ---------------------- | --------------------------------------- | ------------------- |
| Series 1-2 heroes      | Generate hero images for first 2 series | Visual style locked |
| Module illustrations   | Key images for teaching modules         | Content draft       |
| Vocab card backgrounds | Abstract images for Hebrew word cards   | Visual style        |
| Image optimization     | Compress, format for web (WebP)         | Generated images    |

**Deliverable:** Images for first 2 series ready

---

## Week 3: Polish & Connect

### Technical Track (ARCHITECT)

| Task                  | Description                         | Dependencies      |
| --------------------- | ----------------------------------- | ----------------- |
| Share flow            | Copy link + Web Share API           | Series/day pages  |
| Print stylesheet      | Print-friendly CSS for downloads    | Module components |
| Error handling        | 404, 500, session expired pages     | All routes        |
| Analytics integration | Vercel Analytics or Plausible setup | All pages         |

**Deliverable:** All features functional, error states handled

### Visual Track (DESIGNER)

| Task                  | Description                        | Dependencies     |
| --------------------- | ---------------------------------- | ---------------- |
| Responsive testing    | 320px, 768px, 1440px breakpoints   | All components   |
| Animation/transitions | Loading states, page transitions   | Core components  |
| Dark mode polish      | Test all components in both themes | Dark mode system |
| Accessibility audit   | WCAG 2.1 AA compliance check       | All components   |

**Deliverable:** Responsive, accessible, polished UI

### Content Track (WRITER)

| Task                | Description                     | Dependencies       |
| ------------------- | ------------------------------- | ------------------ |
| Series 5 draft      | Fifth series                    | Module templates   |
| Series 3-4 review   | Polish and finalize             | WRITER self-review |
| Content integration | Load all series into system     | JSON schema        |
| QA content          | Review all content in actual UI | Integration        |

**Deliverable:** 5 series complete, all content loaded

### Illustration Track (ARTIST)

| Task                 | Description                               | Dependencies      |
| -------------------- | ----------------------------------------- | ----------------- |
| Series 3-5 heroes    | Generate hero images for remaining series | Content draft     |
| Module illustrations | Complete remaining illustrations          | Content finalized |
| OG images            | Open Graph images for social sharing      | Hero images       |
| Final optimization   | Ensure all images web-ready               | All images        |

**Deliverable:** All MVP images complete and optimized

---

## Week 4: Integration & Launch

### All Tracks → Integration

| Day     | Focus                            | Owner                |
| ------- | -------------------------------- | -------------------- |
| Day 1-2 | Full integration testing         | PM coordinates       |
| Day 3   | Bug fixes, content corrections   | All agents           |
| Day 4   | Staging deployment, final review | ARCHITECT + LAUNCHER |
| Day 5   | Production deployment            | LAUNCHER             |

### Launch Checklist (PM coordinates)

**Technical:**

- [ ] All API endpoints working
- [ ] Auth flow complete (magic link → account)
- [ ] Day-gating respects timezone
- [ ] Progress saves correctly
- [ ] Share links work
- [ ] Print stylesheet functional
- [ ] Analytics tracking
- [ ] Error pages in place

**Visual:**

- [ ] All modules render correctly
- [ ] Dark mode complete
- [ ] Mobile responsive (320px → 1920px)
- [ ] WCAG 2.1 AA compliant
- [ ] All images load and display

**Content:**

- [ ] 5 series loaded and verified
- [ ] All 12 module types present
- [ ] Soul Audit matching tested
- [ ] Public language consistent

**Legal:**

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Contact email configured
- [ ] Crisis resources visible

---

## Dependencies Map

```
DESIGNER (tokens) ────────────────────────────┐
                                              │
ARCHITECT (schema) ───> ARCHITECT (auth) ─────┤
                                              │
WRITER (templates) ───> WRITER (series) ──────┼──> Integration
                                              │
ARTIST (style) ───> ARTIST (prompts) ─────────┤
                                              │
                 ARTIST (images) ─────────────┘
```

**Critical Path:**

1. Design tokens must be locked before component build
2. Database schema must be ready before auth
3. Content JSON schema must be defined before series creation
4. Visual style must be locked before image generation

---

## Agent Assignments

| Agent          | Primary Focus                       | Secondary            |
| -------------- | ----------------------------------- | -------------------- |
| **PM**         | Coordination, dependency tracking   | Status updates       |
| **ARCHITECT**  | All technical implementation        | API design           |
| **DESIGNER**   | UI components, responsive design    | Accessibility        |
| **WRITER**     | 5 series, all content               | Language consistency |
| **ARTIST**     | All illustrations, image processing | Visual QA            |
| **STRATEGIST** | Legal docs, launch messaging        | —                    |
| **LAUNCHER**   | Deployment, DNS, hosting            | Monitoring setup     |
| **OPERATOR**   | — (post-launch)                     | —                    |

---

## Communication Protocol

### Daily Check-ins (PM facilitates)

```
Morning:
- What are you working on today?
- Any blockers?

Evening:
- What did you complete?
- What's next?
```

### Handoff Format

When handing work between agents:

```
From: [AGENT]
To: [AGENT]
Asset: [file/deliverable]
Context: [what they need to know]
Next step: [what you expect them to do]
```

---

## Risk Register

| Risk                     | Likelihood | Impact | Mitigation                              |
| ------------------------ | ---------- | ------ | --------------------------------------- |
| Content not ready        | Medium     | High   | Start content Week 1, parallel track    |
| Image generation quality | Medium     | Medium | Build prompt library, iterate early     |
| Auth complexity          | Low        | High   | Use Supabase Auth as-is, minimal custom |
| Scope creep              | High       | Medium | Reference MVP-SCOPE.md constantly       |
| Integration issues       | Medium     | Medium | Reserve Week 4 for integration only     |

---

## Success Criteria (End of Sprint)

MVP is complete when all items in `docs/MVP-SCOPE.md` Success Criteria are checked:

- [ ] Soul Audit → Match → Account creation → Series works end-to-end
- [ ] Day-gating respects 7 AM user timezone
- [ ] All 12 core modules render correctly
- [ ] Series completion flow works
- [ ] Magic link auth functional
- [ ] Share flow works
- [ ] Print-friendly download works
- [ ] Navigation, settings, error pages complete
- [ ] Mobile responsive
- [ ] Dark mode complete
- [ ] WCAG 2.1 AA accessibility
- [ ] Analytics tracking core metrics
- [ ] Deployed to wokegod.world

---

## Post-Sprint (Phase 2 Backlog)

Items explicitly deferred (do not work on during sprint):

- Server-generated PDFs
- Offline mode / service worker
- All Shepherd Tools
- Remaining 9 modules
- Community features
- Email sequences
- Payments

---

_Four weeks. Four tracks. One goal: seeds in the ground._
