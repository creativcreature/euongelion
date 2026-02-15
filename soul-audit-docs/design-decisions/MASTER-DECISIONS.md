# EUONGELION Master Decision Document

> **Last Updated:** January 17, 2026
> **Status:** Active
> **Target Launch:** Easter 2026

---

## Executive Summary

This document consolidates all strategic and tactical decisions made for the EUONGELION project across eight major categories. It serves as the single source of truth for project direction and should be referenced before making any implementation decisions.

| Category            | Decisions | Status   |
| ------------------- | --------- | -------- |
| Soul Audit Feature  | 16        | COMPLETE |
| Bible Reading Plan  | 10        | COMPLETE |
| App vs Web App      | 7         | COMPLETE |
| Pricing Model       | 4         | COMPLETE |
| Launch Strategy     | 5         | COMPLETE |
| Content Production  | 5         | COMPLETE |
| Technical Stack     | 4         | COMPLETE |
| Design System       | 3         | COMPLETE |
| Timeline Resolution | 3         | COMPLETE |

**Total Decisions Documented:** 56

---

## 1. SOUL AUDIT FEATURE

| Status   | Reference                                      |
| -------- | ---------------------------------------------- |
| COMPLETE | [SOUL-AUDIT-DESIGN.md](./SOUL-AUDIT-DESIGN.md) |

### Summary of 16 Decisions

The Soul Audit feature design has been fully documented in the referenced file. Key decisions include:

| #   | Decision Area   | Resolution                                              |
| --- | --------------- | ------------------------------------------------------- |
| 1   | Core Purpose    | Self-reflection tool, not diagnostic                    |
| 2   | Question Count  | 12-15 questions per assessment                          |
| 3   | Frequency       | Weekly recommended, user-controlled                     |
| 4   | Scoring Model   | Qualitative insights, not numerical scores              |
| 5   | Categories      | Faith, Relationships, Purpose, Habits, Emotional Health |
| 6   | Privacy         | All data stored locally by default                      |
| 7   | History         | Trend tracking over time                                |
| 8   | Integration     | Links to relevant devotional content                    |
| 9   | Onboarding      | Optional during initial setup                           |
| 10  | Reminders       | Gentle, dismissible prompts                             |
| 11  | Results Display | Visual + narrative format                               |
| 12  | Sharing         | Optional, user-initiated only                           |
| 13  | Customization   | Users can skip questions                                |
| 14  | Language        | Grace-centered, non-judgmental                          |
| 15  | Progress        | Celebrate growth, encourage consistency                 |
| 16  | Export          | PDF/text export option                                  |

---

## 2. BIBLE READING PLAN

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 10        |

### Decision Matrix

| #   | Decision Area         | Resolution                                       | Rationale                                                                                           |
| --- | --------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1   | **Philosophy**        | Whole Story                                      | Full understanding of the biblical narrative; covers every book, not necessarily every verse        |
| 2   | **Structure**         | Narrative Arc + Canonical Flow + Gospel-Centered | Tells the story while maintaining book order and pointing to Christ                                 |
| 3   | **Duration**          | 365 days                                         | Sabbath = verse only (no deep dive)                                                                 |
| 4   | **Start Date**        | Rolling enrollment                               | If user starts mid-week, plan begins on following Monday                                            |
| 5   | **Deep Dive Format**  | Hybrid approach                                  | Primary passage + NT connections + weekly theme + practical application                             |
| 6   | **OT/NT Balance**     | ~180 OT / ~185 NT                                | Confirmed split                                                                                     |
| 7   | **Wisdom Literature** | Contextual placement                             | Every wisdom book included; placed where narratively appropriate                                    |
| 8   | **Minor Prophets**    | All 12 included                                  | Full coverage, no omissions                                                                         |
| 9   | **Sequence**          | Genesis-Revelation order                         | Flexible within that framework                                                                      |
| 10  | **Existing Content**  | Separate track                                   | 365-day is special flagship series; other series are 7-day format (5 content + 1 recap + 1 sabbath) |

### 365-Day Plan Structure

```
Monday-Saturday: Full devotional content
Sunday (Sabbath): Single verse meditation only

Weekly Format:
- Day 1-6: Deep dive content
- Day 7: Rest / reflection verse
```

---

