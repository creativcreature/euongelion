-- Migration: 004_create_user_progress
-- Description: Create user_progress table to track devotional completion
-- Created: 2024

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

    -- Prevent duplicate progress entries
    CONSTRAINT unique_user_devotional UNIQUE (user_id, devotional_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_devotional ON public.user_progress(devotional_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_series ON public.user_progress(series_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON public.user_progress(user_id, completed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
    ON public.user_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
    ON public.user_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON public.user_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
    ON public.user_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.user_progress TO authenticated;

-- Create view for user streaks
CREATE OR REPLACE VIEW public.user_streaks AS
WITH daily_completions AS (
    SELECT
        user_id,
        DATE(completed_at) as completion_date
    FROM public.user_progress
    GROUP BY user_id, DATE(completed_at)
),
streak_groups AS (
    SELECT
        user_id,
        completion_date,
        completion_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY completion_date))::INTEGER AS streak_group
    FROM daily_completions
)
SELECT
    user_id,
    MIN(completion_date) as streak_start,
    MAX(completion_date) as streak_end,
    COUNT(*) as streak_length
FROM streak_groups
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start DESC;

-- Grant read access to streak view
GRANT SELECT ON public.user_streaks TO authenticated;
