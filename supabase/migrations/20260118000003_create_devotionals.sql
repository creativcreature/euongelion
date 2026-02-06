-- Migration: 003_create_devotionals
-- Description: Create devotionals table for daily devotional content
-- Created: 2024

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

    -- Ensure unique day_number within a series
    CONSTRAINT unique_series_day UNIQUE (series_id, day_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devotionals_series ON public.devotionals(series_id);
CREATE INDEX IF NOT EXISTS idx_devotionals_slug ON public.devotionals(slug);
CREATE INDEX IF NOT EXISTS idx_devotionals_published ON public.devotionals(is_published);
CREATE INDEX IF NOT EXISTS idx_devotionals_featured ON public.devotionals(is_featured);
CREATE INDEX IF NOT EXISTS idx_devotionals_premium ON public.devotionals(is_premium);
CREATE INDEX IF NOT EXISTS idx_devotionals_day_number ON public.devotionals(series_id, day_number);
CREATE INDEX IF NOT EXISTS idx_devotionals_published_at ON public.devotionals(published_at DESC);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_devotionals_fts ON public.devotionals
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Enable Row Level Security
ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view published free devotionals
CREATE POLICY "Anyone can view published free devotionals"
    ON public.devotionals
    FOR SELECT
    USING (is_published = TRUE AND is_premium = FALSE);

-- Authenticated users with premium can view all published devotionals
CREATE POLICY "Premium users can view all published devotionals"
    ON public.devotionals
    FOR SELECT
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

-- Trigger to auto-update updated_at
CREATE TRIGGER update_devotionals_updated_at
    BEFORE UPDATE ON public.devotionals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update series devotional count
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

-- Trigger to update series count
CREATE TRIGGER update_series_count_on_devotional_change
    AFTER INSERT OR UPDATE OR DELETE ON public.devotionals
    FOR EACH ROW EXECUTE FUNCTION public.update_series_devotional_count();

-- Grant permissions
GRANT SELECT ON public.devotionals TO anon;
GRANT SELECT ON public.devotionals TO authenticated;
