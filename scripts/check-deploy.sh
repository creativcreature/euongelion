#!/bin/bash
# Pre-deploy sanity check — run before any Vercel deploy or git push
# Prevents deploying to wrong account or with wrong git identity

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

EXPECTED_VERCEL_USER="wokegodx"
EXPECTED_GIT_EMAIL="wokegod3@gmail.com"
EXPECTED_VERCEL_TEAM="wokegodxs-projects"

echo "=== Euangelion Deploy Check ==="

# Check git email
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "NOT SET")
if [ "$GIT_EMAIL" != "$EXPECTED_GIT_EMAIL" ]; then
  echo -e "${RED}FAIL: Git email is '$GIT_EMAIL' — expected '$EXPECTED_GIT_EMAIL'${NC}"
  echo "Fix: git config --global user.email \"$EXPECTED_GIT_EMAIL\""
  exit 1
fi
echo -e "${GREEN}OK: Git email = $GIT_EMAIL${NC}"

# Check Vercel identity
VERCEL_USER=$(npx vercel whoami 2>/dev/null || echo "NOT LOGGED IN")
if [ "$VERCEL_USER" != "$EXPECTED_VERCEL_USER" ]; then
  echo -e "${RED}FAIL: Vercel user is '$VERCEL_USER' — expected '$EXPECTED_VERCEL_USER'${NC}"
  echo "Fix: npx vercel logout && npx vercel login"
  exit 1
fi
echo -e "${GREEN}OK: Vercel user = $VERCEL_USER${NC}"

# Check .vercel/project.json points to correct project
if [ -f .vercel/project.json ]; then
  PROJECT_NAME=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.vercel/project.json','utf8')).projectName)")
  if [ "$PROJECT_NAME" != "euangelion" ]; then
    echo -e "${RED}FAIL: .vercel/project.json links to '$PROJECT_NAME' — expected 'euangelion'${NC}"
    exit 1
  fi
  echo -e "${GREEN}OK: Vercel project = $PROJECT_NAME${NC}"
else
  echo -e "${RED}FAIL: .vercel/project.json not found. Run: npx vercel link --project euangelion --yes${NC}"
  exit 1
fi

echo -e "${GREEN}=== All checks passed ===${NC}"
