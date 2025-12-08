-- Migration to add is_edited column to order tables
-- This tracks when orders have been modified after creation

-- Add is_edited to bottle_orders
ALTER TABLE bottle_orders 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add is_edited to closure_orders
ALTER TABLE closure_orders 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add is_edited to box_orders
ALTER TABLE box_orders 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add is_edited to label_orders
ALTER TABLE label_orders 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN bottle_orders.is_edited IS 'Indicates if the order has been edited after creation';
COMMENT ON COLUMN closure_orders.is_edited IS 'Indicates if the order has been edited after creation';
COMMENT ON COLUMN box_orders.is_edited IS 'Indicates if the order has been edited after creation';
COMMENT ON COLUMN label_orders.is_edited IS 'Indicates if the order has been edited after creation';

