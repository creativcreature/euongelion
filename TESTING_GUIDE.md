# Wake Up Zine - Comprehensive Testing Guide

## Testing Checklist for Production Verification

### **Frontend Tests**

#### **1. Navigation Testing**
- [ ] Homepage loads correctly
- [ ] Main navigation menu appears (hamburger icon)
- [ ] Menu opens/closes properly
- [ ] All 7 series links work
- [ ] "All Devotionals" link works
- [ ] "About" link works
- [ ] "Coming Soon" link works
- [ ] Logo links back to homepage
- [ ] Mobile navigation works on small screens

#### **2. Series Page Testing**
Test each series page (`/series/[slug]`):
- [ ] `/series/identity-crisis`
- [ ] `/series/peace`
- [ ] `/series/community`
- [ ] `/series/kingdom`
- [ ] `/series/provision`
- [ ] `/series/truth`
- [ ] `/series/hope`

**For Each Series Page:**
- [ ] Series title and question display
- [ ] All 5 days listed
- [ ] Progress bar shows completion status
- [ ] Day 3 highlighted in gold
- [ ] Locked days appear greyed out with lock icon
- [ ] Completed days show green checkmark
- [ ] Clicking unlocked day navigates to devotional
- [ ] Clicking locked day shows modal explanation

#### **3. Devotional Page Testing**
Test a sample devotional (e.g., `/devotional/identity-crisis-day-1`):
- [ ] Title, teaser, and metadata display correctly
- [ ] Word count and scripture reference visible
- [ ] All panels render with correct numbering
- [ ] Scripture sections have gold left border
- [ ] Scripture icon appears for scripture panels
- [ ] Images/illustrations render (if present)
- [ ] Text formatting (bold, italics) works
- [ ] Sticky bottom navigation bar appears
- [ ] Prev/Next buttons work
- [ ] Day circles (1-5) navigation works
- [ ] Series switcher dropdown works
- [ ] "Back to Series" link works
- [ ] Mobile layout is responsive

#### **4. Progress Tracking Testing**
- [ ] Mark a devotional as complete
- [ ] Completion time displays (e.g., "2 min 34s")
- [ ] Green checkmark appears on devotional header
- [ ] Progress persists after page reload
- [ ] Series page shows updated progress (e.g., "1/5 Complete")
- [ ] Progress bar updates visually
- [ ] Locked devotionals unlock after completing previous ones
- [ ] Completion status syncs across all pages

#### **5. Text Highlighting Testing**
Open any devotional and test highlighting:
- [ ] Select text with mouse
- [ ] Floating toolbar appears above selection
- [ ] Toolbar shows 3 color options (Yellow, Green, Gold)
- [ ] Click Yellow - text highlights in yellow
- [ ] Click Green - text highlights in green
- [ ] Click Gold - text highlights in gold
- [ ] Close button dismisses toolbar without highlighting
- [ ] Highlights persist after page reload
- [ ] Multiple highlights can be added
- [ ] Highlights don't overlap incorrectly

#### **6. Reflection Prompt Testing**
- [ ] Scroll to first reflection prompt (after panel 2)
- [ ] Prompt appears with fade-in animation
- [ ] Question displays correctly
- [ ] Textarea is expandable and functional
- [ ] Type a response (minimum 10 characters)
- [ ] Click "Save Response" button
- [ ] Success confirmation appears
- [ ] Reload page - response still there
- [ ] Test second reflection prompt (after panel 4)
- [ ] Both prompts save independently

#### **7. Bookmark Testing**
- [ ] Click bookmark button on devotional
- [ ] Icon fills with gold color
- [ ] Button text changes to "Bookmarked"
- [ ] Reload page - bookmark persists
- [ ] Click bookmark again - unbookmarks
- [ ] Icon empties
- [ ] Button text changes back to "Bookmark"

#### **8. Share Testing**
- [ ] Click share button
- [ ] On mobile: Native share sheet appears
- [ ] On desktop: Share menu appears with options
- [ ] Click "Copy Link" - link copies to clipboard
- [ ] "Copied!" confirmation appears
- [ ] Click "Share on Twitter" - opens Twitter intent
- [ ] Click "Share via Email" - opens mailto link
- [ ] Click "Cancel" - menu closes

