-- Migration: 007_create_soul_audit_responses
-- Description: Create soul_audit_responses table to store user assessment answers
-- Created: 2024

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_user ON public.soul_audit_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_question ON public.soul_audit_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_session ON public.soul_audit_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_responses_created ON public.soul_audit_responses(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.soul_audit_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own responses
CREATE POLICY "Users can view own responses"
    ON public.soul_audit_responses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert own responses"
    ON public.soul_audit_responses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update own responses"
    ON public.soul_audit_responses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own responses
CREATE POLICY "Users can delete own responses"
    ON public.soul_audit_responses
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_soul_audit_responses_updated_at
    BEFORE UPDATE ON public.soul_audit_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.soul_audit_responses TO authenticated;

-- Create soul audit sessions table for grouping responses
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

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_soul_audit_sessions_user ON public.soul_audit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_audit_sessions_completed ON public.soul_audit_sessions(user_id, completed_at DESC);

-- Enable RLS for sessions
ALTER TABLE public.soul_audit_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Users can view own sessions"
    ON public.soul_audit_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON public.soul_audit_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON public.soul_audit_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.soul_audit_sessions TO authenticated;

-- Create view for soul audit results with category breakdown
CREATE OR REPLACE VIEW public.soul_audit_results AS
SELECT
    s.id as session_id,
    s.user_id,
    s.completed_at,
    s.total_score,
    s.category_scores,
    s.recommendations,
    COUNT(r.id) as total_responses,
    json_agg(
        json_build_object(
            'question_id', q.id,
            'question_text', q.question_text,
            'category', q.category,
            'response_value', r.response_value,
            'response_text', r.response_text
        ) ORDER BY q.sort_order
    ) as responses
FROM public.soul_audit_sessions s
LEFT JOIN public.soul_audit_responses r ON s.id = r.session_id
LEFT JOIN public.soul_audit_questions q ON r.question_id = q.id
GROUP BY s.id, s.user_id, s.completed_at, s.total_score, s.category_scores, s.recommendations;

-- Grant read access to view
GRANT SELECT ON public.soul_audit_results TO authenticated;
