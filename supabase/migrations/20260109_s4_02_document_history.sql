-- Migration: Document History & Block Schema Update
-- Adds document history tracking and ensures block schema consistency

-- 1) Update document_blocks to ensure consistency with frontend interfaces
ALTER TABLE public.document_blocks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_block_id UUID REFERENCES public.document_blocks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'section' CHECK (block_type IN ('section', 'note', 'quote', 'table'));

-- 2) Create document_history table for action tracking and recovery
CREATE TABLE IF NOT EXISTS public.document_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'import_replace', 'import_merge', 'restore', 'bulk_edit'
    description TEXT,
    snapshot JSONB, -- Almacena el estado completo de los bloques antes de la acción
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_history_document ON public.document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_history_created ON public.document_history(created_at);
CREATE INDEX IF NOT EXISTS idx_document_blocks_parent ON public.document_blocks(parent_block_id);
