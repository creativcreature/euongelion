# QA Checklist

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** ACTIVE

---

## Purpose

This checklist ensures every piece of content and every feature meets quality standards before reaching users. QA is the final gate between development and production.

---

## Quick Reference

```
QA QUICK CHECK
==============
[ ] Content renders correctly
[ ] All interactive elements work
[ ] Mobile responsive (320px-1440px)
[ ] Dark mode displays properly
[ ] Links and references valid
[ ] Accessibility passes
[ ] Performance acceptable
[ ] No console errors

Ready for production: [ ] YES [ ] NO
```

---

## Section 1: Content Checks

### 1.1 Text Rendering

| Check | Criteria                                                  | Pass |
| ----- | --------------------------------------------------------- | ---- |
| [ ]   | All text displays (no missing content)                    |      |
| [ ]   | No placeholder text remaining (Lorem ipsum, [TODO], etc.) |      |
| [ ]   | No typos or grammatical errors visible                    |      |
| [ ]   | Proper paragraph breaks maintained                        |      |
| [ ]   | Lists render correctly (bulleted/numbered)                |      |
| [ ]   | Block quotes styled appropriately                         |      |

### 1.2 Scripture Display

| Check | Criteria                                      | Pass |
| ----- | --------------------------------------------- | ---- |
| [ ]   | Scripture text displays correctly             |      |
| [ ]   | Reference shows (book chapter:verse)          |      |
| [ ]   | Translation noted (ESV, NIV, etc.)            |      |
| [ ]   | Scripture styling applied (gold border, etc.) |      |
| [ ]   | Long passages don't break layout              |      |

### 1.3 Original Language Content

| Check | Criteria                                          | Pass |
| ----- | ------------------------------------------------- | ---- |
| [ ]   | Hebrew text renders correctly (right-to-left)     |      |
| [ ]   | Greek text renders correctly (accents, breathing) |      |
| [ ]   | Transliterations display properly                 |      |
| [ ]   | Fonts load for special characters                 |      |
| [ ]   | Word study cards styled correctly                 |      |

### 1.4 Citations

| Check | Criteria                          | Pass |
| ----- | --------------------------------- | ---- |
| [ ]   | All citation markers present      |      |
| [ ]   | Citations section displays at end |      |
| [ ]   | Citation numbers match references |      |
| [ ]   | External links open in new tab    |      |
| [ ]   | No broken citation links          |      |

---

## Section 2: Formatting Checks

### 2.1 Typography

| Check | Criteria                                        | Pass |
| ----- | ----------------------------------------------- | ---- |
| [ ]   | Headings hierarchy correct (H1 > H2 > H3)       |      |
| [ ]   | Body text legible (size, line-height, contrast) |      |
| [ ]   | Pull quotes styled distinctly                   |      |
| [ ]   | Day number displays prominently                 |      |
| [ ]   | Series title visible                            |      |

### 2.2 Spacing & Layout

| Check | Criteria                                           | Pass |
| ----- | -------------------------------------------------- | ---- |
| [ ]   | Consistent margins/padding throughout              |      |
| [ ]   | No text touching edges                             |      |
| [ ]   | Adequate whitespace between sections               |      |
| [ ]   | Content width comfortable for reading (~680px max) |      |
| [ ]   | No unexpected horizontal scroll                    |      |

### 2.3 Images & Media

| Check | Criteria                       | Pass |
| ----- | ------------------------------ | ---- |
| [ ]   | Hero image loads (if present)  |      |
| [ ]   | Images have alt text           |      |
| [ ]   | No broken image icons          |      |
| [ ]   | Video embeds work (if present) |      |
| [ ]   | Media doesn't break layout     |      |

---

## Section 3: Link & Reference Checks

### 3.1 Internal Links

| Check | Criteria                           | Pass |
| ----- | ---------------------------------- | ---- |
| [ ]   | Previous/Next day navigation works |      |
| [ ]   | Series index link works            |      |
| [ ]   | Related content links valid        |      |
| [ ]   | Home/Dashboard link works          |      |
| [ ]   | User profile link works            |      |

### 3.2 External Links