## 3. APP VS WEB APP

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 7         |

### Platform Strategy

| #   | Decision               | Resolution                      | Phase    |
| --- | ---------------------- | ------------------------------- | -------- |
| 1   | **Primary Platform**   | Web-first (PWA)                 | Phase 1  |
| 2   | **Native Apps**        | iOS + Android                   | Phase 2+ |
| 3   | **Push Notifications** | NO                              | --       |
| 4   | **Install Prompt**     | Midway through first devotional | Phase 1  |
| 5   | **Offline Support**    | Cache last devotional           | Phase 1  |
|     |                        | Full offline capability         | Phase 2  |
| 6   | **Domain**             | `wokegodworld.com/euongelion`   | Phase 1  |
| 7   | **Audio Content**      | Text-only                       | Phase 1  |
|     |                        | Audio added                     | Phase 2  |

### Platform Rationale

```
Web-First Benefits:
+ Faster time to market
+ Cross-platform compatibility
+ No app store approval delays
+ Easier updates and iterations
+ Lower development cost

Native App Triggers:
- Sufficient user base established
- Revenue model validated
- Development resources available
- User demand demonstrated
```

---

## 4. PRICING MODEL

| Status   | Decisions                  |
| -------- | -------------------------- |
| COMPLETE | 4 (+1 Under Consideration) |

### Revenue Strategy

| #   | Decision             | Resolution               | Notes                                             |
| --- | -------------------- | ------------------------ | ------------------------------------------------- |
| 1   | **Core Model**       | Free + Donations         | No paywall on content                             |
| 2   | **Priority**         | Reach AND Sustainability | Both matter equally                               |
| 3   | **Donation Prompts** | Settings only            | Accessible but not promoted; no guilt-driven asks |
| 4   | **External Funding** | No (Year 1)              | Cost-conscious approach; bootstrap mentality      |

### Under Consideration

| Item               | Details         | Status     |
| ------------------ | --------------- | ---------- |
| Micro-subscription | $1/month option | EVALUATING |

**Micro-subscription Notes:**

- Purpose: Cover operational costs
- Positioning: Support option, not access gate
- Implementation: Would NOT paywall any content
- Decision: Pending founder evaluation

---

## 5. LAUNCH STRATEGY

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 5         |

### Launch Parameters

| #   | Decision              | Resolution           | Status              |
| --- | --------------------- | -------------------- | ------------------- |
| 1   | **Target Date**       | Easter 2026          | ~12-13 weeks away   |
| 2   | **Content Minimum**   | 20+ series           | Required for launch |
| 3   | **Audience Approach** | Private beta first   | Soft launch         |
| 4   | **Beta Testers**      | Need to recruit      | NONE LINED UP       |
| 5   | **Marketing**         | Social media primary | Varied strategies   |

### Launch Readiness Checklist

| Item                  | Required | Status         |
| --------------------- | -------- | -------------- |
| 20+ devotional series | YES      | NOT STARTED    |
| 365-day plan content  | YES      | NOT STARTED    |
| Beta tester group     | YES      | NOT RECRUITED  |
| PWA functional        | YES      | IN DEVELOPMENT |
| wokeGod integration   | YES      | NOT STARTED    |
| Marketing assets      | YES      | NOT STARTED    |

---

## 6. CONTENT PRODUCTION

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 5         |

### Production Framework

| #   | Decision             | Resolution           | Details                                                  |
| --- | -------------------- | -------------------- | -------------------------------------------------------- |
| 1   | **Voice/Creation**   | AI-generated         | Claude drafts at scale, founder reviews                  |
| 2   | **Production Pace**  | ~42 devotionals/week | Aggressive target (revised from 5-10)                    |
| 3   | **365-Day Priority** | HIGHEST              | Flagship series                                          |
| 4   | **Review Process**   | Founder reviews all  | Batch review process for efficiency                      |
| 5   | **AI Constraints**   | Strict guardrails    | No hallucinations; verified Scripture; orthodox theology |

### Content Pipeline (Revised for Scale)

```
Stage 1: AI Batch Generation (Claude)
    |  - Generate in series batches (7 at a time)
    |  - Built-in verification prompts
    v
Stage 2: Automated Checks
    |  - Scripture reference validation
    |  - Format consistency check
    v
Stage 3: Founder Batch Review
    |  - Review 6-7 devotionals per session
    |  - Edit or reject as needed
    v
Stage 4: Publication Queue
```

