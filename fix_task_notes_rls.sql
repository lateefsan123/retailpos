-- Fix RLS policies for task_notes table
-- This will make the policies more permissive for testing

-- Drop existing policies if they exist
DROP POLICY IF EXISTS task_notes_select_policy ON task_notes;
DROP POLICY IF EXISTS task_notes_insert_policy ON task_notes;
DROP POLICY IF EXISTS task_notes_update_policy ON task_notes;
DROP POLICY IF EXISTS task_notes_delete_policy ON task_notes;

-- Create more permissive policies that work with your current auth setup
-- Policy: Users can view all notes (for now)
CREATE POLICY task_notes_select_policy ON task_notes
FOR SELECT
USING (true);

-- Policy: Users can insert notes (for now)
CREATE POLICY task_notes_insert_policy ON task_notes
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update notes (for now)
CREATE POLICY task_notes_update_policy ON task_notes
FOR UPDATE
USING (true);

-- Policy: Users can delete notes (for now)
CREATE POLICY task_notes_delete_policy ON task_notes
FOR DELETE
USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'task_notes';
