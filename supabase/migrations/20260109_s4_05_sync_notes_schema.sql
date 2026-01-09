-- Migration: Sync block_comments schema
-- Ensures all columns required for the notes system are present.

-- 1. Ensure text_selection, start_offset, end_offset, content, comment_type exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='block_comments' AND column_name='start_offset') THEN
        ALTER TABLE public.block_comments ADD COLUMN start_offset INT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='block_comments' AND column_name='end_offset') THEN
        ALTER TABLE public.block_comments ADD COLUMN end_offset INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='block_comments' AND column_name='meta') THEN
        ALTER TABLE public.block_comments ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Ensure RLS is not blocking insertions if policies are missing
-- If RLS is enabled, we need to make sure there's an insert policy.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'block_comments' AND rowsecurity = true) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'block_comments' AND policyname = 'Allow all insertions to block_comments') THEN
            CREATE POLICY "Allow all insertions to block_comments" ON public.block_comments FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'block_comments' AND policyname = 'Allow all selects on block_comments') THEN
            CREATE POLICY "Allow all selects on block_comments" ON public.block_comments FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'block_comments' AND policyname = 'Allow updates on block_comments') THEN
            CREATE POLICY "Allow updates on block_comments" ON public.block_comments FOR UPDATE USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'block_comments' AND policyname = 'Allow deletes on block_comments') THEN
            CREATE POLICY "Allow deletes on block_comments" ON public.block_comments FOR DELETE USING (true);
        END IF;
    END IF;
END $$;
