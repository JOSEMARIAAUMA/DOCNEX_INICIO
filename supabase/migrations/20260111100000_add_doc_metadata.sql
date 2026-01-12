-- Add metadata column to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
