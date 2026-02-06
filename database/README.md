# EUONGELION Database Schema

This directory contains the Supabase database schema for the EUONGELION devotional platform.

## Overview

EUONGELION is a Christian devotional application that provides:

- Daily devotional content organized into series
- User progress tracking with streaks
- Bookmarking favorite devotionals
- Soul Audit spiritual assessment tool
- Premium content with subscription tiers

## Directory Structure

```
database/
├── migrations/           # SQL migration files (run in order)
│   ├── 001_create_users.sql
│   ├── 002_create_series.sql
│   ├── 003_create_devotionals.sql
│   ├── 004_create_user_progress.sql
│   ├── 005_create_bookmarks.sql
│   ├── 006_create_soul_audit_questions.sql
│   └── 007_create_soul_audit_responses.sql
├── types.ts              # TypeScript interfaces
├── seed-data.sql         # Sample data for development
└── README.md             # This file
```

## Schema Overview

### Core Tables

#### `users`

Extends Supabase Auth with additional profile information.

- Linked to `auth.users` via foreign key
- Stores subscription tier, preferences, and onboarding status
- Auto-created via trigger on auth signup

#### `series`

Collections of related devotionals.

- Supports premium/free content
- Featured series for homepage
- Automatic devotional count tracking

#### `devotionals`

Individual devotional entries.

- Rich content with scripture references
- Reflection questions and action steps
- Audio support for accessibility
- Full-text search enabled

#### `user_progress`

Tracks completed devotionals per user.

- Notes and ratings per devotional
- Time spent tracking
- Streak calculation via view

#### `bookmarks`

User-saved devotionals organized by collections.

- Collection-based organization
- Personal notes on bookmarks

### Soul Audit Tables

#### `soul_audit_questions`

Spiritual assessment questions.

- 8 categories covering spiritual life
- Multiple question types (scale, multiple choice, etc.)
- Weighted scoring

#### `soul_audit_responses`

User answers to assessment questions.

- Grouped by session
- Supports various response formats

#### `soul_audit_sessions`

Groups assessment responses with calculated scores.

- Category breakdown
- Personalized recommendations

## Views

- **`user_streaks`** - Calculate consecutive daily completion streaks
- **`bookmarks_with_devotionals`** - Bookmarks joined with devotional details
- **`soul_audit_results`** - Complete assessment results with responses

## Row Level Security (RLS)

All tables have RLS enabled with the following patterns:

### User-owned data (progress, bookmarks, responses)

- Users can only read/write their own data
- Enforced via `auth.uid() = user_id`

### Public content (series, devotionals, questions)

- Anyone can read published content
- Premium content requires appropriate subscription tier
- Write operations require service_role key

## Subscription Tiers

| Tier       | Access                              |
| ---------- | ----------------------------------- |
| `free`     | Free devotionals only               |
| `premium`  | All devotionals                     |
| `lifetime` | All devotionals (one-time purchase) |

## Getting Started

### 1. Run Migrations

Run migrations in order using Supabase CLI or dashboard:

```bash
# Using Supabase CLI
supabase db push

# Or run each file manually in the SQL editor
```

### 2. Seed Data (Development)

```bash
# Run the seed file for sample data
psql -f seed-data.sql
```

### 3. TypeScript Integration

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './database/types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

// Fully typed queries
const { data: series } = await supabase
  .from('series')
  .select('*')
  .eq('is_published', true)
```

## Key Features

### Auto-updating Timestamps

All tables with `updated_at` columns automatically update via trigger.

### Cascading Deletes

- Deleting a user removes all their progress, bookmarks, and responses
- Deleting a series sets `series_id` to null on devotionals
- Deleting a devotional removes associated progress and bookmarks

### Automatic User Creation

New auth users automatically get a profile in the `users` table.

### Devotional Count Sync

Series `devotional_count` automatically updates when devotionals change.

## Question Categories

The Soul Audit assessment covers 8 spiritual life areas:

1. **Faith Foundation** - Core beliefs and God-knowledge
2. **Prayer Life** - Prayer habits and intimacy with God
3. **Scripture Engagement** - Bible reading and application
4. **Community** - Church involvement and Christian relationships
5. **Service** - Using gifts, evangelism, and generosity
6. **Spiritual Disciplines** - Fasting, sabbath, journaling
7. **Heart Condition** - Joy, peace, repentance, inner life
8. **Life Integration** - Faith in work, relationships, finances

## API Examples

### Get User's Current Streak

```typescript
const { data } = await supabase
  .from('user_streaks')
  .select('*')
  .eq('user_id', userId)
  .order('streak_end', { ascending: false })
  .limit(1)
```

### Get Series with Progress

```typescript
const { data } = await supabase
  .from('series')
  .select(
    `
    *,
    devotionals (
      id,
      title,
      day_number,
      user_progress (completed_at)
    )
  `,
  )
  .eq('slug', 'identity-in-christ')
  .single()
```

### Mark Devotional Complete

```typescript
const { error } = await supabase.from('user_progress').upsert({
  user_id: userId,
  devotional_id: devotionalId,
  series_id: seriesId,
  completed_at: new Date().toISOString(),
})
```

## Maintenance

### Backup Recommendations

- Regular pg_dump of the database
- Supabase dashboard provides point-in-time recovery

### Performance Considerations

- Indexes are created on all foreign keys and common query patterns
- Full-text search index on devotionals for content search
- Consider partitioning `user_progress` for large user bases

## License

Proprietary - EUONGELION
