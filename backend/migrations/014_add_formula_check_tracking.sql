-- ============================================================================
-- Migration 014: Add Formula Check Tracking Columns
-- Adds columns for tracking formula check status, comments, and per-formula notes
-- ============================================================================

-- Add formula check comment column to shipments table
-- This stores the overall comment when formula check is marked incomplete
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS formula_check_comment TEXT;

-- Add label check comment column to shipments table
-- This stores the overall comment when label check is marked incomplete
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS label_check_comment TEXT;

-- Add book_shipment_completed column if not exists
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS book_shipment_completed BOOLEAN DEFAULT FALSE;

-- Add carrier column for Book Shipment step
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);

-- Add is_checked column to shipment_formulas table
-- Tracks which formulas have been reviewed/checked
ALTER TABLE shipment_formulas 
ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT FALSE;

-- Add notes column to shipment_formulas table
-- Stores per-formula notes from Formula Check step
ALTER TABLE shipment_formulas 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add checked_at timestamp for auditing
ALTER TABLE shipment_formulas 
ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP;

-- Add checked_by for auditing
ALTER TABLE shipment_formulas 
ADD COLUMN IF NOT EXISTS checked_by VARCHAR(255);

-- Create index for quick lookup of unchecked formulas
CREATE INDEX IF NOT EXISTS idx_shipment_formulas_checked 
ON shipment_formulas(shipment_id, is_checked);

-- Update the view to include new columns
DROP VIEW IF EXISTS v_shipment_details;

CREATE OR REPLACE VIEW v_shipment_details AS
SELECT 
    s.id as shipment_id,
    s.shipment_number,
    s.shipment_date,
    s.shipment_type,
    s.marketplace,
    s.account,
    s.status,
    s.total_units,
    s.total_boxes,
    s.total_palettes,
    s.estimated_hours,
    s.carrier,
    
    -- Progress tracking
    s.add_products_completed,
    s.formula_check_completed,
    s.formula_check_comment,
    s.label_check_completed,
    s.label_check_comment,
    s.sort_products_completed,
    s.sort_formulas_completed,
    s.book_shipment_completed,
    
    -- Product details
    sp.id as product_id,
    sp.product_name,
    sp.brand_name,
    sp.size,
    sp.quantity,
    sp.boxes_needed,
    sp.formula_name,
    sp.bottle_name,
    sp.closure_name,
    sp.label_location,
    
    -- Inventory availability
    bi.warehouse_quantity as bottles_available,
    ci.warehouse_quantity as closures_available,
    li.warehouse_inventory as labels_available,
    fi.gallons_available as formula_available
    
FROM shipments s
LEFT JOIN shipment_products sp ON s.id = sp.shipment_id
LEFT JOIN bottle_inventory bi ON sp.bottle_name = bi.bottle_name
LEFT JOIN closure_inventory ci ON sp.closure_name = ci.closure_name
LEFT JOIN label_inventory li ON sp.label_location = li.label_location
LEFT JOIN formula_inventory fi ON sp.formula_name = fi.formula_name;

-- Comments for new columns
COMMENT ON COLUMN shipments.formula_check_comment IS 'Comment provided when formula check is marked incomplete';
COMMENT ON COLUMN shipments.label_check_comment IS 'Comment provided when label check is marked incomplete';
COMMENT ON COLUMN shipments.carrier IS 'Shipping carrier selected during Book Shipment step';
COMMENT ON COLUMN shipment_formulas.is_checked IS 'Whether this formula has been reviewed during formula check';
COMMENT ON COLUMN shipment_formulas.notes IS 'Per-formula notes from Formula Check step';
COMMENT ON COLUMN shipment_formulas.checked_at IS 'Timestamp when formula was marked as checked';
COMMENT ON COLUMN shipment_formulas.checked_by IS 'User who marked the formula as checked';

-- ============================================================================
-- Migration complete
-- ============================================================================

