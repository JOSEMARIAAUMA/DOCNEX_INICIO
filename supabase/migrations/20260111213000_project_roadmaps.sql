-- Migration: Add project_roadmaps and roadmap_steps tables
-- Path: supabase/migrations/20260111213000_project_roadmaps.sql

-- 1) Roadmaps Table
CREATE TABLE IF NOT EXISTS public.project_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    suggestions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id)
);

-- 2) Roadmap Steps Table
CREATE TABLE IF NOT EXISTS public.roadmap_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL REFERENCES public.project_roadmaps(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_project_roadmaps_project_id ON public.project_roadmaps(project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_steps_roadmap_id ON public.roadmap_steps(roadmap_id);

-- Disable RLS for dev mode consistency
ALTER TABLE public.project_roadmaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_steps DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.project_roadmaps TO authenticated, anon, service_role, postgres;
GRANT ALL ON TABLE public.roadmap_steps TO authenticated, anon, service_role, postgres;
