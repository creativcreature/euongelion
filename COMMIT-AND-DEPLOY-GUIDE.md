# Commit and Deploy Guide

How to commit code and deploy Euangelion. This project has strict pre-commit hooks — every check must pass before a commit succeeds.

---

## Quick Reference

```bash
# 1. Before committing: make sure CHANGELOG.md is updated
# 2. If you changed src/**/*.ts(x), you also need a feature PRD staged

# Stage your files
git add <files> CHANGELOG.md docs/feature-prds/F-xxx.md

# Commit (hooks run automatically)
git commit -m "SA-001 F-051: Short description of what changed"

# Before pushing: verify accounts
gh auth status                    # Confirm: creativcreature
git config user.email             # Confirm: chrisparker21@gmail.com

# Push
git push origin main
```

---

## What the Hooks Check

### Pre-Commit Hook (11 checks, runs in order)

| # | Check | What It Does | Common Fix |
|---|-------|-------------|------------|
| 1 | **lint-staged** | Prettier + ESLint on staged `.ts/.tsx/.css/.json/.md` | Run `npm run format`, re-stage |
| 2 | **type-check** | `tsc --noEmit` (strict mode) | Fix type errors in code |
| 3 | **verify:production-contracts** | Checks required doc files exist, route tokens match | Ensure contract docs exist |
| 4 | **verify:tracking** | CHANGELOG version matches package.json, CLAUDE.md refs | Update CHANGELOG.md |
| 5 | **verify:feature-prds** | All 50+ PRD files exist with required sections | Don't delete PRD files |
| 6 | **verify:feature-prd-link** | Feature code staged? PRD file must also be staged | `git add docs/feature-prds/F-xxx.md` |
| 7 | **verify:governance-alignment** | PRD index and registry stay in sync | Update both index + registry |
| 8 | **verify:methodology-traceability** | Methodology docs exist and PRDs reference them | Don't delete methodology docs |
| 9 | **verify:folder-structure** | Required dirs exist, frozen dirs untouched | `mkdir -p` missing dirs |
| 10 | **verify:appstore-gate** | App Store metadata files exist and validate | Don't delete appstore docs |
| 11 | **CHANGELOG enforcement** | If `.ts/.tsx` staged, CHANGELOG.md must also be staged | `git add CHANGELOG.md` |

### Commit-Msg Hook (runs after pre-commit passes)

The commit message **must** include:
- **`SA-xxx`** — a production decision ID (e.g., `SA-001`)
- **`F-xxx`** — a feature PRD ID (e.g., `F-051`)
- Every `F-xxx` referenced must have its matching `docs/feature-prds/F-xxx.md` staged

**Skipped for:** merge commits, reverts, fixups

**Example commit messages:**
```
SA-001 F-051: Add Apple TV browse page with editorial rails
SA-030 SA-031 F-028 F-050: Add post-signup onboarding and curation
```

---

## Step-by-Step: Making a Feature Commit

### 1. Update CHANGELOG.md

Add an entry at the top of CHANGELOG.md describing what you changed.

### 2. Create or update a Feature PRD

If this is new work, create `docs/feature-prds/F-0XX.md`:

```markdown
# F-0XX: Feature Name

**Status:** Shipped
**Sprint:** 5
**Date:** 2026-02-21

## Summary
What this feature does.

## Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2
```

### 3. Stage everything

```bash
git add src/your-changed-files.tsx
git add CHANGELOG.md
git add docs/feature-prds/F-0XX.md
```

### 4. Commit

```bash
git commit -m "SA-001 F-0XX: Description of changes"
```

The hooks will run. If they fail, read the error, fix the issue, re-stage, and commit again (new commit, not amend).

### 5. Push

```bash
git push origin main
```

Vercel auto-deploys on every push to `main`.

---

## Account Setup

This machine has multiple GitHub accounts. Before any push:

```bash
# Check which account is active
gh auth status

# Switch if needed
gh auth switch --user creativcreature

# Verify git identity
git config user.email   # Should be: chrisparker21@gmail.com
git config user.name    # Should be: creativcreature
```

**Correct values:**
| Setting | Value |
|---------|-------|
| GitHub account | `creativcreature` |
| Git email | `chrisparker21@gmail.com` |
| Git name | `creativcreature` |
| GitHub repo | `creativcreature/euongelion` |
| Vercel team | `james-projects-5d824c1e/euongelion` |
| Production URL | `https://euangelion.app` |

---

## Emergency Bypass

Only when absolutely necessary:

```bash
git commit --no-verify -m "SA-001 F-0XX: hotfix description"
```

Then immediately run checks manually:
```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run verify:feature-prds
npm run lint
npm test
```

---

## Troubleshooting

### "CHANGELOG.md not staged but code files changed"
```bash
# Edit CHANGELOG.md with your changes, then:
git add CHANGELOG.md
# Retry the commit
```

### "Feature code is staged but no docs/feature-prds/F-xxx.md file is staged"
```bash
# Create or update a feature PRD, then:
git add docs/feature-prds/F-0XX.md
# Retry the commit
```

### "Feature commit messages must reference a production decision id"
Your commit message needs `SA-xxx` in it. Use `SA-001` if unsure which decision applies.

### "refusing to allow an OAuth App to create or update workflow"
The GitHub token needs `workflow` scope:
```bash
gh auth refresh -h github.com -s workflow
# Complete browser authorization
```

### Push rejected / wrong account
```bash
gh auth switch --user creativcreature
gh auth status  # Verify
git push origin main
```

### Vercel build fails
1. Check Vercel dashboard → Deployments → Latest
2. Verify env vars are set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`
3. Fix and push again

---

## Deployment Flow

```
Commit (hooks pass)
    → Push to main
        → GitHub Actions CI (type-check, verify, lint, build, test)
            → Vercel auto-deploy to euangelion.app
```

No manual deploy step needed. Push to `main` = production deploy.
