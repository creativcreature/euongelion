# Pricing Strategy Decision Document

**Version:** 1.0
**Created:** January 17, 2026
**Status:** DECISION REQUIRED
**Decision Maker:** Founder

---

## Executive Summary

This document presents four pricing model options for EUONGELION, with analysis of each approach's implications for sustainability, growth, audience reach, and mission alignment.

**The goal:** Find a pricing model that sustains the platform while removing barriers for lost sheep finding their way home.

**Key Tension:** EUONGELION's target audience (the drifted, the seeking, the struggling) may have financial constraints or may not be ready to pay for spiritual content. Yet quality content requires sustainable funding.

---

## Market Context

### Competitor Pricing

| App             | Model               | Price                    | Notes                                |
| --------------- | ------------------- | ------------------------ | ------------------------------------ |
| YouVersion      | Free (donation)     | $0                       | Church-funded, massive scale         |
| She Reads Truth | Freemium + products | $9.99/yr or free limited | Physical products major revenue      |
| Dwell           | Subscription        | $3.99/mo / $39.99/yr     | Audio Bible only                     |
| Pray.com        | Freemium            | $9.99/mo / $79.99/yr     | Most expensive, aggressive upselling |
| Hallow          | Freemium            | $8.99/mo / $69.99/yr     | High production value justifies      |

### User Expectations

- Many users expect Bible/devotional apps to be free (YouVersion effect)
- Subscription fatigue is real (users have Netflix, Spotify, etc.)
- Christian content has "should be free" expectation ("ministry, not business")
- However: users pay for quality (Headspace, Calm, MasterClass)

---

## Option A: Completely Free

### How It Works

- All content free to all users, forever
- No paywalls, no premium tiers
- Supported by external funding (donations, grants, church partnerships)

### Implementation

- Launch as free from day one
- Optional donation feature ("Support this ministry")
- Seek church partnerships for sponsorship
- Apply for Christian foundation grants

### Pros

| Benefit                   | Impact                                                   |
| ------------------------- | -------------------------------------------------------- |
| **Zero Barrier to Entry** | Maximum reach to seekers and the financially constrained |
| **Mission Alignment**     | "Free gift" mirrors the gospel itself                    |
| **Word-of-Mouth**         | Easy to recommend without "but it costs..."              |
| **Simplicity**            | No complex tier management, no paywalls to design        |
| **Trust Building**        | No commercial perception, pure ministry                  |

### Cons

| Risk                           | Mitigation                                       |
| ------------------------------ | ------------------------------------------------ |
| **Financial Unsustainability** | Requires ongoing fundraising effort              |
| **Donor Dependence**           | Single large donor loss could cripple operations |
| **Devaluation**                | "Free" can signal "low value"                    |
| **Scaling Challenges**         | More users = more cost, no matching revenue      |
| **Founder Time Sink**          | Fundraising distracts from content creation      |

### Sustainability Analysis

**Annual Operating Costs (Estimated):**

- Hosting/Infrastructure: $2,400-6,000
- Domain/SSL: $100
- Email service: $600-1,200
- AI API costs (Claude for generation): $0 (OAuth to subscription)
- Font licensing (if needed): $500-2,000
- Total: $3,600-9,300/year minimum

**Funding Required:**

- ~$10,000/year for lean operation
- Realistically $25,000-50,000/year if scaling

**Funding Sources:**

1. Personal funds (founder)
2. Individual donations (via platform)
3. Church partnerships ($500-2,000/month each)
4. Christian foundation grants ($10,000-100,000)
5. wokeGod umbrella organization

### Growth Implications

- Fastest user acquisition (no friction)
- Hardest to sustain at scale
- Works best if part of larger funded organization

### Verdict: HIGH MISSION ALIGNMENT, HIGH RISK

---

## Option B: Freemium Model

### How It Works

- Core content free
- Premium features or content behind paywall
- Subscription unlocks full experience

### Tier Structure Options

**Option B1: Content-Gated Freemium**
| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Onboarding series + 1 core series |
| Premium | $4.99/mo or $39.99/yr | All series, all content |

**Option B2: Feature-Gated Freemium**
| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | All content, limited features |
| Premium | $4.99/mo or $39.99/yr | Audio devotionals, offline, print PDFs, advanced search |

