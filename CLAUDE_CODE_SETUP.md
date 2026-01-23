# Claude Code Setup - EUONGELION Project

**Date:** 2026-01-22
**Version:** 1.0
**Status:** ✅ Configured & Ready

---

## Overview

This document describes the Claude Code configuration for the EUONGELION devotional web application. The setup follows Claude Code best practices and ensures consistent, high-quality AI-assisted development.

---

## Project Structure

```
/euongelion                           # Main web application (THIS PROJECT)
├── /.claude/                         # Claude Code configuration
│   ├── /agents/                      # Specialized AI agents (inherited from parent)
│   │   ├── ARCHITECT.md              # Tech lead, builds features
│   │   ├── DESIGNER.md               # Visual design, UI/UX
│   │   ├── WRITER.md                 # Content creation
│   │   ├── LAUNCHER.md               # Marketing, growth
│   │   ├── STRATEGIST.md             # Business strategy
│   │   └── OPERATOR.md               # DevOps, deployment
│   ├── /skills/                      # Shared knowledge base
│   │   ├── euongelion-platform/      # Platform architecture & API docs
│   │   └── wokegod-brand/            # Design system, brand guidelines
│   ├── settings.json                 # Main permissions configuration
│   └── settings.local.json           # Local-only permissions (gitignored)
│
├── CLAUDE.md                         # Project context & rules (THIS FILE'S SIBLING)
├── CLAUDE_CODE_SETUP.md              # Setup documentation (THIS FILE)
├── CURRENT_STATUS.md                 # Session tracking
│
├── /src                              # Application source code
├── /public                           # Static assets
├── package.json                      # Dependencies
└── .gitignore                        # Git ignore rules (includes Claude Code)
```

---

## Files Created/Updated

### 1. CLAUDE.md ✅
**Location:** `/euongelion/CLAUDE.md`

**Purpose:** Main project context file for Claude Code sessions

**Contents:**
- Project overview and mission
- Technical stack (Next.js 16.1.2, React 19, Tailwind v4)
- Architecture decisions and rationale
- Design system (HSL colors, dark mode, typography)
- Code style and conventions
- Lessons learned from v1.4.1 session
- Quality standards (WCAG 2.1 AA, performance targets)
- Known issues and constraints
- Deployment workflow
- Claude Code rules (project-specific)

**Why Important:** This is the first file Claude should read when starting a new session. It provides complete context about the project state, conventions, and best practices.

### 2. .claude/settings.json ✅
**Location:** `/euongelion/.claude/settings.json`

**Purpose:** Define allowed and denied bash commands for safety

**Permissions:**
- **Allowed:** npm commands, vercel deployment, git operations, file inspection
- **Denied:** Destructive operations (rm -rf, force push, uninstalling core dependencies)

**Why Important:** Prevents accidental destructive operations while enabling standard development workflows.

### 3. .gitignore (Updated) ✅
**Location:** `/euongelion/.gitignore`

**Added:**
```gitignore
# claude code
.claude/settings.local.json
.claude/cache/
.claude/sessions/
```

**Why Important:** Prevents committing local settings, cache, and session data to git. Only project-wide Claude Code configuration should be versioned.

### 4. CLAUDE_CODE_SETUP.md ✅
**Location:** `/euongelion/CLAUDE_CODE_SETUP.md`

**Purpose:** This document - explains the Claude Code setup for future reference

---

## How to Use Claude Code with This Project

### Starting a Session

```bash
cd /Users/meltmac/Documents/Personal/wkGD/EUONGELION-STARTUP/euongelion
claude
```

Claude Code will automatically:
1. Detect the project context
2. Load `.claude/` configuration
3. Apply permission rules from `settings.json`

### First Command in New Session

```
You: "Read CLAUDE.md to understand the project context"
```

Claude will read the comprehensive project documentation and understand:
- Current version (1.4.1)
- Tech stack
- Architecture decisions
- Design system
- Known issues
- Deployment workflow

### Using Specialized Agents

The project inherits 6 specialized agents from the parent directory:

```
# For feature development
"Read .claude/agents/ARCHITECT.md and implement [feature]"

# For styling/design work
"Read .claude/agents/DESIGNER.md and style [component]"

# For content creation
"Read .claude/agents/WRITER.md and create [content]"

# For deployment/operations
"Read .claude/agents/OPERATOR.md and deploy to production"

# For growth/marketing
"Read .claude/agents/LAUNCHER.md and plan [campaign]"

# For business decisions
"Read .claude/agents/STRATEGIST.md and analyze [business question]"
```

### Using Shared Skills

```
# For platform architecture questions
"Read .claude/skills/euongelion-platform/SKILL.md"

# For design system questions
"Read .claude/skills/wokegod-brand/SKILL.md"
```

---

## Development Workflow

### Standard Development Session

1. **Start Claude Code**
   ```bash
   cd /path/to/euongelion
   claude
   ```

2. **Load Context**
   ```
   "Read CLAUDE.md"
   ```

3. **Choose Agent** (optional, for specialized work)
   ```
   "Read .claude/agents/ARCHITECT.md and let's work on [feature]"
   ```

4. **Work on Tasks**
   ```
   "Implement dark mode toggle in navigation"
   "Fix logo colorization in dark mode"
   "Create new devotional series component"
   ```

5. **Test Locally**
   ```
   "Run npm run dev and verify the changes"
   ```

6. **Commit Changes**
   ```
   "Create a git commit with message: feat: [description]"
   ```

7. **Deploy** (when ready)
   ```
   "Deploy to production using vercel --prod"
   ```

### Emergency Fixes

```
"Read CLAUDE.md, then read CURRENT_STATUS.md"
"What issues are currently known?"
"Fix [specific issue] and deploy immediately"
```

---

## Permission System

### Allowed Operations

The `settings.json` permits:

**Development:**
- `npm run dev` - Start development server on port 3333
- `npm run build` - Production build
- `npm install [package]` - Install dependencies
- `npm run lint` - Run ESLint

**Deployment:**
- `vercel --prod` - Deploy to production
- `vercel --prod --force --yes` - Force deploy (skip cache)

**Git:**
- `git status`, `git diff`, `git log` - Inspection
- `git add`, `git commit` - Version control
- `git push` - Push to remote

**File Operations:**
- `ls`, `pwd`, `cat`, `grep`, `find`, `head`, `tail` - File inspection

### Denied Operations

For safety, these are explicitly blocked:

- `rm -rf /` or similar destructive commands
- `git push --force` - Forced push (use with caution manually)
- `git reset --hard` - Hard reset (can lose work)
- `npm uninstall react` or `npm uninstall next` - Removing core dependencies

**Note:** These can still be run manually if absolutely necessary, but Claude won't execute them automatically.

---

## Agent System

The project uses a multi-agent system where each agent has specialized knowledge and responsibilities.

### Agent Roles

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| **ARCHITECT** | Code, APIs, database | Building features, fixing bugs |
| **DESIGNER** | UI/UX, styling, brand | Styling components, layout work |
| **WRITER** | Content, copy, devotionals | Creating content, writing copy |
| **LAUNCHER** | Marketing, growth, social | Launch planning, user acquisition |
| **STRATEGIST** | Business, revenue, partnerships | Business decisions, monetization |
| **OPERATOR** | DevOps, deployment, monitoring | Deployment, production issues |

### Skills (Shared Knowledge)

| Skill | Contains | Used By |
|-------|----------|---------|
| **euongelion-platform** | API routes, auth, database schema | All agents |
| **wokegod-brand** | Colors, typography, components, animations | ARCHITECT, DESIGNER |

---

## Best Practices

### 1. Always Load Context First
```
"Read CLAUDE.md"
```
This ensures Claude understands the current project state, conventions, and lessons learned.

### 2. Use Agents for Specialized Work
Don't ask ARCHITECT to write marketing copy. Don't ask WRITER to fix TypeScript errors. Each agent has specific expertise.

### 3. Reference Documentation
- Current state: `CURRENT_STATUS.md`
- Setup info: `CLAUDE_CODE_SETUP.md` (this file)
- Project rules: `CLAUDE.md`
- Visual improvements: `VISUAL_IMPROVEMENTS.md`
- UX audit: `ELITE_UX_AUDIT.md`