#### **9. Locked Devotionals Testing**
- [ ] Clear all progress: Open console, run `localStorage.clear()`
- [ ] Reload homepage
- [ ] Try to open Day 2 before completing Day 1
- [ ] Modal appears with explanation
- [ ] Modal explains chiastic structure
- [ ] Modal closes properly
- [ ] Complete Day 1, verify Day 2 unlocks
- [ ] Verify sequential unlocking through all 35 devotionals

#### **10. Typography & Visual Design Testing**
- [ ] Check font sizes on mobile (320px width)
- [ ] Check font sizes on tablet (768px width)
- [ ] Check font sizes on desktop (1440px+ width)
- [ ] Verify Impact font loads for headings
- [ ] Verify Playfair Display loads for body
- [ ] Verify Helvetica Neue loads for labels
- [ ] Check color consistency (Cream: #FAF9F6, Gold: #B8860B, Black: #000000)
- [ ] Verify fade-in animations on scroll
- [ ] Check hover states on buttons
- [ ] Verify touch targets are 44px minimum on mobile

#### **11. Mobile Responsiveness Testing**
Test on multiple screen sizes:
- [ ] iPhone SE (375px)
- [ ] iPhone 14 Pro (393px)
- [ ] iPad (768px)
- [ ] Desktop (1440px+)

**For Each Size:**
- [ ] Navigation menu works
- [ ] Text is readable
- [ ] Buttons are touch-friendly
- [ ] No horizontal scrolling
- [ ] Images scale properly

---

### **localStorage (Database) Tests**

#### **1. localStorage Keys Testing**
Open browser console and run these commands:

```javascript
// Check progress data
localStorage.getItem('wakeup_progress')

// Check highlights data
localStorage.getItem('wakeup_highlights')

// Check bookmarks data
localStorage.getItem('wakeup_bookmarks')

// Check reflection responses
localStorage.getItem('reflection_identity-crisis-day-1_1')
localStorage.getItem('reflection_identity-crisis-day-1_2')
```

**Expected Results:**
- [ ] `wakeup_progress` returns JSON array of completed devotionals
- [ ] `wakeup_highlights` returns JSON array of text highlights
- [ ] `wakeup_bookmarks` returns JSON array of bookmarked devotionals
- [ ] Reflection keys return saved text responses

#### **2. Data Persistence Testing**
- [ ] Complete a devotional
- [ ] Add highlights
- [ ] Bookmark the devotional
- [ ] Save reflection responses
- [ ] Close browser completely
- [ ] Reopen browser and navigate to site
- [ ] Verify all data persists

#### **3. Custom Events Testing**
Open browser console and add event listeners:

```javascript
// Listen for progress updates
window.addEventListener('progressUpdated', (e) => {
  console.log('Progress updated:', e.detail);
});

// Listen for highlight updates
window.addEventListener('highlightsUpdated', (e) => {
  console.log('Highlight updated:', e.detail);
});

// Listen for bookmark updates
window.addEventListener('bookmarksUpdated', (e) => {
  console.log('Bookmark updated:', e.detail);
});
```

Then perform actions and verify events fire.

#### **4. Data Clearing Testing**
- [ ] Run `localStorage.clear()` in console
- [ ] Reload page
- [ ] Verify all progress resets
- [ ] Verify all highlights removed
- [ ] Verify all bookmarks removed
- [ ] Verify all reflections cleared

---

### **Backend Tests** (Vercel Deployment)

#### **1. Build Testing**
```bash
# Run local build
npm run build

# Check for errors
# Verify all pages generate successfully
```

**Expected Results:**
- [ ] Build completes without errors
- [ ] All routes generate successfully
- [ ] No TypeScript errors
- [ ] No linting errors

#### **2. API Route Testing**
Note: This is a static site with no server-side API routes. All "backend" logic is client-side localStorage.

- [ ] Verify no API routes exist (none expected)
- [ ] Verify all data operations happen in browser
- [ ] Verify no external API calls

#### **3. Static Asset Testing**
- [ ] All JSON files load from `/devotionals/*.json`
- [ ] Logo image loads
- [ ] All illustrations load (if present)
- [ ] No 404 errors in network tab

#### **4. Deployment Testing**
- [ ] Visit production URL: https://www.wokegod.world
- [ ] Check Vercel deployment status
- [ ] Verify SSL certificate is valid
- [ ] Verify custom domain works
- [ ] Check deployment logs for errors

---

### **Admin/Authentication Tests**

#### **1. Admin Unlock Testing**
- [ ] Navigate to `/admin/unlock`
- [ ] Enter incorrect password
- [ ] Verify error message appears
- [ ] Enter correct password: `Lawlaw135$$`
- [ ] Verify success message appears
- [ ] Verify cookie is set (`adminUnlocked=true`)
- [ ] Verify cookie expires in 7 days
- [ ] Verify protected content becomes accessible

#### **2. Protected Routes Testing**
After unlocking admin access:
- [ ] Navigate to `/coming-soon`
- [ ] Verify full EUONGELION platform content displays
- [ ] Verify admin-only features are visible
- [ ] Clear cookies
- [ ] Reload page
- [ ] Verify content is hidden again

---

### **Cross-Browser Testing**

Test on multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**For Each Browser:**
- [ ] localStorage works
- [ ] Text selection works
- [ ] Highlighting works
- [ ] Intersection Observer works (fade-in animations)
- [ ] Navigation works
- [ ] Forms work

---

### **Performance Testing**

#### **1. Lighthouse Scores**
Run Lighthouse audit in Chrome DevTools:
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

#### **2. Load Time Testing**
- [ ] Homepage loads in < 2 seconds
- [ ] Series pages load in < 2 seconds
- [ ] Devotional pages load in < 3 seconds
- [ ] No render-blocking resources

#### **3. Network Testing**
Open Network tab in DevTools:
- [ ] No failed requests (404s, 500s)
- [ ] All JSON files load successfully
- [ ] Images load successfully
- [ ] Fonts load successfully

---

### **Accessibility Testing**

#### **1. Keyboard Navigation**
- [ ] Tab through all interactive elements
- [ ] All focusable elements have visible focus states
- [ ] Enter key activates buttons
- [ ] Escape key closes modals

#### **2. Screen Reader Testing**
- [ ] All images have alt text
- [ ] All buttons have descriptive labels
- [ ] All forms have proper labels
- [ ] Navigation landmarks are present

#### **3. Color Contrast Testing**
- [ ] Text meets WCAG AA contrast requirements
- [ ] Gold text (#B8860B) on cream (#FAF9F6) meets contrast ratio
- [ ] Black text (#000000) on cream meets contrast ratio

---

## Testing Workflow

### **Daily Testing Routine**
1. Test one series page
2. Test one devotional page
3. Test one interactive feature (highlighting, reflection, bookmark)
4. Check localStorage data

### **Pre-Deployment Testing**
1. Run full build locally
2. Test all 7 series pages
3. Test 3-5 sample devotional pages (one from each series)
4. Test all interactive features
5. Test on mobile device
6. Clear localStorage and test from fresh state
7. Deploy to Vercel
8. Test production URL

### **Post-Deployment Testing**
1. Visit https://www.wokegod.world
2. Test homepage
3. Test one complete user journey (homepage → series → devotional → mark complete)
4. Verify analytics (if installed)
5. Check for console errors

---

## Common Issues & Fixes

### **Issue: Highlights not appearing**
- Check if `wakeup_highlights` exists in localStorage
- Verify Selection API is supported in browser
- Check console for JavaScript errors

### **Issue: Progress not saving**
- Check if localStorage is enabled in browser
- Verify `wakeup_progress` is being written
- Check for console errors

### **Issue: Navigation not appearing**
- Check if Navigation component is imported
- Verify hamburger icon is visible
- Check z-index conflicts

### **Issue: Text too large on mobile**
- Review viewport-width (vw) sizing
- Check clamp() values
- Test on actual device (not just browser DevTools)

---

## Test Data

### **Sample localStorage Data**

```json
// wakeup_progress
[
  {
    "slug": "identity-crisis-day-1",
    "completedAt": "2026-01-22T12:00:00.000Z",
    "timeSpent": 154
  }
]

// wakeup_highlights
[
  {
    "id": "highlight_1737547200000_abc123",
    "devotionalSlug": "identity-crisis-day-1",
    "text": "Seek first the kingdom of God",
    "color": "yellow",
    "createdAt": "2026-01-22T12:00:00.000Z"
  }
]

// wakeup_bookmarks
[
  {
    "slug": "identity-crisis-day-1",
    "title": "The Mirror You Avoid",
    "seriesTitle": "Identity Crisis",
    "createdAt": "2026-01-22T12:00:00.000Z"
  }
]
```

---

## Automated Testing (Future)

For future development, consider:
- Jest for unit tests
- Cypress for e2e tests
- React Testing Library for component tests
- Playwright for cross-browser testing

---

**Last Updated:** 2026-01-22
**Version:** 1.1.0
