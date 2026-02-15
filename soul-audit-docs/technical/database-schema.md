# Database Schema

EUONGELION uses Supabase (PostgreSQL) with Row Level Security (RLS) enabled.

## Overview

The database supports:

- User authentication and profiles
- Devotional series and content
- Progress tracking with streaks
- Bookmarking system
- Soul Audit spiritual assessments

## Entity Relationship

```
users
  │
  ├── user_progress (1:many)
  │     └── devotionals (many:1)
  │           └── series (many:1)
  │
  ├── bookmarks (1:many)
  │     └── devotionals (many:1)
  │
  └── soul_audit_sessions (1:many)
        └── soul_audit_responses (1:many)
              └── soul_audit_questions (many:1)
```

## Core Tables

### users

Extends Supabase Auth with profile data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  subscription_tier subscription_tier DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Matches auth.users.id |
| email | VARCHAR | User email |
| full_name | VARCHAR | Display name |
| avatar_url | TEXT | Profile image URL |
| subscription_tier | ENUM | free, premium, lifetime |
| onboarding_completed | BOOLEAN | Has completed onboarding |
| preferences | JSONB | User settings (theme, notifications, etc.) |

**Preferences Structure:**

```typescript
interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  notifications_enabled?: boolean
  daily_reminder_time?: string
  preferred_bible_version?: string
  font_size?: 'small' | 'medium' | 'large'
}
```

### series

Collections of related devotionals.

```sql
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  image_url TEXT,
  thumbnail_url TEXT,
  devotional_count INTEGER DEFAULT 0,
  duration_days INTEGER,
  difficulty_level difficulty_level DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  author VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| slug | VARCHAR | URL-friendly identifier |
| devotional_count | INTEGER | Auto-updated count |
| difficulty_level | ENUM | beginner, intermediate, advanced |
| is_premium | BOOLEAN | Requires subscription |
| is_published | BOOLEAN | Visible to users |
| is_featured | BOOLEAN | Shown on homepage |

### devotionals

Individual devotional entries with rich content.

```sql
CREATE TABLE devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  subtitle VARCHAR(500),
  content TEXT NOT NULL,
  content_html TEXT,
  scripture_ref VARCHAR(255) NOT NULL,
  scripture_text TEXT,
  scripture_version VARCHAR(50) DEFAULT 'NIV',
  day_number INTEGER,
  reading_time_minutes INTEGER DEFAULT 5,
  prayer TEXT,
  reflection_questions TEXT[] DEFAULT '{}',
  action_step TEXT,
  audio_url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  author VARCHAR(255),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search
CREATE INDEX idx_devotionals_search ON devotionals
USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| series_id | UUID | Parent series (nullable) |
| day_number | INTEGER | Position in series |
| scripture_ref | VARCHAR | e.g., "John 3:16" |
| scripture_version | VARCHAR | Bible translation |
| reflection_questions | TEXT[] | Array of questions |
| reading_time_minutes | INTEGER | Estimated read time |

### user_progress

Tracks completed devotionals and engagement.

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, devotional_id)
);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Who completed it |
| devotional_id | UUID | What was completed |
| completed_at | TIMESTAMPTZ | Completion timestamp |
| notes | TEXT | User's personal notes |
| rating | INTEGER | 1-5 star rating |
| time_spent_seconds | INTEGER | Reading duration |

### bookmarks

User-saved devotionals with organization.

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'Default',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, devotional_id)
);
```

## Soul Audit Tables

### soul_audit_questions

Spiritual assessment questions.

```sql
CREATE TABLE soul_audit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_description TEXT,
  category question_category NOT NULL,
  question_type question_type DEFAULT 'scale',
  options JSONB,
  min_value INTEGER DEFAULT 1,
  max_value INTEGER DEFAULT 10,
  min_label VARCHAR(100) DEFAULT 'Strongly Disagree',
  max_label VARCHAR(100) DEFAULT 'Strongly Agree',
  weight DECIMAL(3,2) DEFAULT 1.00,
  sort_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  help_text TEXT,
  scripture_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Categories (8 areas):**

- `faith_foundation` - Core beliefs
- `prayer_life` - Prayer habits
- `scripture_engagement` - Bible reading
- `community` - Church involvement
- `service` - Using gifts
- `spiritual_disciplines` - Fasting, sabbath
- `heart_condition` - Joy, peace
- `life_integration` - Faith in daily life

### soul_audit_responses

User answers to questions.

```sql
CREATE TABLE soul_audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES soul_audit_questions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  response_value INTEGER,
  response_text TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### soul_audit_sessions

Groups responses with calculated scores.

```sql
CREATE TABLE soul_audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_score INTEGER,
  category_scores JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Views

### user_streaks

Calculates consecutive reading days.

```sql
CREATE VIEW user_streaks AS
WITH daily_activity AS (
  SELECT
    user_id,
    DATE(completed_at) as activity_date,
    DATE(completed_at) - ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY DATE(completed_at)
    )::int as streak_group
  FROM user_progress
  WHERE completed_at IS NOT NULL
  GROUP BY user_id, DATE(completed_at)
)
SELECT
  user_id,
  MIN(activity_date) as streak_start,
  MAX(activity_date) as streak_end,
  COUNT(*) as streak_length
FROM daily_activity
GROUP BY user_id, streak_group;
```

### bookmarks_with_devotionals

Bookmarks joined with devotional details.

```sql
CREATE VIEW bookmarks_with_devotionals AS
SELECT
  b.*,
  d.title,
  d.subtitle,
  d.scripture_ref,
  d.image_url,
  d.reading_time_minutes,
  s.name as series_name,
  s.slug as series_slug
FROM bookmarks b
JOIN devotionals d ON b.devotional_id = d.id
LEFT JOIN series s ON d.series_id = s.id;
```

## Enums

```sql
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'lifetime');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE question_category AS ENUM (
  'faith_foundation',
  'prayer_life',
  'scripture_engagement',
  'community',
  'service',
  'spiritual_disciplines',
  'heart_condition',
  'life_integration'
);
CREATE TYPE question_type AS ENUM ('scale', 'multiple_choice', 'text', 'yes_no', 'frequency');
```

## Row Level Security

### Content Tables (Public Read)

```sql
-- Series: Anyone can read published
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published series" ON series
  FOR SELECT USING (is_published = true);

-- Devotionals: Anyone can read published (premium check in app)
ALTER TABLE devotionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published devotionals" ON devotionals
  FOR SELECT USING (is_published = true);
```

### User-Owned Data

```sql
-- Progress: Users own their data
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Bookmarks: Users own their data
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Soul Audit: Users own their data
ALTER TABLE soul_audit_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own responses" ON soul_audit_responses
  FOR ALL USING (auth.uid() = user_id);
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_series_slug ON series(slug);
CREATE INDEX idx_series_published ON series(is_published);
CREATE INDEX idx_devotionals_slug ON devotionals(slug);
CREATE INDEX idx_devotionals_series ON devotionals(series_id);
CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_completed ON user_progress(completed_at);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
```

## Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Auto-create user profile

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Update devotional count

```sql
CREATE OR REPLACE FUNCTION update_devotional_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE series
  SET devotional_count = (
    SELECT COUNT(*) FROM devotionals
    WHERE series_id = COALESCE(NEW.series_id, OLD.series_id)
  )
  WHERE id = COALESCE(NEW.series_id, OLD.series_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_series_count
  AFTER INSERT OR UPDATE OR DELETE ON devotionals
  FOR EACH ROW EXECUTE FUNCTION update_devotional_count();
```

## TypeScript Integration

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

See `database/types.ts` for complete TypeScript definitions.
