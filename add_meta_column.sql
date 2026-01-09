-- Add meta column to block_comments
ALTER TABLE public.block_comments 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
