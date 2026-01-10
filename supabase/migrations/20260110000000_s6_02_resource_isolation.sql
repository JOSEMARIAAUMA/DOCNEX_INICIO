-- Add document_id to resources for strict isolation
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_resources_document_id ON public.resources(document_id);
