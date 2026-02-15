# EUONGELION UI Messaging Guide

**Version:** 1.0
**Created:** January 17, 2026
**Voice:** Warm, contemplative, wise mentor. Never corporate or salesy.

---

## Voice Principles

Before writing any UI copy, remember:

- Every word earns its place
- Warm like a letter, not casual like a text
- Never create anxiety, urgency, guilt, or shame
- Respect the user's time and intelligence
- When in doubt, say less

---

## 1. Error Messages

| Error Type                  | Message                           | Subtext                                                          |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Network error               | "Connection lost"                 | "Check your internet and try again."                             |
| 500 error                   | "Something went wrong on our end" | "We're looking into it. Please try again shortly."               |
| 404 page                    | "This page doesn't exist"         | "Perhaps you were looking for something else."                   |
| Auth failed                 | "We couldn't sign you in"         | "Please try again, or request a new link."                       |
| Magic link expired          | "This link has expired"           | "Magic links are valid for 15 minutes. Request a new one below." |
| Form validation (empty)     | "This field needs your attention" | _(no subtext needed)_                                            |
| Form validation (email)     | "Please enter a valid email"      | _(no subtext needed)_                                            |
| Form validation (too short) | "Tell us a bit more"              | "Your response helps us find the right words for you."           |
| Rate limited                | "Please slow down"                | "Take a breath. Try again in a moment."                          |
| Save failed                 | "Your words weren't saved"        | "Check your connection and try again."                           |
| Session expired             | "Your session has ended"          | "Sign in again to continue where you left off."                  |

### Error Message Principles

- Never blame the user
- Offer a clear next step
- Keep the tone calm and reassuring
- Avoid technical jargon

---

## 2. Empty States

| Screen                | Headline                   | Subtext                                                           | CTA                     |
| --------------------- | -------------------------- | ----------------------------------------------------------------- | ----------------------- |
| No series started     | "Your journey begins here" | "Take a moment to share what's on your heart."                    | "Begin Soul Audit"      |
| No journal entries    | "A blank page, waiting"    | "Your reflections will appear here as you write them."            | "Start Today's Reading" |
| Search no results     | "Nothing found"            | "Try different words, or browse our series."                      | "Browse All Series"     |
| Completed all content | "You've walked every path" | "New series are coming. Until then, revisit what you've learned." | "Review Past Series"    |
| No saved reflections  | "Your thoughts, preserved" | "When you write in the reflection spaces, they'll be kept here."  | _(none)_                |
| Bookmarks empty       | "Nothing saved yet"        | "Passages you mark will appear here for easy return."             | _(none)_                |

### Empty State Principles

- Frame emptiness as potential, not lack
- Never make the user feel behind
- Keep CTAs gentle, not pushy

---

## 3. Success/Confirmation Messages

| Action                 | Message                         | Duration                            |
| ---------------------- | ------------------------------- | ----------------------------------- |
| Saved                  | "Saved"                         | 2 seconds                           |
| Shared                 | "Shared"                        | 2 seconds                           |
| Completed day          | "Day complete"                  | 3 seconds                           |
| Completed series       | "Series complete. Well done."   | 5 seconds (with celebration moment) |
| Account created        | "Welcome. Your journey begins." | 3 seconds                           |
| Settings updated       | "Settings saved"                | 2 seconds                           |
| Email sent             | "Check your inbox"              | 3 seconds                           |
| Copied to clipboard    | "Copied"                        | 2 seconds                           |
| Reflection saved       | "Your words are kept"           | 2 seconds                           |
| Subscription confirmed | "You're in. Welcome."           | 3 seconds                           |

### Success Message Principles

- Brief is beautiful
- No exclamation points needed
- Let the checkmark do the celebrating
- Fade naturally, don't demand attention

---

## 4. Loading States

| Context               | Message                            |
| --------------------- | ---------------------------------- |
| Soul Audit processing | "Listening..."                     |
| Content loading       | _(no text, subtle fade animation)_ |
| Saving journal        | "Saving..."                        |
| Sending magic link    | "Sending..."                       |
| Initial page load     | _(no text, logo mark fades in)_    |
| Image loading         | _(skeleton with paper texture)_    |
| Share generating      | "Preparing..."                     |
| Search processing     | _(no text, subtle pulse)_          |

