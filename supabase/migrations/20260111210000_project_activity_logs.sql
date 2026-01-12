CREATE TABLE IF NOT EXISTS public.project_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    agent_profile TEXT NOT NULL,
    action_type TEXT NOT NULL,
    reasoning TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_logs_project_id ON public.project_activity_logs(project_id);

ALTER TABLE public.project_activity_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.project_activity_logs TO authenticated;
GRANT ALL ON TABLE public.project_activity_logs TO anon;
GRANT ALL ON TABLE public.project_activity_logs TO service_role;
GRANT ALL ON TABLE public.project_activity_logs TO postgres;
