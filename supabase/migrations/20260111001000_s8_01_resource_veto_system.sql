-- Migration: Add status and historical tracking to resources
-- Status: ACTIVE, OBSOLETE, VETOED

ALTER TABLE resources ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE resources ADD COLUMN veto_reason TEXT;
ALTER TABLE resources ADD COLUMN replaced_by_id UUID REFERENCES resources(id);

-- Add index for status filtering
CREATE INDEX idx_resources_status ON resources(status);

-- Update existing resources to ACTIVE
UPDATE resources SET status = 'ACTIVE' WHERE status IS NULL;
