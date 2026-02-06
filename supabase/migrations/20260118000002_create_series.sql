-- Migration: 002_create_series
-- Description: Create series table for devotional collections
-- Created: 2024

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_series_slug ON public.series(slug);
CREATE INDEX IF NOT EXISTS idx_series_published ON public.series(is_published);
CREATE INDEX IF NOT EXISTS idx_series_featured ON public.series(is_featured);
CREATE INDEX IF NOT EXISTS idx_series_premium ON public.series(is_premium);
CREATE INDEX IF NOT EXISTS idx_series_sort_order ON public.series(sort_order);

-- Enable Row Level Security
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view published series
CREATE POLICY "Anyone can view published series"
    ON public.series
    FOR SELECT
    USING (is_published = TRUE);

-- Only admins can insert/update/delete (handled via service role)
-- For admin operations, use service_role key which bypasses RLS

-- Trigger to auto-update updated_at
CREATE TRIGGER update_series_updated_at
    BEFORE UPDATE ON public.series
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.series TO anon;
GRANT SELECT ON public.series TO authenticated;
