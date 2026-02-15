# Launch Checklist

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** ACTIVE

---

## Purpose

This checklist ensures everything is verified and ready before EUONGELION goes live at wokegod.world. Complete every item before announcing launch.

---

## Launch Readiness Summary

```
LAUNCH READINESS
================
Date: _______________

CONTENT:      [ ] Ready  [ ] Not Ready
AUTH:         [ ] Ready  [ ] Not Ready
EMAIL:        [ ] Ready  [ ] Not Ready
ANALYTICS:    [ ] Ready  [ ] Not Ready
ERRORS:       [ ] Ready  [ ] Not Ready
INFRA:        [ ] Ready  [ ] Not Ready
PERFORMANCE:  [ ] Ready  [ ] Not Ready
SECURITY:     [ ] Ready  [ ] Not Ready
LEGAL:        [ ] Ready  [ ] Not Ready
TEAM:         [ ] Ready  [ ] Not Ready

LAUNCH DECISION: [ ] GO  [ ] NO-GO
```

---

## Section 1: Content Readiness

### 1.1 MVP Content Loaded

| Content | Required                                  | Loaded      | Verified |
| ------- | ----------------------------------------- | ----------- | -------- |
| [ ]     | Onboarding series (Welcome to EUONGELION) | \_\_\_ days | [ ]      |
| [ ]     | How to Approach This Material             | \_\_\_ days | [ ]      |
| [ ]     | Common Misconceptions                     | \_\_\_ days | [ ]      |
| [ ]     | Questions Everyone Asks                   | \_\_\_ days | [ ]      |
| [ ]     | What We Believe (Doctrine)                | \_\_\_ days | [ ]      |
| [ ]     | The Way of Jesus (Disciplines)            | \_\_\_ days | [ ]      |
| [ ]     | Existing Substack content                 | \_\_\_ days | [ ]      |

**Minimum for launch:** 50+ days of content

**Total days loaded:** **\_\_\_**

### 1.2 Content Quality Verified

| Check | Pass                                          |
| ----- | --------------------------------------------- | --- |
| [ ]   | All loaded content passed founder review      |     |
| [ ]   | All JSON validates correctly                  |     |
| [ ]   | No placeholder content remaining              |     |
| [ ]   | All citations present                         |     |
| [ ]   | Interactive elements work for all devotionals |     |

### 1.3 Content Organization

| Check | Pass                                                    |
| ----- | ------------------------------------------------------- | --- |
| [ ]   | Series are correctly grouped                            |     |
| [ ]   | Day ordering is correct                                 |     |
| [ ]   | Series metadata complete (titles, descriptions, images) |     |
| [ ]   | Related content links work                              |     |

---

## Section 2: Authentication Flow

### 2.1 Magic Link Auth

| Check | Pass                                       |
| ----- | ------------------------------------------ | --- |
| [ ]   | Sign-up form accepts email                 |     |
| [ ]   | Magic link email sends successfully        |     |
| [ ]   | Magic link email arrives within 60 seconds |     |
| [ ]   | Clicking magic link authenticates user     |     |
| [ ]   | Session persists after authentication      |     |
| [ ]   | Logout works correctly                     |     |

### 2.2 Auth Edge Cases

| Check | Pass                                       |
| ----- | ------------------------------------------ | --- |
| [ ]   | Invalid email rejected with clear message  |     |
| [ ]   | Expired magic link shows helpful error     |     |
| [ ]   | Already-used magic link handled gracefully |     |
| [ ]   | User can request new magic link            |     |
| [ ]   | Rate limiting prevents abuse               |     |

### 2.3 Account Management

| Check | Pass                                   |
| ----- | -------------------------------------- | --- |
| [ ]   | User can view their profile            |     |
| [ ]   | User can update preferences            |     |
| [ ]   | User can delete their account          |     |
| [ ]   | Account deletion removes all user data |     |

### 2.4 Session Management

