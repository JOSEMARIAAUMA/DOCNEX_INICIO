-- Add icon_url and custom_color to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