| Check | Criteria                                   | Pass |
| ----- | ------------------------------------------ | ---- |
| [ ]   | All external links reachable               |      |
| [ ]   | External links open in new tab             |      |
| [ ]   | No links to HTTP (should be HTTPS)         |      |
| [ ]   | Bible reference links work (if applicable) |      |

### 3.3 Share Links

| Check | Criteria                   | Pass |
| ----- | -------------------------- | ---- |
| [ ]   | Share button visible       |      |
| [ ]   | Copy link function works   |      |
| [ ]   | Social share links correct |      |
| [ ]   | Share preview image loads  |      |
| [ ]   | Share text appropriate     |      |

---

## Section 4: Interactive Elements

### 4.1 Breath Prayer

| Check | Criteria                            | Pass |
| ----- | ----------------------------------- | ---- |
| [ ]   | Breath prayer section displays      |      |
| [ ]   | Timing/animation works (if present) |      |
| [ ]   | Inhale/exhale indicators visible    |      |
| [ ]   | Prayer text readable                |      |
| [ ]   | Can be dismissed/closed             |      |

### 4.2 Reflection Questions

| Check | Criteria                               | Pass |
| ----- | -------------------------------------- | ---- |
| [ ]   | All 3 questions display                |      |
| [ ]   | Questions numbered correctly           |      |
| [ ]   | Expand/collapse works (if applicable)  |      |
| [ ]   | Journal input field works (if present) |      |

### 4.3 Progress Tracking

| Check | Criteria                         | Pass |
| ----- | -------------------------------- | ---- |
| [ ]   | Day completion toggle works      |      |
| [ ]   | Progress saves correctly         |      |
| [ ]   | Progress bar updates             |      |
| [ ]   | Series completion state accurate |      |

### 4.4 Print/Download

| Check | Criteria                          | Pass |
| ----- | --------------------------------- | ---- |
| [ ]   | Print button present              |      |
| [ ]   | Print preview looks correct       |      |
| [ ]   | PDF download works (if available) |      |
| [ ]   | Print version removes navigation  |      |

---

## Section 5: Mobile Preview

### 5.1 Responsive Breakpoints

Test at these widths:

| Width      | Device                   | Pass |
| ---------- | ------------------------ | ---- |
| [ ] 320px  | iPhone SE / Small phones |      |
| [ ] 375px  | iPhone 12/13             |      |
| [ ] 414px  | iPhone 14 Plus           |      |
| [ ] 768px  | iPad Mini / Tablets      |      |
| [ ] 1024px | iPad Pro                 |      |
| [ ] 1440px | Desktop                  |      |

### 5.2 Mobile-Specific Checks

| Check | Criteria                                     | Pass |
| ----- | -------------------------------------------- | ---- |
| [ ]   | No horizontal scroll at any breakpoint       |      |
| [ ]   | Touch targets large enough (44x44px minimum) |      |
| [ ]   | Navigation accessible on mobile              |      |
| [ ]   | Text readable without zooming                |      |
| [ ]   | Images scale appropriately                   |      |
| [ ]   | Modals/overlays work on mobile               |      |

### 5.3 Mobile Navigation

| Check | Criteria                            | Pass |
| ----- | ----------------------------------- | ---- |
| [ ]   | Hamburger menu works                |      |
| [ ]   | Menu closes when item selected      |      |
| [ ]   | Back gesture doesn't break state    |      |
| [ ]   | Swipe navigation (if enabled) works |      |

---

## Section 6: Dark Mode Preview

### 6.1 Color Contrast

| Check | Criteria                              | Pass |
| ----- | ------------------------------------- | ---- |
| [ ]   | Body text readable on dark background |      |
| [ ]   | Headings have sufficient contrast     |      |
| [ ]   | Links distinguishable from text       |      |
| [ ]   | Scripture blocks styled for dark mode |      |
| [ ]   | Interactive elements visible          |      |

### 6.2 Component Styling

| Check | Criteria                                      | Pass |
| ----- | --------------------------------------------- | ---- |
| [ ]   | Cards/containers have appropriate backgrounds |      |
| [ ]   | Borders visible but not harsh                 |      |
| [ ]   | Form inputs styled for dark mode              |      |
| [ ]   | Buttons have correct states                   |      |
| [ ]   | Icons/SVGs adapt to dark mode                 |      |