**Option B3: Depth-Gated Freemium**
| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Devotional essays (core content) |
| Premium | $4.99/mo or $39.99/yr | Word studies, deep dives, shepherd tools, citations |

### Pros

| Benefit                 | Impact                                 |
| ----------------------- | -------------------------------------- |
| **Sustainable Revenue** | Predictable monthly/annual income      |
| **Low Barrier Entry**   | Free tier still reaches seekers        |
| **Value Demonstration** | Users experience quality before paying |
| **Market Validation**   | Paying users prove product-market fit  |
| **Scalable**            | Revenue scales with user growth        |

### Cons

| Risk                      | Mitigation                                      |
| ------------------------- | ----------------------------------------------- |
| **Paywall Frustration**   | Careful design of what's free vs. paid          |
| **Complexity**            | Two experiences to maintain                     |
| **Perception Problem**    | "Pay to encounter God" feels wrong              |
| **Conversion Pressure**   | Must optimize for conversion (feels commercial) |
| **Feature Fragmentation** | Harder to design cohesive experience            |

### What Should Be Free vs. Paid?

**Always Free (Non-Negotiable):**

- Onboarding content (first impression)
- Core devotional essays (the mission)
- Scripture text (obviously)
- Basic reading experience
- One complete series (to demonstrate value)

**Potentially Paid:**

- Audio narration of devotionals
- Offline access / downloads
- Print-friendly PDF exports
- Advanced word study tools
- Shepherd/leader tools
- Early access to new series
- Additional series beyond 1 free

**Never Paid:**

- Basic access to encounter Scripture
- The gospel message itself
- Entry-level content for seekers

### Recommended Freemium Structure

| Free Forever                | Premium ($4.99/mo or $39.99/yr) |
| --------------------------- | ------------------------------- |
| Full onboarding series      | All series unlocked             |
| 1 complete series of choice | Audio devotionals               |
| Basic reading experience    | Offline downloads               |
| Breath prayers, reflections | Print-quality PDFs              |
| Share features              | Shepherd tools                  |
| Dark mode                   | Early access                    |

### Sustainability Analysis

**Conversion Assumptions:**

- Free users: 10,000
- Conversion rate: 2-5% (industry standard)
- Paying users: 200-500
- Annual price: $39.99
- Annual revenue: $8,000-20,000

**Break-Even:**

- Need ~250 paying users at $39.99/yr to cover $10,000 operating costs
- Need ~625 paying users for $25,000 sustainable operation

### Verdict: BALANCED APPROACH, MODERATE COMPLEXITY

---

## Option C: Free with Voluntary Donations

### How It Works

- All content free to everyone
- Prominent but non-intrusive donation option
- "Pay what you can" / "Support this ministry" model
- Similar to Wikipedia, Patreon creator model

### Implementation

**Donation Integration Points:**

1. End of series: "This content was free. Consider supporting."
2. Settings page: "Support EUONGELION"
3. Occasional (rare) in-content prompts
4. Email follow-ups after engagement milestones

**Donation Tiers (Suggested, Not Required):**
| Tier | Amount | Recognition |
|------|--------|-------------|
| Supporter | $5/month | Email thank you |
| Sustainer | $15/month | Name in annual report |
| Patron | $50/month | Early access + direct founder access |
| One-time | Any amount | Gratitude |

### Pros

| Benefit                   | Impact                                                        |
| ------------------------- | ------------------------------------------------------------- |
| **Zero Barrier**          | Same as fully free                                            |
| **Voluntary**             | Those who can, support those who can't                        |
| **Mission Integrity**     | "Gift economy" aligns with gospel                             |
| **Higher Per-User Value** | Committed donors often give more than subscription would cost |
| **Simplicity**            | One experience for everyone                                   |

### Cons

| Risk                       | Mitigation                               |
| -------------------------- | ---------------------------------------- |
| **Unpredictable Revenue**  | Build reserve fund, diversify funding    |
| **Low Conversion**         | Typical donation rate 1-3% of users      |
| **Requires Scale**         | Need many users for donations to sustain |
| **Donor Fatigue**          | Can't ask too often                      |
| **No Recurring Guarantee** | One-time donors may not return           |