| Check | Pass                                                    |
| ----- | ------------------------------------------------------- | --- |
| [ ]   | Session timeout is appropriate (30 days)                |     |
| [ ]   | Session refresh works                                   |     |
| [ ]   | Multiple device sessions handled                        |     |
| [ ]   | Session invalidation on password change (if applicable) |     |

---

## Section 3: Email Delivery

### 3.1 Transactional Emails

| Email Type                           | Sends | Delivers | Correct |
| ------------------------------------ | ----- | -------- | ------- |
| [ ] Magic link                       | [ ]   | [ ]      | [ ]     |
| [ ] Welcome email                    | [ ]   | [ ]      | [ ]     |
| [ ] Daily devotional (if applicable) | [ ]   | [ ]      | [ ]     |
| [ ] Password reset (if applicable)   | [ ]   | [ ]      | [ ]     |

### 3.2 Email Provider Health

| Check | Pass                                            |
| ----- | ----------------------------------------------- | --- |
| [ ]   | SPF record configured                           |     |
| [ ]   | DKIM configured                                 |     |
| [ ]   | DMARC configured                                |     |
| [ ]   | Not on any blocklists                           |     |
| [ ]   | Test emails to Gmail, Outlook, Yahoo successful |     |

### 3.3 Email Content

| Check | Pass                                          |
| ----- | --------------------------------------------- | --- |
| [ ]   | From address is branded (hello@wokegod.world) |     |
| [ ]   | Subject lines clear and professional          |     |
| [ ]   | Email content mobile-responsive               |     |
| [ ]   | Unsubscribe link present (if marketing)       |     |
| [ ]   | No broken images in emails                    |     |

---

## Section 4: Analytics Firing

### 4.1 Core Events Tracked

| Event | Fires                | Data Correct |
| ----- | -------------------- | ------------ |
| [ ]   | Page view            | [ ]          |
| [ ]   | Sign up started      | [ ]          |
| [ ]   | Sign up completed    | [ ]          |
| [ ]   | Soul Audit started   | [ ]          |
| [ ]   | Soul Audit completed | [ ]          |
| [ ]   | Series started       | [ ]          |
| [ ]   | Day viewed           | [ ]          |
| [ ]   | Day completed        | [ ]          |
| [ ]   | Series completed     | [ ]          |
| [ ]   | Share initiated      | [ ]          |
| [ ]   | Share completed      | [ ]          |

### 4.2 Analytics Tools

| Tool | Configured              | Verified |
| ---- | ----------------------- | -------- |
| [ ]  | Google Analytics 4      | [ ]      |
| [ ]  | Plausible (if used)     | [ ]      |
| [ ]  | Mixpanel (if used)      | [ ]      |
| [ ]  | Custom events dashboard | [ ]      |

### 4.3 User Properties

| Property | Captured                              |
| -------- | ------------------------------------- | --- |
| [ ]      | User ID (anonymous until auth)        |     |
| [ ]      | First visit date                      |     |
| [ ]      | Traffic source                        |     |
| [ ]      | Device type                           |     |
| [ ]      | Soul Audit pathway (after completion) |     |

### 4.4 Privacy Compliance

| Check | Pass                                    |
| ----- | --------------------------------------- | --- |
| [ ]   | Cookie consent banner displays          |     |
| [ ]   | Analytics respects consent choice       |     |
| [ ]   | Do Not Track respected (if implemented) |     |
| [ ]   | Data retention policy configured        |     |

---

## Section 5: Error Tracking

### 5.1 Error Monitoring Setup

| Check | Pass                                  |
| ----- | ------------------------------------- | --- |
| [ ]   | Sentry (or equivalent) configured     |     |
| [ ]   | Source maps uploaded                  |     |
| [ ]   | Environment tags correct (production) |     |
| [ ]   | Release version tagged                |     |

### 5.2 Alert Configuration

| Alert Type | Configured                           | Tested |
| ---------- | ------------------------------------ | ------ |
| [ ]        | New error type                       | [ ]    |
| [ ]        | Error spike (>10 in 5 min)           | [ ]    |
| [ ]        | Critical path errors (auth, payment) | [ ]    |
| [ ]        | API errors (5xx responses)           | [ ]    |

