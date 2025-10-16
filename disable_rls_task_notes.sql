-- Disable RLS for task_notes table to fix notes display issue
-- This is a temporary fix for development

ALTER TABLE task_notes DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'task_notes';
