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

---

# 📌 PINNED DIRECTION — founder, 2026-08-19 morning

Work list, verbatim intent, in progress:

1. **BUG:** the verse unscramble ("piece together a scripture") overflows the
   page — needs a container.
2. **Footer pages accuracy pass:** every page linked in the footer updated to
   match how the site actually works today — accurate, no secret sauce, no
   lying. **Specifically /how-we-write.**
3. **Site-wide typographic hierarchy:** one unified system, best standards,
   beautiful. Size hierarchies are all over — especially Daily Bread.
   Daily Bread should get MORE robust.
4. **Author pages:** each author listed on /how-we-write gets a dedicated page
   — photo hopefully, small bio, where their words appear on site (not
   comprehensive).
5. **Daily Bread prayer:** full psalm is right, but needs proper biblical
   annotation (verse numbers etc.).
6. **The three "How to read" sections (lectio divina etc.):** each leads to a
   robust dedicated page explaining it in detail. They feel incomplete.
7. **Gallery, Vasari-style:** captions that talk about the art's quality and
   what is literally shown. Full gallery of 7 images with a lightbox — the
   image archive should be showcased.
8. **Comic strip (already pinned above):** real multi-panel strip; waiting on
   the founder's ChatGPT cartoon → `content/strip-reference/`.
9. ~~30 modules paste~~ — **NO LONGER NEEDED for content.** All the new
   sections compute on the page itself now (SA-094). The ONLY paste that
   still matters is `database/APPLY-NOW-2026-08-19.sql` (reading-progress
   sync across devices). `-19b.sql` is optional/retired.
10. ~~Audio on the Daily Bread devotional~~ — DONE. 15/15 rendered via
    Voicebox (provision/truth/hope), chapters measured, player mounted.
11. **Container rule:** no content breaks its container on any page touched.
