-- Fix RLS policies for semantic_links by disabling RLS for consistency with other tables (dev mode)

ALTER TABLE public.semantic_links DISABLE ROW LEVEL SECURITY;

-- Ensure grants are correct for all roles including anon
GRANT ALL ON TABLE public.semantic_links TO authenticated;
GRANT ALL ON TABLE public.semantic_links TO anon;
GRANT ALL ON TABLE public.semantic_links TO service_role;
GRANT ALL ON TABLE public.semantic_links TO postgres;

-- Update the function to be SECURITY DEFINER to avoid RLS issues when reading blocks (in case RLS is enabled elsewhere)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
