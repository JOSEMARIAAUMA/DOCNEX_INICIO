-- Migration: Add status and historical tracking to resources
-- Status: ACTIVE, OBSOLETE, VETOED

ALTER TABLE resources ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS veto_reason TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS replaced_by_id UUID REFERENCES resources(id);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

-- Update existing resources to ACTIVE
UPDATE resources SET status = 'ACTIVE' WHERE status IS NULL;
