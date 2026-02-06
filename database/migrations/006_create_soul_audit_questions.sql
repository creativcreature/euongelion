-- Migration: 006_create_soul_audit_questions
-- Description: Create soul_audit_questions table for spiritual assessment
-- Created: 2024

-- Create enum for question categories
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for question types
DO $$ BEGIN
    CREATE TYPE question_type AS ENUM (
        'scale',
        'multiple_choice',
        'text',
        'yes_no',
        'frequency'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_category ON public.soul_audit_questions(category);
CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_order ON public.soul_audit_questions(sort_order);
CREATE INDEX IF NOT EXISTS idx_soul_audit_questions_active ON public.soul_audit_questions(is_active);

-- Enable Row Level Security
ALTER TABLE public.soul_audit_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view active questions
CREATE POLICY "Anyone can view active questions"
    ON public.soul_audit_questions
    FOR SELECT
    USING (is_active = TRUE);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_soul_audit_questions_updated_at
    BEFORE UPDATE ON public.soul_audit_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.soul_audit_questions TO anon;
GRANT SELECT ON public.soul_audit_questions TO authenticated;
