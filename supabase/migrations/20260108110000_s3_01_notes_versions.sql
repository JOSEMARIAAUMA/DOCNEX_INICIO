-- Sprint 3: Notes & Versions
-- Adds support for block comments/notes and version history

-- Notas/comentarios sobre texto en bloques
CREATE TABLE IF NOT EXISTS block_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES document_blocks(id) ON DELETE CASCADE,
    text_selection TEXT,           -- Texto seleccionado
    start_offset INT,              -- Posición inicio
    end_offset INT,                -- Posición fin
    content TEXT NOT NULL,         -- Contenido del comentario
    comment_type TEXT DEFAULT 'review' CHECK (comment_type IN ('review', 'ai_instruction')),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Versiones de bloques (snapshots del contenido)
CREATE TABLE IF NOT EXISTS block_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES document_blocks(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_block_comments_block ON block_comments(block_id);
CREATE INDEX IF NOT EXISTS idx_block_comments_resolved ON block_comments(block_id, resolved);
CREATE INDEX IF NOT EXISTS idx_block_versions_block ON block_versions(block_id);
CREATE INDEX IF NOT EXISTS idx_block_versions_active ON block_versions(block_id, is_active);

-- Trigger to update updated_at on comments
CREATE OR REPLACE FUNCTION update_block_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_comments_updated_at ON block_comments;
CREATE TRIGGER block_comments_updated_at
    BEFORE UPDATE ON block_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_block_comment_timestamp();