### Donation Messaging (On-Brand)

**What NOT to Say:**

- "We need your help to survive!"
- "Don't miss out on exclusive content!"
- "Your streak will be lost!"

**What TO Say:**

- "This content is free because someone believed you should have access."
- "If EUONGELION has been meaningful, consider supporting the mission."
- "Pay what you can. Give what you're able. No pressure."
- "Your gift makes this possible for others who can't afford to pay."

### Sustainability Analysis

**Donation Assumptions:**

- Active users: 5,000
- Donation rate: 2%
- Donors: 100
- Average donation: $10/month
- Annual revenue: $12,000

**More Optimistic:**

- Active users: 10,000
- Donation rate: 3%
- Donors: 300
- Average donation: $12/month
- Annual revenue: $43,200

### Verdict: HIGH MISSION ALIGNMENT, REQUIRES SCALE

---

## Option D: Subscription After Trial

### How It Works

- 7-30 day free trial with full access
- Subscription required to continue
- No free tier after trial ends

### Implementation

**Trial Period:**

- 14-day trial (industry standard)
- Full access to all features
- Credit card required at signup (optional)
- Clear communication of trial end date

**Post-Trial Pricing:**
| Plan | Price | Billing |
|------|-------|---------|
| Monthly | $5.99 | Monthly |
| Annual | $49.99 | Annual (30% savings) |
| Lifetime | $149.99 | One-time |

### Pros

| Benefit                 | Impact                         |
| ----------------------- | ------------------------------ |
| **Sustainable Revenue** | Most predictable income        |
| **Committed Users**     | Paying users are engaged users |
| **Simple Model**        | One experience, one price      |
| **Higher ARPU**         | No free tier diluting metrics  |
| **Industry Standard**   | Users understand this model    |

### Cons

| Risk                       | Mitigation                                   |
| -------------------------- | -------------------------------------------- |
| **High Barrier**           | Seekers may not pay to "try God"             |
| **Mission Conflict**       | Paywall between people and spiritual content |
| **Churn Risk**             | Must continuously prove value                |
| **Word-of-Mouth Friction** | Harder to recommend                          |
| **Exclusivity Perception** | "Only for those who can afford it"           |

### Sustainability Analysis

**Assumptions:**

- Trial starts: 1,000/month
- Trial-to-paid conversion: 10%
- New subscribers: 100/month
- Annual price: $49.99
- 12-month churn: 50%

**Year 1 Revenue:**

- Month 1: 100 subscribers x $4.17 = $417
- Month 6: ~400 subscribers = $1,668
- Month 12: ~600 subscribers = $2,502
- Year 1 total: ~$15,000

### Trial Length Analysis

| Length  | Pros                             | Cons                           |
| ------- | -------------------------------- | ------------------------------ |
| 7 days  | Quick decision, less free-riding | Not enough to experience value |
| 14 days | Industry standard, balanced      | Still short for slow readers   |
| 30 days | Completes one series             | High free-riding risk          |

**Recommendation if choosing this option:** 14-day trial, no credit card required upfront.

### Verdict: SUSTAINABLE BUT CREATES BARRIERS

---

## Comparative Analysis

### Mission Alignment Score

| Option             | Score | Reasoning                         |
| ------------------ | ----- | --------------------------------- |
| A: Completely Free | 10/10 | Zero barriers, pure mission       |
| B: Freemium        | 7/10  | Core content free, premium extras |
| C: Donations       | 9/10  | Free access, voluntary support    |
| D: Subscription    | 4/10  | Paywall to spiritual content      |

### Financial Sustainability Score

| Option             | Score | Reasoning                 |
| ------------------ | ----- | ------------------------- |
| A: Completely Free | 3/10  | Requires external funding |
| B: Freemium        | 8/10  | Predictable, scalable     |
| C: Donations       | 5/10  | Variable, requires scale  |
| D: Subscription    | 9/10  | Most predictable          |

### Growth Potential Score

| Option             | Score | Reasoning                 |
| ------------------ | ----- | ------------------------- |
| A: Completely Free | 10/10 | Maximum reach             |
| B: Freemium        | 8/10  | Good reach, some friction |
| C: Donations       | 9/10  | Nearly maximum reach      |
| D: Subscription    | 5/10  | Significant friction      |

