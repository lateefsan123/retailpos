-- =====================================================
-- ADD TASK ICONS MIGRATION
-- =====================================================
-- Adds icon support for tasks to better categorize
-- and visually identify different types of tasks
-- =====================================================

-- Add task_icon column to reminders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'task_icon') THEN
        ALTER TABLE public.reminders ADD COLUMN task_icon VARCHAR(50);
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reminders_task_icon ON reminders(task_icon);

-- Add comment to document the new field
COMMENT ON COLUMN reminders.task_icon IS 'Icon identifier for task categorization (e.g., cleaning, inventory, maintenance)';

-- Add constraint to ensure valid icon values (optional - can be removed if you want more flexibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_task_icon'
    ) THEN
        ALTER TABLE reminders ADD CONSTRAINT valid_task_icon 
        CHECK (task_icon IS NULL OR task_icon IN (
            'cleaning', 'inventory', 'maintenance', 'delivery', 'customer-service',
            'stock-check', 'pricing', 'display', 'security', 'training',
            'meeting', 'reporting', 'marketing', 'sales', 'admin'
        ));
    END IF;
END $$;
