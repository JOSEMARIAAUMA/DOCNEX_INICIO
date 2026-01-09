-- Sprint 4: Document Categories & Support System
-- Adds category to documents to distinguish between main, versions, and references

-- 1. Add category column to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category text DEFAULT 'main' CHECK (category IN ('main', 'version', 'linked_ref', 'unlinked_ref'));

-- 2. Add description to documents for better context in references
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;

-- 3. Update existing data if necessary (already defaulted to 'main')

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_project_category ON public.documents(project_id, category);