### 5.3 Alert Destinations

| Destination | Configured              |
| ----------- | ----------------------- | --- |
| [ ]         | Email to founder        |     |
| [ ]         | Slack/Discord channel   |     |
| [ ]         | PagerDuty (if critical) |     |

### 5.4 Test Error Flow

| Check | Pass                                     |
| ----- | ---------------------------------------- | --- |
| [ ]   | Intentional error captured by monitoring |     |
| [ ]   | Alert received within 5 minutes          |     |
| [ ]   | Error details sufficient for debugging   |     |
| [ ]   | Stack trace includes source maps         |     |

---

## Section 6: Infrastructure

### 6.1 DNS Configuration

| Check | Pass                              |
| ----- | --------------------------------- | --- |
| [ ]   | wokegod.world points to hosting   |     |
| [ ]   | www subdomain redirects to apex   |     |
| [ ]   | DNS propagation complete          |     |
| [ ]   | TTL set appropriately (300-3600s) |     |

### 6.2 SSL/TLS

| Check | Pass                                     |
| ----- | ---------------------------------------- | --- |
| [ ]   | SSL certificate valid                    |     |
| [ ]   | Certificate covers all subdomains needed |     |
| [ ]   | Auto-renewal configured                  |     |
| [ ]   | Certificate expiry > 30 days             |     |
| [ ]   | HTTPS redirects from HTTP                |     |
| [ ]   | HSTS header set                          |     |

### 6.3 Hosting

| Check | Pass                            |
| ----- | ------------------------------- | --- |
| [ ]   | Production environment deployed |     |
| [ ]   | Environment variables set       |     |
| [ ]   | Secrets not exposed in code     |     |
| [ ]   | Build successful                |     |
| [ ]   | Health check endpoint responds  |     |

### 6.4 Database

| Check | Pass                                  |
| ----- | ------------------------------------- | --- |
| [ ]   | Production database provisioned       |     |
| [ ]   | Connection pooling configured         |     |
| [ ]   | Backups scheduled (daily minimum)     |     |
| [ ]   | Point-in-time recovery enabled        |     |
| [ ]   | Row-level security enabled (Supabase) |     |

### 6.5 CDN

| Check | Pass                                 |
| ----- | ------------------------------------ | --- |
| [ ]   | CDN configured for static assets     |     |
| [ ]   | Cache headers set correctly          |     |
| [ ]   | Cache invalidation tested            |     |
| [ ]   | Edge locations cover target audience |     |

---

## Section 7: Performance

### 7.1 Load Testing

| Test | Target                  | Actual | Pass     |
| ---- | ----------------------- | ------ | -------- | --- |
| [ ]  | Concurrent users        | 100    | \_\_\_   |     |
| [ ]  | Requests per second     | 50     | \_\_\_   |     |
| [ ]  | 95th percentile latency | <500ms | \_\_\_ms |     |
| [ ]  | Error rate under load   | <1%    | \_\_\_%  |     |

### 7.2 Core Web Vitals

| Metric | Target | Desktop | Mobile   | Pass     |
| ------ | ------ | ------- | -------- | -------- | --- |
| [ ]    | LCP    | <2.5s   | \_\_\_s  | \_\_\_s  |     |
| [ ]    | FID    | <100ms  | \_\_\_ms | \_\_\_ms |     |
| [ ]    | CLS    | <0.1    | \_\_\_   | \_\_\_   |     |

### 7.3 Page Load Times

| Page | Target          | Actual | Pass    |
| ---- | --------------- | ------ | ------- | --- |
| [ ]  | Homepage        | <2s    | \_\_\_s |     |
| [ ]  | Soul Audit      | <2s    | \_\_\_s |     |
| [ ]  | Devotional page | <2s    | \_\_\_s |     |
| [ ]  | Dashboard       | <2s    | \_\_\_s |     |

