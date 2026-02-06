# Soul Audit Design Decisions

**Status:** ALL DECISIONS FINALIZED
**Last Updated:** January 17, 2026
**Related Documents:** UX-FLOW-MAPS.md, MODULE-MAPPING.md, CONTENT-DEVELOPMENT-PLAN.md

---

## Decisions Finalized

The following decisions were made during the January 17, 2026 design session:

### 1. Question Format

**DECIDED:** Single open-ended question - "What are you wrestling with?"

### 2. Minimum Character Count

**DECIDED:** Soft validation approach

- **Empty** = blocked (must enter something)
- **1-9 characters** = gentle nudge with option to continue
- **10+ characters** = proceed normally

### 3. Matching Logic

**DECIDED:** Option C - Claude API + Keyword Fallback

- **Primary:** Claude API for semantic analysis (~$0.02-0.05 per audit)
- **Fallback:** Keyword matching (zero cost) if API fails

### 4. Audit Limit

**DECIDED:** 3 attempts per series cycle (not lifetime)

### 5. Time-Based Reset

**DECIDED:** 3 audits reset when series completes

- Series structure: 5 content days + 1 recap + 1 sabbath = 7 days
- User gets fresh 3 audits at start of each new series

### 6. Low Confidence Handling

**DECIDED:** Present top 3 matches + optional clarifying question

- User can pick from suggestions or answer clarifying question

### 7. Short Answer Handling

**DECIDED:** Same as low confidence fallback

- Treat short answers as low-signal, offer top 3 matches

### 8. Crisis Response Protocol

**DECIDED:** Four-step protocol:

1. **Step 1:** Acknowledge the weight of what they shared
2. **Step 2:** Present crisis resources (988, Crisis Text Line) - require acknowledgment
3. **Step 3:** Warm offer - "Would you like someone to pray for you?"
4. **Step 4:** Clear path to continue to devotional content

### 9. Default Fallback (No Match)

**DECIDED:** Let user browse all series manually

- If Claude API and keyword matching both fail to produce a confident match, present the full series catalog for manual selection

### 10. Data Retention

**DECIDED:** Full text stored, anonymized

- Store audit responses for matching improvement but anonymize user association
- Privacy-first approach: no user data at risk

### 11. Pre-Account Audit

**DECIDED:** Yes, but account required to see results

- Users can take the audit before signup
- Must create account to view their matched series and proceed

### 12. Re-Audit Visibility

**DECIDED:** Subtle

- Not prominent on dashboard
- Available but not pushing users to re-audit constantly

### 13. Audit Analytics

**DECIDED:** Anonymized data if possible; aggregate-only if anonymization not feasible

- Priority on privacy over data richness
- Track patterns for system improvement without individual exposure

### 14. Multi-Series Recommendation

**DECIDED:** AI audit recommends ONE series at a time

- Users can manually queue additional series themselves
- AI focuses user on single series; queuing is user-controlled
- Goal: focused engagement, not buffet browsing

### 15. Skip Audit Option

**DECIDED:** Yes, users can skip and browse freely

- Skipping = no personalized setup, manual selection
- Any series can be set as user's "active" series
- AI audit flow: produces 3 options → user picks one → that's their series
- Manual queue is separate from AI recommendation

### 16. Returning User Flow

**DECIDED:** Prompted on series completion day

- Final day includes series recap
- Prompt offers: re-audit OR select another series manually
- Not automatic re-audit; user chooses

---

## Executive Summary

The Soul Audit is EUONGELION's signature intake experience - the first meaningful interaction a user has with the platform. It sets the tone for everything that follows and determines which devotional series a user will begin.

This document presents OPTIONS for you to choose. Each section includes trade-offs to help you decide.

---

## 1. Soul Audit Philosophy

### What It Is

The Soul Audit is the mechanism by which users are matched to the right devotional series based on their current spiritual, emotional, and life circumstances. It's the digital equivalent of a pastoral intake conversation.

### Why It Matters

- **First impression:** This is the user's first experience of EUONGELION's voice
- **Trust establishment:** How we ask reveals what we value
- **Match quality:** Better input = better series matching = higher engagement
- **Brand differentiator:** No other devotional app does this with this level of intentionality

### The Central Tension: Pastoral vs. Algorithmic