### Weekly Production Schedule (Target)

| Day | Generation    | Review                |
| --- | ------------- | --------------------- |
| Mon | 7 devotionals | Review previous batch |
| Tue | 7 devotionals | Review previous batch |
| Wed | 7 devotionals | Review previous batch |
| Thu | 7 devotionals | Review previous batch |
| Fri | 7 devotionals | Review previous batch |
| Sat | 7 devotionals | Catch-up              |
| Sun | Buffer        | Rest                  |

---

## 7. TECHNICAL STACK

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 4         |

### Technical Decisions

| #   | Decision           | Resolution       | Notes                                      |
| --- | ------------------ | ---------------- | ------------------------------------------ |
| 1   | **Timeline**       | 8+ weeks         | Development estimate                       |
| 2   | **Build Team**     | Founder + Claude | AI-assisted development                    |
| 3   | **Hosting**        | Vercel           | Platform choice                            |
| 4   | **Authentication** | All options      | Email/password + Magic link + Social login |

### Tech Stack Overview

```
Frontend:     PWA (Progressive Web App)
Hosting:      Vercel
Auth:         Multi-method (email, magic link, social)
Database:     TBD
CDN:          Vercel Edge
Domain:       wokegodworld.com/euongelion
```

---

## 8. DESIGN SYSTEM

| Status   | Decisions |
| -------- | --------- |
| COMPLETE | 3         |

### Design Decisions

| #   | Decision      | Resolution                    | Phase                       |
| --- | ------------- | ----------------------------- | --------------------------- |
| 1   | **Dark Mode** | At launch                     | MVP feature                 |
| 2   | **Images**    | Rich media throughout         | Devotionals include imagery |
| 3   | **Branding**  | Fully integrated with wokeGod | Unified brand identity      |

### Design Requirements

- Dark mode as MVP feature (not Phase 2)
- Rich media/images embedded in devotional content
- Visual consistency with wokeGod parent brand
- Mobile-first responsive design

---

## TIMELINE ANALYSIS

### Current State

| Parameter       | Value                 |
| --------------- | --------------------- |
| Target Launch   | Easter 2026           |
| Time Remaining  | ~12-13 weeks          |
| Production Pace | 5-10 devotionals/week |

### Content Requirements

| Content Type    | Count Needed                               |
| --------------- | ------------------------------------------ |
| Standard Series | 20+ series x 7 days = **140+ devotionals** |
| 365-Day Plan    | **365 devotionals**                        |
| **TOTAL**       | **505+ devotionals**                       |

### Production Reality Check

| Scenario | Weekly Output | Weeks to Complete 505 |
| -------- | ------------- | --------------------- |
| Low End  | 5/week        | 101 weeks             |
| High End | 10/week       | 50.5 weeks            |
| Required | ~42/week      | 12 weeks              |

### The Gap

```
Available Time:     12-13 weeks
Required Content:   505+ devotionals
Current Pace:       5-10/week
Pace Needed:        ~42/week

GAP: Current pace delivers 60-130 devotionals
     vs. 505+ needed = 375-445 SHORTFALL
```

---

## TIMELINE RESOLUTION

> **Status:** DECISION MADE
> **Date:** January 17, 2026

### Options Considered

| Option               | Description                     | Trade-offs                                   |
| -------------------- | ------------------------------- | -------------------------------------------- |
| A. Delay Launch      | Push to Fall 2026               | More time, but misses Easter momentum        |
| B. Reduce Scope      | Launch with fewer series        | Faster, but less content variety             |
| **C. Increase Pace** | AI batch generation with review | Higher volume, review bottleneck risk        |
| D. Hybrid Approach   | Launch 365-day only + 5 series  | Focused offering, can add series post-launch |

### CHOSEN: Option C - Aggressive AI Generation

**Founder Decision:**

> "We will aggressively tackle the content. Content depth and series variety matter most."

**Launch Priorities:**

1. Series variety - multiple content tracks available at launch
2. Content depth - no shallow or thin devotionals
3. 365-day plan + 20+ standard series

### AI Content Constraints (CRITICAL)

