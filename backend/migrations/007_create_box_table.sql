-- ============================================================================
-- Migration 007: Create Box Table
-- Creates box table for shipping/packaging boxes
-- ============================================================================

CREATE TABLE IF NOT EXISTS box (
    id SERIAL PRIMARY KEY,
    box_size VARCHAR(100) UNIQUE NOT NULL,
    warehouse_inventory INTEGER DEFAULT 0,
    max_warehouse_inventory INTEGER,
    supplier VARCHAR(255),
    moq INTEGER,
    units_per_pallet INTEGER,
    cost_per_unit DECIMAL(10,4),
    lead_time_weeks NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_box_box_size ON box(box_size);

-- Trigger to update updated_at
CREATE TRIGGER trigger_box_updated_at
    BEFORE UPDATE ON box
    FOR EACH ROW
    EXECUTE FUNCTION update_supply_chain_timestamp();

COMMENT ON TABLE box IS 'Shipping/packaging boxes inventory and specifications';

-- Import data from BoxDatabase sheet
INSERT INTO box (box_size, warehouse_inventory, max_warehouse_inventory)
VALUES 
    ('12x10x12', 0, NULL),
    ('13x13x13', 0, NULL),
    ('13x13x10', 0, NULL),
    ('24x16x10', 0, NULL),
    ('21x13x13', 0, NULL),
    ('21x13x10', 0, NULL)
ON CONFLICT (box_size) DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================




