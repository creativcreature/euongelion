-- Add unique constraint on devotionals.slug for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_devotionals_slug_unique ON public.devotionals(slug);