### 7.4 Resource Budgets

| Resource | Budget            | Actual      | Pass     |
| -------- | ----------------- | ----------- | -------- | --- |
| [ ]      | Total page size   | <1MB        | \_\_\_KB |     |
| [ ]      | JavaScript bundle | <300KB      | \_\_\_KB |     |
| [ ]      | CSS               | <100KB      | \_\_\_KB |     |
| [ ]      | Images (hero)     | <200KB each | \_\_\_KB |     |

---

## Section 8: Security

### 8.1 Application Security

| Check | Pass                                             |
| ----- | ------------------------------------------------ | --- |
| [ ]   | No sensitive data in client-side code            |     |
| [ ]   | API keys not exposed                             |     |
| [ ]   | Environment variables for secrets                |     |
| [ ]   | Input validation on all forms                    |     |
| [ ]   | SQL injection protection (parameterized queries) |     |
| [ ]   | XSS protection (content sanitization)            |     |
| [ ]   | CSRF protection enabled                          |     |

### 8.2 Authentication Security

| Check | Pass                                      |
| ----- | ----------------------------------------- | --- |
| [ ]   | Passwords hashed (bcrypt/argon2) if used  |     |
| [ ]   | Magic links expire appropriately (15 min) |     |
| [ ]   | Magic links single-use                    |     |
| [ ]   | Rate limiting on auth endpoints           |     |
| [ ]   | Account lockout after failed attempts     |     |

### 8.3 Data Protection

| Check | Pass                              |
| ----- | --------------------------------- | --- |
| [ ]   | Data encrypted at rest            |     |
| [ ]   | Data encrypted in transit (TLS)   |     |
| [ ]   | PII access logged                 |     |
| [ ]   | Data retention policy implemented |     |

### 8.4 Security Headers

| Header | Value                     | Pass                            |
| ------ | ------------------------- | ------------------------------- | --- |
| [ ]    | Strict-Transport-Security | max-age=31536000                |     |
| [ ]    | X-Content-Type-Options    | nosniff                         |     |
| [ ]    | X-Frame-Options           | DENY                            |     |
| [ ]    | Content-Security-Policy   | [defined]                       |     |
| [ ]    | Referrer-Policy           | strict-origin-when-cross-origin |     |

---

## Section 9: Legal Compliance

### 9.1 Required Pages

| Page | Present          | Link in Footer |
| ---- | ---------------- | -------------- |
| [ ]  | Privacy Policy   | [ ]            |
| [ ]  | Terms of Service | [ ]            |
| [ ]  | Cookie Policy    | [ ]            |

### 9.2 Privacy Compliance

| Check | Pass                                        |
| ----- | ------------------------------------------- | --- |
| [ ]   | Cookie consent banner implemented           |     |
| [ ]   | Users can opt out of non-essential cookies  |     |
| [ ]   | Privacy policy accurate and complete        |     |
| [ ]   | Data subject access request process defined |     |
| [ ]   | GDPR compliant (if serving EU)              |     |
| [ ]   | CCPA compliant (if serving California)      |     |

### 9.3 Content Rights

| Check | Pass                           |
| ----- | ------------------------------ | --- |
| [ ]   | All images properly licensed   |     |
| [ ]   | Scripture quotations credited  |     |
| [ ]   | Font licenses valid            |     |
| [ ]   | Third-party content attributed |     |

---

## Section 10: Team Readiness

### 10.1 Support Preparation

| Check | Pass                                             |
| ----- | ------------------------------------------------ | --- |
| [ ]   | Support email configured (support@wokegod.world) |     |
| [ ]   | Support response templates ready                 |     |
| [ ]   | FAQ documented                                   |     |
| [ ]   | Escalation path defined                          |     |

### 10.2 Monitoring Schedule