| Pastoral Approach          | Algorithmic Approach        |
| -------------------------- | --------------------------- |
| Open-ended, conversational | Structured, predictable     |
| Feels like being heard     | Feels like a quiz           |
| Requires AI interpretation | Simple keyword matching     |
| Higher API cost            | Zero API cost               |
| More intimate              | More efficient              |
| Less predictable outcomes  | Highly predictable outcomes |

**The core question:** Do we want the Soul Audit to feel like talking to a wise friend or taking a spiritual assessment?

---

## 2. Question Format Options

### OPTION A: Single Open-Ended Question

**The Question:**

> "What's weighing on your heart?"

**Supporting copy:**

> Share honestly. This helps us find the right words for where you are right now.
> Take your time. There's no wrong answer.

**Pros:**

- Maximum intimacy - feels like being asked by a pastor
- Low friction - one field, one action
- Rich data - user can share what's actually relevant
- Memorable - differentiated from every quiz-based app
- Respects user intelligence - doesn't force them into boxes
- Aligns with EUONGELION's "Deep Not Wide" philosophy

**Cons:**

- Requires Claude API for interpretation (~$0.02-0.05 per audit)
- Less predictable matching - AI may misinterpret
- User anxiety - "What should I write?" paralysis
- Short answers provide less signal
- Edge cases harder to handle (one-word answers, trauma disclosure)

**Current UX-FLOW-MAPS.md Status:** This is the documented approach

---

### OPTION B: Multiple Choice Questions (3-5 Questions)

**Sample Question Set:**

**Q1: What season best describes where you are spiritually?**

- [ ] Drifting - I've lost connection with God
- [ ] Seeking - I have questions and want answers
- [ ] Growing - I want to go deeper in faith
- [ ] Hurting - I'm walking through pain or loss
- [ ] Doubting - I'm not sure what I believe anymore

**Q2: What's your primary struggle right now?**

- [ ] I'm too busy for God
- [ ] I'm dealing with grief or loss
- [ ] I'm wrestling with doubt or questions
- [ ] I'm struggling with anger or frustration
- [ ] I feel spiritually stuck or dry

**Q3: How do you best receive truth?**

- [ ] Through stories and examples
- [ ] Through logical explanation
- [ ] Through emotional connection
- [ ] Through practical application

**Pros:**

- Zero AI cost - pure pattern matching
- Predictable outcomes - same inputs = same outputs
- Faster for users - no typing required
- Easier analytics - categorical data is clean
- Consistent matching - no interpretation variance

**Cons:**

- Feels like a quiz, not a conversation
- Forces users into pre-defined boxes
- Less personal data captured
- Users may not see themselves in the options
- Doesn't differentiate from other apps
- May feel clinical rather than pastoral

---

### OPTION C: Hybrid Approach

**Step 1: Open-ended (primary)**

> "What's weighing on your heart?"
> [textarea]

**Step 2: Clarifying MCQ (if needed)**

> Based on what you shared, which resonates most?
>
> - [ ] "I need rest and recovery"
> - [ ] "I need answers to hard questions"
> - [ ] "I need comfort in pain"
> - [ ] "I need direction and purpose"

**Step 3: Optional depth selector**

> How much time can you give to this each day?
>
> - [ ] A few minutes (1-min immersion)
> - [ ] About 5 minutes
> - [ ] 15+ minutes (deep dive)

**Pros:**

- Best of both worlds - intimacy + precision
- Fallback mechanism if AI interpretation is uncertain
- Captures both emotional data and categorical data
- User feels heard AND understood
- Allows Claude to verify its interpretation

**Cons:**

- More steps = more friction
- Longer flow may lose some users
- More complex to build and maintain
- Still requires AI for step 1
- Users may feel over-questioned

---

### RECOMMENDATION

**Option A (Single Open-Ended) with guardrails.**

**Reasoning:**

1. **Brand alignment:** EUONGELION is positioned as "Deep Not Wide" - the single question embodies this
2. **Differentiation:** Every other app uses quizzes. This is memorable.
3. **Data quality:** Open responses reveal more than checkbox selections
4. **Pastoral tone:** Sets the expectation for the entire platform experience
5. **Cost is acceptable:** At $0.02-0.05 per audit with 3-audit limit, lifetime cost per user is ~$0.15

**Guardrails to add:**

- Minimum character count (10-15 characters) before continue button enables
- Fallback prompt if Claude can't determine match with >70% confidence
- Crisis detection and response protocol

**Alternative consideration:** If you want lower friction, consider Option A as default with Option C's clarifying MCQ only when the AI confidence is below threshold.

---

## 3. Matching Logic Options

