# Local Dual-Account (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run two Claude Code accounts simultaneously on this machine as `claude --1` / `claude --2`, sharing all authored config, with zero sync surface.

**Architecture:** `~/.claude` stays account #1. `~/.claude-2` is a thin config dir holding only per-account state; everything authored is symlinked to account #1's copy. MCP servers move to a shared file loaded via `--mcp-config --strict-mcp-config`, so `.claude.json` never needs syncing. A shell wrapper intercepts `--1`/`--2`; a SessionStart hook proves integrity in-session.

**Tech Stack:** zsh, POSIX shell, `jq`-free python3 for JSON, Claude Code 2.1.241 native install.

**Spec:** `docs/superpowers/specs/2026-08-23-dual-account-failover-design.md`

## Global Constraints

- Config dir env var is `CLAUDE_CONFIG_DIR`; `.claude.json` is created **inside** it (verified 2026-08-23).
- Account #1 config at `~/.claude` must never be moved, renamed, or have files deleted.
- Shared artifacts live in `~/.claude-shared/`. Account #2 config dir is `~/.claude-2`.
- The four local MCP servers are exactly: `mobbin`, `nanobanana-mcp`, `robinhood-trading`, `comfyui`.
- Every launch passes `--mcp-config ~/.claude-shared/mcp.json --strict-mcp-config`.
- Never write secrets into `~/.claude-shared/` — it may later be versioned.

---

### Task 1: Extract MCP servers to a shared config file

**Files:**

- Create: `~/.claude-shared/mcp.json`
- Create: `~/.claude-shared/test/test-mcp-shared.sh`

**Interfaces:**

- Produces: `~/.claude-shared/mcp.json`, a JSON object with a single top-level `mcpServers` key. All later tasks pass it via `--mcp-config`.

- [ ] **Step 1: Write the failing test**

```sh
#!/bin/sh
# ~/.claude-shared/test/test-mcp-shared.sh
set -eu
F="$HOME/.claude-shared/mcp.json"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
for s in mobbin nanobanana-mcp robinhood-trading comfyui; do
  python3 -c "
import json,sys
d=json.load(open('$F'))
sys.exit(0 if '$s' in d.get('mcpServers',{}) else 1)" \
    || { echo "FAIL: server $s missing from shared mcp.json"; exit 1; }
done
OUT=$(claude --mcp-config "$F" --strict-mcp-config mcp list 2>&1)
for s in mobbin nanobanana-mcp robinhood-trading comfyui; do
  echo "$OUT" | grep -q "$s" || { echo "FAIL: $s not loaded via --mcp-config"; exit 1; }
done
echo "PASS: shared mcp.json exports all 4 servers"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mkdir -p ~/.claude-shared/test && sh ~/.claude-shared/test/test-mcp-shared.sh`
Expected: FAIL with `$HOME/.claude-shared/mcp.json missing`

- [ ] **Step 3: Write minimal implementation**

```sh
mkdir -p ~/.claude-shared
python3 -c "
import json
src=json.load(open('$HOME/.claude.json'))
json.dump({'mcpServers': src.get('mcpServers', {})},
          open('$HOME/.claude-shared/mcp.json','w'), indent=2)
print('wrote', len(src.get('mcpServers',{})), 'servers')"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `sh ~/.claude-shared/test/test-mcp-shared.sh`
Expected: `PASS: shared mcp.json exports all 4 servers`

- [ ] **Step 5: Commit**

`~/.claude-shared` is not yet a repo. Initialize and commit:

```bash
cd ~/.claude-shared && git init -q && \
  printf 'test/tmp/\n*.log\n' > .gitignore && \
  git add -A && git commit -q -m "feat: shared MCP config for dual-account setup"
```

---

### Task 2: Provision the account-2 config dir

**Files:**

- Create: `~/.claude-shared/bin/provision-account2.sh`
- Create: `~/.claude-shared/test/test-provision.sh`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `~/.claude-2/` containing symlinks `skills`, `plugins`, `hooks`, `CLAUDE.md`, `settings.json`, `projects` → the `~/.claude` equivalents. `~/.claude-2/.claude.json` must be a **regular file**, never a symlink.

- [ ] **Step 1: Write the failing test**

```sh
#!/bin/sh
# ~/.claude-shared/test/test-provision.sh
set -eu
D="$HOME/.claude-2"
[ -d "$D" ] || { echo "FAIL: $D missing"; exit 1; }
for l in skills plugins hooks CLAUDE.md settings.json projects; do
  [ -L "$D/$l" ] || { echo "FAIL: $D/$l is not a symlink"; exit 1; }
  [ -e "$D/$l" ] || { echo "FAIL: $D/$l is a broken symlink"; exit 1; }
  T=$(readlink "$D/$l")
  [ "$T" = "$HOME/.claude/$l" ] || { echo "FAIL: $l points at $T"; exit 1; }
