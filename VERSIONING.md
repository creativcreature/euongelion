# EUONGELION Versioning Strategy

## Overview

This document outlines the versioning strategy for the EUONGELION project, enabling easy rollback and tracking of all changes.

## Version Format

We use **Semantic Versioning 2.0.0** (semver.org):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** - Breaking changes, complete redesigns, major feature additions
- **MINOR** - New features, significant improvements, non-breaking changes
- **PATCH** - Bug fixes, small tweaks, content updates

### Examples

- `v1.0.0` - Initial Wake Up Zine transformation (current)
- `v1.1.0` - Adding dark mode feature
- `v1.1.1` - Fixing navigation bug
- `v2.0.0` - Complete redesign or architectural change

## Current Version

**v1.0.0** - Wake Up Zine: Series landing pages implementation

## Git Workflow

### Every Change is Committed

Each logical unit of work should be committed immediately:

1. **Make changes** to files
2. **Stage changes**: `git add [files]` or `git add -A`
3. **Commit with descriptive message**: `git commit -m "Description"`
4. **Tag major milestones**: `git tag -a vX.Y.Z -m "Description"`

### Commit Message Format

```
<type>: <short description>

<optional longer description>

<optional breaking changes>
<optional issues closed>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, design changes
- `refactor:` - Code restructuring
- `content:` - Content updates (devotionals, copy)
- `chore:` - Build, config, dependencies

**Examples:**

```bash
# New feature
git commit -m "feat: Add dark mode toggle to navigation"

# Bug fix
git commit -m "fix: Correct series slug routing in homepage links"

# Content update
git commit -m "content: Update Hope series Day 3 devotional"

# Style change
git commit -m "style: Adjust typography scale for mobile viewports"
```

## Rolling Back Changes

### View Version History

```bash
# See all commits
git log --oneline

# See all tagged versions
git tag -l

# See changes in specific commit
git show <commit-hash>

# See changes between versions
git diff v1.0.0 v1.1.0
```

### Rollback Methods

#### Method 1: Revert to Previous Version (Safe)

Creates a new commit that undoes changes:

```bash
# Revert to a specific version (creates new commit)
git revert <commit-hash>

# Revert last commit
git revert HEAD

# Revert last 3 commits
git revert HEAD~3..HEAD
```

**Pros:** Preserves history, safe for shared repositories
**Cons:** Creates additional commits

#### Method 2: Reset to Previous Version (Destructive)

Completely removes commits from history:

```bash
# SOFT reset - keeps your changes as uncommitted
git reset --soft <commit-hash>

# MIXED reset - keeps your changes as unstaged
git reset --mixed <commit-hash>

# HARD reset - DESTROYS all changes (use with caution!)
git reset --hard <commit-hash>
```

**Warning:** `--hard` permanently deletes uncommitted work. Use only when certain.

#### Method 3: Checkout Specific Version (Temporary)

View old version without changing current branch:

```bash
# Temporarily view old version
git checkout v1.0.0

# Return to current version
git checkout main
```

#### Method 4: Create Branch from Old Version

Preserve old version as separate branch:

```bash
# Create new branch from old version
git checkout -b restore-v1.0.0 v1.0.0

# Work on this branch, then merge back if needed
git checkout main
git merge restore-v1.0.0
```

## Common Rollback Scenarios

### Scenario 1: "Last change broke something, need to undo"

```bash
# See what changed in last commit
git show HEAD

# Undo last commit (keep changes as uncommitted)
git reset --soft HEAD~1

# Fix the issue, then commit again
git add -A
git commit -m "fix: Corrected navigation bug"
```

### Scenario 2: "Need to go back to v1.0.0"

```bash
# Check current version
git tag -l

# View what changed since v1.0.0
git log v1.0.0..HEAD --oneline

# Rollback to v1.0.0 (destructive)
git reset --hard v1.0.0

# Or create revert commit (safe)
git revert <commit-hash-of-bad-change>
```

### Scenario 3: "Want to compare current version with v1.0.0"

```bash
# See all changes since v1.0.0
git diff v1.0.0 HEAD

# See only file names changed
git diff --name-only v1.0.0 HEAD

