# Email & newsletter — options, not a decision

**Raised:** 2026-08-16 — "We need to set up a true newsletter and email solution
here. I dont want to have to continuously send texts to let people know about new
content. This needs to be set up to send emails to people with accounts, and then
people that want a newsletter, but not wanting to commit to an account."

**Status: RESEARCH ONLY.** Nothing implemented. Founder asked to understand the
options first.

---

## 1. These are two different jobs, and conflating them is the classic mistake

|              | Transactional                            | Broadcast / newsletter            |
| ------------ | ---------------------------------------- | --------------------------------- |
| Examples     | sign-in codes, receipts, account notices | "Day 1 of the new series is up"   |
| Volume shape | a trickle, one at a time                 | **one burst to everyone at once** |
| Timing       | must arrive in seconds                   | minutes is fine                   |
| Consent      | implied by the action                    | **explicit opt-in required**      |
| If it fails  | someone cannot get in                    | someone misses an update          |

The burst is what breaks naive setups. **500 subscribers × one newsletter = 500
emails in one minute.** A free tier advertising "3,000 emails a month" can still
be useless if it also caps you at 100 a day.

Almost every provider is good at one of these jobs and mediocre at the other.
The common professional setup is **two providers**, one for each.

---

## 2. What Cloudflare can and cannot do

You are already on Cloudflare, so this deserves a straight answer.

**Email Routing — free, inbound only.** Receives mail at `@euangelion.app` and
forwards it or hands it to a Worker. Useful for `hello@euangelion.app`. It does
**not** send.

**Cloudflare Email Service — public beta since April 2026.** Cloudflare's own
outbound sending, native to Workers. Three catches:

1. **Requires the Workers PAID plan** ($5/mo). You are on free.
2. **Public beta**, so the API can move under you.
3. **~50 recipients per send** — that is a transactional cap. It cannot mail a
   newsletter list.

**MailChannels is dead.** It was the free way to send from Workers and it
**ended 31 August 2024**. Any tutorial you find recommending it is out of date;
this trips people up constantly.

**So: Cloudflare is not your newsletter answer.** It could eventually be your
transactional answer, for $5/mo, once out of beta.

---

## 3. The free tiers that actually matter (verified August 2026)

Free tiers move constantly — MailerLite cut theirs hard in 2026 and SendGrid
killed its free tier outright. These are current as of this writing.

### For transactional (sign-in emails)

| Provider     | Free tier                                   | Verdict                                                                                 |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Resend**   | 3,000/mo, **100/day**, 1 domain             | Best fit. Modern, clean API. The daily cap is fine for sign-ins, fatal for newsletters. |
| **Brevo**    | 300/day, unlimited contacts                 | Also fine, and could do both jobs at low volume.                                        |
| **AWS SES**  | ~3,000/mo first year, then ~$0.10 per 1,000 | Cheapest at scale, most setup pain.                                                     |
| **Postmark** | 100/mo free                                 | Best deliverability in the business, but the free tier is a demo.                       |

**This alone fixes your current 2-emails-per-hour problem.** Supabase's built-in
mailer is a development convenience; any of the above replaces it via four SMTP
fields in the Supabase dashboard.

### For the newsletter

| Provider                 | Free tier                                    | Verdict                                                                                                         |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Kit** (was ConvertKit) | **10,000 subscribers, unlimited broadcasts** | The standout. Built for exactly this: a writer with an audience.                                                |
| **Brevo**                | unlimited contacts, **300/day**              | Free forever, but 300/day means a 1,000-person list takes 4 days to reach.                                      |
| **Buttondown**           | 100 subscribers                              | Lovely, markdown-first, matches the house voice. Free tier is tiny.                                             |
| **MailerLite**           | 250 subscribers, 2,500/mo                    | Cut back in 2026; no longer the obvious pick.                                                                   |
| **Substack**             | unlimited, free                              | Zero infrastructure. You already publish there. Owns the reading experience and takes a cut if you ever charge. |
| **Listmonk**             | free, self-hosted                            | No limits, no cost, but you own deliverability — which is the hard part.                                        |

---

## 4. The two-audience problem

You described two groups, and they need different plumbing:

**People with accounts.** Already in `public.users` (5 today). You know their
email. But **having an account is not consent to be marketed to** — that is the
part people get wrong legally. A separate opt-in flag is required.

