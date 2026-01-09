-- Migration: Enhance Block Comments with Metadata
-- Adds meta column to support links, image references, and rich content in notes

ALTER TABLE public.block_comments 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Ensure indexes for recently added columns if any
CREATE INDEX IF NOT EXISTS idx_block_comments_resolved ON public.block_comments(block_id, resolved);
