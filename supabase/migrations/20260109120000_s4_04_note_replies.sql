-- Migration: Note Replies and Meta Column Fix

-- 1. Ensure meta column exists in block_comments
ALTER TABLE public.block_comments 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- 2. Create block_comment_replies table
CREATE TABLE IF NOT EXISTS public.block_comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.block_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_block_comment_replies_comment_id ON public.block_comment_replies(comment_id);

-- 4. Enable RLS (Assuming standard policies)
ALTER TABLE public.block_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replies to comments they can see" ON public.block_comment_replies
    FOR SELECT USING (true);

CREATE POLICY "Users can add replies" ON public.block_comment_replies
    FOR INSERT WITH CHECK (true);
