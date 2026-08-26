# Database Schema (Supabase)

**Version:** 1.0

---

## OVERVIEW

PostgreSQL database hosted on Supabase. Row Level Security (RLS) enabled.

---

## TABLES

### series

Devotional series metadata.

```sql
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  pathway VARCHAR(20) CHECK (pathway IN ('sleep', 'awake', 'shepherd')),
  day_count INTEGER DEFAULT 5,
  ecclesiastes_connection VARCHAR(20) DEFAULT 'moderate',
  gospel_presentation VARCHAR(20) DEFAULT 'moderate',
  core_theme TEXT,
  emotional_tones TEXT[],
  life_circumstances TEXT[],
  target_audience TEXT[],
  soul_audit_keywords TEXT[],
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast slug lookup
CREATE INDEX idx_series_slug ON series(slug);
CREATE INDEX idx_series_published ON series(published);
```

### days

Individual devotional days with module content.

```sql
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title VARCHAR(255),
  chiasm_position VARCHAR(2), -- A, B, C, B', A'
  modules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, day_number)
);

CREATE INDEX idx_days_series ON days(series_id);
```

### user_sessions

Anonymous user tracking (no PII).

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  active_series_id UUID REFERENCES series(id),
  current_day INTEGER DEFAULT 1,
  start_date DATE,
  sabbath_preference VARCHAR(10) DEFAULT 'sunday',
  pathway VARCHAR(20) DEFAULT 'awake',
  theme VARCHAR(10) DEFAULT 'light',
  timezone VARCHAR(50) DEFAULT 'UTC',
  soul_audit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
```

### soul_audits

Soul Audit history for analytics.

```sql
CREATE TABLE soul_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_input TEXT NOT NULL,
  matched_series_id UUID REFERENCES series(id),
  confidence DECIMAL(3,2),
  reasoning TEXT,
  alternatives TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audits_session ON soul_audits(session_id);
```

### progress

Day completion tracking.

```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id),
  day_number INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, series_id, day_number)
);

CREATE INDEX idx_progress_session ON progress(session_id);
```

---

## ROW LEVEL SECURITY (RLS)

### Public Read for Content

```sql
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published series" ON series
  FOR SELECT USING (published = true);

ALTER TABLE days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read days" ON days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM series WHERE series.id = days.series_id AND published = true)
  );
```

### Session-Based Access

```sql
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for API routes
-- Anon role has no direct access to these tables
```

---

## SUPABASE CLIENT SETUP

### Server Client (for API routes)

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
```

### Browser Client (for public data)

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
```

---

## COMMON QUERIES

### Get Series by Slug

```typescript
const { data: series } = await supabaseAdmin
  .from('series')
  .select('*, days(*)')
  .eq('slug', slug)
  .eq('published', true)
  .single()
```

### Get Session by Token

```typescript
const { data: session } = await supabaseAdmin
  .from('user_sessions')
  .select('*, series:active_series_id(*)')
  .eq('session_token', token)
  .single()
```

### Create Session

```typescript
const { data: session } = await supabaseAdmin
  .from('user_sessions')
  .insert({
    session_token: crypto.randomUUID(),
    active_series_id: seriesId,
    start_date: new Date().toISOString().split('T')[0],
    sabbath_preference: 'sunday',
    pathway: 'awake',
    timezone: 'America/New_York',
  })
  .select()
  .single()
```

### Record Soul Audit

```typescript
const { data: audit } = await supabaseAdmin
  .from('soul_audits')
  .insert({
    session_id: sessionId,
    user_input: userInput,
    matched_series_id: matchedSeriesId,
    confidence: 0.85,
    reasoning: 'Based on keywords...',
    alternatives: ['series-2', 'series-3'],
  })
  .select()
  .single()
```

### Mark Day Complete

```typescript
const { data: progress } = await supabaseAdmin
  .from('progress')
  .upsert({
    session_id: sessionId,
    series_id: seriesId,
    day_number: dayNumber,
  })
  .select()
  .single()
```

---

## MIGRATION SCRIPT

Run this in Supabase SQL Editor to set up all tables:

```sql
-- Run all CREATE TABLE statements above
-- Then run all CREATE INDEX statements
-- Then run all RLS policies
-- Then seed with series data
```

---

## TYPE DEFINITIONS

```typescript
// lib/supabase/types.ts

export interface Series {
  id: string
  slug: string
  title: string
  subtitle: string | null
  pathway: 'sleep' | 'awake' | 'shepherd'
  day_count: number
  ecclesiastes_connection: string
  gospel_presentation: string
  core_theme: string | null
  emotional_tones: string[]
  life_circumstances: string[]
  target_audience: string[]
  soul_audit_keywords: string[]
  published: boolean
  created_at: string
  updated_at: string
}

export interface Day {
  id: string
  series_id: string
  day_number: number
  title: string | null
  chiasm_position: string | null
  modules: Module[]
  created_at: string
}

export interface UserSession {
  id: string
  session_token: string
  active_series_id: string | null
  current_day: number
  start_date: string | null
  sabbath_preference: 'saturday' | 'sunday'
  pathway: 'sleep' | 'awake' | 'shepherd'
  theme: 'light' | 'dark'
  timezone: string
  soul_audit_count: number
  created_at: string
  updated_at: string
}

export interface Module {
  type: string
  data: Record<string, any>
}
```