### 6.3 Images in Dark Mode

| Check | Criteria                                      | Pass |
| ----- | --------------------------------------------- | ---- |
| [ ]   | Images don't clash with dark background       |      |
| [ ]   | Transparent PNGs have appropriate backgrounds |      |
| [ ]   | No "flashbang" effect from bright images      |      |

### 6.4 Toggle Behavior

| Check | Criteria                                | Pass |
| ----- | --------------------------------------- | ---- |
| [ ]   | Dark mode toggle visible                |      |
| [ ]   | Toggle switches modes immediately       |      |
| [ ]   | Preference persists across sessions     |      |
| [ ]   | Respects system preference (if enabled) |      |

---

## Section 7: Accessibility Check

### 7.1 Keyboard Navigation

| Check | Criteria                                           | Pass |
| ----- | -------------------------------------------------- | ---- |
| [ ]   | All interactive elements focusable via Tab         |      |
| [ ]   | Focus order logical (top to bottom, left to right) |      |
| [ ]   | Focus indicator visible                            |      |
| [ ]   | Enter/Space activates buttons                      |      |
| [ ]   | Escape closes modals                               |      |

### 7.2 Screen Reader

| Check | Criteria                                       | Pass |
| ----- | ---------------------------------------------- | ---- |
| [ ]   | Page has meaningful title                      |      |
| [ ]   | Headings properly nested                       |      |
| [ ]   | Images have alt text                           |      |
| [ ]   | Links have descriptive text (not "click here") |      |
| [ ]   | Form inputs have labels                        |      |
| [ ]   | ARIA labels where needed                       |      |

### 7.3 Visual Accessibility

| Check | Criteria                                  | Pass |
| ----- | ----------------------------------------- | ---- |
| [ ]   | Color contrast ratio 4.5:1 minimum (AA)   |      |
| [ ]   | Information not conveyed by color alone   |      |
| [ ]   | Text resizable to 200% without breaking   |      |
| [ ]   | Animations respect prefers-reduced-motion |      |

### 7.4 Automated Tools

Run these checks:

| Tool | Pass                                |
| ---- | ----------------------------------- | --- |
| [ ]  | Lighthouse Accessibility Score > 90 |     |
| [ ]  | axe DevTools - no critical errors   |     |
| [ ]  | WAVE - no errors                    |     |

---

## Section 8: Performance Check

### 8.1 Page Load

| Check | Criteria                 | Target  | Actual   | Pass |
| ----- | ------------------------ | ------- | -------- | ---- |
| [ ]   | First Contentful Paint   | < 1.5s  | \_\_\_s  |      |
| [ ]   | Largest Contentful Paint | < 2.5s  | \_\_\_s  |      |
| [ ]   | Time to Interactive      | < 3.0s  | \_\_\_s  |      |
| [ ]   | Total Blocking Time      | < 300ms | \_\_\_ms |      |
| [ ]   | Cumulative Layout Shift  | < 0.1   | \_\_\_   |      |

### 8.2 Asset Optimization

| Check | Criteria                                | Pass |
| ----- | --------------------------------------- | ---- |
| [ ]   | Images optimized (WebP where supported) |      |
| [ ]   | CSS minified                            |      |
| [ ]   | JavaScript minified                     |      |
| [ ]   | Fonts subset (only needed characters)   |      |
| [ ]   | No unused CSS/JS                        |      |

### 8.3 Network

| Check | Criteria                        | Pass |
| ----- | ------------------------------- | ---- |
| [ ]   | Gzip/Brotli compression enabled |      |
| [ ]   | CDN delivering assets           |      |
| [ ]   | HTTP/2 or HTTP/3 enabled        |      |
| [ ]   | No blocking resources in head   |      |

### 8.4 Lighthouse Score

| Category       | Target | Actual | Pass |
| -------------- | ------ | ------ | ---- |
| Performance    | > 90   | \_\_\_ | [ ]  |
| Accessibility  | > 90   | \_\_\_ | [ ]  |
| Best Practices | > 90   | \_\_\_ | [ ]  |
| SEO            | > 90   | \_\_\_ | [ ]  |

---

