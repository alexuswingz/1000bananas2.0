-- ============================================================================
-- Migration 004: Create Label Orders System
-- Creates tables for tracking label orders and costs
-- ============================================================================

-- Label Orders Table
CREATE TABLE IF NOT EXISTS label_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    label_name VARCHAR(255),
    label_size VARCHAR(100),
    supplier VARCHAR(255) DEFAULT 'Leapin'' Lizard Labels',
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    quantity_ordered INTEGER,
    quantity_received INTEGER DEFAULT 0,
    cost_per_label DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    -- Status: pending, ordered, in_transit, received, archived
    tracking_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Label Costs Table (pricing tiers)
CREATE TABLE IF NOT EXISTS label_costs (
    id SERIAL PRIMARY KEY,
    label_size VARCHAR(100) NOT NULL,
    min_quantity INTEGER,
    max_quantity INTEGER,
    price_per_thousand DECIMAL(10,2),
    setup_fee_first_product DECIMAL(10,2),
    setup_fee_additional DECIMAL(10,2),
    item_change_fee DECIMAL(10,2),
    effective_date DATE DEFAULT CURRENT_DATE,
    supplier VARCHAR(255) DEFAULT 'Leapin'' Lizard Labels',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(label_size, min_quantity, max_quantity, effective_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_label_orders_status ON label_orders(status);
CREATE INDEX IF NOT EXISTS idx_label_orders_label_name ON label_orders(label_name);
CREATE INDEX IF NOT EXISTS idx_label_orders_label_size ON label_orders(label_size);
CREATE INDEX IF NOT EXISTS idx_label_orders_order_date ON label_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_label_costs_size ON label_costs(label_size);
CREATE INDEX IF NOT EXISTS idx_label_costs_quantity ON label_costs(min_quantity, max_quantity);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_label_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_label_orders_updated_at
    BEFORE UPDATE ON label_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_label_orders_timestamp();

-- Comments
COMMENT ON TABLE label_orders IS 'Tracks label orders from suppliers';
COMMENT ON TABLE label_costs IS 'Label pricing tiers from suppliers';
COMMENT ON COLUMN label_orders.status IS 'Order status: pending, ordered, in_transit, received, archived';
COMMENT ON COLUMN label_costs.price_per_thousand IS 'Price per 1,000 labels';

-- ============================================================================
-- Migration complete
-- ============================================================================