### OPTION A: Keyword Matching (Simple)

**How it works:**

- Each series has a list of `soulAuditKeywords` (already in JSON files)
- User response is tokenized and matched against keywords
- Series with highest keyword hits is selected

**Example from too-busy-for-god.json:**

```json
"soulAuditKeywords": [
  "busy", "overwhelmed", "empty", "meaningless", "exhausted",
  "running", "hustle", "no time", "stressed", "anxious"
]
```

**Pros:**

- Zero API cost
- Instant response
- Completely predictable
- Easy to debug and adjust
- Works offline

**Cons:**

- Misses context ("I'm NOT busy" still matches "busy")
- Can't handle nuance or synonyms
- Limited to exact/stem matches
- Requires extensive keyword lists
- Poor match quality for complex responses

**Cost:** $0

---

### OPTION B: Claude API Semantic Analysis

**How it works:**

- User response sent to Claude API
- Claude analyzes emotional state, life circumstances, spiritual needs
- Claude returns series recommendation with reasoning

**Prompt structure (example):**

```
You are matching a user to a devotional series based on their response to
"What's weighing on your heart?"

User response: "{user_input}"

Available series:
1. Too Busy for God - For those overwhelmed by busyness and activity
2. Wrestling with Doubt - For those questioning faith
3. Grieving with Hope - For those processing loss
[...etc]

Return:
- primary_match: series_id
- confidence: 0.0-1.0
- reasoning: one sentence explaining why
- alternatives: [up to 2 other series]
```

**Pros:**

- Understands context and nuance
- Handles synonyms, negation, complex expressions
- Can detect emotional undertones
- Provides reasoning for the match
- Can suggest alternatives
- Adapts to new series without keyword updates

**Cons:**

- API cost (~$0.02-0.05 per call)
- Latency (2-4 seconds)
- Requires API availability
- Occasional inconsistency
- Black box - harder to debug

**Cost:** ~$0.02-0.05 per audit

---

### OPTION C: Pre-defined Persona Buckets

**How it works:**

- Define 5-8 "spiritual personas" (archetypes)
- Each persona maps to specific series
- User is matched to persona, then persona to series

**Example Personas:**

1. **The Overwhelmed** - Busy, stressed, running from themselves
2. **The Doubter** - Questioning, skeptical, seeking evidence
3. **The Grieving** - Processing loss, pain, disappointment
4. **The Seeker** - New to faith, exploring, curious
5. **The Dry** - Long-time believer, spiritually stuck
6. **The Angry** - Frustrated with God, church, or life

**Pros:**

- Creates clear user segments for analytics
- Easy to explain matching logic
- Can use either keywords OR AI to determine persona
- Scales well as series library grows
- Enables targeted communication

**Cons:**

- Another layer of abstraction
- Users may not fit cleanly into one bucket
- Requires maintaining persona definitions
- May feel reductive

**Cost:** Depends on detection method (keyword = $0, AI = $0.02-0.05)

---

### OPTION D: Weighted Scoring System

**How it works:**

- Each series has multiple matching dimensions with weights
- User response is analyzed across dimensions
- Weighted scores determine match

**Dimensions:**
| Dimension | Weight | Example Signals |
|-----------|--------|-----------------|
| Emotional State | 30% | "overwhelmed", "peaceful", "angry" |
| Life Circumstance | 25% | "loss", "transition", "stuck" |
| Spiritual State | 25% | "doubting", "growing", "drifting" |
| Need Type | 20% | "comfort", "challenge", "answers" |

**Pros:**

- More nuanced than simple keywords
- Tunable weights allow optimization
- Can combine multiple matching signals
- Provides match strength/confidence

**Cons:**

- Complex to implement and maintain
- Requires defining all dimensions
- Still needs some form of signal extraction
- May over-engineer the problem

**Cost:** Depends on signal extraction method

---

### RECOMMENDATION

**Option B (Claude API) as primary, with Option A (Keywords) as fallback.**

**Reasoning:**

1. **Quality over cost:** The Soul Audit happens max 3 times per user. At $0.15 lifetime cost, quality matching is worth it.
2. **Graceful degradation:** If API is unavailable, keywords provide reasonable backup.
3. **Learning opportunity:** AI responses can be logged to improve keyword lists over time.
4. **Aligns with brand:** wokeGod positions itself as thoughtful and nuanced, not algorithmic.

**Implementation priority:**

