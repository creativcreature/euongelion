# Deployment Guide

This document covers deploying EUONGELION to production.

## Overview

EUONGELION is designed to deploy on Vercel with Supabase as the backend. This guide covers the complete deployment process.

## Prerequisites

- Vercel account
- Supabase project
- Anthropic API key
- Domain (wokegod.world or custom)
- GitHub repository access

## Environment Setup

### Required Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Anthropic (Required)
ANTHROPIC_API_KEY=sk-ant-your-api-key

# Site Configuration (Optional)
NEXT_PUBLIC_SITE_URL=https://wokegod.world
NEXT_PUBLIC_SITE_NAME=EUONGELION

# Rate Limiting - Production Only (Optional)
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token
```

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and keys

### 2. Run Migrations

Run migrations in order from `database/migrations/`:

```bash
# Using Supabase CLI
supabase db push

# Or manually in SQL Editor:
# 1. 001_create_users.sql
# 2. 002_create_series.sql
# 3. 003_create_devotionals.sql
# 4. 004_create_user_progress.sql
# 5. 005_create_bookmarks.sql
# 6. 006_create_soul_audit_questions.sql
# 7. 007_create_soul_audit_responses.sql
```

### 3. Seed Data (Optional)

For initial content:

```bash
# Run seed file
psql -f database/seed-data.sql
```

### 4. Configure RLS

Row Level Security is defined in migrations. Verify policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Link Project

```bash
cd app
vercel link
```

### 3. Configure Environment Variables

```bash
# Add each variable
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
```

Or add via Vercel Dashboard:

1. Go to Project Settings
2. Navigate to Environment Variables
3. Add each variable for Production/Preview/Development

### 4. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 5. Automatic Deployments

Connect GitHub for automatic deployments:

1. Vercel Dashboard > Project > Git
2. Connect GitHub repository
3. Configure branch deployment rules

## Domain Configuration

### 1. Add Domain in Vercel

1. Project Settings > Domains
2. Add: `wokegod.world`
3. Add: `www.wokegod.world`

### 2. Configure DNS

Add these records at your registrar:

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 3. Wait for Propagation

DNS changes can take up to 48 hours. Verify with:

```bash
dig wokegod.world
```

### 4. SSL Certificate

Vercel automatically provisions SSL certificates once DNS is configured.

## Production Checklist

### Before Launch

- [ ] All environment variables configured
- [ ] Database migrations complete
- [ ] Initial content seeded
- [ ] RLS policies verified
- [ ] API routes tested
- [ ] Rate limiting configured
- [ ] Error monitoring set up
- [ ] Analytics configured

### Security

- [ ] Service role key server-side only
- [ ] HTTPS enforced
- [ ] Cookies use httpOnly, secure, sameSite
- [ ] Input sanitization active
- [ ] Rate limiting on Soul Audit

### Performance

- [ ] Images optimized
- [ ] Static pages generated
- [ ] Code splitting enabled
- [ ] Cache headers configured

## Monitoring

### Vercel Analytics

Enable in project settings for:

- Core Web Vitals
- Page views
- Error tracking

### Error Monitoring

Recommended: Sentry integration

```bash
npm install @sentry/nextjs
```

### Database Monitoring

Supabase Dashboard provides:

- Query performance
- Connection stats
- Storage usage

## Rollback Procedure

### Vercel

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel rollback [deployment-url]
```

### Database

1. Supabase Dashboard > Backups
2. Restore to point-in-time

## Scaling Considerations

### Supabase

- Free tier: Good for development and small production
- Pro tier: Recommended for production (better limits, daily backups)

### Vercel

- Free tier: Good for development
- Pro tier: Custom domains, increased bandwidth

### Rate Limiting

For high traffic, configure Upstash Redis:

```bash
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-token
```

## Troubleshooting

### Build Failures

Check Vercel build logs:

```bash
vercel logs [deployment-url]
```

Common issues:

- Missing environment variables
- TypeScript errors
- Dependency version conflicts

### Database Connection Issues

1. Verify Supabase URL is correct
2. Check RLS policies
3. Verify service role key for admin operations

### API Route Errors

1. Check function logs in Vercel
2. Verify environment variables
3. Test locally with `vercel dev`

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Dependencies
        run: npm ci
        working-directory: ./app

      - name: Run Tests
        run: npm test
        working-directory: ./app

      - name: Deploy to Vercel
        uses: vercel/actions@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Support

For deployment issues:

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Supabase Documentation: [supabase.com/docs](https://supabase.com/docs)
- Project maintainers
