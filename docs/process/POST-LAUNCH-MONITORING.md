# Post-Launch Monitoring

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** ACTIVE

---

## Purpose

This document defines what to monitor, alert thresholds, escalation procedures, and rollback criteria for the first 48 hours after EUONGELION launch.

---

## Monitoring Schedule

### First 48 Hours Coverage

| Period     | Hours       | Intensity | Owner               |
| ---------- | ----------- | --------- | ------------------- |
| Hour 0-4   | Launch      | CRITICAL  | Founder + Engineer  |
| Hour 4-12  | Settling    | HIGH      | Engineer on-call    |
| Hour 12-24 | Stabilizing | MEDIUM    | Engineer on-call    |
| Hour 24-48 | Cruising    | NORMAL    | Check every 4 hours |

### Check Intervals

| Period        | Check Frequency  |
| ------------- | ---------------- |
| First 4 hours | Every 15 minutes |
| Hours 4-12    | Every 30 minutes |
| Hours 12-24   | Every hour       |
| Hours 24-48   | Every 4 hours    |

---

## What to Watch

### 1. Error Rates

**Where to Look:** Sentry Dashboard, Server Logs, Supabase Logs

| Metric                | Normal | Warning | Critical |
| --------------------- | ------ | ------- | -------- |
| JavaScript errors/min | <1     | 1-5     | >5       |
| API errors/min        | <1     | 1-3     | >3       |
| Auth failures/min     | <2     | 2-5     | >5       |
| 5xx responses/min     | 0      | 1-2     | >2       |
| 4xx responses/min     | <10    | 10-25   | >25      |

**Red Flags:**

- Any error affecting >10% of users
- Repeating error patterns
- Errors in auth flow
- Database connection errors

### 2. Performance Metrics

**Where to Look:** Vercel Analytics, Lighthouse, Real User Monitoring

| Metric                         | Normal | Warning   | Critical |
| ------------------------------ | ------ | --------- | -------- |
| LCP (Largest Contentful Paint) | <2.5s  | 2.5-4s    | >4s      |
| TTFB (Time to First Byte)      | <200ms | 200-500ms | >500ms   |
| API response time (p95)        | <300ms | 300-800ms | >800ms   |
| Page load time                 | <3s    | 3-5s      | >5s      |

**Red Flags:**

- Sudden spike in load times
- Database query timeouts
- CDN cache misses increasing

### 3. User Metrics

**Where to Look:** Analytics Dashboard (GA4, Mixpanel)

| Metric                 | Healthy Sign     | Concern          |
| ---------------------- | ---------------- | ---------------- |
| New sign-ups           | Steady flow      | Sudden drop      |
| Soul Audit starts      | >50% of visitors | <30% of visitors |
| Soul Audit completions | >70% of starts   | <50% of starts   |
| Day 1 completions      | >60% of matched  | <40% of matched  |
| Bounce rate            | <50%             | >70%             |
| Session duration       | >3 min           | <1 min           |

**Red Flags:**

- Zero sign-ups for 30+ minutes (during expected traffic)
- Completion rate dropping suddenly
- Users hitting error pages

### 4. Infrastructure Health

**Where to Look:** Vercel Dashboard, Supabase Dashboard, DNS Status

| Component | Check              | Normal        | Alert If           |
| --------- | ------------------ | ------------- | ------------------ |
| Web app   | Health endpoint    | 200 OK        | Non-200 or timeout |
| Database  | Connection pool    | <50% utilized | >80% utilized      |
| Database  | Active connections | <20           | >50                |
| CDN       | Cache hit ratio    | >80%          | <50%               |
| DNS       | Resolution time    | <100ms        | >500ms             |
| SSL       | Certificate valid  | Yes           | Expiring <7 days   |

### 5. Email Delivery

**Where to Look:** Email Provider Dashboard (Resend, Sendgrid, etc.)

| Metric          | Normal | Warning | Critical |
| --------------- | ------ | ------- | -------- |
| Delivery rate   | >98%   | 95-98%  | <95%     |
| Bounce rate     | <2%    | 2-5%    | >5%      |
| Spam complaints | 0      | 1-2     | >2       |
| Send latency    | <10s   | 10-30s  | >30s     |

**Red Flags:**

- Magic links not arriving
- Emails landing in spam
- Delivery queue backing up

---

## Alert Thresholds

### Severity Levels

| Level         | Response Time | Who Gets Notified       | Action                 |
| ------------- | ------------- | ----------------------- | ---------------------- |
| P0 - Critical | Immediate     | Founder + All Engineers | Drop everything        |
| P1 - High     | 15 minutes    | On-call Engineer        | Interrupt current work |
| P2 - Medium   | 1 hour        | On-call Engineer        | Next priority          |
| P3 - Low      | 4 hours       | Engineering queue       | When available         |

