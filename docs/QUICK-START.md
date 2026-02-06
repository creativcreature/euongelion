# Quick Start Guide

**Get EUONGELION running in 4 weeks**

---

## WEEK 1: FOUNDATION

### Day 1-2: Project Setup

```bash
# 1. Create Next.js project
npx create-next-app@latest euongelion --typescript --tailwind --app

# 2. Enter project
cd euongelion

# 3. Add skills (copy from this package)
cp -r /path/to/EUONGELION-CLAUDE-CODE-PACKAGE/.claude ./

# 4. Install dependencies
npm install @supabase/supabase-js @anthropic-ai/sdk date-fns date-fns-tz

# 5. Start Claude Code
claude
```

**Tell Claude:**

> "Set up the project structure from architecture.md. Create all folders and placeholder files."

---

### Day 3-4: Supabase Setup

1. **Create Supabase Project**
   - Go to supabase.com
   - New Project → Choose region → Create

2. **Run Schema**
   - Go to SQL Editor
   - Copy schema from `database.md`
   - Run all CREATE TABLE statements
   - Run all INDEX statements
   - Run all RLS policies

3. **Get Credentials**
   - Settings → API
   - Copy: Project URL, anon key, service role key

4. **Create .env.local**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Tell Claude:**

> "Create Supabase client files in lib/supabase/ based on database.md"

---

### Day 5-7: Session Management

**Tell Claude:**

> "Implement session management from auth-security.md. Create lib/session.ts with cookie handling."

**Test:**

1. Create a test session via API
2. Verify cookie is set (httpOnly)
3. Retrieve session on page load
4. Clear session

---

## WEEK 2: CORE FEATURES

### Day 1-2: Soul Audit

**Tell Claude:**

> "Build the Soul Audit flow from user-flows.md. Include:
>
> - Landing page with form
> - Processing state
> - Match presentation
> - Sabbath preference
> - Session creation"

**Test:**

1. Submit various responses
2. Verify Claude API matching works
3. Check session cookie created
4. Verify redirect to Daily Bread

---

### Day 3-4: Daily Bread Feed

**Tell Claude:**

> "Build the Daily Bread feed from architecture.md and content-structure.md. Include:
>
> - Series header
> - Day selector
> - Module renderer
> - Day-gating logic"

**Test:**

1. View current day content
2. Try accessing locked days
3. Navigate between available days
4. Check 7 AM unlock timing

---

### Day 5-7: Module Components

**Tell Claude:**

> "Build all 21 module components from content-structure.md. Start with the most common:
>
> 1. Scripture
> 2. Teaching
> 3. Vocab
> 4. Prayer
>    Then build the rest."

**Test:**

1. Create sample module data
2. Render each module type
3. Check styling matches brand
4. Test accessibility

---

## WEEK 3: CONTENT & POLISH

### Day 1-2: Series Migration

**Tell Claude:**

> "Create a script to convert existing HTML series to JSON format using the schema in content-structure.md. Process all 17 series."

**Manual Review:**

1. Check JSON structure
2. Verify all content preserved
3. Test loading in Daily Bread
4. Fix any parsing errors

---

### Day 3-4: Styling Pass

**Tell Claude:**

> "Apply wokegod-brand styling to all components:
>
> - Typography from typography.md
> - Colors from colors.md
> - Spacing from spacing.md
> - Scroll experience from scroll-experience.md"

**Review:**

1. Check all pages in light/dark mode
2. Verify Hebrew displays correctly
3. Test scroll animations
4. Check color contrast

---

### Day 5-7: Responsive & Accessibility

**Tell Claude:**

> "Make all pages responsive using responsive.md specs. Then run accessibility audit using accessibility.md checklist."

**Test:**

1. Test at 320px, 768px, 1440px
2. Keyboard navigation
3. Screen reader test
4. Color contrast check
5. Touch target sizes

---

## WEEK 4: LAUNCH

### Day 1-2: Testing

**Checklist:**

- [ ] Soul Audit → Match → Redirect works
- [ ] Day-gating respects timezone
- [ ] All 21 modules render
- [ ] Series completion flow works
- [ ] Browse series works
- [ ] Settings persist
- [ ] Error states handled
- [ ] Mobile works perfectly

---

### Day 3-4: Deploy

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/you/euongelion.git
git push -u origin main

# 2. Deploy to Vercel
# Go to vercel.com
# Import from GitHub
# Add environment variables
# Deploy

# 3. Test production
# Visit deployed URL
# Run through all flows
```

---

### Day 5-7: Domain & Launch

1. **Connect Domain**
   - Vercel Dashboard → Domains
   - Add: wokegod.world
   - Update DNS at registrar

2. **Final Checks**
   - HTTPS working
   - All pages load
   - Analytics connected (if using)

3. **Launch!**
   - Share the link
   - Monitor for errors
   - Celebrate 🎉

---

## COMMON CLAUDE CODE COMMANDS

### Setup

```
"Create the file structure from architecture.md"
"Set up Supabase clients from database.md"
"Implement session management from auth-security.md"
```

### Building

```
"Build the Soul Audit form from user-flows.md"
"Create the Daily Bread feed component"
"Build all 18 content modules from content-structure.md"
"Build the 3 game modules"
```

### Styling

```
"Apply wokegod-brand typography"
"Style with the color system from colors.md"
"Implement scroll experience from scroll-experience.md"
"Make this component responsive"
```

### Testing

```
"Add error handling to all API routes"
"Write tests for day-gating logic"
"Check accessibility compliance"
```

---

## TROUBLESHOOTING

### "Supabase connection failed"

- Check .env.local has correct values
- Verify project is not paused
- Check RLS policies

### "Session not persisting"

- Check cookie settings
- Verify domain matches
- Check browser dev tools → Application → Cookies

### "Claude API not matching well"

- Review series keywords
- Check prompt in claude.ts
- Adjust confidence threshold

### "Styling looks wrong"

- Check Tailwind config includes brand colors
- Verify CSS custom properties set
- Check dark mode toggle

---

## GETTING HELP

1. **Read the skill files** - Most answers are there
2. **Ask Claude Code** - "Explain [concept] from [skill-name]"
3. **Check Supabase docs** - supabase.com/docs
4. **Check Next.js docs** - nextjs.org/docs

---

**You've got this. One day at a time.**
