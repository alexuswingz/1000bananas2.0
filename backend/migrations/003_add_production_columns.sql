-- ============================================================================
-- Migration 003: Add Production Planning Columns
-- Adds BPM (Bottles Per Minute) and max warehouse inventory to existing tables
-- ============================================================================

-- Add BPM column to bottle table
ALTER TABLE bottle ADD COLUMN IF NOT EXISTS bottles_per_minute INTEGER;

-- Add max warehouse inventory to bottle table  
ALTER TABLE bottle ADD COLUMN IF NOT EXISTS max_warehouse_inventory INTEGER;

-- Add BPM column to finished_goods table
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS max_packaging_per_minute INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bottle_bpm ON bottle(bottles_per_minute);
CREATE INDEX IF NOT EXISTS idx_finished_goods_bpm ON finished_goods(max_packaging_per_minute);

-- Add comments
COMMENT ON COLUMN bottle.bottles_per_minute IS 'Manufacturing speed - bottles packaged per minute';
COMMENT ON COLUMN bottle.max_warehouse_inventory IS 'Maximum warehouse capacity for this bottle type';
COMMENT ON COLUMN finished_goods.max_packaging_per_minute IS 'Maximum packaging speed per minute for finished goods';

-- ============================================================================
-- Migration complete
-- ============================================================================

