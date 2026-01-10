-- Migration: Library Intelligence & Experience Layer
-- Description: Adds theme detection and cross-project experience tracking for the global library.

-- 1. Extend Resources with Theme and Specialized Metadata
ALTER TABLE resources ADD COLUMN IF NOT EXISTS theme TEXT;
COMMENT ON COLUMN resources.theme IS 'Semantic theme detected by AI (e.g., Jurídico, Arquitectura, Económico)';

-- 2. Create Library Experiences Table
CREATE TABLE IF NOT EXISTS library_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    block_id UUID REFERENCES document_blocks(id) ON DELETE SET NULL,
    experience_type TEXT NOT NULL CHECK (experience_type IN ('limitation', 'success', 'contradiction', 'tip', 'critical_note')),
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE library_experiences ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Global Read, Authenticated Write
CREATE POLICY "Experiences are viewable by all team members" 
ON library_experiences FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own experiences" 
ON library_experiences FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. Indexes for fast cross-project retrieval
CREATE INDEX IF NOT EXISTS idx_lib_exp_resource ON library_experiences(resource_id);
CREATE INDEX IF NOT EXISTS idx_lib_exp_type ON library_experiences(experience_type);