### Loading State Principles

- Prefer animation to words
- Never show spinners (use opacity fades)
- If words are needed, use present participle ("Listening..." not "Please wait")
- No progress percentages unless genuinely meaningful

---

## 5. Tooltips & Helper Text

| Element                    | Tooltip/Helper                                   |
| -------------------------- | ------------------------------------------------ |
| Day-gating lock            | "Unlocks [day] at 7:00 AM"                       |
| Progress indicator         | "Day [X] of [Y]"                                 |
| Sabbath day                | "Today is for rest. No new content."             |
| Breath prayer instructions | "Read slowly. Breathe between lines."            |
| Soul Audit textarea        | "Take your time. There's no wrong answer."       |
| Magic link input           | "No passwords. No spam. Just your journey."      |
| Sabbath preference         | "We'll give you rest that day."                  |
| Share button               | "Share this day"                                 |
| Reflection textarea        | "Your words stay private unless you share them." |
| Series difficulty          | "Estimated reading time: 15-20 minutes daily"    |
| Hebrew/Greek terms         | "Tap to explore the original language"           |
| Completed day checkmark    | "Completed [date]"                               |
| New content badge          | "New today"                                      |

### Tooltip Principles

- Speak plainly
- One sentence maximum
- Answer the question the user is asking
- Never repeat what's already visible

---

## 6. Special Pages

### 404 Page

**Headline:**
"This page doesn't exist."

**Body:**
"The path you're looking for isn't here. Perhaps you'd like to return home, or continue where you left off."

**Navigation Options:**

- "Return Home" (primary)
- "Continue Reading" (if session exists)

**Visual Treatment:**

- Minimal, centered layout
- Tehom Black background, Scroll White text
- Small lamb mark above headline (subtle)

---

### Maintenance Page

**Headline:**
"We'll be right back."

**Body:**
"We're making some improvements. This shouldn't take long."

**Additional:**
"In the meantime, consider this a moment of unexpected rest."

**Visual Treatment:**

- Full-screen Scroll White
- Centered text
- No countdown or estimated time (unless known)

---

### Offline Page (PWA)

**Headline:**
"You're offline."

**Body:**
"Your connection to the internet has paused. Previously read content is still available below."

**CTA:**
"View Downloaded Content"

**Secondary:**
"When you're back online, your journey continues."

**Visual Treatment:**

- Subtle wifi-off icon (line art, not filled)
- Previously accessed content listed if available

---

## 7. Legal/Consent

### Cookie Consent

**Message:**
"We use essential cookies to remember your progress and preferences. Nothing more."

**Options:**

- "Continue" (primary, accepts)

**Note:** No "Learn more" needed for essential-only cookies. If analytics are added later, provide opt-out.

---

### Email Opt-in

**Checkbox Label:**
"Send me gentle reminders to return"

**Helper Text:**
"One email per day, at most. Unsubscribe anytime."

**Note:** Never pre-check. Never guilt. Never "You'll miss out if..."

---

### Terms Agreement

**Checkbox Label:**
"I agree to the Terms of Service and Privacy Policy"

**Helper Text (if needed):**
"Your privacy matters. We keep your data safe and never sell it."

**Links:**
Terms of Service | Privacy Policy

---

## 8. Onboarding Tooltips

For first-time users, gentle hints appear once per element.

| Feature           | Tooltip                                              | Trigger                            |
| ----------------- | ---------------------------------------------------- | ---------------------------------- |
| Day selector      | "Tap any completed day to revisit it"                | First series dashboard view        |
| Reflection box    | "Write here. Your thoughts are saved automatically." | First scroll to reflection section |
| Progress bar      | "This shows how far you've come in today's reading"  | First devotional scroll            |
| Share button      | "Share a passage or your progress with others"       | First completion                   |
| Settings menu     | "Adjust your experience here"                        | After 3rd day completion           |
| Sabbath indicator | "This is your rest day. No new content, just peace." | First Sabbath visit                |

### Onboarding Principles

- Show once, then get out of the way
- Dismiss on click anywhere
- Small, unobtrusive placement
- Never block content