1. Build keyword matching first (it's simpler and serves as fallback)
2. Add Claude API layer on top
3. Log matches for future optimization

---

## 4. Series Matching Matrix

### Current Series Inventory (19 total)

Based on `/content/series-json/`:

| Series                              | Pathway | Days | Primary Signals                          |
| ----------------------------------- | ------- | ---- | ---------------------------------------- |
| Too Busy for God                    | Sleep   | 6    | busy, overwhelmed, exhausted, no time    |
| Why Jesus                           | Awake   | ?    | curious, seeking, new to faith           |
| What Is the Gospel                  | Awake   | ?    | basics, foundation, starting point       |
| What Does It Mean to Believe        | Awake   | ?    | faith, belief, trust                     |
| The Nature of Belief                | Awake   | ?    | doubt, intellectual, questions           |
| Once Saved Always Saved             | Awake   | ?    | security, assurance, doubt               |
| Abiding in His Presence             | Sleep   | ?    | distant, dry, disconnect                 |
| Hearing God in the Noise            | Sleep   | ?    | confused, distracted, guidance           |
| Surrender to God's Will             | Sleep   | ?    | control, anxiety, plans                  |
| What Is Carrying a Cross            | Awake   | ?    | suffering, purpose, meaning              |
| The Work of God                     | Awake   | ?    | calling, purpose, vocation               |
| In the Beginning (Genesis)          | Awake   | 7    | foundation, creation, beginning          |
| Genesis: Two Stories                | Awake   | ?    | Bible questions, apparent contradictions |
| The Word Before Words               | Awake   | ?    | Jesus, Christology, deep theology        |
| The Blueprint of Community          | Awake   | ?    | church, community, relationships         |
| From Jerusalem to the Nations       | Awake   | ?    | mission, purpose, Acts                   |
| Witness Under Pressure              | Awake   | ?    | persecution, standing firm               |
| Signs, Boldness, Opposition         | Awake   | ?    | faith under fire, courage                |
| What Happens When You Repeatedly... | Sleep   | ?    | patterns, habits, cycles                 |

### Draft Matching Matrix

| User Signal                   | Primary Match           | Secondary Matches         | Confidence Notes                          |
| ----------------------------- | ----------------------- | ------------------------- | ----------------------------------------- |
| **Busy/Overwhelmed/Stressed** | Too Busy for God        | Hearing God in the Noise  | High confidence                           |
| **Doubt/Questions/Skeptical** | The Nature of Belief    | Once Saved Always Saved   | Check for intellectual vs emotional doubt |
| **Grief/Loss/Pain**           | _Need grieving series_  | Surrender to God's Will   | Gap in current series                     |
| **Anger/Frustrated**          | _Need anger series_     | What Is Carrying a Cross  | Gap in current series                     |
| **Distant from God/Dry**      | Abiding in His Presence | Hearing God in the Noise  | High confidence                           |
| **New to faith/Curious**      | Why Jesus               | What Is the Gospel        | Check for seeker vs skeptic               |
| **Seeking purpose/Direction** | The Work of God         | What Is Carrying a Cross  | Medium confidence                         |
| **Control issues/Anxiety**    | Surrender to God's Will | Too Busy for God          | Check primary emotion                     |
| **Guilt/Shame/Past**          | Once Saved Always Saved | What Is Carrying a Cross  | May need dedicated series                 |
| **Want to go deeper**         | The Word Before Words   | In the Beginning          | For mature believers                      |
| **Community struggles**       | Blueprint of Community  | From Jerusalem to Nations | Medium confidence                         |

### Confidence Thresholds

| Confidence Level | Action                                                  |
| ---------------- | ------------------------------------------------------- |
| **>85%**         | Direct match, proceed to series presentation            |
| **70-85%**       | Match with "also consider" alternatives shown           |
| **50-70%**       | Show match but emphasize "Browse All Series" option     |
| **<50%**         | Default to onboarding OR show "Browse All Series" first |

### Series Gaps Identified

**High Priority (common user signals without good match):**

1. **Grief/Loss series** - Multiple signals point here with no dedicated series
2. **Anger/Frustration series** - Common emotion, no direct match
3. **Anxiety/Fear series** - Different from "busy" - more existential

**Medium Priority:** 4. **Shame/Guilt series** - Distinct from doubt 5. **Relationship struggles** - Marriage, parenting, friendship

---

## 5. Edge Cases

### Edge Case 1: No Clear Match

**Scenario:** User response doesn't map clearly to any series.

**Example:** "I just want to learn more about the Bible"

**Options:**

| Response                                | Pros                | Cons                          |
| --------------------------------------- | ------------------- | ----------------------------- |
| A) Default to Genesis/foundation series | Provides clear path | May not be what user needs    |
| B) Show "Browse All Series"             | User chooses        | Defeats purpose of Soul Audit |
| C) Ask clarifying question              | Better match        | More friction                 |
| D) Offer top 3 matches                  | Balanced            | May confuse user              |

