-- ============================================================================
-- Migration 017: Create Formula Inventory Table
-- Tracks formula inventory levels and manufacturing history
-- ============================================================================

-- Create formula_inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS formula_inventory (
    id SERIAL PRIMARY KEY,
    formula_name VARCHAR(255) NOT NULL UNIQUE,
    gallons_available DECIMAL(10,2) DEFAULT 0,
    gallons_in_production DECIMAL(10,2) DEFAULT 0,
    last_manufactured TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (formula_name) REFERENCES formula(formula) ON DELETE CASCADE
);

-- Create index for quick lookup by formula name
CREATE INDEX IF NOT EXISTS idx_formula_inventory_formula_name ON formula_inventory(formula_name);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_formula_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS formula_inventory_updated_at_trigger ON formula_inventory;
CREATE TRIGGER formula_inventory_updated_at_trigger
    BEFORE UPDATE ON formula_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_formula_inventory_timestamp();

-- Add comments
COMMENT ON TABLE formula_inventory IS 'Tracks formula inventory levels and manufacturing history';
COMMENT ON COLUMN formula_inventory.formula_name IS 'Name of the formula (references formula table)';
COMMENT ON COLUMN formula_inventory.gallons_available IS 'Available gallons in inventory';
COMMENT ON COLUMN formula_inventory.gallons_in_production IS 'Gallons currently allocated to active shipments';
COMMENT ON COLUMN formula_inventory.last_manufactured IS 'Timestamp of last manufacturing run';

-- Initialize formula_inventory for all existing formulas with zero inventory
INSERT INTO formula_inventory (formula_name, gallons_available, gallons_in_production)
SELECT f.formula, 0, 0
FROM formula f
WHERE NOT EXISTS (
    SELECT 1 FROM formula_inventory fi WHERE fi.formula_name = f.formula
)
ON CONFLICT (formula_name) DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================

