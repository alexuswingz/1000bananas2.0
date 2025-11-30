-- ============================================================================
-- Migration 012: Create Floor Inventory Tables
-- Tracks sellables, shiners, and unused formulas
-- ============================================================================

-- Table for tracking damaged/cosmetic issue products (Shiners)
CREATE TABLE IF NOT EXISTS shiners (
    id SERIAL PRIMARY KEY,
    catalog_id INTEGER REFERENCES catalog(id) ON DELETE CASCADE,
    product_name VARCHAR(500) NOT NULL,
    brand_name VARCHAR(255),
    size VARCHAR(100),
    formula_name VARCHAR(255) REFERENCES formula(formula) ON DELETE SET NULL,
    bottle_name VARCHAR(255) REFERENCES bottle(bottle_name) ON DELETE SET NULL,
    closure_name VARCHAR(255) REFERENCES closure(closure_name) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    issue_type VARCHAR(100), -- 'label_misaligned', 'dented', 'scratched', 'faded_label', 'damaged_bottle'
    severity VARCHAR(50) DEFAULT 'minor', -- 'minor', 'moderate', 'major'
    location VARCHAR(255), -- Where stored in warehouse
    notes TEXT,
    can_rework BOOLEAN DEFAULT FALSE, -- Can labels be replaced or bottle refilled?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for shiners updated_at
CREATE OR REPLACE FUNCTION update_shiners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shiners_updated_at_trigger ON shiners;
CREATE TRIGGER shiners_updated_at_trigger
    BEFORE UPDATE ON shiners
    FOR EACH ROW
    EXECUTE FUNCTION update_shiners_updated_at();

-- View: Sellables (Products ready to ship with all components available)
CREATE OR REPLACE VIEW v_sellables AS
SELECT 
    c.id as catalog_id,
    c.child_asin,
    c.child_sku_final,
    c.product_name,
    c.brand_name,
    c.size,
    c.formula_name,
    c.packaging_name as bottle_name,
    c.closure_name,
    c.label_location,
    c.label_size,
    
    -- Inventory levels
    COALESCE(bi.warehouse_quantity, 0) as bottle_inventory,
    COALESCE(ci.warehouse_quantity, 0) as closure_inventory,
    COALESCE(li.warehouse_inventory, 0) as label_inventory,
    COALESCE(fi.gallons_available, 0) as formula_gallons_available,
    
    -- Calculate gallons per unit based on size
    CASE 
        WHEN c.size = '8oz' THEN 0.0625
        WHEN c.size = '16oz' THEN 0.125
        WHEN c.size IN ('Quart', '32oz') THEN 0.25
        WHEN c.size = 'Gallon' THEN 1.0
        WHEN c.size = '5 Gallon' THEN 5.0
        ELSE 0.25
    END as gallons_per_unit,
    
    -- Calculate max sellable units (bottleneck)
    LEAST(
        COALESCE(bi.warehouse_quantity, 0),
        COALESCE(ci.warehouse_quantity, 0),
        COALESCE(li.warehouse_inventory, 0),
        CASE 
            WHEN c.size = '8oz' AND 0.0625 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.0625)
            WHEN c.size = '16oz' AND 0.125 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.125)
            WHEN c.size IN ('Quart', '32oz') AND 0.25 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
            WHEN c.size = 'Gallon' AND 1.0 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 1.0)
            WHEN c.size = '5 Gallon' AND 5.0 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 5.0)
            ELSE FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
        END
    ) as max_sellable_units,
    
    -- Identify which component is the bottleneck
    CASE
        WHEN COALESCE(bi.warehouse_quantity, 0) = 0 THEN 'Bottles'
        WHEN COALESCE(ci.warehouse_quantity, 0) = 0 THEN 'Closures'
        WHEN COALESCE(li.warehouse_inventory, 0) = 0 THEN 'Labels'
        WHEN COALESCE(fi.gallons_available, 0) = 0 THEN 'Formula'
        ELSE 'None'
    END as bottleneck_component

FROM catalog c
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
LEFT JOIN label_inventory li ON c.label_location = li.label_location
WHERE c.child_asin IS NOT NULL
  AND COALESCE(bi.warehouse_quantity, 0) > 0
  AND COALESCE(ci.warehouse_quantity, 0) > 0
  AND COALESCE(li.warehouse_inventory, 0) > 0
  AND COALESCE(fi.gallons_available, 0) > 0;

COMMENT ON VIEW v_sellables IS 
'Products with all components in stock and ready to manufacture/ship';

-- View: Unused Formulas (Formulas with excess inventory)
CREATE OR REPLACE VIEW v_unused_formulas AS
SELECT 
    fi.formula_name,
    fi.gallons_available as total_gallons,
    fi.gallons_in_production,
    
    -- Calculate allocated formulas from active shipments
    COALESCE(SUM(sp.formula_gallons_needed), 0) as allocated_gallons,
    
    -- Calculate unused/excess
    fi.gallons_available - COALESCE(SUM(sp.formula_gallons_needed), 0) as unused_gallons,
    
    -- Get products that use this formula
    STRING_AGG(DISTINCT c.product_name, ', ') as product_names,
    COUNT(DISTINCT c.id) as product_count,
    
    fi.last_manufactured

FROM formula_inventory fi
LEFT JOIN shipment_products sp ON fi.formula_name = sp.formula_name
    AND sp.shipment_id IN (
        SELECT id FROM shipments 
        WHERE status IN ('planning', 'manufacturing', 'packaging')
    )
LEFT JOIN catalog c ON fi.formula_name = c.formula_name
WHERE fi.gallons_available > 0
GROUP BY fi.formula_name, fi.gallons_available, fi.gallons_in_production, fi.last_manufactured
HAVING fi.gallons_available > COALESCE(SUM(sp.formula_gallons_needed), 0);

COMMENT ON VIEW v_unused_formulas IS 
'Formulas with excess inventory not allocated to active shipments';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shiners_catalog_id ON shiners(catalog_id);
CREATE INDEX IF NOT EXISTS idx_shiners_formula_name ON shiners(formula_name);
CREATE INDEX IF NOT EXISTS idx_shiners_issue_type ON shiners(issue_type);

-- ============================================================================
-- Migration complete
-- ============================================================================

