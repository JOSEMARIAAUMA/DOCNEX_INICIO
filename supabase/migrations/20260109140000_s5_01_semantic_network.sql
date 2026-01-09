-- Sprint 5: Semantic Network Infrastructure
-- Table to store bidirectional links between blocks and documents

-- 1. Create the semantic_links table
CREATE TABLE IF NOT EXISTS public.semantic_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_block_id uuid NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    target_block_id uuid REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    target_document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
    link_type text NOT NULL CHECK (link_type IN ('manual_ref', 'auto_mention', 'semantic_similarity', 'backlink')),
    metadata jsonb DEFAULT '{}', -- Store context like 'excerpt', 'confidence', 'is_active'
    created_at timestamptz DEFAULT now(),
    
    -- Constraint: Either target_block or target_document must be present
    CONSTRAINT target_exists CHECK (target_block_id IS NOT NULL OR target_document_id IS NOT NULL)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_semantic_links_source_block ON public.semantic_links(source_block_id);
CREATE INDEX IF NOT EXISTS idx_semantic_links_target_block ON public.semantic_links(target_block_id);
CREATE INDEX IF NOT EXISTS idx_semantic_links_target_doc ON public.semantic_links(target_document_id);
CREATE INDEX IF NOT EXISTS idx_semantic_links_type ON public.semantic_links(link_type);

-- 3. RLS Policies
ALTER TABLE public.semantic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semantic links are viewable by everyone in the workspace"
ON public.semantic_links FOR SELECT
TO authenticated
USING (true); -- Simplified for MVP, ideally should check workspace membership

CREATE POLICY "Semantic links can be inserted by authenticated users"
ON public.semantic_links FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Semantic links can be deleted by authenticated users"
ON public.semantic_links FOR DELETE
TO authenticated
USING (true);

-- 4. Automatically set target_document_id if only target_block_id is provided
CREATE OR REPLACE FUNCTION public.fn_sync_semantic_link_document()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_block_id IS NOT NULL AND NEW.target_document_id IS NULL THEN
        SELECT document_id INTO NEW.target_document_id 
        FROM public.document_blocks 
        WHERE id = NEW.target_block_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_sync_semantic_link_document
BEFORE INSERT ON public.semantic_links
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_semantic_link_document();