### Alert Definitions

#### P0 - Critical (Site Down)

Trigger ANY of:

- [ ] Homepage returns non-200 for >2 minutes
- [ ] Auth completely broken
- [ ] Database unreachable
- [ ] > 25% of requests failing
- [ ] Data breach detected

**Notification:** Phone call + SMS + Slack

#### P1 - High (Major Degradation)

Trigger ANY of:

- [ ] Error rate >5 per minute for >5 minutes
- [ ] API latency p95 >2 seconds
- [ ] Email delivery failing
- [ ] Soul Audit broken
- [ ] Payment processing failing (if applicable)

**Notification:** SMS + Slack

#### P2 - Medium (Partial Impact)

Trigger ANY of:

- [ ] Error rate 2-5 per minute sustained
- [ ] Specific feature broken (share, print, etc.)
- [ ] Performance degraded but functional
- [ ] Non-critical integrations failing

**Notification:** Slack + Email

#### P3 - Low (Minor Issue)

Trigger ANY of:

- [ ] Cosmetic issues
- [ ] Non-blocking errors
- [ ] Edge case failures
- [ ] Monitoring gaps

**Notification:** Email

---

## Escalation Procedures

### Step 1: Acknowledge (Within SLA)

```
ACKNOWLEDGMENT TEMPLATE
=======================
Alert: [Alert name]
Severity: [P0/P1/P2/P3]
Time: [Timestamp]
Acknowledging: [Your name]
Status: Investigating

Initial assessment:
[Brief description of what you see]

Next step:
[What you're doing next]
```

### Step 2: Investigate

1. Check error logs (Sentry)
2. Check server logs (Vercel)
3. Check database logs (Supabase)
4. Check recent deployments
5. Check external service status (AWS, DNS, etc.)

### Step 3: Communicate

**Internal (Team Channel):**

- What's happening
- Who's working on it
- ETA for resolution (if known)
- What you need (if anything)

**External (If user-facing, >15 min):**

- Status page update
- Social media acknowledgment (if significant)

### Step 4: Resolve or Escalate

**If you can fix it:**

1. Implement fix
2. Verify fix works
3. Monitor for 15 minutes
4. Close alert with notes

**If you need help:**

1. Escalate to next person
2. Document what you've tried
3. Hand off cleanly
4. Stay available for questions

### Step 5: Post-Incident

After resolution:

1. Document timeline
2. Identify root cause
3. Create follow-up tasks
4. Schedule post-mortem (if P0/P1)

---

## Escalation Contacts

### Primary Contacts

| Role            | Name   | Phone   | Slack     | Availability          |
| --------------- | ------ | ------- | --------- | --------------------- |
| Founder         | [Name] | [Phone] | @founder  | 24/7 for P0/P1        |
| Lead Engineer   | [Name] | [Phone] | @engineer | On-call rotation      |
| Backup Engineer | [Name] | [Phone] | @backup   | When lead unavailable |

### Vendor Contacts

| Service        | Support             | Priority Line                   |
| -------------- | ------------------- | ------------------------------- |
| Vercel         | support@vercel.com  | Enterprise line (if applicable) |
| Supabase       | support@supabase.io | Dashboard support               |
| Email Provider | [Support URL]       | [Phone if available]            |
| DNS Provider   | [Support URL]       | [Phone if available]            |

### Escalation Matrix

```
ESCALATION FLOW
===============

Issue Detected
     |
     v
[On-Call Engineer] <-- First 15 min
     |
     | (If not resolved)
     v
[Lead Engineer] <-- Next 30 min
     |
     | (If not resolved or P0)
     v
[Founder] <-- Immediate for P0
     |
     | (If external dependency)
     v
[Vendor Support]
```

---

## Rollback Criteria

### When to Rollback

**Automatic Rollback Triggers (No approval needed):**

- [ ] Homepage completely down for >5 minutes
- [ ] Auth broken for all users
- [ ] Data corruption detected
- [ ] Security breach confirmed

**Rollback Consideration (Discuss first):**

- [ ] Error rate >10% sustained >15 minutes
- [ ] Critical feature broken with no quick fix
- [ ] Performance severely degraded (>5s load times)
- [ ] Major user complaints about functionality

**DO NOT Rollback For:**

- Minor cosmetic issues
- Single user complaints
- Edge case errors
- Performance slightly degraded

### Rollback Procedure

#### Pre-Rollback Checklist

- [ ] Confirm rollback is appropriate (not a quick fix available)
- [ ] Notify team of impending rollback
- [ ] Identify rollback target (previous deploy)
- [ ] Confirm database compatibility (schema unchanged or reversible)

