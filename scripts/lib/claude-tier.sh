# Tier ladder for subscription-billed composition. Source this, don't execute.
#
#   tier 1  CLAUDE_CODE_OAUTH_TOKEN     account 1 subscription
#   tier 2  CLAUDE_CODE_OAUTH_TOKEN_2   account 2 subscription
#   tier 3  CONTENT_PIPELINE_API_KEY    dedicated metered key, console spend cap
#
# See docs/superpowers/specs/2026-08-23-dual-account-failover-design.md.
# Exactly one credential is left set after select_tier; the rest are unset.

# classify_tier_output <exit_code> <output_file> -> healthy | invalid | exhausted
#
# FAIL-SAFE: anything non-zero that is not recognisably an auth problem is
# reported as `exhausted` so the ladder ADVANCES rather than stalling. A bad
# token must be distinguished because it needs a human, not the next tier.
classify_tier_output() {
  _code="$1"; _file="$2"
  if [ "$_code" = "0" ]; then echo healthy; return 0; fi
  if grep -qiE 'oauth access token is invalid|token has expired|invalid api key|invalid.*token|please run /login|unauthorized|401' "$_file" 2>/dev/null; then
    echo invalid; return 0
  fi
  echo exhausted
}

# _probe_tier <env_var_name> <value> -> 0 if that credential is usable
_probe_tier() {
  [ -n "${2:-}" ] || return 2
  _out=$(mktemp)
  env -u CLAUDE_CODE_OAUTH_TOKEN -u CLAUDE_CODE_OAUTH_TOKEN_2 \
      -u ANTHROPIC_API_KEY -u CONTENT_PIPELINE_API_KEY \
      "$1=$2" claude -p 'ok' >"$_out" 2>&1
  _code=$?
  _verdict=$(classify_tier_output "$_code" "$_out")
  if [ "$_verdict" = "invalid" ]; then
    echo "[tier] ALERT: credential $1 is invalid or expired — needs a human, not a retry" >&2
    sed -n '1,3p' "$_out" >&2
  fi
  rm -f "$_out"
  [ "$_verdict" = "healthy" ]
}

# select_tier -> exports CLAUDE_TIER and exactly one credential; 1 if none work
select_tier() {
  unset ANTHROPIC_API_KEY

  if _probe_tier CLAUDE_CODE_OAUTH_TOKEN "${CLAUDE_CODE_OAUTH_TOKEN:-}"; then
    CLAUDE_TIER=1; export CLAUDE_TIER
    unset CLAUDE_CODE_OAUTH_TOKEN_2 CONTENT_PIPELINE_API_KEY
    echo "[tier] 1 — account 1 subscription"
    return 0
  fi
  echo "[tier] 1 unavailable, advancing" >&2

  if _probe_tier CLAUDE_CODE_OAUTH_TOKEN "${CLAUDE_CODE_OAUTH_TOKEN_2:-}"; then
    CLAUDE_TIER=2; export CLAUDE_TIER
    CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN_2"; export CLAUDE_CODE_OAUTH_TOKEN
    unset CONTENT_PIPELINE_API_KEY
    echo "[tier] 2 — account 2 subscription"
    return 0
  fi
  echo "[tier] 2 unavailable, advancing to the metered API floor" >&2

  if [ -n "${CONTENT_PIPELINE_API_KEY:-}" ]; then
    CLAUDE_TIER=3; export CLAUDE_TIER
    ANTHROPIC_API_KEY="$CONTENT_PIPELINE_API_KEY"; export ANTHROPIC_API_KEY
    unset CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_2
    echo "[tier] 3 — dedicated metered API key (billed)"
    return 0
  fi

  echo "[tier] NO TIER AVAILABLE" >&2
  return 1
}
