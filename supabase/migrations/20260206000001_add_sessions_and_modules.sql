-- ============================================================================
-- Sprint 3: Sessions, Pathways, and Module Support
-- ============================================================================

-- Add pathway and soul_audit_keywords to series
ALTER TABLE public.series
    ADD COLUMN IF NOT EXISTS pathway TEXT DEFAULT 'awake'
        CHECK (pathway IN ('sleep', 'awake', 'shepherd')),
    ADD COLUMN IF NOT EXISTS soul_audit_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS core_question TEXT;

CREATE INDEX IF NOT EXISTS idx_series_pathway ON public.series(pathway);

-- Add modules JSONB to devotionals for structured content
ALTER TABLE public.devotionals
    ADD COLUMN IF NOT EXISTS modules JSONB;

-- ============================================================================
-- Anonymous Sessions (httpOnly cookie-based)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    active_series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    current_day INTEGER DEFAULT 1,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    sabbath_preference TEXT DEFAULT 'none'
        CHECK (sabbath_preference IN ('none', 'saturday', 'sunday')),
    pathway TEXT DEFAULT 'awake'
        CHECK (pathway IN ('sleep', 'awake', 'shepherd')),
    timezone TEXT DEFAULT 'America/New_York',
    soul_audit_count INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Anonymous sessions can be read/updated by anyone with the token (via API routes)
-- RLS is enforced at the API level, not row level for anonymous sessions
CREATE POLICY "Service role full access to sessions"
    ON public.user_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Only service role should access sessions directly
REVOKE ALL ON public.user_sessions FROM anon;
REVOKE ALL ON public.user_sessions FROM authenticated;
GRANT ALL ON public.user_sessions TO service_role;

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired sessions (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
