# HUMAN_REQUIRED — items only the founder can do

_Every item here is a failure to find an autonomous path; alternatives were exhausted first. Exact steps included._

## 1. GitHub push credentials — ✅ RESOLVED 2026-07-10 (gh CLI installed from official release; founder authorized via browser device flow; both branches pushed; credential in macOS keyring — no future prompts)

**Why blocked:** No `gh` CLI installed (searched PATH, /opt/homebrew, /usr/local, Spotlight), no `~/.config/gh/hosts.yml`, no `~/.git-credentials`, no keychain entry for github.com. The remote is `https://github.com/creativcreature/euongelion.git` with `credential.helper=store`.

**Exact steps (pick one):**

- Easiest — in this Claude session type: `! git push origin elevation/soul-audit-rebuild && git push origin main` and enter credentials when prompted (a GitHub PAT with `repo` scope as the password, username `creativcreature`), or
- Install gh and auth: `brew install gh && gh auth login` (choose creativcreature), then tell the session to push.

**Impact while open:** all run commits exist only on this machine. Production deploys are unaffected (Cloudflare deploys from the working tree via the verified wrangler token).

## 2. Reminders go-live (5 steps, ~10 minutes, in this order)

**Why blocked:** applying the production DB migration autonomously was denied by the session's permission gate (production-change review); Supabase secret-setting + edge deploy follow it. NOTE: do the VAPID step only TOGETHER WITH migration 017 — setting the key alone makes the reader's push opt-in send window fields the DB can't store yet. Everything else (picker UI, window persistence, timezone-aware idempotent sender, dry-run guards) is implemented and tested (50 new tests; see F-070).

1. **Apply migration 017**: Supabase dashboard → SQL editor → paste `database/migrations/017_add_reminder_window_to_push_subscriptions.sql`.
2. **VAPID keys**: a keypair is already generated at `/private/tmp/claude-501/-Users-jamesparker-Documents-app-projects-external-euangelion/a6a97842-6eec-43a4-9a1b-aa518379246a/scratchpad/vapid.json` (or regenerate: `npx web-push generate-vapid-keys`). Put `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` (build-time — a Worker secret alone won't reach the client bundle) AND as a Worker secret; then `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:hello@euangelion.app`.
3. **Deploy the sender**: `supabase functions deploy send-daily-push`.
4. **Schedule hourly pg_cron** (dashboard SQL; needs pg_cron + pg_net): `select cron.schedule('send-daily-push-hourly', '5 * * * *', $$select net.http_post(url := 'https://<project-ref>.supabase.co/functions/v1/send-daily-push', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_KEY>','X-Internal-Secret','<INTERNAL_ROUTE_SECRET>'), body := '{}'::jsonb);$$);`
5. **Safe first send**: subscribe one test browser → invoke with `{"dryRun":true,"onlyEndpoint":"<test endpoint>"}` → inspect counts → repeat without dryRun. Never invoke by hand without `onlyEndpoint`.

**Impact while open:** the Settings picker shows its honest "unconfigured" state; nothing pretends to work.

## 3. Sign-in code visibility (1 edit, ~2 minutes)

**Why blocked:** the hosted Supabase email templates can't be edited from the repo. The in-app 6-digit code entry is fully built and live-proven; readers just need the code IN the email.

**Exact steps:** Supabase Dashboard → project → Authentication → Emails (Email Templates) → edit **Magic Link** AND **Confirm signup** → add a line like `<p>Your sign-in code: {{ .Token }}</p>` → Save.

**Impact while open:** sign-in works exactly as before (link only); the code form's copy is honest about it.
