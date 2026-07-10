# HUMAN_REQUIRED — items only the founder can do

_Every item here is a failure to find an autonomous path; alternatives were exhausted first. Exact steps included._

## 1. GitHub push credentials (backup/source-of-truth only — deploys are NOT blocked)

**Why blocked:** No `gh` CLI installed (searched PATH, /opt/homebrew, /usr/local, Spotlight), no `~/.config/gh/hosts.yml`, no `~/.git-credentials`, no keychain entry for github.com. The remote is `https://github.com/creativcreature/euongelion.git` with `credential.helper=store`.

**Exact steps (pick one):**

- Easiest — in this Claude session type: `! git push origin elevation/soul-audit-rebuild && git push origin main` and enter credentials when prompted (a GitHub PAT with `repo` scope as the password, username `creativcreature`), or
- Install gh and auth: `brew install gh && gh auth login` (choose creativcreature), then tell the session to push.

**Impact while open:** all run commits exist only on this machine. Production deploys are unaffected (Cloudflare deploys from the working tree via the verified wrangler token).
