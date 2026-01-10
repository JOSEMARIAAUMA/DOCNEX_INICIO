-- COGNITIVE INFRASTRUCTURE MIGRATION
-- Supports: Long-Term Memory, Interaction Logging, and Multi-Agent Coordination

-- 1. Interaction Logs (The "Raw" Experience)
CREATE TABLE IF NOT EXISTS public.ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL, -- 'librarian', 'critic', 'researcher', etc.
    event_type TEXT NOT NULL, -- 'division', 'transcription', 'refinement'
    prompt_used TEXT,
    ai_response JSONB,
    user_feedback JSONB, -- { "action": "accept", "edit_distance": 12, "dwell_time": 4500 }
    metrics JSONB, -- { "tokens": 1200, "latency_ms": 450 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Cognitive Memory (The "User DNA")
-- Stores refined preferences extracted from logs
CREATE TABLE IF NOT EXISTS public.ai_cognitive_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_key TEXT NOT NULL, -- 'division_pref_contracts', 'tone_legal', etc.
    memory_value TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    source_events UUID[], -- Array of log IDs that shaped this memory
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, memory_key)
);

-- Enable RLS
ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cognitive_memory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own logs"
    ON public.ai_interaction_logs FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own memories"
    ON public.ai_cognitive_memory FOR ALL
    USING (auth.uid() = user_id);
