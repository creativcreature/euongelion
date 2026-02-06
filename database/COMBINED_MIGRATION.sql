-- ============================================================================
-- EUONGELION Complete Database Migration
-- ============================================================================
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ovivwbopjfruikehrlgm
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file
-- 5. Click "Run" (or Cmd+Enter)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'lifetime')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON public.users(subscription_tier);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- ============================================================================
-- 2. SERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    devotional_count INTEGER DEFAULT 0,
    duration_days INTEGER,
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    tags TEXT[] DEFAULT '{}',
    is_premium BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_slug ON public.series(slug);
CREATE INDEX IF NOT EXISTS idx_series_published ON public.series(is_published);
CREATE INDEX IF NOT EXISTS idx_series_featured ON public.series(is_featured);
CREATE INDEX IF NOT EXISTS idx_series_premium ON public.series(is_premium);
CREATE INDEX IF NOT EXISTS idx_series_sort_order ON public.series(sort_order);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published series"
    ON public.series FOR SELECT USING (is_published = TRUE);

CREATE TRIGGER update_series_updated_at
    BEFORE UPDATE ON public.series
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.series TO anon;
GRANT SELECT ON public.series TO authenticated;

-- ============================================================================
-- 3. DEVOTIONALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.devotionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    subtitle TEXT,
    content TEXT NOT NULL,
    content_html TEXT,
    scripture_ref TEXT NOT NULL,
    scripture_text TEXT,
    scripture_version TEXT DEFAULT 'ESV',
    day_number INTEGER,
    reading_time_minutes INTEGER DEFAULT 5,
    prayer TEXT,
    reflection_questions TEXT[],
    action_step TEXT,
    audio_url TEXT,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_premium BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    author TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_series_day UNIQUE (series_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_devotionals_series ON public.devotionals(series_id);
CREATE INDEX IF NOT EXISTS idx_devotionals_slug ON public.devotionals(slug);
CREATE INDEX IF NOT EXISTS idx_devotionals_published ON public.devotionals(is_published);
CREATE INDEX IF NOT EXISTS idx_devotionals_featured ON public.devotionals(is_featured);
CREATE INDEX IF NOT EXISTS idx_devotionals_premium ON public.devotionals(is_premium);
CREATE INDEX IF NOT EXISTS idx_devotionals_day_number ON public.devotionals(series_id, day_number);
CREATE INDEX IF NOT EXISTS idx_devotionals_published_at ON public.devotionals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_devotionals_fts ON public.devotionals
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));

ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published free devotionals"
    ON public.devotionals FOR SELECT
    USING (is_published = TRUE AND is_premium = FALSE);

CREATE POLICY "Premium users can view all published devotionals"
    ON public.devotionals FOR SELECT
    USING (
        is_published = TRUE
        AND (
            is_premium = FALSE
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.subscription_tier IN ('premium', 'lifetime')
            )
        )
    );

CREATE TRIGGER update_devotionals_updated_at
    BEFORE UPDATE ON public.devotionals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update series count when devotionals change
CREATE OR REPLACE FUNCTION public.update_series_devotional_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.series
        SET devotional_count = (
            SELECT COUNT(*) FROM public.devotionals
            WHERE series_id = NEW.series_id AND is_published = TRUE
        )
        WHERE id = NEW.series_id;
    END IF;
    IF TG_OP = 'DELETE' THEN
        UPDATE public.series
        SET devotional_count = (
            SELECT COUNT(*) FROM public.devotionals
            WHERE series_id = OLD.series_id AND is_published = TRUE
        )
        WHERE id = OLD.series_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_series_count_on_devotional_change
    AFTER INSERT OR UPDATE OR DELETE ON public.devotionals
    FOR EACH ROW EXECUTE FUNCTION public.update_series_devotional_count();

GRANT SELECT ON public.devotionals TO anon;
GRANT SELECT ON public.devotionals TO authenticated;