done
[ -L "$D/.claude.json" ] && { echo "FAIL: .claude.json must NOT be a symlink"; exit 1; }
echo "PASS: account-2 config dir provisioned"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `sh ~/.claude-shared/test/test-provision.sh`
Expected: FAIL with `$HOME/.claude-2 missing`

- [ ] **Step 3: Write minimal implementation**

```sh
#!/bin/sh
# ~/.claude-shared/bin/provision-account2.sh
set -eu
SRC="$HOME/.claude"
DST="$HOME/.claude-2"
mkdir -p "$DST"
for l in skills plugins hooks CLAUDE.md settings.json projects; do
  [ -e "$SRC/$l" ] || { echo "skip (absent in account 1): $l"; continue; }
  if [ -L "$DST/$l" ]; then rm "$DST/$l"; fi
  if [ -e "$DST/$l" ]; then
    echo "REFUSING: $DST/$l exists as a real file; move it aside first" >&2
    exit 1
  fi
  ln -s "$SRC/$l" "$DST/$l"
  echo "linked $l"
done
echo "provisioned $DST"
```

Run it: `sh ~/.claude-shared/bin/provision-account2.sh`

- [ ] **Step 4: Run test to verify it passes**

Run: `sh ~/.claude-shared/test/test-provision.sh`
Expected: `PASS: account-2 config dir provisioned`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude-shared && git add -A && \
  git commit -q -m "feat: provision account-2 config dir with shared symlinks"
```

---

### Task 3: Launcher wrapper for `claude --1` / `claude --2`

**Files:**

- Create: `~/.claude-shared/launcher.zsh`
- Modify: `~/.zshrc` (append one `source` line)
- Create: `~/.claude-shared/test/test-launcher.sh`

**Interfaces:**

- Consumes: `~/.claude-shared/mcp.json` (Task 1), `~/.claude-2` (Task 2).
- Produces: shell function `claude`. Bare `claude` → account #1 (`~/.claude`). `claude --1` → same, explicit. `claude --2` → `~/.claude-2`. All remaining args pass through unchanged.

- [ ] **Step 1: Write the failing test**

```sh
#!/bin/sh
# ~/.claude-shared/test/test-launcher.sh
set -eu
L="$HOME/.claude-shared/launcher.zsh"
[ -f "$L" ] || { echo "FAIL: $L missing"; exit 1; }
D2=$(zsh -c "source $L; claude --2 --config-dir-echo 2>/dev/null || echo \$CLAUDE_CONFIG_DIR" 2>/dev/null || true)
zsh -c "source $L; type claude | grep -q function" \
  || { echo "FAIL: claude is not a shell function"; exit 1; }
V1=$(zsh -c "source $L; claude --1 --version" 2>&1)
V2=$(zsh -c "source $L; claude --2 --version" 2>&1)
echo "$V1" | grep -q "Claude Code" || { echo "FAIL: --1 broke: $V1"; exit 1; }
echo "$V2" | grep -q "Claude Code" || { echo "FAIL: --2 broke: $V2"; exit 1; }
echo "PASS: launcher routes both accounts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `sh ~/.claude-shared/test/test-launcher.sh`
Expected: FAIL with `launcher.zsh missing`

- [ ] **Step 3: Write minimal implementation**

```zsh
# ~/.claude-shared/launcher.zsh
claude() {
  local cfg="$HOME/.claude"
  case "$1" in
    --1) shift ;;
    --2) cfg="$HOME/.claude-2"; shift ;;
  esac
  CLAUDE_CONFIG_DIR="$cfg" command claude \
    --mcp-config "$HOME/.claude-shared/mcp.json" --strict-mcp-config "$@"
}
```

Then append to `~/.zshrc`:

```sh
printf '\n# Dual-account Claude Code launcher (see ~/.claude-shared)\nsource "$HOME/.claude-shared/launcher.zsh"\n' >> ~/.zshrc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `sh ~/.claude-shared/test/test-launcher.sh`
Expected: `PASS: launcher routes both accounts`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude-shared && git add -A && \
  git commit -q -m "feat: claude --1 / --2 launcher wrapper"
```

---

### Task 4: Settle Keychain namespacing (spec open question 2)

**Files:**

- Create: `~/.claude-shared/test/test-credential-isolation.sh`
- Create (only if the test fails): `~/.claude-shared/NOTES-credentials.md`

**Interfaces:**