#### Rollback Steps

**For Vercel (Frontend/API):**

```bash
# 1. Find previous deployment
vercel ls --prod

# 2. Rollback to previous
vercel rollback [deployment-url]

# 3. Verify
curl -I https://wokegod.world
```

**For Database (If schema rollback needed):**

```bash
# 1. Identify rollback point
# 2. Run reverse migration
npx prisma migrate resolve --rolled-back [migration-name]

# 3. Verify data integrity
# 4. Re-deploy compatible code
```

#### Post-Rollback

1. [ ] Verify site is stable
2. [ ] Monitor for 30 minutes
3. [ ] Communicate to team
4. [ ] Document what happened
5. [ ] Plan forward fix

---

## Monitoring Dashboard Setup

### Recommended Views

#### View 1: Real-Time Health

```
+------------------+------------------+
|   Error Rate     |   Response Time  |
|   (last 15 min)  |   (p95, live)    |
+------------------+------------------+
|   Active Users   |   Requests/min   |
|   (real-time)    |   (live)         |
+------------------+------------------+
```

#### View 2: User Flow

```
+-------------------------------------------+
|  Funnel: Visit > Soul Audit > Sign Up     |
|  [Visual funnel with conversion rates]    |
+-------------------------------------------+
|  Day Completion Rate (last 24h)           |
+-------------------------------------------+
```

#### View 3: Infrastructure

```
+------------------+------------------+
|   Database CPU   |   Database Mem   |
+------------------+------------------+
|   CDN Hit Rate   |   Edge Latency   |
+------------------+------------------+
```

### Dashboard Links

| Dashboard | URL                                  | Access     |
| --------- | ------------------------------------ | ---------- |
| Vercel    | https://vercel.com/[project]         | Team login |
| Supabase  | https://app.supabase.io/project/[id] | Team login |
| Sentry    | https://sentry.io/[org]/[project]    | Team login |
| Analytics | https://analytics.google.com/...     | Team login |
| Email     | [Provider dashboard URL]             | Team login |

---

## Communication Templates

### Internal Status Update

```
INTERNAL STATUS UPDATE
======================
Time: [HH:MM UTC]
Status: [Investigating/Identified/Monitoring/Resolved]

Summary:
[1-2 sentence summary]

Impact:
[Who/what is affected]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [Time or "when status changes"]

—[Your name]
```

### External Status Update (If using status page)

```
[TIME] - [STATUS]

We are [investigating/aware of/resolving] an issue affecting [specific functionality].

[Impact description - be honest but calm]

We are actively working on a resolution and will provide updates as we have them.

—EUONGELION Team
```

### Resolution Notice

```
RESOLVED
========
Time: [HH:MM UTC]
Duration: [X hours Y minutes]

Summary:
[What happened]

Resolution:
[How it was fixed]

Impact:
[Users affected, data impact if any]

Prevention:
[What we're doing to prevent recurrence]

—[Your name]
```

---

## 48-Hour Checklist

### Hour 1

- [ ] Verify all systems operational
- [ ] Check first user sign-ups
- [ ] Monitor error rates
- [ ] Team check-in

### Hour 4

- [ ] Review all errors logged
- [ ] Check email delivery stats
- [ ] Review user completion rates
- [ ] First performance review

### Hour 12

- [ ] Comprehensive metrics review
- [ ] Address any non-critical issues
- [ ] User feedback review
- [ ] Team handoff (if applicable)

### Hour 24

- [ ] Full 24-hour metrics report
- [ ] Error pattern analysis
- [ ] User behavior review
- [ ] Adjust monitoring thresholds if needed

### Hour 48

- [ ] Exit intensive monitoring
- [ ] Final incident review
- [ ] Document lessons learned
- [ ] Return to normal operations

---

## Post-48-Hour Transition

After 48 hours, if stable:

1. **Reduce monitoring frequency** to standard (hourly spot checks)
2. **Document any issues** that arose
3. **Create follow-up tickets** for improvements
4. **Schedule retrospective** if any incidents occurred
5. **Celebrate** - you launched!

### Ongoing Monitoring (Post-Stabilization)

| Check                 | Frequency |
| --------------------- | --------- |
| Error rate review     | Daily     |
| Performance metrics   | Weekly    |
| User analytics        | Weekly    |
| Infrastructure health | Daily     |
| Security scan         | Weekly    |

---

## Document Control

| Version | Date       | Author       | Changes          |
| ------- | ---------- | ------------ | ---------------- |
| 1.0     | 2026-01-17 | Process Team | Initial creation |

---

_"Hope for the best, plan for the worst, and prepare to be surprised." - Denis Waitley_