## Section 9: Browser Compatibility

### 9.1 Desktop Browsers

Test in these browsers:

| Browser     | Version | Pass |
| ----------- | ------- | ---- |
| [ ] Chrome  | Latest  |      |
| [ ] Firefox | Latest  |      |
| [ ] Safari  | Latest  |      |
| [ ] Edge    | Latest  |      |

### 9.2 Mobile Browsers

| Browser              | Device       | Pass |
| -------------------- | ------------ | ---- |
| [ ] Safari           | iOS (iPhone) |      |
| [ ] Chrome           | iOS          |      |
| [ ] Chrome           | Android      |      |
| [ ] Samsung Internet | Android      |      |

### 9.3 Known Issues Log

Document any browser-specific issues:

```
Browser: ________________
Issue: ________________
Workaround: ________________
```

---

## Section 10: Error Handling

### 10.1 Console Check

| Check | Criteria                              | Pass |
| ----- | ------------------------------------- | ---- |
| [ ]   | No JavaScript errors in console       |      |
| [ ]   | No failed network requests (4xx, 5xx) |      |
| [ ]   | No deprecation warnings               |      |
| [ ]   | No excessive console.log statements   |      |

### 10.2 Error States

| Check | Criteria                                | Pass |
| ----- | --------------------------------------- | ---- |
| [ ]   | 404 page displays for invalid routes    |      |
| [ ]   | Error boundary catches component errors |      |
| [ ]   | Network error messages user-friendly    |      |
| [ ]   | Loading states display properly         |      |

### 10.3 Edge Cases

| Check | Criteria                               | Pass |
| ----- | -------------------------------------- | ---- |
| [ ]   | First day of series loads correctly    |      |
| [ ]   | Last day of series loads correctly     |      |
| [ ]   | Empty states handled                   |      |
| [ ]   | Very long content doesn't break layout |      |
| [ ]   | Special characters render correctly    |      |

---

## QA Sign-Off Form

```
QA SIGN-OFF
===========

Content/Feature: ________________________________
Environment: [ ] Development [ ] Staging [ ] Production
Date: _______________
Tester: _______________

SECTION RESULTS
---------------
1. Content Checks:          [ ] PASS [ ] FAIL
2. Formatting Checks:       [ ] PASS [ ] FAIL
3. Link/Reference Checks:   [ ] PASS [ ] FAIL
4. Interactive Elements:    [ ] PASS [ ] FAIL
5. Mobile Preview:          [ ] PASS [ ] FAIL
6. Dark Mode Preview:       [ ] PASS [ ] FAIL
7. Accessibility Check:     [ ] PASS [ ] FAIL
8. Performance Check:       [ ] PASS [ ] FAIL
9. Browser Compatibility:   [ ] PASS [ ] FAIL
10. Error Handling:         [ ] PASS [ ] FAIL

OVERALL RESULT
--------------
[ ] PASS - Ready for production
[ ] CONDITIONAL PASS - Minor issues noted below
[ ] FAIL - Critical issues must be resolved

ISSUES FOUND
------------
Critical:
_________________________________________________

Major:
_________________________________________________

Minor:
_________________________________________________

SIGN-OFF
--------
Tester: _______________ Date: _______________
Reviewer: _______________ Date: _______________
```

---

## QA Automation Candidates

### Automated with CI/CD

| Check               | Tool                           |
| ------------------- | ------------------------------ |
| Lighthouse scores   | GitHub Actions + Lighthouse CI |
| Accessibility       | axe-core in Playwright         |
| Visual regression   | Percy or Chromatic             |
| Link checking       | Linkinator                     |
| Performance budgets | Webpack Bundle Analyzer        |

### Must Be Manual

| Check                | Reason                  |
| -------------------- | ----------------------- |
| Content quality      | Requires human judgment |
| Voice/tone           | Subjective assessment   |
| User experience flow | Context-dependent       |
| Mobile feel          | Nuance in interaction   |

---

## Document Control

| Version | Date       | Author       | Changes          |
| ------- | ---------- | ------------ | ---------------- |
| 1.0     | 2026-01-17 | Process Team | Initial creation |

---

_"Quality is not an act, it is a habit." - Aristotle_
