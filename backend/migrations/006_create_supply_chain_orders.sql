-- ============================================================================
-- Migration 006: Create Supply Chain Order Tables
-- Creates tables for tracking bottle, closure, and box orders
-- ============================================================================

-- Bottle Orders Table
CREATE TABLE IF NOT EXISTS bottle_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    bottle_name VARCHAR(255),
    supplier VARCHAR(255),
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    quantity_ordered INTEGER,
    quantity_received INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    -- Status: pending, ordered, in_transit, received, archived
    tracking_number VARCHAR(255),
    po_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closure Orders Table
CREATE TABLE IF NOT EXISTS closure_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    closure_name VARCHAR(255),
    supplier VARCHAR(255),
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    quantity_ordered INTEGER,
    quantity_received INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(255),
    po_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Box Orders Table
CREATE TABLE IF NOT EXISTS box_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    box_type VARCHAR(255),
    box_size VARCHAR(100),
    supplier VARCHAR(255),
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    quantity_ordered INTEGER,
    quantity_received INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(255),
    po_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bottle Inventory Table (for tracking warehouse stock)
CREATE TABLE IF NOT EXISTS bottle_inventory (
    id SERIAL PRIMARY KEY,
    bottle_name VARCHAR(255) UNIQUE NOT NULL,
    warehouse_quantity INTEGER DEFAULT 0,
    supplier_quantity INTEGER DEFAULT 0,
    min_quantity INTEGER,
    max_quantity INTEGER,
    reorder_point INTEGER,
    last_count_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (bottle_name) REFERENCES bottle(bottle_name) ON DELETE CASCADE
);

-- Closure Inventory Table
CREATE TABLE IF NOT EXISTS closure_inventory (
    id SERIAL PRIMARY KEY,
    closure_name VARCHAR(255) UNIQUE NOT NULL,
    warehouse_quantity INTEGER DEFAULT 0,
    supplier_quantity INTEGER DEFAULT 0,
    min_quantity INTEGER,
    max_quantity INTEGER,
    reorder_point INTEGER,
    last_count_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Box Inventory Table
CREATE TABLE IF NOT EXISTS box_inventory (
    id SERIAL PRIMARY KEY,
    box_type VARCHAR(255) UNIQUE NOT NULL,
    warehouse_quantity INTEGER DEFAULT 0,
    supplier_quantity INTEGER DEFAULT 0,
    min_quantity INTEGER,
    max_quantity INTEGER,
    reorder_point INTEGER,
    last_count_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indexes for performance
-- Bottle Orders
CREATE INDEX IF NOT EXISTS idx_bottle_orders_status ON bottle_orders(status);
CREATE INDEX IF NOT EXISTS idx_bottle_orders_bottle_name ON bottle_orders(bottle_name);
CREATE INDEX IF NOT EXISTS idx_bottle_orders_order_date ON bottle_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_bottle_orders_supplier ON bottle_orders(supplier);

-- Closure Orders
CREATE INDEX IF NOT EXISTS idx_closure_orders_status ON closure_orders(status);
CREATE INDEX IF NOT EXISTS idx_closure_orders_closure_name ON closure_orders(closure_name);
CREATE INDEX IF NOT EXISTS idx_closure_orders_order_date ON closure_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_closure_orders_supplier ON closure_orders(supplier);

-- Box Orders
CREATE INDEX IF NOT EXISTS idx_box_orders_status ON box_orders(status);
CREATE INDEX IF NOT EXISTS idx_box_orders_box_type ON box_orders(box_type);
CREATE INDEX IF NOT EXISTS idx_box_orders_order_date ON box_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_box_orders_supplier ON box_orders(supplier);

-- Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_bottle_inventory_bottle_name ON bottle_inventory(bottle_name);
CREATE INDEX IF NOT EXISTS idx_closure_inventory_closure_name ON closure_inventory(closure_name);
CREATE INDEX IF NOT EXISTS idx_box_inventory_box_type ON box_inventory(box_type);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_supply_chain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_bottle_orders_updated_at
    BEFORE UPDATE ON bottle_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_supply_chain_timestamp();

CREATE TRIGGER trigger_closure_orders_updated_at
    BEFORE UPDATE ON closure_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_supply_chain_timestamp();

CREATE TRIGGER trigger_box_orders_updated_at
    BEFORE UPDATE ON box_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_supply_chain_timestamp();

-- Trigger to update inventory last_updated
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bottle_inventory_updated
    BEFORE UPDATE ON bottle_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER trigger_closure_inventory_updated
    BEFORE UPDATE ON closure_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER trigger_box_inventory_updated
    BEFORE UPDATE ON box_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

-- Comments
COMMENT ON TABLE bottle_orders IS 'Tracks bottle orders from suppliers';
COMMENT ON TABLE closure_orders IS 'Tracks closure orders from suppliers';
COMMENT ON TABLE box_orders IS 'Tracks box/case orders from suppliers';
COMMENT ON TABLE bottle_inventory IS 'Tracks bottle warehouse and supplier inventory';
COMMENT ON TABLE closure_inventory IS 'Tracks closure warehouse and supplier inventory';
COMMENT ON TABLE box_inventory IS 'Tracks box warehouse and supplier inventory';

COMMENT ON COLUMN bottle_orders.status IS 'Order status: pending, ordered, in_transit, received, archived';
COMMENT ON COLUMN closure_orders.status IS 'Order status: pending, ordered, in_transit, received, archived';
COMMENT ON COLUMN box_orders.status IS 'Order status: pending, ordered, in_transit, received, archived';

-- Initialize bottle inventory from existing bottle table
INSERT INTO bottle_inventory (bottle_name, warehouse_quantity, supplier_quantity)
SELECT 
    bottle_name,
    COALESCE(warehouse_inventory, 0) as warehouse_quantity,
    COALESCE(supplier_inventory, 0) as supplier_quantity
FROM bottle
ON CONFLICT (bottle_name) DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================