- Consumes: Task 3 launcher.
- Produces: a definitive answer recorded in `NOTES-credentials.md`, and — if Keychain proves shared — `CLAUDE_SECURESTORAGE_CONFIG_DIR` added to the launcher's exported env.

This is the last feasibility risk in Part B. Do it before minting the tier-2 token.

- [ ] **Step 1: Record the pre-state**

```sh
security find-generic-password -s "Claude Code-credentials" -g 2>&1 \
  | grep -E '"(acct|svce)"' | tee ~/.claude-shared/test/keychain-before.txt
```

- [ ] **Step 2: Log into account #2**

Run: `claude --2` then `/login`, and complete the browser flow with the second account.

- [ ] **Step 3: Write the isolation test**

```sh
#!/bin/sh
# ~/.claude-shared/test/test-credential-isolation.sh
set -eu
A1=$(CLAUDE_CONFIG_DIR="$HOME/.claude" python3 -c "
import json,os
p=os.path.expanduser('~/.claude/.claude.json')
print(json.load(open(p)).get('oauthAccount',{}).get('emailAddress','NONE'))" 2>/dev/null \
  || python3 -c "
import json,os
print(json.load(open(os.path.expanduser('~/.claude.json'))).get('oauthAccount',{}).get('emailAddress','NONE'))")
A2=$(python3 -c "
import json,os
p=os.path.expanduser('~/.claude-2/.claude.json')
print(json.load(open(p)).get('oauthAccount',{}).get('emailAddress','NONE'))")
echo "account1=$A1 account2=$A2"
[ "$A1" != "NONE" ] || { echo "FAIL: account 1 identity lost"; exit 1; }
[ "$A2" != "NONE" ] || { echo "FAIL: account 2 never logged in"; exit 1; }
[ "$A1" != "$A2" ] || { echo "FAIL: both dirs report the SAME account"; exit 1; }
echo "PASS: credentials are isolated per config dir"
```

- [ ] **Step 4: Run it**

Run: `sh ~/.claude-shared/test/test-credential-isolation.sh`
Expected: `PASS: credentials are isolated per config dir`

**If it FAILS** with both dirs reporting the same account, the Keychain entry is shared. Apply the fallback: add `CLAUDE_SECURESTORAGE_CONFIG_DIR="$cfg"` alongside `CLAUDE_CONFIG_DIR` in `launcher.zsh`, re-login to account #2, and re-run. Record the outcome either way in `NOTES-credentials.md`.

- [ ] **Step 5: Commit**

```bash
cd ~/.claude-shared && git add -A && \
  git commit -q -m "test: verify per-config-dir credential isolation"
```

---

### Task 5: SessionStart integrity guard

**Files:**

- Create: `~/.claude-shared/hooks/account-guard.sh`
- Modify: `~/.claude/settings.json` (add a `SessionStart` hook; shared via symlink, so it runs for both accounts)
- Create: `~/.claude-shared/test/test-guard.sh`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: a hook printing one banner line naming the live account, plus loud warnings on broken symlinks or MCP drift. Exit code is always 0 — the guard informs, it never blocks a session.

- [ ] **Step 1: Write the failing test**

```sh
#!/bin/sh
# ~/.claude-shared/test/test-guard.sh
set -eu
H="$HOME/.claude-shared/hooks/account-guard.sh"
[ -x "$H" ] || { echo "FAIL: $H missing or not executable"; exit 1; }
OUT=$(CLAUDE_CONFIG_DIR="$HOME/.claude-2" sh "$H" 2>&1)
echo "$OUT" | grep -q "account 2" || { echo "FAIL: no account-2 banner: $OUT"; exit 1; }
OUT1=$(CLAUDE_CONFIG_DIR="$HOME/.claude" sh "$H" 2>&1)
echo "$OUT1" | grep -q "account 1" || { echo "FAIL: no account-1 banner: $OUT1"; exit 1; }
# drift detection: a stray mcpServers entry must be reported
python3 - <<'EOF'
import json,os
p=os.path.expanduser('~/.claude-2/.claude.json')
d=json.load(open(p)); d.setdefault('mcpServers',{})['__drifttest__']={'type':'stdio','command':'true'}
json.dump(d,open(p,'w'),indent=2)
EOF
OUTD=$(CLAUDE_CONFIG_DIR="$HOME/.claude-2" sh "$H" 2>&1)
python3 - <<'EOF'
import json,os
p=os.path.expanduser('~/.claude-2/.claude.json')
d=json.load(open(p)); d.get('mcpServers',{}).pop('__drifttest__',None)
json.dump(d,open(p,'w'),indent=2)
EOF
echo "$OUTD" | grep -q "__drifttest__" || { echo "FAIL: MCP drift not reported"; exit 1; }
echo "PASS: guard reports account and drift"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `sh ~/.claude-shared/test/test-guard.sh`
Expected: FAIL with `account-guard.sh missing or not executable`

- [ ] **Step 3: Write minimal implementation**

```sh
#!/bin/sh
# ~/.claude-shared/hooks/account-guard.sh
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
case "$CFG" in
  "$HOME/.claude-2") LABEL="account 2" ;;
  *)                 LABEL="account 1" ;;