| Shift               | Owner          | Hours             |
| ------------------- | -------------- | ----------------- |
| Launch day (0-8h)   | \***\*\_\*\*** | **_:_** - **_:_** |
| Launch day (8-16h)  | \***\*\_\*\*** | **_:_** - **_:_** |
| Launch day (16-24h) | \***\*\_\*\*** | **_:_** - **_:_** |
| Day 2               | \***\*\_\*\*** | On-call           |

### 10.3 Communication Channels

| Channel | Ready                      |
| ------- | -------------------------- | --- |
| [ ]     | Team Slack/Discord channel |     |
| [ ]     | Incident response thread   |     |
| [ ]     | Status page (if used)      |     |
| [ ]     | Social media accounts      |     |

### 10.4 Rollback Plan

| Check | Pass                                       |
| ----- | ------------------------------------------ | --- |
| [ ]   | Previous version tagged in git             |     |
| [ ]   | Rollback procedure documented              |     |
| [ ]   | Database rollback plan (if schema changed) |     |
| [ ]   | Rollback tested in staging                 |     |

---

## Launch Day Timeline

### T-24 Hours

| Time | Task                       | Owner | Done |
| ---- | -------------------------- | ----- | ---- |
| [ ]  | Final staging verification |       |      |
| [ ]  | Team briefing              |       |      |
| [ ]  | Support queue cleared      |       |      |
| [ ]  | Social posts scheduled     |       |      |

### T-2 Hours

| Time | Task                      | Owner | Done |
| ---- | ------------------------- | ----- | ---- |
| [ ]  | Deploy to production      |       |      |
| [ ]  | Smoke test critical paths |       |      |
| [ ]  | Verify monitoring         |       |      |
| [ ]  | Team online               |       |      |

### T-0 (Launch)

| Time | Task                   | Owner | Done |
| ---- | ---------------------- | ----- | ---- |
| [ ]  | DNS switch (if needed) |       |      |
| [ ]  | Verify public access   |       |      |
| [ ]  | Social announcement    |       |      |
| [ ]  | Monitor metrics        |       |      |

### T+1 Hour

| Time | Task                        | Owner | Done |
| ---- | --------------------------- | ----- | ---- |
| [ ]  | Review error logs           |       |      |
| [ ]  | Check analytics             |       |      |
| [ ]  | Respond to initial feedback |       |      |
| [ ]  | Team check-in               |       |      |

### T+4 Hours

| Time | Task                 | Owner | Done |
| ---- | -------------------- | ----- | ---- |
| [ ]  | Performance check    |       |      |
| [ ]  | User feedback review |       |      |
| [ ]  | Address any issues   |       |      |
| [ ]  | Status update        |       |      |

---

## Launch Sign-Off

```
LAUNCH SIGN-OFF
===============

Project: EUONGELION
Launch Date: _______________
Launch Time: _______________

SECTION SIGN-OFFS
-----------------
1. Content:       _____________ Date: _______
2. Auth:          _____________ Date: _______
3. Email:         _____________ Date: _______
4. Analytics:     _____________ Date: _______
5. Errors:        _____________ Date: _______
6. Infrastructure:_____________ Date: _______
7. Performance:   _____________ Date: _______
8. Security:      _____________ Date: _______
9. Legal:         _____________ Date: _______
10. Team:         _____________ Date: _______

FINAL APPROVAL
--------------
[ ] All sections verified
[ ] Rollback plan confirmed
[ ] Team ready

LAUNCH DECISION: [ ] GO  [ ] NO-GO

Founder Signature: _________________________
Date: _____________
Time: _____________
```

---

## Post-Launch Immediate Actions

After launch confirmed:

1. [ ] Monitor metrics for 15 minutes
2. [ ] Check error logs
3. [ ] Verify first user sign-ups working
4. [ ] Send team confirmation
5. [ ] Begin 48-hour monitoring (see POST-LAUNCH-MONITORING.md)

---

## Document Control

| Version | Date       | Author       | Changes          |
| ------- | ---------- | ------------ | ---------------- |
| 1.0     | 2026-01-17 | Process Team | Initial creation |

---

_"The only way to go fast is to go well." - Robert C. Martin_
