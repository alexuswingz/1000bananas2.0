-- ============================================================================
-- Migration 005: Add Catalog Relationships for Production Planning
-- Adds foreign key constraints to connect catalog with bottle, formula, closure
-- NOTE: Uses ON DELETE SET NULL to preserve catalog data if referenced item is deleted
-- ============================================================================

-- First, check and clean up any invalid references (set to NULL if not found)
-- This ensures foreign keys won't fail

-- Clean packaging_name references
UPDATE catalog 
SET packaging_name = NULL 
WHERE packaging_name IS NOT NULL 
AND packaging_name NOT IN (SELECT bottle_name FROM bottle);

-- Clean closure_name references  
UPDATE catalog 
SET closure_name = NULL 
WHERE closure_name IS NOT NULL 
AND closure_name NOT IN (SELECT closure_name FROM closure);

-- Clean formula_name references
UPDATE catalog 
SET formula_name = NULL 
WHERE formula_name IS NOT NULL 
AND formula_name NOT IN (SELECT formula FROM formula);

-- Clean brand_name references
UPDATE catalog 
SET brand_name = NULL 
WHERE brand_name IS NOT NULL 
AND brand_name NOT IN (SELECT brand_name FROM brand);

-- Now add foreign key constraints
-- Using ON DELETE SET NULL to preserve catalog entries even if referenced item is deleted

ALTER TABLE catalog 
ADD CONSTRAINT fk_catalog_bottle 
FOREIGN KEY (packaging_name) 
REFERENCES bottle(bottle_name) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

ALTER TABLE catalog 
ADD CONSTRAINT fk_catalog_formula 
FOREIGN KEY (formula_name) 
REFERENCES formula(formula) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add unique constraint to closure table first (if not exists)
-- Note: closure table has UNIQUE(closure_name, category) but we need closure_name alone
ALTER TABLE closure DROP CONSTRAINT IF EXISTS closure_closure_name_category_key;
ALTER TABLE closure ADD CONSTRAINT closure_closure_name_unique UNIQUE (closure_name);

ALTER TABLE catalog 
ADD CONSTRAINT fk_catalog_closure 
FOREIGN KEY (closure_name) 
REFERENCES closure(closure_name) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

ALTER TABLE catalog 
ADD CONSTRAINT fk_catalog_brand 
FOREIGN KEY (brand_name) 
REFERENCES brand(brand_name) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add indexes for foreign key lookups (improves join performance)
CREATE INDEX IF NOT EXISTS idx_catalog_packaging_name ON catalog(packaging_name);
CREATE INDEX IF NOT EXISTS idx_catalog_formula_name ON catalog(formula_name);
CREATE INDEX IF NOT EXISTS idx_catalog_closure_name ON catalog(closure_name);
CREATE INDEX IF NOT EXISTS idx_catalog_brand_name ON catalog(brand_name);
CREATE INDEX IF NOT EXISTS idx_catalog_child_asin ON catalog(child_asin);

-- Add comments explaining relationships
COMMENT ON CONSTRAINT fk_catalog_bottle ON catalog IS 
'Links catalog product to bottle specs for production planning (BPM, capacity)';

COMMENT ON CONSTRAINT fk_catalog_formula ON catalog IS 
'Links catalog product to formula for inventory management and manufacturing';

COMMENT ON CONSTRAINT fk_catalog_closure ON catalog IS 
'Links catalog product to closure specs for supply chain ordering';

COMMENT ON CONSTRAINT fk_catalog_brand ON catalog IS 
'Links catalog product to brand information';

-- Create a view for production planning that joins all related tables
CREATE OR REPLACE VIEW v_production_planning AS
SELECT 
    c.id as catalog_id,
    c.product_name,
    c.size,
    c.child_asin,
    c.child_sku_final,
    c.units_per_case,
    
    -- Formula info
    c.formula_name,
    f.guaranteed_analysis,
    f.npk,
    fi.gallons_available as formula_gallons_available,
    fi.gallons_allocated as formula_gallons_allocated,
    fi.last_manufactured as formula_last_manufactured,
    
    -- Bottle info
    c.packaging_name as bottle_name,
    b.bottles_per_minute as bpm,
    b.max_warehouse_inventory as bottle_max_inventory,
    b.warehouse_inventory as bottle_current_inventory,
    b.size_oz as bottle_size_oz,
    
    -- Closure info
    c.closure_name,
    cl.closure_supplier,
    cl.moq as closure_moq,
    
    -- Label info
    c.label_size,
    
    -- Finished goods (for packaging BPM)
    fg.finished_good_name,
    fg.max_packaging_per_minute as packaging_bpm,
    fg.boxes_per_pallet,
    fg.box_weight_lbs,
    
    -- Brand
    c.brand_name,
    br.brand_address,
    
    -- Sales data
    c.units_sold_30_days,
    c.price
    
FROM catalog c
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN closure cl ON c.closure_name = cl.closure_name
LEFT JOIN brand br ON c.brand_name = br.brand_name
LEFT JOIN finished_goods fg ON c.size = fg.finished_good_name
WHERE c.child_asin IS NOT NULL;

COMMENT ON VIEW v_production_planning IS 
'Complete view of all products with related data for production planning';

-- Create indexes on related tables for better join performance
CREATE INDEX IF NOT EXISTS idx_formula_inventory_formula_name ON formula_inventory(formula_name);
CREATE INDEX IF NOT EXISTS idx_bottle_bottle_name ON bottle(bottle_name);
CREATE INDEX IF NOT EXISTS idx_closure_closure_name ON closure(closure_name);

-- ============================================================================
-- Migration complete
-- ============================================================================