**Comfort Level:** Moderately comfortable with AI-heavy content

**Founder Requirement:**

> "I will have to fully constrain the writer so that no hallucinations happen and info is verified and credentialed."

**Required Guardrails:**

- All Scripture references must be verified against actual text
- No fabricated quotes, statistics, or historical claims
- Theological positions must align with established orthodox Christianity
- Citations required for any factual claims
- Founder review of all content before publication
- Batch review process to enable high throughput

### Revised Production Target

| Metric         | Value                     |
| -------------- | ------------------------- |
| Content needed | 505+ devotionals          |
| Time available | 12-13 weeks               |
| Weekly target  | ~42 devotionals/week      |
| AI role        | Draft generation at scale |
| Human role     | Review, edit, approve     |

### Risk Mitigation

| Risk                   | Mitigation                                       |
| ---------------------- | ------------------------------------------------ |
| Hallucinated Scripture | Verify all references against Bible API/database |
| Theological errors     | Style guide with doctrinal boundaries            |
| Quality dilution       | Batch review with rejection criteria             |
| Founder burnout        | Structured review sessions, not ad-hoc           |

---

## OPEN ITEMS & FOLLOW-UPS

### Priority 1: Critical Path

| Item                                       | Owner            | Due                | Status                   |
| ------------------------------------------ | ---------------- | ------------------ | ------------------------ |
| Recruit beta testers                       | Founder          | 4 weeks pre-launch | NOT STARTED              |
| ~~Resolve content/timeline tension~~       | Founder          | Jan 17, 2026       | **COMPLETE**             |
| ~~Create AI content constraints document~~ | Founder + Claude | Jan 17, 2026       | **COMPLETE**             |
| ~~Build verified source/quote bank~~       | Founder + Claude | Jan 17, 2026       | **STARTED** (~60 quotes) |
| Set up wokeGod integration architecture    | Dev Team         | 6 weeks pre-launch | NOT STARTED              |

### Priority 2: Important

| Item                                | Owner            | Due                | Status      |
| ----------------------------------- | ---------------- | ------------------ | ----------- |
| Finalize micro-subscription details | Founder          | Pre-launch         | EVALUATING  |
| Define beta tester criteria         | Founder          | 5 weeks pre-launch | NOT STARTED |
| Create content production templates | Founder + Claude | 2 weeks            | NOT STARTED |

### Priority 3: Ongoing

| Item                              | Owner    | Due                | Status      |
| --------------------------------- | -------- | ------------------ | ----------- |
| Document brand guidelines         | Design   | Pre-launch         | NOT STARTED |
| Set up analytics tracking         | Dev Team | Pre-launch         | NOT STARTED |
| Create marketing content calendar | Founder  | 4 weeks pre-launch | NOT STARTED |

---

## DECISION LOG

| Date             | Category     | Decision                                                                   | Made By     |
| ---------------- | ------------ | -------------------------------------------------------------------------- | ----------- |
| Jan 2026         | Soul Audit   | 16 feature decisions                                                       | Founder     |
| Jan 2026         | Bible Plan   | 10 structure decisions                                                     | Founder     |
| Jan 2026         | Platform     | Web-first PWA approach                                                     | Founder     |
| Jan 2026         | Pricing      | Free + Donations model                                                     | Founder     |
| Jan 2026         | Launch       | Easter 2026 target                                                         | Founder     |
| Jan 2026         | Content      | AI-assisted production                                                     | Founder     |
| Jan 2026         | Technical    | Vercel + multi-auth                                                        | Founder     |
| Jan 2026         | Design       | Dark mode at launch                                                        | Founder     |
| **Jan 17, 2026** | **Timeline** | **Aggressive AI generation - keep Easter 2026, full scope, ~42/week pace** | **Founder** |

---

## DOCUMENT CONTROL

| Version | Date         | Changes                                              | Author           |
| ------- | ------------ | ---------------------------------------------------- | ---------------- |
| 1.0     | Jan 17, 2026 | Initial consolidation                                | Founder + Claude |
| 1.1     | Jan 17, 2026 | Timeline resolution: aggressive AI generation chosen | Founder + Claude |

---

**Total Decisions:** 56 (53 original + 3 timeline)

_This document should be reviewed and updated after each major decision session._