### 4. Commit Frequently
```
"Create a git commit after completing [feature]"
```
Use conventional commit format: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`

### 5. Test Before Deploying
```
"Run npm run dev and verify [feature] works correctly"
```
Always test locally before pushing to production.

### 6. Document Lessons Learned
When encountering issues or making important decisions, update `CLAUDE.md` with the lesson learned.

---

## Project-Specific Rules

### Port Configuration
**Always use port 3333** for local development. Ports 3000-3005 are occupied.

```json
// package.json
"scripts": {
  "dev": "next dev -p 3333"
}
```

### Dark Mode Implementation
**Inline theme logic** into components rather than creating separate client components. This prevents hydration mismatches in production.

See: `src/components/Navigation.tsx` for reference implementation.

### Logo Handling
**Prevent filters on logos** to avoid colorization in dark mode:

```css
img[src*="/logos/"],
img[alt*="logo"] {
  filter: none !important;
  mix-blend-mode: normal !important;
}
```

### Typography Detection
**Use strict Scripture detection** to avoid over-styling text as block quotes:

```typescript
// Only treat as scripture if fully quoted
const paragraphIsScripture =
  paragraph.trim().startsWith('"') &&
  paragraph.trim().endsWith('"');
```

### Deployment
**Use force flag when needed** to skip Vercel build cache:

```bash
vercel --prod --force --yes
```

---

## Troubleshooting

### Issue: Claude doesn't know about the project
**Solution:** Start with `"Read CLAUDE.md"`

### Issue: Changes aren't visible on production
**Solution:**
1. Force rebuild: `vercel --prod --force --yes`
2. Clear browser cache
3. Verify deployment on Vercel dashboard

### Issue: Dark mode not working in production
**Solution:** Inline theme logic into Navigation component instead of separate client component (hydration mismatch issue)

### Issue: Git permission denied
**Solution:** Check `.claude/settings.json` - the command might be in the deny list for safety

### Issue: Port 3000 already in use
**Solution:** This project uses port 3333 by default (see `package.json`)

---

## Related Documentation

### In This Project
- `CLAUDE.md` - Main project context and rules
- `CURRENT_STATUS.md` - Current project state (v1.4.1)
- `VISUAL_IMPROVEMENTS.md` - Typography and conversion redesign
- `ELITE_UX_AUDIT.md` - UX principles applied
- `DEPLOYMENT_SUCCESS.md` - Deployment guide
- `SESSION_SUMMARY.md` - Complete session history

### In Parent Directory
- `../README.md` - Overall EUONGELION startup guide
- `../FOLDER-STRUCTURE.md` - Project organization
- `../.claude/agents/` - Agent definitions
- `../.claude/skills/` - Shared skills

### External Resources
- [Claude Code Best Practices](https://docs.anthropic.com/claude/docs/claude-code)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

## Maintenance

### Updating This Setup

When making significant changes to the project:

1. **Update CLAUDE.md**
   - Add new architecture decisions
   - Document lessons learned
   - Update known issues
   - Add new conventions

2. **Update settings.json** (if needed)
   - Add new permitted commands
   - Add new denied patterns

3. **Update .gitignore** (if needed)
   - Add new Claude Code paths to ignore

4. **Commit Changes**
   ```
   git add CLAUDE.md .claude/settings.json .gitignore
   git commit -m "docs: Update Claude Code configuration"
   ```

### Version History

- **v1.0** (2026-01-22) - Initial Claude Code setup following best practices
  - Created comprehensive CLAUDE.md
  - Configured settings.json with safe permissions
  - Updated .gitignore for Claude Code files
  - Documented setup in this file

---

## Summary

✅ **CLAUDE.md** - Complete project context and rules
✅ **.claude/settings.json** - Safe permission configuration
✅ **.gitignore** - Claude Code files excluded
✅ **Agent System** - 6 specialized agents available
✅ **Skills** - Platform and brand knowledge accessible
✅ **Documentation** - Comprehensive guides created

**The project is now properly configured for Claude Code development.**

---

**Last Updated:** 2026-01-22
**Maintained By:** Project team
**Questions?** Refer to `CLAUDE.md` or ask Claude to explain any section.
