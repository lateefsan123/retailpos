-- Create inventory_movements table for tracking stock changes
-- Run this in your Supabase SQL editor to create the inventory movements table

CREATE TABLE IF NOT EXISTS inventory_movements (
  movement_id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  movement_type VARCHAR(50) NOT NULL, -- 'Sale', 'Restock', 'Quick Restock', 'Adjustment', etc.
  reference_id INTEGER, -- Reference to sale_id, purchase_id, etc. (nullable for manual operations)
  business_id INTEGER NOT NULL,
  branch_id INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER -- User who made the movement
);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
  -- Add foreign key for business_id to businesses table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
    -- Check if constraint already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_inventory_movements_business_id' 
      AND table_name = 'inventory_movements'
    ) THEN
      ALTER TABLE inventory_movements 
      ADD CONSTRAINT fk_inventory_movements_business_id 
      FOREIGN KEY (business_id) REFERENCES businesses(business_id);
    END IF;
  END IF;

  -- Add foreign key for branch_id to branches table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    -- Check if constraint already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_inventory_movements_branch_id' 
      AND table_name = 'inventory_movements'
    ) THEN
      ALTER TABLE inventory_movements 
      ADD CONSTRAINT fk_inventory_movements_branch_id 
      FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
    END IF;
  END IF;

  -- Add foreign key for created_by to users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Check if constraint already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_inventory_movements_created_by' 
      AND table_name = 'inventory_movements'
    ) THEN
      ALTER TABLE inventory_movements 
      ADD CONSTRAINT fk_inventory_movements_created_by 
      FOREIGN KEY (created_by) REFERENCES users(user_id);
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_id ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Add table comment
COMMENT ON TABLE inventory_movements IS 'Tracks all inventory movements including sales, restocks, and adjustments';