**Newsletter-only people.** No account, just an email. Needs a new home. Two
shapes:

- **(a) The ESP owns the list.** An embedded Kit/Brevo form; they never touch
  your database. Zero code. The cost is that your audience lives on someone
  else's platform and your site does not know who they are.
- **(b) You own the list.** A `newsletter_subscribers` table in Supabase,
  mirrored to the ESP for sending. More work, and the list is yours — which for
  a devotional product, where the list _is_ the relationship, is worth
  something. It also lets an account-holder and a subscriber be recognised as
  the same person.

**A recommendation, since you will ask:** own the list, mirror it out. But start
with (a) if the goal is to stop sending texts this month — you can migrate a
list later, and you cannot un-annoy people you failed to email.

---

## 5. Things that are not optional, whichever you pick

**DNS authentication — SPF, DKIM, DMARC.** Three records on `euangelion.app`.
Without them a meaningful share of mail lands in spam or is rejected outright.
Since February 2024 Gmail and Yahoo enforce this for bulk senders. Your DNS is
already at Cloudflare, so this is a ten-minute job — but it is not skippable.

**Separate the two streams.** Send marketing from a subdomain
(`news.euangelion.app`) and transactional from another (or the root). If a
newsletter draws spam complaints, a shared reputation drags your **sign-in
emails** down with it — people cannot get into the product because a newsletter
annoyed someone. This is the single most valuable non-obvious thing on this page.

**One-click unsubscribe in every marketing email**, honoured immediately.
Required by CAN-SPAM, by GDPR, and by Gmail/Yahoo's bulk rules (RFC 8058).

**Explicit, recorded consent.** Double opt-in (confirm by clicking a link) is
best practice everywhere and effectively required in the EU. Store when and how
they consented — you already have a `consent_records` table.

**Special-category caution.** This is a religious product. Under GDPR Art. 9, a
list of people who subscribe to a Christian devotional newsletter _is_ a list of
people's religious belief. That raises the bar on consent and on who you share
the list with — which is another argument for owning it rather than scattering
it across ad platforms.

---

## 6. Shapes worth considering

**A. Cheapest that works — Resend + Kit.** Resend for sign-in mail (fixes the
2/hour cap today), Kit for the newsletter (10k subscribers, unlimited sends).
Both free. Two accounts, two dashboards, clean separation of the two jobs.

**B. Simplest — Brevo for both.** One account, one dashboard, free forever.
300/day is the ceiling: fine at a few hundred subscribers, a real constraint at
a thousand.

**C. Zero infrastructure — Substack.** You already publish there. No DNS, no
code, no limits. Gives up control of the reading experience and takes a cut on
any future paid tier.

**D. Fully owned — Supabase table + Resend + your own send job.** Total control,
your list, your design, no per-subscriber cost. It also means you own bounce
handling, unsubscribes, retries and deliverability — a real project, not an
afternoon.

**Not viable: Cloudflare alone.** Wrong tool for broadcast, and needs the paid
plan even for transactional.

---

## 7. What this depends on

Not decisions to make now, but the answers change the recommendation:

1. **How big do you expect the list to get this year?** Under ~300, Brevo alone
   is genuinely enough. Over ~1,000, the daily caps decide it.
2. **Does the newsletter drive people to the site, or replace it?** If the email
   IS the product, Substack/Kit are stronger. If it is a nudge back to
   euangelion.app, plain broadcasts are enough.
3. **Will the newsletter ever be paid?** That rules some options in and out.
4. **Do you want subscribers visible in the product** — "you have 412 readers" —
   or is a dashboard elsewhere fine?

---

## Sources

- [MailChannels End of Life — Cloudflare Workers](https://support.mailchannels.com/hc/en-us/articles/26814255454093-End-of-Life-Notice-Cloudflare-Workers)
- [Cloudflare Email Service docs](https://developers.cloudflare.com/email-service/)
- [Announcing Cloudflare Email Service's private beta](https://blog.cloudflare.com/email-service/)
- [Resend pricing 2026](https://nuntly.com/resend-pricing)
- [Free email marketing services 2026 — EmailToolTester](https://www.emailtooltester.com/en/blog/free-email-marketing-services/)
- [Best free email marketing software — Zapier](https://zapier.com/blog/free-email-marketing-software/)
