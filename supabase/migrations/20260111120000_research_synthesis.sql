-- RESEARCH SYNTHESIS INFRASTRUCTURE
-- Enables multi-document analysis, consolidation, and provenance tracking
-- Migration: 20260111120000

-- 1. Research Sessions Table
-- Tracks synthesis projects where multiple research documents are consolidated
CREATE TABLE IF NOT EXISTS public.research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_document_ids UUID[] NOT NULL,
    target_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Synthesis Operations Log
-- Records each AI-powered merge, consolidation, or deduplication operation
CREATE TABLE IF NOT EXISTS public.synthesis_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('merge', 'consolidate', 'dedup', 'conflict_resolution')),
    input_block_ids UUID[] NOT NULL,
    output_block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    ai_reasoning TEXT,
    user_approved BOOLEAN DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Block Provenance (Source Attribution & Lineage)
-- Tracks which source documents/blocks contributed to each synthesized block
CREATE TABLE IF NOT EXISTS public.block_provenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    source_block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    contribution_type TEXT CHECK (contribution_type IN ('original', 'merged', 'synthesized', 'referenced')),
    contribution_percentage FLOAT DEFAULT 100.0 CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100),
    confidence_score FLOAT DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(block_id, source_block_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_research_sessions_user ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_project ON public.research_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON public.research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_synthesis_ops_session ON public.synthesis_operations(session_id);
CREATE INDEX IF NOT EXISTS idx_synthesis_ops_output ON public.synthesis_operations(output_block_id);
CREATE INDEX IF NOT EXISTS idx_provenance_block ON public.block_provenance(block_id);
CREATE INDEX IF NOT EXISTS idx_provenance_source_doc ON public.block_provenance(source_document_id);

-- Enable Row Level Security
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthesis_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_provenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage their own research sessions"
    ON public.research_sessions FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users manage synthesis operations from their sessions"
    ON public.synthesis_operations FOR ALL
    USING (
        auth.uid() = (
            SELECT user_id FROM public.research_sessions 
            WHERE id = session_id
        )
    );

CREATE POLICY "Users see provenance for their blocks"
    ON public.block_provenance FOR ALL
    USING (auth.role() = 'authenticated');

-- Updated_at trigger for research_sessions
CREATE OR REPLACE FUNCTION update_research_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER research_sessions_updated_at
    BEFORE UPDATE ON public.research_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_research_session_updated_at();
