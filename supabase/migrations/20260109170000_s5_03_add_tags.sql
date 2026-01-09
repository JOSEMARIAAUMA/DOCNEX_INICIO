-- Sprint 5.5: Semantic Network v2 (Tags & Topics)

-- 1. Add tags column to document_blocks
ALTER TABLE public.document_blocks 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Create GIN index for fast array similarity searches
CREATE INDEX IF NOT EXISTS idx_document_blocks_tags ON public.document_blocks USING GIN (tags);

-- 3. Update RLS policies to allow updating tags (if necessary, though update usually covers all columns)
-- Existing policies should cover UPDATE if they are defined on the table level.

-- 4. Function to find related blocks by tag overlap
CREATE OR REPLACE FUNCTION public.get_related_blocks_by_tags(
    p_block_id uuid,
    p_limit int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    document_id uuid,
    shared_tags text[],
    similarity_score int
) AS $$
BEGIN
    RETURN QUERY
    WITH current_block AS (
        SELECT tags FROM public.document_blocks WHERE id = p_block_id
    )
    SELECT 
        b.id,
        b.title,
        b.content,
        b.document_id,
        ARRAY(select unnest(b.tags) INTERSECT select unnest(cb.tags)) as shared_tags,
        cardinality(ARRAY(select unnest(b.tags) INTERSECT select unnest(cb.tags))) as similarity_score
    FROM 
        public.document_blocks b,
        current_block cb
    WHERE 
        b.id != p_block_id -- Exclude self
        AND b.tags && cb.tags -- Overlap operator (at least one common tag)
    ORDER BY 
        similarity_score DESC,
        b.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
