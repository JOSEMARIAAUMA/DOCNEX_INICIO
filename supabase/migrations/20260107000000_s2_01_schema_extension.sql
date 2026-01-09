-- S2-01: Schema extension for Sprint 2 Document Workspace
-- Extends resources, document_blocks; adds block_actions, block_highlights

-- ============================================================
-- 1. Extend resources table for file uploads
-- ============================================================
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS ingest_status text DEFAULT 'pending';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS extracted_text text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- ============================================================
-- 2. Extend document_blocks for advanced operations
-- ============================================================
ALTER TABLE public.document_blocks ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.document_blocks ADD COLUMN IF NOT EXISTS parent_block_id uuid REFERENCES public.document_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.document_blocks ADD COLUMN IF NOT EXISTS block_type text DEFAULT 'section';

-- Remove unique constraint that prevents flexible reordering
ALTER TABLE public.document_blocks DROP CONSTRAINT IF EXISTS uq_document_blocks_order;

-- Add better index for ordering
CREATE INDEX IF NOT EXISTS idx_blocks_doc_order ON public.document_blocks(document_id, order_index) WHERE is_deleted = false;

-- ============================================================
-- 3. Create block_actions table (AI/manual actions on blocks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.block_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id uuid NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    action_type text NOT NULL, -- rewrite, summarize, clean, retitle, merge_suggest, split_suggest
    input jsonb DEFAULT '{}'::jsonb,
    output text,
    status text DEFAULT 'pending', -- pending, done, failed
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_block_actions_block_id ON public.block_actions(block_id);

-- ============================================================
-- 4. Create block_highlights table (text selections/marks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.block_highlights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id uuid NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
    extract_id uuid REFERENCES public.resource_extracts(id) ON DELETE SET NULL,
    start_index int NOT NULL,
    end_index int NOT NULL,
    selected_text text NOT NULL,
    label text,
    color text DEFAULT 'yellow',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_block_highlights_block_id ON public.block_highlights(block_id);

-- ============================================================
-- 5. Enable RLS (permissive for local dev)
-- ============================================================
ALTER TABLE public.block_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.block_actions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.block_highlights
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