-- ============================================================================
-- 4. USER PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    devotional_id UUID NOT NULL REFERENCES public.devotionals(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    time_spent_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_devotional UNIQUE (user_id, devotional_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_devotional ON public.user_progress(devotional_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_series ON public.user_progress(series_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON public.user_progress(user_id, completed_at DESC);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
    ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON public.user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
    ON public.user_progress FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.user_progress TO authenticated;

-- User streaks view
CREATE OR REPLACE VIEW public.user_streaks AS
WITH daily_completions AS (
    SELECT user_id, DATE(completed_at) as completion_date
    FROM public.user_progress
    GROUP BY user_id, DATE(completed_at)
),
streak_groups AS (
    SELECT user_id, completion_date,
        completion_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY completion_date))::INTEGER AS streak_group
    FROM daily_completions
)
SELECT user_id,
    MIN(completion_date) as streak_start,
    MAX(completion_date) as streak_end,
    COUNT(*) as streak_length
FROM streak_groups
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start DESC;

GRANT SELECT ON public.user_streaks TO authenticated;

-- ============================================================================
-- 5. BOOKMARKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    devotional_id UUID NOT NULL REFERENCES public.devotionals(id) ON DELETE CASCADE,
    collection_name TEXT DEFAULT 'default',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_devotional_bookmark UNIQUE (user_id, devotional_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_devotional ON public.bookmarks(devotional_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON public.bookmarks(user_id, collection_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON public.bookmarks(user_id, created_at DESC);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.bookmarks TO authenticated;

CREATE OR REPLACE VIEW public.bookmarks_with_devotionals AS
SELECT
    b.id, b.user_id, b.devotional_id, b.collection_name,
    b.notes as bookmark_notes, b.created_at as bookmarked_at,
    d.title, d.subtitle, d.scripture_ref, d.image_url, d.reading_time_minutes,
    s.name as series_name, s.slug as series_slug
FROM public.bookmarks b
JOIN public.devotionals d ON b.devotional_id = d.id
LEFT JOIN public.series s ON d.series_id = s.id
WHERE d.is_published = TRUE;

GRANT SELECT ON public.bookmarks_with_devotionals TO authenticated;

-- ============================================================================
-- 6. SOUL AUDIT QUESTIONS TABLE
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE question_category AS ENUM (
        'faith_foundation', 'prayer_life', 'scripture_engagement', 'community',
        'service', 'spiritual_disciplines', 'heart_condition', 'life_integration'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('scale', 'multiple_choice', 'text', 'yes_no', 'frequency');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.soul_audit_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    question_description TEXT,
    category question_category NOT NULL,
    question_type question_type DEFAULT 'scale',
    options JSONB,
    min_value INTEGER DEFAULT 1,
    max_value INTEGER DEFAULT 10,
    min_label TEXT DEFAULT 'Strongly Disagree',
    max_label TEXT DEFAULT 'Strongly Agree',
    weight DECIMAL(3,2) DEFAULT 1.0,
    sort_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    help_text TEXT,
    scripture_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_category ON public.soul_audit_questions(category);
CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_order ON public.soul_audit_questions(sort_order);
CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_active ON public.soul_audit_questions(is_active);

ALTER TABLE public.soul_audit_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active questions"
    ON public.soul_audit_questions FOR SELECT USING (is_active = TRUE);

CREATE TRIGGER update_soul_audit_questions_updated_at
    BEFORE UPDATE ON public.soul_audit_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.soul_audit_questions TO anon;
GRANT SELECT ON public.soul_audit_questions TO authenticated;

-- ============================================================================
-- 7. SOUL AUDIT RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soul_audit_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.soul_audit_questions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    response_value INTEGER,
    response_text TEXT,
    response_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_user ON public.soul_audit_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_question ON public.soul_audit_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_session ON public.soul_audit_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_created ON public.soul_audit_responses(user_id, created_at DESC);

ALTER TABLE public.soul_audit_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses"
    ON public.soul_audit_responses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
    ON public.soul_audit_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses"
    ON public.soul_audit_responses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own responses"
    ON public.soul_audit_responses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_soul_audit_responses_updated_at
    BEFORE UPDATE ON public.soul_audit_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.soul_audit_responses TO authenticated;

-- Soul Audit Sessions
CREATE TABLE IF NOT EXISTS public.soul_audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_score DECIMAL(5,2),
    category_scores JSONB,
    recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_audit_sessions_user ON public.soul_audit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_sessions_completed ON public.soul_audit_sessions(user_id, completed_at DESC);

ALTER TABLE public.soul_audit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON public.soul_audit_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON public.soul_audit_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON public.soul_audit_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.soul_audit_sessions TO authenticated;

CREATE OR REPLACE VIEW public.soul_audit_results AS
SELECT
    s.id as session_id, s.user_id, s.completed_at, s.total_score, s.category_scores, s.recommendations,
    COUNT(r.id) as total_responses,
    json_agg(
        json_build_object(
            'question_id', q.id, 'question_text', q.question_text, 'category', q.category,
            'response_value', r.response_value, 'response_text', r.response_text
        ) ORDER BY q.sort_order
    ) as responses
FROM public.soul_audit_sessions s
LEFT JOIN public.soul_audit_responses r ON s.id = r.session_id
LEFT JOIN public.soul_audit_questions q ON r.question_id = q.id
GROUP BY s.id, s.user_id, s.completed_at, s.total_score, s.category_scores, s.recommendations;

GRANT SELECT ON public.soul_audit_results TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: users, series, devotionals, user_progress, bookmarks,
--                 soul_audit_questions, soul_audit_responses, soul_audit_sessions
-- Views created: user_streaks, bookmarks_with_devotionals, soul_audit_results
-- ============================================================================
