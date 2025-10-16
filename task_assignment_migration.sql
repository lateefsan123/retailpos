-- Task Assignment System Migration
-- Add task assignment functionality to reminders table

-- Add new columns to support task assignment (only if they don't exist)
DO $$ 
BEGIN
    -- Add assigned_to column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.reminders ADD COLUMN assigned_to integer;
    END IF;
    
    -- Add assigned_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'assigned_by') THEN
        ALTER TABLE public.reminders ADD COLUMN assigned_by integer;
    END IF;
    
    -- Add is_task column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'is_task') THEN
        ALTER TABLE public.reminders ADD COLUMN is_task boolean DEFAULT false;
    END IF;
    
    -- Add completed_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'completed_by') THEN
        ALTER TABLE public.reminders ADD COLUMN completed_by integer;
    END IF;
    
    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'completed_at') THEN
        ALTER TABLE public.reminders ADD COLUMN completed_at timestamp with time zone;
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'priority') THEN
        ALTER TABLE public.reminders ADD COLUMN priority text CHECK (priority IN ('Low', 'Medium', 'High'));
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'notes') THEN
        ALTER TABLE public.reminders ADD COLUMN notes text;
    END IF;
END $$;

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    -- Add assigned_to foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'reminders_assigned_to_fkey') THEN
        ALTER TABLE public.reminders 
        ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id);
    END IF;
    
    -- Add assigned_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'reminders_assigned_by_fkey') THEN
        ALTER TABLE public.reminders 
        ADD CONSTRAINT reminders_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(user_id);
    END IF;
    
    -- Add completed_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'reminders_completed_by_fkey') THEN
        ALTER TABLE public.reminders 
        ADD CONSTRAINT reminders_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(user_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_by ON reminders(assigned_by);
CREATE INDEX IF NOT EXISTS idx_reminders_is_task ON reminders(is_task);
CREATE INDEX IF NOT EXISTS idx_reminders_completed_by ON reminders(completed_by);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority);

-- Add index for task filtering
CREATE INDEX IF NOT EXISTS idx_reminders_business_tasks ON reminders(business_id, is_task) WHERE is_task = true;
CREATE INDEX IF NOT EXISTS idx_reminders_branch_tasks ON reminders(branch_id, is_task) WHERE is_task = true;
