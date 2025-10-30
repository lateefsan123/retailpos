-- Add approval status to click and collect orders
-- This allows store owners to approve/reject orders and customers to see the status

-- Add approval status column to customer_shopping_lists table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'approval_status') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- Add approval notes column for store owner comments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'approval_notes') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

-- Add approved/rejected timestamp
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'approval_timestamp') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN approval_timestamp TIMESTAMPTZ;
  END IF;
END $$;

-- Add approved by user reference (optional - for tracking who approved)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'approved_by') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN approved_by INTEGER;
  END IF;
END $$;

-- Add foreign key constraint for approved_by (references users table)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND constraint_name = 'customer_shopping_lists_approved_by_fkey') THEN
    ALTER TABLE public.customer_shopping_lists 
    ADD CONSTRAINT customer_shopping_lists_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for approval status queries
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_approval_status 
ON public.customer_shopping_lists(approval_status) 
WHERE is_click_and_collect = true;

-- Create index for pending approvals (most common query)
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_pending_approvals 
ON public.customer_shopping_lists(business_id, approval_status, created_at DESC) 
WHERE is_click_and_collect = true AND approval_status = 'pending';

-- Add check constraint for valid approval status values
-- Note: This will fail if the constraint already exists, but that's okay
DO $$ 
BEGIN
  ALTER TABLE public.customer_shopping_lists 
  ADD CONSTRAINT check_approval_status 
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'ready_for_pickup', 'collected'));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore the error
    NULL;
END $$;

-- Update existing click and collect items to have 'pending' status
UPDATE public.customer_shopping_lists 
SET approval_status = 'pending' 
WHERE is_click_and_collect = true 
AND approval_status IS NULL;

-- Add comment explaining the approval workflow
COMMENT ON COLUMN public.customer_shopping_lists.approval_status IS 'Status of click and collect order: pending, approved, rejected, ready_for_pickup, collected';
COMMENT ON COLUMN public.customer_shopping_lists.approval_notes IS 'Notes from store owner about the approval decision';
COMMENT ON COLUMN public.customer_shopping_lists.approval_timestamp IS 'When the approval decision was made';
COMMENT ON COLUMN public.customer_shopping_lists.approved_by IS 'User ID of the store owner who made the approval decision';
