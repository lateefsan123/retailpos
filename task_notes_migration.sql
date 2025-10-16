-- =====================================================
-- TASK NOTES TABLE MIGRATION
-- =====================================================
-- Creates a table to store notes/comments for tasks
-- =====================================================

-- Add notes column to reminders table for backward compatibility
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add status column to reminders table for task management
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending';

-- Add constraint to ensure valid status values (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_status'
    ) THEN
        ALTER TABLE reminders ADD CONSTRAINT valid_status 
        CHECK (status IN ('Pending', 'In Progress', 'Review', 'Completed'));
    END IF;
END $$;

-- Create task_notes table
CREATE TABLE IF NOT EXISTS task_notes (
  note_id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES reminders(reminder_id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  business_id INTEGER NOT NULL REFERENCES business_info(business_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_business_id ON task_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_created_at ON task_notes(created_at DESC);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for tasks in their business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_notes' AND policyname = 'task_notes_select_policy'
    ) THEN
        CREATE POLICY task_notes_select_policy ON task_notes
        FOR SELECT
        USING (business_id IN (
          SELECT business_id FROM users WHERE auth_user_id = auth.uid()
        ));
    END IF;
END $$;

-- Policy: Users can insert notes for tasks in their business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_notes' AND policyname = 'task_notes_insert_policy'
    ) THEN
        CREATE POLICY task_notes_insert_policy ON task_notes
        FOR INSERT
        WITH CHECK (business_id IN (
          SELECT business_id FROM users WHERE auth_user_id = auth.uid()
        ));
    END IF;
END $$;

-- Policy: Users can update their own notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_notes' AND policyname = 'task_notes_update_policy'
    ) THEN
        CREATE POLICY task_notes_update_policy ON task_notes
        FOR UPDATE
        USING (author_id IN (
          SELECT user_id FROM users WHERE auth_user_id = auth.uid()
        ));
    END IF;
END $$;

-- Policy: Owners and Admins can delete notes in their business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_notes' AND policyname = 'task_notes_delete_policy'
    ) THEN
        CREATE POLICY task_notes_delete_policy ON task_notes
        FOR DELETE
        USING (
          business_id IN (
            SELECT business_id FROM users 
            WHERE auth_user_id = auth.uid()
            AND role IN ('Owner', 'Admin')
          )
        );
    END IF;
END $$;