### Operational Complexity Score (Lower is Better)

| Option             | Score | Reasoning                    |
| ------------------ | ----- | ---------------------------- |
| A: Completely Free | 2/10  | Simplest                     |
| B: Freemium        | 7/10  | Two tiers, paywall logic     |
| C: Donations       | 4/10  | Simple + donation UI         |
| D: Subscription    | 5/10  | Auth + billing + trial logic |

---

## Founder Decision Framework

### Questions to Consider

1. **What is the funding situation?**
   - Is there existing budget/runway?
   - Can wokeGod support EUONGELION's costs?
   - Are there potential church partners or donors?

2. **What is the growth priority?**
   - Maximize reach to seekers? (Options A, C)
   - Build sustainable business? (Options B, D)

3. **What feels right theologically?**
   - Is paywalling spiritual content acceptable?
   - Does "free gift" messaging matter?

4. **What is the capacity for fundraising?**
   - Willing to pursue grants and church partnerships? (Option A)
   - Prefer revenue to come from users? (Options B, D)

5. **What is the long-term vision?**
   - Ministry supported by donations?
   - Self-sustaining platform?
   - Part of larger wokeGod ecosystem?

---

## Recommendation

### Primary Recommendation: Option C (Free with Donations)

**Rationale:**

1. **Mission First**
   - EUONGELION's audience includes seekers, the drifted, and the struggling
   - These groups may not pay for spiritual content they're unsure about
   - Removing financial barriers aligns with "lost sheep finding their way home"

2. **Gospel Alignment**
   - "Freely you have received, freely give" (Matthew 10:8)
   - Gift economy mirrors the nature of grace
   - On-brand for "good news" messaging

3. **Growth Priority**
   - MVP needs users for validation, not revenue
   - Word-of-mouth works better when free
   - Build audience first, monetize later if needed

4. **Sustainable with Effort**
   - If content is exceptional, donations will come
   - Church partnerships and grants are available
   - Can add premium features later if donations insufficient

5. **Low Complexity**
   - One experience for everyone
   - No paywall logic to design/maintain
   - Simpler codebase

### Fallback Recommendation: Option B (Freemium)

**If donations prove insufficient after 6-12 months:**

- Core devotional content remains free forever
- Add premium features (audio, offline, PDFs) as subscription
- Price at $3.99/month or $29.99/year (accessible)
- Never paywall the primary reading experience

### Hybrid Approach (Consider)

**Free + Donations + Optional Premium:**

- All core content free forever
- Donation prompts for those who want to give
- Optional premium tier for bonus features (audio, tools)
- Allows giving without requiring payment

---

## Implementation Roadmap

### Phase 1: MVP Launch (Weeks 1-4)

- Launch completely free
- No donation asks during initial onboarding
- Focus on quality and user acquisition

### Phase 2: Soft Donation (Weeks 5-8)

- Add subtle "Support" link in footer/settings
- End-of-series donation prompt
- Track donation conversion rates

### Phase 3: Evaluate (Week 12)

- Review donation revenue
- Assess user growth
- Decide: continue donations-only or add freemium tier

### Phase 4: Adjust (If Needed)

- If donations sustaining: continue as-is
- If insufficient: implement freemium with premium audio/offline

---

## Decision Template

**Founder: Please indicate your decision below.**

```
PRICING DECISION

Selected Option: [ A / B / C / D / Other ]

If Option B, preferred structure: [ B1 / B2 / B3 ]

If Option B/D, target price point: $____/month or $____/year

Additional notes:
_________________________________________________
_________________________________________________

Signed: _________________
Date: _________________
```

---

## Appendix: Messaging for Each Option

### If Option A (Completely Free)

> "EUONGELION is free. Forever. Because the good news has always been a gift."

### If Option B (Freemium)

> "Core content is always free. Premium features support the mission."

### If Option C (Donations)

> "This content is free because we believe it should be. If it's been valuable, consider giving back."

### If Option D (Subscription)

> "Start your free trial. Experience what depth feels like."

---

**End of Document**

_Decision Required By: Before MVP Launch_
_Document Owner: Founder_
