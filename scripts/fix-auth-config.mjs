#!/usr/bin/env node
/**
 * Repair the Supabase auth configuration that makes in-app code entry fail.
 *
 * Three faults, all verified against the live project on 2026-08-16:
 *
 *  1. `mailer_templates_magic_link_content` is Supabase's STOCK DEFAULT and
 *     contains no `{{ .Token }}`. F-065 shipped an in-app 6-digit code entry
 *     (`/api/auth/verify-code`) that literally cannot work, because the email
 *     never carries a code.
 *  2. `mailer_otp_length` is **8**, while the app hard-requires `/^\d{6}$/` in
 *     both the UI and the route. Even with a token in the template, every code
 *     would be rejected. Six digits is also the near-universal convention
 *     (Google, Apple, Stripe, GitHub), so the config moves to the app rather
 *     than the reverse.
 *  3. The template is unbranded stock HTML on a product whose whole identity is
 *     typographic. The rewrite stays deliberately plain — an auth email is
 *     infrastructure, not a broadside — but it is at least in the product's
 *     voice and carries BOTH the link and the code.
 *
 * NOT fixed here, because it needs an account this script cannot create:
 * `smtp_host` is null, so the built-in mailer is in use and
 * `rate_limit_email_sent` is **2 per hour**. That is a Supabase platform
 * limit on the built-in sender; the only real fix is custom SMTP (Resend,
 * Postmark, SES). Google sign-in already routes around it for most readers.
 *
 *   node scripts/fix-auth-config.mjs --check   # report only
 *   node scripts/fix-auth-config.mjs           # apply
 */
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const PAT = process.env.SUPABASE_ACCESS_TOKEN
const REF = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace('https://', '')
  .split('.')[0]
const CHECK_ONLY = process.argv.includes('--check')

if (!PAT || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL.')
  process.exit(1)
}

const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`

/**
 * The code is in the SUBJECT as well as the body: iOS and Android autofill both
 * read it from there, and a reader scanning an inbox on a phone should not have
 * to open the mail to act on it.
 */
const SUBJECT = 'Your Euangelion sign-in code: {{ .Token }}'

/**
 * Table layout and inline styles, because email clients support neither modern
 * CSS nor external stylesheets. Restrained on purpose — this is infrastructure.
 */
const TEMPLATE = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ece6;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #d9d2c7;">
      <tr><td style="padding:28px 32px 8px;">
        <p style="margin:0 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#1f2a8d;">Euangelion</p>
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:normal;font-style:italic;color:#11182a;">Welcome back.</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a4256;">Use the code below, or follow the link. Either one signs you in.</p>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 24px;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:30px;letter-spacing:0.28em;color:#11182a;padding:16px 0;border-top:1px solid #d9d2c7;border-bottom:1px solid #d9d2c7;">{{ .Token }}</div>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 28px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2a8d;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;padding:14px 28px;">Sign in</a>
      </td></tr>
      <tr><td style="padding:0 32px 28px;">
        <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7183;">This code expires in an hour. If you didn't ask to sign in, you can ignore this email — nothing will happen.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`

const PATCH = {
  // 6 digits: what the app validates, and what every reader expects.
  mailer_otp_length: 6,
  mailer_subjects_magic_link: SUBJECT,
  mailer_templates_magic_link_content: TEMPLATE,
  // The confirmation mail is the same moment for a new reader.
  mailer_subjects_confirmation: SUBJECT,
  mailer_templates_confirmation_content: TEMPLATE,
}

const current = await fetch(API, {
  headers: { Authorization: `Bearer ${PAT}` },
}).then((r) => r.json())

const report = (label, before, after) =>
  console.log(`  ${label.padEnd(34)} ${before}  ->  ${after}`)

console.log(`Project: ${REF}\n`)
console.log('BEFORE:')
report(
  'mailer_otp_length',
  current.mailer_otp_length,
  CHECK_ONLY ? '(unchanged)' : PATCH.mailer_otp_length,
)
report(
  'magic link has {{ .Token }}',
  String(current.mailer_templates_magic_link_content || '').includes(
    '{{ .Token }}',
  ),
  CHECK_ONLY ? '(unchanged)' : true,
)
report(
  'confirmation has {{ .Token }}',
  String(current.mailer_templates_confirmation_content || '').includes(
    '{{ .Token }}',
  ),
  CHECK_ONLY ? '(unchanged)' : true,
)
console.log(
  `\n  custom SMTP: ${current.smtp_host ? current.smtp_host : 'NONE — built-in mailer, rate_limit_email_sent = ' + current.rate_limit_email_sent + '/hour'}`,
)

if (CHECK_ONLY) {
  console.log('\n--check: nothing changed.')
  process.exit(0)
}

const response = await fetch(API, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(PATCH),
})

if (!response.ok) {
  console.error(`\nPATCH FAILED ${response.status}`)
  console.error((await response.text()).slice(0, 400))
  process.exit(1)
}

const after = await fetch(API, {
  headers: { Authorization: `Bearer ${PAT}` },
}).then((r) => r.json())

console.log('\nAFTER (read back from the API, not assumed):')
console.log('  mailer_otp_length            ', after.mailer_otp_length)
console.log(
  '  magic link has {{ .Token }}  ',
  String(after.mailer_templates_magic_link_content || '').includes(
    '{{ .Token }}',
  ),
)
console.log(
  '  confirmation has {{ .Token }}',
  String(after.mailer_templates_confirmation_content || '').includes(
    '{{ .Token }}',
  ),
)
console.log('  subject                      ', after.mailer_subjects_magic_link)
console.log('\nDone.')