# See specific file changes
git diff v1.0.0 HEAD -- src/app/page.tsx
```

### Scenario 4: "Made several bad commits, need to undo all"

```bash
# View recent commits
git log --oneline -10

# Undo last 5 commits (keep changes)
git reset --soft HEAD~5

# Or undo and discard all changes (destructive!)
git reset --hard HEAD~5
```

## Version Tags

### Creating Tags

```bash
# Lightweight tag (simple pointer)
git tag v1.1.0

# Annotated tag (recommended - includes message, date, author)
git tag -a v1.1.0 -m "Added dark mode feature"

# Tag specific commit
git tag -a v1.0.1 <commit-hash> -m "Retrospective tag for bug fix"
```

### Viewing Tags

```bash
# List all tags
git tag -l

# List tags matching pattern
git tag -l "v1.*"

# Show tag details
git show v1.0.0
```

### Deleting Tags

```bash
# Delete local tag
git tag -d v1.1.0

# Delete remote tag (if pushing to remote)
git push origin --delete v1.1.0
```

## Best Practices

### 1. Commit Often, Commit Small

- Commit after each logical change
- Don't bundle unrelated changes in one commit
- Makes rollback more granular and precise

### 2. Write Descriptive Commit Messages

- First line: Short summary (50 chars max)
- Body: Detailed explanation if needed
- Include "why" not just "what"

### 3. Tag Major Milestones

- Tag every version increment (v1.0.0, v1.1.0, v1.1.1)
- Tag before major changes (easy rollback point)
- Tag working states before experiments

### 4. Test Before Committing

- Ensure site works before committing
- Run `npm run build` to check for errors
- Test key functionality

### 5. Use Branches for Experiments

```bash
# Create experimental branch
git checkout -b experiment-dark-mode

# Make changes, test, commit
git add -A
git commit -m "feat: Experimental dark mode implementation"

# If successful, merge to main
git checkout main
git merge experiment-dark-mode

# If failed, just delete branch
git branch -D experiment-dark-mode
```

## Emergency Rollback Procedure

If the site is broken and you need to quickly restore:

```bash
# 1. Check what version you're on
git log --oneline -5

# 2. See all tagged versions
git tag -l

# 3. Immediately rollback to last known good version
git reset --hard v1.0.0

# 4. Verify site works
npm run dev

# 5. If working, create new branch to fix issue
git checkout -b fix-broken-feature

# 6. Fix issue on branch, test, then merge back
git checkout main
git merge fix-broken-feature
```

## Backup Strategy

### Local Backups

Git history serves as automatic backup, but for extra safety:

```bash
# Create backup branch of current state
git checkout -b backup-$(date +%Y%m%d)

# Return to main
git checkout main
```

### Remote Backups (Optional)

If using GitHub/GitLab:

```bash
# Push all commits
git push origin main

# Push all tags
git push origin --tags

# Push specific tag
git push origin v1.0.0
```

## Version History

### v1.0.0 (2026-01-21)

**Tag:** `v1.0.0`
**Commit:** `a6df53f`
**Description:** Wake Up Zine - Series landing pages complete

**Features:**
- Complete homepage transformation
- 7 series landing pages created
- 35 devotional JSON files
- Accordion.net.au aesthetic applied
- Viewport-width typography system
- Scroll-based animations
- wokeGod logo integration
- Middleware-based route protection

**Files Changed:** 104 files (8,200 insertions, 419 deletions)

**Key Files:**
- `src/app/page.tsx` - Homepage
- `src/app/series/[slug]/page.tsx` - Series landing pages
- `src/app/devotional/[slug]/page.tsx` - Devotional days
- `DEVELOPMENT_LOG.md` - Project documentation
- `middleware.ts` - Route protection

---

## Quick Reference

```bash
# See current version
git describe --tags

# See all versions
git tag -l

# Rollback to last commit (safe)
git reset --soft HEAD~1

# Rollback to specific version (destructive)
git reset --hard v1.0.0

# View changes since version
git log v1.0.0..HEAD --oneline

# Compare two versions
git diff v1.0.0 v1.1.0

# Create new version tag
git tag -a v1.1.0 -m "Description"
```

---

**Last Updated:** 2026-01-21
**Maintained By:** Claude Code + Melt Mac
