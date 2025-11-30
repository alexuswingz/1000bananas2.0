-- Migration 008: Create Label Inventory and Order Management Tables

-- Drop existing label_inventory table if it exists (old schema)
DROP TABLE IF EXISTS label_inventory CASCADE;

-- Table 1: Label Inventory
CREATE TABLE label_inventory (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    bottle_size VARCHAR(100) NOT NULL,  -- '8oz', 'Quart', 'Gallon', etc.
    label_size VARCHAR(100),  -- '5" x 8"', '5.375" x 4.5"', etc.
    label_location VARCHAR(255),  -- e.g., 'LBL-PLANT-494'
    label_status VARCHAR(100) DEFAULT 'Up to Date',  -- 'Up to Date', 'Needs Proofing'
    warehouse_inventory INTEGER DEFAULT 0,
    inbound_quantity INTEGER DEFAULT 0,
    supplier VARCHAR(255) DEFAULT 'Richmark Label',
    moq INTEGER,
    lead_time_weeks INTEGER,
    last_count_date DATE,
    google_drive_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(brand_name, product_name, bottle_size)
);

CREATE INDEX idx_label_inventory_brand_product ON label_inventory(brand_name, product_name);
CREATE INDEX idx_label_inventory_status ON label_inventory(label_status);

-- Drop and recreate label_orders with proper schema for multi-line orders
DROP TABLE IF EXISTS label_orders CASCADE;

-- Table 2: Label Orders
CREATE TABLE label_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) NOT NULL UNIQUE,
    supplier VARCHAR(255) DEFAULT 'Richmark Label',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_quantity INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2),
    status VARCHAR(100) DEFAULT 'pending',  -- 'pending', 'partial', 'received', 'archived'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_label_orders_status ON label_orders(status);
CREATE INDEX idx_label_orders_date ON label_orders(order_date);

-- Table 3: Label Order Lines
CREATE TABLE label_order_lines (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES label_orders(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    bottle_size VARCHAR(100) NOT NULL,
    label_size VARCHAR(100),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    cost_per_label DECIMAL(10,4),
    line_total DECIMAL(10,2),
    google_drive_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_label_order_lines_order ON label_order_lines(order_id);

-- Table 4: Label Cycle Counts
CREATE TABLE label_cycle_counts (
    id SERIAL PRIMARY KEY,
    count_date DATE DEFAULT CURRENT_DATE,
    counted_by VARCHAR(255) NOT NULL,
    status VARCHAR(100) DEFAULT 'draft',  -- 'draft', 'completed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_label_cycle_counts_date ON label_cycle_counts(count_date);
CREATE INDEX idx_label_cycle_counts_status ON label_cycle_counts(status);

-- Table 5: Label Cycle Count Lines
CREATE TABLE label_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    cycle_count_id INTEGER REFERENCES label_cycle_counts(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    bottle_size VARCHAR(100) NOT NULL,
    expected_quantity INTEGER,
    counted_quantity INTEGER NOT NULL,
    variance INTEGER,  -- counted - expected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_label_cycle_count_lines_count ON label_cycle_count_lines(cycle_count_id);

-- Add comments for documentation
COMMENT ON TABLE label_inventory IS 'Stores current label inventory for all product/size combinations';
COMMENT ON TABLE label_orders IS 'Header table for label orders';
COMMENT ON TABLE label_order_lines IS 'Line items for each label order';
COMMENT ON TABLE label_cycle_counts IS 'Physical inventory count sessions';
COMMENT ON TABLE label_cycle_count_lines IS 'Individual label counts within a cycle count';