esac
EMAIL=$(python3 -c "
import json,os
for p in ('$CFG/.claude.json', os.path.expanduser('~/.claude.json')):
    try:
        print(json.load(open(p)).get('oauthAccount',{}).get('emailAddress','unknown')); break
    except Exception: continue
else: print('unknown')" 2>/dev/null)
echo "[claude] $LABEL — $EMAIL — $CFG"

if [ "$CFG" = "$HOME/.claude-2" ]; then
  for l in skills plugins hooks CLAUDE.md settings.json projects; do
    [ -e "$CFG/$l" ] || echo "[claude] WARNING: broken or missing link: $CFG/$l"
  done
fi

python3 -c "
import json,os
shared=set(json.load(open(os.path.expanduser('~/.claude-shared/mcp.json'))).get('mcpServers',{}))
try: local=set(json.load(open('$CFG/.claude.json')).get('mcpServers',{}))
except Exception: local=set()
stray=local-shared
if stray:
    print('[claude] WARNING: mcpServers in .claude.json not in shared mcp.json (IGNORED under --strict-mcp-config): '+', '.join(sorted(stray)))
    print('[claude]          add them to ~/.claude-shared/mcp.json instead.')
" 2>/dev/null
exit 0
```

Make executable and register in the shared settings:

```sh
chmod +x ~/.claude-shared/hooks/account-guard.sh
python3 - <<'EOF'
import json,os
p=os.path.expanduser('~/.claude/settings.json')
d=json.load(open(p))
d.setdefault('hooks',{}).setdefault('SessionStart',[]).append(
  {"hooks":[{"type":"command","command":"$HOME/.claude-shared/hooks/account-guard.sh"}]})
json.dump(d,open(p,'w'),indent=2)
print('SessionStart hook registered')
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `sh ~/.claude-shared/test/test-guard.sh`
Expected: `PASS: guard reports account and drift`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude-shared && git add -A && \
  git commit -q -m "feat: SessionStart account banner and MCP drift guard"
```

---

### Task 6: Mint the tier-2 token (hands off to Part A)

**Files:**

- Modify: GitHub secrets on the euangelion repo (no repo files change)

**Interfaces:**

- Consumes: a working, logged-in account #2 (Task 4).
- Produces: repo secret `CLAUDE_CODE_OAUTH_TOKEN_2`, consumed by Part A's tier ladder.

- [ ] **Step 1: Confirm account 2 is live**

Run: `claude --2` and check the banner reads `account 2` with the second email.

- [ ] **Step 2: Mint the token**

Run: `CLAUDE_CONFIG_DIR="$HOME/.claude-2" claude setup-token`
Copy the emitted token.

- [ ] **Step 3: Store it as a repo secret**

```bash
cd ~/Documents/app-projects/external/euangelion
gh secret set CLAUDE_CODE_OAUTH_TOKEN_2
# paste the token at the prompt
```

- [ ] **Step 4: Verify it registered**

Run: `gh secret list | grep CLAUDE_CODE_OAUTH_TOKEN_2`
Expected: the secret listed with today's date.

- [ ] **Step 5: Record completion**

```bash
cd ~/.claude-shared && \
  printf '\n- %s: CLAUDE_CODE_OAUTH_TOKEN_2 minted from account 2 and stored.\n' "$(date +%F)" >> NOTES-credentials.md && \
  git add -A && git commit -q -m "docs: record tier-2 token provisioning"
```

---

## Manual verification

After Task 6, confirm the whole system end to end:

1. Open two terminals. Run `claude --1` in one and `claude --2` in the other, simultaneously.
2. Each banner names a different account.
3. In both, `/mcp` lists the same four servers.
4. In both, your skills and `CLAUDE.md` are present.
5. Quit both. Re-open `claude --1`; confirm it is still account #1 — proving account #2's login did not evict it.

Step 5 is the one that matters most; it is the real-world version of Task 4's test.

## Not covered by this plan

The claude.ai connectors (Gmail, Calendar, Drive, Canva, Adobe, Higgsfield, Granola, Cloudflare, Microsoft 365) are provisioned server-side per account. Account #2 must re-authorise each by hand through `/mcp`. No script can do this.