**DECISION NEEDED:** Which fallback behavior do you prefer?

---

### Edge Case 2: One-Word or Very Short Answer

**Scenario:** User types "tired" or "idk" or "sad"

**Current UX-FLOW-MAPS.md approach:** Continue button disabled until >10 characters

**Options:**

| Response                                        | Pros                | Cons               |
| ----------------------------------------------- | ------------------- | ------------------ |
| A) Require minimum characters (10-15)           | Ensures usable data | May feel demanding |
| B) Accept short answers, use keyword matching   | Low friction        | Poor matches       |
| C) Gentle prompt: "Could you share a bit more?" | Pastoral tone       | Another step       |
| D) Show clarifying MCQ                          | Gets needed data    | Feels like quiz    |

**DECISION NEEDED:** What's the minimum character requirement? What if they still give minimal input?

---

### Edge Case 3: Trauma/Crisis Content

**Scenario:** User shares suicidal ideation, abuse, or acute crisis.

**Example:** "I don't want to be here anymore" or "My husband hits me"

**CRITICAL: This requires immediate, thoughtful response.**

**Options:**

| Response                              | Implementation                                        |
| ------------------------------------- | ----------------------------------------------------- |
| A) Dedicated crisis response screen   | Custom page with resources, hotline numbers           |
| B) Redirect to professional resources | National Suicide Prevention Lifeline, local resources |
| C) Modify series recommendation       | Still provide devotional, but add crisis resources    |
| D) Human follow-up option             | "Would you like someone to reach out to you?"         |

**Recommended approach:**

1. **Detection:** Claude API includes crisis keyword detection
2. **Immediate response:** Pause matching, show care message
3. **Resources provided:** Crisis hotline, text line, local resources
4. **Gentle continuation:** "When you're ready, we're here with words of hope"
5. **Optional contact:** "Would you like us to pray for you? Leave your email."

**Crisis response copy (draft):**

> **We hear you.**
>
> What you're carrying sounds incredibly heavy. Before we continue, we want you to know: you matter, and there are people who want to help.
>
> If you're in crisis right now:
>
> - **National Suicide Prevention Lifeline:** 988
> - **Crisis Text Line:** Text HOME to 741741
> - **International Association for Suicide Prevention:** [resources link]
>
> God sees you. He hasn't forgotten you.
>
> When you're ready, we have words of hope waiting for you.
>
> [ Continue to EUONGELION ] [ I need help now → Resources ]

**DECISION NEEDED:** Confirm crisis response approach and copy tone.

---

### Edge Case 4: Re-Audit Limits

**Scenario:** User wants to take Soul Audit again.

**Current approach (from UX-FLOW-MAPS.md):** Maximum 3 Soul Audits per user.

**Options for the limit:**

| Limit                       | Rationale                                                    |
| --------------------------- | ------------------------------------------------------------ |
| **3 audits** (current)      | Encourages self-direction, reduces API cost, prevents gaming |
| **5 audits**                | More flexibility while still having a limit                  |
| **Unlimited**               | Maximum user freedom                                         |
| **1 per series completion** | Ties re-audit to milestone                                   |
| **Time-based reset**        | Reset count every 6 months or year                           |

**When count is reached:**

- Hide "Take Another Soul Audit" button
- Show "Browse All Series" as primary action
- Display: "You've explored deeply through the Soul Audit. Now browse our full library."

**DECISION NEEDED:**

1. Confirm 3-audit limit or adjust
2. Should re-audits be tied to series completion?
3. Should there be a time-based reset?

---

### Edge Case 5: Repeat Visitor Without Account

**Scenario:** User completed Soul Audit but never created account. Returns later.

**Options:**

| Response                          | Pros           | Cons                         |
| --------------------------------- | -------------- | ---------------------------- |
| A) Fresh Soul Audit (no memory)   | Simple         | May frustrate returning user |
| B) Cookie-based session (30 days) | Remembers them | Cookie may be cleared        |
| C) "Have we met before?" check    | Personal touch | Another step                 |

