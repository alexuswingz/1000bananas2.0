-- ============================================================================
-- Migration 011: Create Production Shipment Tables
-- Creates tables for tracking shipments and their products through production
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS shipment_formulas CASCADE;
DROP TABLE IF EXISTS shipment_products CASCADE;
DROP TABLE IF EXISTS production_shipments CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS formula_allocations CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS v_shipment_details CASCADE;

-- Shipments Table (Main shipment records)
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(255) UNIQUE NOT NULL,
    shipment_date DATE NOT NULL,
    shipment_type VARCHAR(50) NOT NULL,  -- AWD, FBA, etc.
    marketplace VARCHAR(100),
    account VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'planning',
    -- Status flow: planning -> add_products -> formula_check -> label_check -> sort_products -> sort_formulas -> manufacturing -> packaging -> ready_for_pickup -> shipped -> received
    
    -- Completion tracking for workflow stages
    add_products_completed BOOLEAN DEFAULT FALSE,
    formula_check_completed BOOLEAN DEFAULT FALSE,
    label_check_completed BOOLEAN DEFAULT FALSE,
    sort_products_completed BOOLEAN DEFAULT FALSE,
    sort_formulas_completed BOOLEAN DEFAULT FALSE,
    
    -- Totals (cached for performance)
    total_units INTEGER DEFAULT 0,
    total_boxes INTEGER DEFAULT 0,
    total_palettes INTEGER DEFAULT 0,
    total_weight_lbs DECIMAL(10,2) DEFAULT 0,
    estimated_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Products Table (Products in each shipment)
CREATE TABLE IF NOT EXISTS shipment_products (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    catalog_id INTEGER NOT NULL,
    
    -- Product info (denormalized for historical record)
    product_name VARCHAR(500),
    brand_name VARCHAR(255),
    size VARCHAR(100),
    child_asin VARCHAR(50),
    child_sku VARCHAR(255),
    
    -- Quantities
    quantity INTEGER NOT NULL,
    units_per_case DECIMAL(10,2),
    boxes_needed INTEGER,
    
    -- Supply chain components (denormalized for historical record)
    bottle_name VARCHAR(255),
    formula_name VARCHAR(255),
    closure_name VARCHAR(255),
    label_location VARCHAR(255),
    box_type VARCHAR(255),
    
    -- Inventory allocations (gallons of formula needed)
    formula_gallons_needed DECIMAL(10,2),
    bottles_needed INTEGER,
    closures_needed INTEGER,
    labels_needed INTEGER,
    
    -- Production metrics
    bottles_per_minute INTEGER,
    production_time_minutes DECIMAL(10,2),
    
    -- Status tracking
    formula_allocated BOOLEAN DEFAULT FALSE,
    inventory_allocated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_id) REFERENCES catalog(id) ON DELETE RESTRICT
);

-- Shipment Formula Aggregation (For Formula Check stage)
-- This is a materialized view that groups products by formula
CREATE TABLE IF NOT EXISTS shipment_formulas (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    formula_name VARCHAR(255) NOT NULL,
    
    -- Aggregated needs
    total_gallons_needed DECIMAL(10,2),
    total_products INTEGER,
    
    -- Vessel allocation
    vessel_type VARCHAR(50),  -- Tote, Barrel, Tank
    vessel_quantity INTEGER,
    vessel_size_gallons DECIMAL(10,2),
    
    -- Status
    formula_available BOOLEAN DEFAULT TRUE,
    gallons_allocated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    UNIQUE(shipment_id, formula_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(shipment_date);
CREATE INDEX IF NOT EXISTS idx_shipments_account ON shipments(account);
CREATE INDEX IF NOT EXISTS idx_shipments_number ON shipments(shipment_number);

CREATE INDEX IF NOT EXISTS idx_shipment_products_shipment ON shipment_products(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_products_catalog ON shipment_products(catalog_id);
CREATE INDEX IF NOT EXISTS idx_shipment_products_formula ON shipment_products(formula_name);
CREATE INDEX IF NOT EXISTS idx_shipment_products_bottle ON shipment_products(bottle_name);

CREATE INDEX IF NOT EXISTS idx_shipment_formulas_shipment ON shipment_formulas(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_formulas_name ON shipment_formulas(formula_name);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shipment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_timestamp();

CREATE TRIGGER trigger_shipment_products_updated_at
    BEFORE UPDATE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_timestamp();

CREATE TRIGGER trigger_shipment_formulas_updated_at
    BEFORE UPDATE ON shipment_formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_timestamp();

-- Trigger to update shipment totals when products are added/updated
CREATE OR REPLACE FUNCTION update_shipment_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate totals for the shipment
    UPDATE shipments
    SET 
        total_units = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM shipment_products
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
        ),
        total_boxes = (
            SELECT COALESCE(SUM(boxes_needed), 0)
            FROM shipment_products
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
        ),
        estimated_hours = (
            SELECT COALESCE(SUM(production_time_minutes), 0) / 60.0
            FROM shipment_products
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.shipment_id, OLD.shipment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipment_products_totals
    AFTER INSERT OR UPDATE OR DELETE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_totals();

-- Function to aggregate formulas for a shipment
CREATE OR REPLACE FUNCTION aggregate_shipment_formulas(p_shipment_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Delete existing aggregations
    DELETE FROM shipment_formulas WHERE shipment_id = p_shipment_id;
    
    -- Insert new aggregations
    INSERT INTO shipment_formulas (
        shipment_id,
        formula_name,
        total_gallons_needed,
        total_products
    )
    SELECT 
        p_shipment_id,
        formula_name,
        SUM(formula_gallons_needed) as total_gallons_needed,
        COUNT(*) as total_products
    FROM shipment_products
    WHERE shipment_id = p_shipment_id
    AND formula_name IS NOT NULL
    GROUP BY formula_name;
    
    -- Calculate vessel allocation (275 gallons per tote)
    UPDATE shipment_formulas
    SET 
        vessel_type = CASE
            WHEN total_gallons_needed <= 55 THEN 'Barrel'
            ELSE 'Tote'
        END,
        vessel_quantity = CASE
            WHEN total_gallons_needed <= 55 THEN CEIL(total_gallons_needed / 55.0)
            ELSE CEIL(total_gallons_needed / 275.0)
        END,
        vessel_size_gallons = CASE
            WHEN total_gallons_needed <= 55 THEN 55
            ELSE 275
        END
    WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql;

-- View for complete shipment details
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
    
    -- Progress tracking
    s.add_products_completed,
    s.formula_check_completed,
    s.label_check_completed,
    s.sort_products_completed,
    s.sort_formulas_completed,
    
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

-- Comments
COMMENT ON TABLE shipments IS 'Production shipments tracking through manufacturing workflow';
COMMENT ON TABLE shipment_products IS 'Products included in each shipment with quantities and allocations';
COMMENT ON TABLE shipment_formulas IS 'Aggregated formula requirements per shipment for formula check stage';

COMMENT ON COLUMN shipments.status IS 'Shipment workflow status: planning, add_products, formula_check, label_check, sort_products, sort_formulas, manufacturing, packaging, ready_for_pickup, shipped, received';
COMMENT ON COLUMN shipment_products.formula_gallons_needed IS 'Gallons of formula needed = quantity × (bottle_size_oz / 128)';
COMMENT ON COLUMN shipment_formulas.vessel_type IS 'Manufacturing vessel: Tote (275 gal), Barrel (55 gal), or Tank';

-- ============================================================================
-- Migration complete
-- ============================================================================

