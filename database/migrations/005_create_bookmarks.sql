-- Migration: 005_create_bookmarks
-- Description: Create bookmarks table for saving favorite devotionals
-- Created: 2024

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    devotional_id UUID NOT NULL REFERENCES public.devotionals(id) ON DELETE CASCADE,
    collection_name TEXT DEFAULT 'default',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate bookmarks
    CONSTRAINT unique_user_devotional_bookmark UNIQUE (user_id, devotional_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_devotional ON public.bookmarks(devotional_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON public.bookmarks(user_id, collection_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON public.bookmarks(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.bookmarks TO authenticated;

-- Create view for bookmarks with devotional details
CREATE OR REPLACE VIEW public.bookmarks_with_devotionals AS
SELECT
    b.id,
    b.user_id,
    b.devotional_id,
    b.collection_name,
    b.notes as bookmark_notes,
    b.created_at as bookmarked_at,
    d.title,
    d.subtitle,
    d.scripture_ref,
    d.image_url,
    d.reading_time_minutes,
    s.name as series_name,
    s.slug as series_slug
FROM public.bookmarks b
JOIN public.devotionals d ON b.devotional_id = d.id
LEFT JOIN public.series s ON d.series_id = s.id
WHERE d.is_published = TRUE;

-- Grant read access to view
GRANT SELECT ON public.bookmarks_with_devotionals TO authenticated;
