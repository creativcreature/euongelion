# 📌 FOUNDER ACTIONS — pinned 2026-08-19

Four steps, in order. Each unblocks something already built.

## 1. Paste one SQL file → turns on cross-device reading progress

Open: **https://supabase.com/dashboard/project/ovivwbopjfruikehrlgm/sql/new**
Paste the contents of **`database/APPLY-NOW-2026-08-19.sql`**, click **Run**.
Expected: "Success. No rows returned."
(Until then, progress sync reports CONFIG_FEATURE_DISABLED — loud, by design.)

## 2. One terminal command → unlocks every /admin page in production

```bash
printf 'c.parker3@me.com' | npx wrangler secret put ADMIN_EMAIL_ALLOWLIST
```

Without it, admin fails closed — including your new review queue at
**/admin/edition** (4 Sunday features are already waiting in it).

## 3. Add 3 GitHub secrets → the paper refreshes itself nightly

GitHub → creativcreature/euongelion → Settings → Secrets and variables →
Actions → New repository secret. Add these three (values are in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

## 4. ~~Say "deploy"~~ — DONE. Deployed 2026-08-19 on your "is it up?" message.

---

### Parked (not urgent)

- **Custom SMTP** (Resend/Postmark/SES) — built-in mailer caps at 2 emails/hour.
- **Stripe env** (`BILLING_CHECKOUT_LIVE` + keys) — purchases stay off until set.
- **The comic strip** — new direction (real multi-panel strip, Peanuts/Boondocks
  register). Waiting on the ChatGPT cartoon you started — see CHANGELOG note.