---

## 9. Push Notification Templates

| Trigger                    | Title                   | Body                                                    |
| -------------------------- | ----------------------- | ------------------------------------------------------- |
| New day unlocked           | "Day [X] is ready"      | "When you're ready, your journey continues."            |
| Series complete            | "Series complete"       | "You finished [Series Name]. Take a moment to reflect." |
| Streak milestone (7 days)  | "One week"              | "You've shown up for seven days. That matters."         |
| Streak milestone (30 days) | "One month"             | "Thirty days of presence. You're becoming someone new." |
| Re-engagement (3 days)     | "Still here"            | "Your series waits. No rush. Return when you're ready." |
| Re-engagement (7 days)     | "Whenever you're ready" | "Your journey paused, not ended. We'll be here."        |
| New series available       | "New series: [Name]"    | "[Brief description]. Begin when you're ready."         |

### Push Notification Principles

- Never guilt ("You haven't opened the app in 3 days!")
- Never urgency ("Don't miss out!")
- Never gamification ("Keep your streak alive!")
- Respect that life happens
- Make return feel welcome, not obligatory

---

## 10. Micro-interactions

### Button States

| State    | Copy Change                          |
| -------- | ------------------------------------ |
| Default  | "Continue"                           |
| Hover    | _(no copy change, subtle animation)_ |
| Loading  | "..." or spinner                     |
| Success  | Checkmark icon (no text)             |
| Disabled | _(grayed, no copy change)_           |

### Form Validation Timing

- Validate on blur, not on keypress
- Show errors gently, below the field
- Clear errors when user begins correcting

### Celebration Moments

- Day completion: Brief checkmark animation, gold accent
- Series completion: Fuller moment (3-5 seconds), quote display, gold confetti (subtle, not overwhelming)
- Account creation: Warm welcome, smooth transition to content

---

## 11. Accessibility Copy

### Screen Reader Announcements

| Context        | Announcement                     |
| -------------- | -------------------------------- |
| Page loaded    | "[Page title] loaded"            |
| Day completed  | "Day [X] marked complete"        |
| Content saved  | "Your reflection has been saved" |
| Error occurred | "Error: [message]"               |
| Navigation     | "Now viewing [section name]"     |
| Modal opened   | "[Modal title] dialog opened"    |
| Modal closed   | "Dialog closed"                  |

### Alt Text Patterns

- Decorative images: `alt=""` (empty)
- Informative images: Describe what matters for context
- Hebrew/Greek text images: Include transliteration and translation

---

## 12. Edge Case Messages

| Scenario                                     | Message                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Trying to access future day                  | "This day unlocks [date] at 7:00 AM. For now, you might revisit earlier days."                        |
| Trying to re-take Soul Audit (limit reached) | "You've completed three Soul Audits. Browse our series to find your next path."                       |
| Slow connection detected                     | "Your connection is slow. Content may take a moment."                                                 |
| Storage quota exceeded                       | "Your device storage is full. Some content may not be available offline."                             |
| Unsupported browser                          | "Your browser may not support all features. For the best experience, try Chrome, Safari, or Firefox." |
| JavaScript disabled                          | "This experience requires JavaScript to work properly."                                               |
| Account already exists (sign up)             | "This email is already registered. Sign in instead?"                                                  |

---

## Writing Checklist

Before finalizing any UI copy, ask:

- [ ] Is every word necessary?
- [ ] Does it sound like a wise mentor, not a corporation?
- [ ] Is it free of guilt, urgency, or shame?
- [ ] Would I want to read this at 6 AM or 11 PM?
- [ ] Is it warm without being casual?
- [ ] Does it respect the user's intelligence?
- [ ] Is the next action clear?

---

## Reference

**Brand Voice Summary:**

- Confident, not arrogant
- Intimate, not casual
- Dense, not verbose
- Reverent, not stuffy
- Direct, not aggressive

**What We Say:**

- "Take your time. There's no rush."
- "You're not behind. You're here."
- "This is hard. Let's sit with it."

**What We Never Say:**

- Anything with urgency
- Anything with guilt
- Anything that sounds like an ad
- Exclamation points in every sentence

---

_End of Document_
