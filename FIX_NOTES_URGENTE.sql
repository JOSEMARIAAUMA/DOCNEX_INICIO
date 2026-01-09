-- EJECUTA ESTE SQL EN EL PANEL DE SUPABASE (SQL Editor)
-- Esto añadirá la columna 'meta' que falta en la tabla block_comments

-- 1. Añadir columna meta si no existe
ALTER TABLE public.block_comments 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- 2. Verificar que se creó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'block_comments' 
AND column_name = 'meta';
