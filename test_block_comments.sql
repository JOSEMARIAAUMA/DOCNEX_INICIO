-- Quick test to verify block_comments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'block_comments'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'block_comments';
