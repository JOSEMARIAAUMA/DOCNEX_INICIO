-- RECOMMENDATIONS SYSTEM
-- Enables intelligent resource suggestions and quality scoring
-- Migration: 20260111160000

-- 1. Add quality score to documents if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'quality_score') THEN
        ALTER TABLE public.documents ADD COLUMN quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100);
    END IF;
END $$;

-- 2. Recommendations Interaction Log
-- Tracks which recommendations were useful to improve the engine
CREATE TABLE IF NOT EXISTS public.recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    context_block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    recommended_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    score_at_recommendation FLOAT,
    interaction_type TEXT CHECK (interaction_type IN ('viewed', 'copied', 'referenced', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_docs_quality ON public.documents(quality_score);
CREATE INDEX IF NOT EXISTS idx_rec_logs_user ON public.recommendation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_logs_context ON public.recommendation_logs(context_block_id);

-- RLS
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recommendation logs"
    ON public.recommendation_logs FOR ALL
    USING (auth.uid() = user_id);