**DECISION NEEDED:** How persistent should pre-account state be?

---

## 6. Sample Questions (All Options)

### Option A: Single Open-Ended

**Primary question:**

> "What's weighing on your heart?"

**Variations to consider:**

| Variation                                                     | Tone              | Consideration          |
| ------------------------------------------------------------- | ----------------- | ---------------------- |
| "What's weighing on your heart?"                              | Pastoral, gentle  | Current choice         |
| "What brought you here today?"                                | Curious, open     | Less emotional         |
| "Where are you in your journey with God?"                     | Direct, spiritual | Assumes faith          |
| "What do you need right now?"                                 | Action-oriented   | May feel transactional |
| "If you could talk to God about one thing, what would it be?" | Prayerful         | Beautiful but long     |

**Supporting microcopy:**

> Share honestly. This helps us find the right words for where you are right now.
>
> Take your time. There's no wrong answer.

**Placeholder text:**

> "I've been feeling..."

---

### Option B: Multiple Choice Questions

**Version 1: Life Season Focus**

**Q1: What season best describes where you are spiritually?**

- [ ] I feel distant from God
- [ ] I have questions about faith
- [ ] I want to grow deeper
- [ ] I'm walking through pain
- [ ] I'm just curious

**Q2: What's on your heart right now?**

- [ ] I'm overwhelmed and exhausted
- [ ] I'm processing loss or grief
- [ ] I'm wrestling with doubt
- [ ] I'm struggling with anger or frustration
- [ ] I'm seeking purpose and direction

**Q3: What would help most?**

- [ ] Rest and recovery
- [ ] Answers to hard questions
- [ ] Comfort in pain
- [ ] Challenge to grow
- [ ] A fresh start with the basics

---

**Version 2: Feeling Focus**

**Q1: Which word best describes how you feel right now?**

- [ ] Overwhelmed
- [ ] Confused
- [ ] Hurt
- [ ] Curious
- [ ] Stuck

**Q2: What do you need from God right now?**

- [ ] Peace and rest
- [ ] Answers and clarity
- [ ] Comfort and presence
- [ ] Direction and purpose
- [ ] A fresh start

---

### Option C: Hybrid Questions

**Step 1 (Open):**

> "What's weighing on your heart?"
>
> [textarea - minimum 10 characters]

**Step 2 (Clarifying - only if needed):**

> Which resonates with what you shared?
>
> - [ ] I need rest and recovery
> - [ ] I need answers to hard questions
> - [ ] I need comfort in pain
> - [ ] I need direction and purpose
> - [ ] Something else (let me browse)

---

## 7. Open Questions for Founder

### Question Format

1. **Confirm Option A** (single open-ended) or choose alternative?
2. If Option A, what's the minimum character count before "Continue" enables?
3. Should we show a clarifying MCQ when AI confidence is low?

### Matching Logic

4. **Confirm Claude API** as primary matching method?
5. Budget ceiling for Soul Audit API costs (per month? per user lifetime?)
6. Should we log all Soul Audit responses for future analysis?

### Edge Cases

7. **Confirm 3-audit limit** or adjust?
8. Should re-audits require series completion first?
9. Should there be a time-based limit reset (e.g., annually)?
10. **Approve crisis response approach** and copy?

### Series Gaps

11. Priority order for creating missing series (Grief, Anger, Anxiety)?
12. What should be the default series if no good match exists?

### Data & Privacy

13. Should Soul Audit responses be stored permanently or purged after matching?
14. Should users be able to see/delete their Soul Audit history?

### Tone & Copy

15. Confirm question wording: "What's weighing on your heart?" or alternative?
16. Review and approve placeholder text, supporting copy, error messages

---

## Implementation Checklist (Once Decisions Made)

After founder decisions, engineering will need to:

- [ ] Build Soul Audit UI component
- [ ] Implement character minimum validation
- [ ] Create Claude API integration for matching
- [ ] Build keyword matching fallback
- [ ] Implement crisis detection and response
- [ ] Create match results presentation screen
- [ ] Build "See other options" alternative series view
- [ ] Add audit count tracking to user session
- [ ] Create re-audit limit handling
- [ ] Implement analytics/logging for audit responses
- [ ] Build browse series fallback for low-confidence matches
- [ ] Test edge cases thoroughly

---

_The Soul Audit is where EUONGELION's pastoral heart meets its technical implementation. The decisions made here will shape how every user experiences the platform from their very first moment._
