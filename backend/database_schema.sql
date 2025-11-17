-- ============================================================================
-- 1000 Bananas Database Schema with Foreign Keys
-- SQLite Database for Amazon Product Management
-- ============================================================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS catalog;
DROP TABLE IF EXISTS formula;
DROP TABLE IF EXISTS bottle;
DROP TABLE IF EXISTS bag;
DROP TABLE IF EXISTS kit;
DROP TABLE IF EXISTS closure;
DROP TABLE IF EXISTS finished_goods;
DROP TABLE IF EXISTS brand;

-- ============================================================================
-- REFERENCE TABLES (No dependencies)
-- ============================================================================

-- Brand Database (Reference Table)
CREATE TABLE brand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL UNIQUE,
    brand_address TEXT,
    brand_website TEXT,
    brand_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kit Database (Reference Table)
CREATE TABLE kit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    packaging_name TEXT NOT NULL UNIQUE,
    box_size TEXT,
    units_per_case REAL,
    box_weight_lbs REAL,
    boxes_per_pallet REAL,
    length_in REAL,
    width_in REAL,
    height_in REAL,
    weight_lbs REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bag Database (Reference Table)
CREATE TABLE bag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    packaging_name TEXT NOT NULL UNIQUE,
    box_size TEXT,
    units_per_case REAL,
    box_weight_lbs REAL,
    boxes_per_pallet REAL,
    length_in REAL,
    width_in REAL,
    height_in REAL,
    weight_lbs REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closure Database (Reference Table)
CREATE TABLE closure (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    closure_name TEXT NOT NULL,
    closure_supplier TEXT,
    closure_part_number TEXT,
    closure_description TEXT,
    lead_time_weeks REAL,
    moq INTEGER,
    units_per_pallet INTEGER,
    units_per_case INTEGER,
    cases_per_pallet INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(closure_name, category)
);

-- Finished Goods Database (Reference Table)
CREATE TABLE finished_goods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finished_good_name TEXT NOT NULL UNIQUE,
    box_size TEXT,
    units_per_case REAL,
    units_per_gallon REAL,
    box_weight_lbs REAL,
    boxes_per_pallet REAL,
    single_box_pallet_share REAL,
    replenishment_strategy TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bottle Database (Reference Table with Sections)
CREATE TABLE bottle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Core Data
    bottle_name TEXT NOT NULL UNIQUE,
    bottle_image TEXT,
    size_oz REAL,
    shape TEXT,
    color TEXT,
    thread_type TEXT,
    cap_size TEXT,
    material TEXT,
    supplier TEXT,
    packaging_part_number TEXT,
    description TEXT,
    brand TEXT,
    
    -- Supplier Info
    lead_time_weeks REAL,
    moq INTEGER,
    units_per_pallet INTEGER,
    units_per_case INTEGER,
    cases_per_pallet INTEGER,
    
    -- Finished Goods
    box_size TEXT,
    finished_units_per_case REAL,
    units_per_gallon REAL,
    box_weight_lbs REAL,
    boxes_per_pallet REAL,
    single_box_pallet_share REAL,
    replenishment_strategy TEXT,
    
    -- Dimensions
    length_in REAL,
    width_in REAL,
    height_in REAL,
    weight_lbs REAL,
    label_size TEXT,
    
    -- Inventory
    supplier_order_strategy TEXT,
    supplier_inventory INTEGER,
    warehouse_inventory INTEGER,
    max_warehouse_inventory INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Formula Database (Reference Table)
CREATE TABLE formula (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formula TEXT NOT NULL UNIQUE,
    guaranteed_analysis TEXT,
    npk TEXT,
    derived_from TEXT,
    storage_warranty_precautionary_metals TEXT,
    filler TEXT,
    tps_guaranteed_analysis TEXT,
    tps_npk TEXT,
    tps_derived_from TEXT,
    tps_storage_warranty_precautionary_metals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CATALOG DATABASE (Main Product Table with Foreign Keys)
-- ============================================================================

CREATE TABLE catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Product Images Section
    product_image_url TEXT,
    basic_wrap_url TEXT,
    plant_behind_product_url TEXT,
    tri_bottle_wrap_url TEXT,
    
    -- Core Product Info Section
    date_added DATE,
    marketplace TEXT,
    seller_account TEXT,
    country TEXT,
    brand_name TEXT,
    product_name TEXT NOT NULL,
    size TEXT,
    type TEXT,
    
    -- Packaging Section
    packaging_name TEXT,
    closure_name TEXT,
    label_size TEXT,
    label_location TEXT,
    case_size TEXT,
    units_per_case REAL,
    filter TEXT,
    upc TEXT,
    upc_image_file TEXT,
    parent_asin TEXT,
    child_asin TEXT,
    parent_sku_final TEXT,
    child_sku_final TEXT,
    
    -- Formula Section (Foreign Key Reference)
    formula_name TEXT,  -- References formula.formula
    
    -- Formula Detail Fields (Denormalized for catalog-specific data)
    msds TEXT,
    guaranteed_analysis TEXT,
    npk TEXT,
    derived_from TEXT,
    storage_warranty_precautionary_metals TEXT,
    units_sold_30_days INTEGER,
    vine_notes TEXT,
    brand_tailor_discount TEXT,
    
    -- Marketing Section
    core_competitor_asins TEXT,
    other_competitor_asins TEXT,
    core_keywords TEXT,
    other_keywords TEXT,
    
    -- Notes Section
    notes TEXT,
    
    -- Label Section
    stock_image TEXT,
    label_ai_file TEXT,
    label_print_ready_pdf TEXT,
    
    -- TPS Label Copy Section
    tps_left_side_benefit_graphic TEXT,
    tps_directions TEXT,
    tps_growing_recommendations TEXT,
    qr_code_section TEXT,
    website TEXT,
    product_title TEXT,
    center_benefit_statement TEXT,
    size_copy_for_label TEXT,
    right_side_benefit_graphic TEXT,
    ingredient_statement TEXT,
    tps_guaranteed_analysis TEXT,
    tps_npk TEXT,
    tps_derived_from TEXT,
    tps_storage_warranty_precautionary_metals TEXT,
    tps_address TEXT,
    
    -- Slides Section
    amazon_slide_1 TEXT,
    amazon_slide_2 TEXT,
    amazon_slide_3 TEXT,
    amazon_slide_4 TEXT,
    amazon_slide_5 TEXT,
    amazon_slide_6 TEXT,
    amazon_slide_7 TEXT,
    
    -- A+ Section
    amazon_a_plus_slide_1 TEXT,
    amazon_a_plus_slide_2 TEXT,
    amazon_a_plus_slide_3 TEXT,
    amazon_a_plus_slide_4 TEXT,
    amazon_a_plus_slide_5 TEXT,
    amazon_a_plus_slide_6 TEXT,
    
    -- Website Section
    tbd TEXT,
    
    -- Listing Setup Section
    product_dimensions_length_in REAL,
    product_dimensions_width_in REAL,
    product_dimensions_height_in REAL,
    product_dimensions_weight_lbs REAL,
    six_sided_image_front TEXT,
    six_sided_image_left TEXT,
    six_sided_image_back TEXT,
    six_sided_image_right TEXT,
    six_sided_image_top TEXT,
    six_sided_image_bottom TEXT,
    
    -- Price Section
    price REAL,
    
    -- Listing Copy Section
    title TEXT,
    bullets TEXT,
    description TEXT,
    
    -- Vine Section
    vine_status TEXT,
    vine_launch_date DATE,
    units_enrolled INTEGER,
    vine_reviews INTEGER,
    star_rating REAL,
    vine_program_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
    -- Note: Foreign key constraints removed to allow flexibility in data import
    -- Relationships can be enforced at the application level
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Brand indexes
CREATE INDEX idx_brand_name ON brand(brand_name);

-- Bottle indexes
CREATE INDEX idx_bottle_name ON bottle(bottle_name);
CREATE INDEX idx_bottle_size ON bottle(size_oz);
CREATE INDEX idx_bottle_shape ON bottle(shape);

-- Formula indexes
CREATE INDEX idx_formula_name ON formula(formula);

-- Closure indexes
CREATE INDEX idx_closure_name ON closure(closure_name);
CREATE INDEX idx_closure_category ON closure(category);

-- Kit indexes
CREATE INDEX idx_kit_packaging_name ON kit(packaging_name);

-- Bag indexes
CREATE INDEX idx_bag_packaging_name ON bag(packaging_name);

-- Finished Goods indexes
CREATE INDEX idx_finished_goods_name ON finished_goods(finished_good_name);

-- Catalog indexes (for faster lookups)
CREATE INDEX idx_catalog_product_name ON catalog(product_name);
CREATE INDEX idx_catalog_brand_name ON catalog(brand_name);
CREATE INDEX idx_catalog_formula_name ON catalog(formula_name);
CREATE INDEX idx_catalog_packaging_name ON catalog(packaging_name);
CREATE INDEX idx_catalog_closure_name ON catalog(closure_name);
CREATE INDEX idx_catalog_parent_asin ON catalog(parent_asin);
CREATE INDEX idx_catalog_child_asin ON catalog(child_asin);
CREATE INDEX idx_catalog_parent_sku ON catalog(parent_sku_final);
CREATE INDEX idx_catalog_child_sku ON catalog(child_sku_final);
CREATE INDEX idx_catalog_size ON catalog(size);
CREATE INDEX idx_catalog_marketplace ON catalog(marketplace);

-- ============================================================================
-- TRIGGERS for Updated Timestamp
-- ============================================================================

CREATE TRIGGER update_brand_timestamp 
    AFTER UPDATE ON brand 
    FOR EACH ROW 
    BEGIN 
        UPDATE brand SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_kit_timestamp 
    AFTER UPDATE ON kit 
    FOR EACH ROW 
    BEGIN 
        UPDATE kit SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_bag_timestamp 
    AFTER UPDATE ON bag 
    FOR EACH ROW 
    BEGIN 
        UPDATE bag SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_closure_timestamp 
    AFTER UPDATE ON closure 
    FOR EACH ROW 
    BEGIN 
        UPDATE closure SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_finished_goods_timestamp 
    AFTER UPDATE ON finished_goods 
    FOR EACH ROW 
    BEGIN 
        UPDATE finished_goods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_bottle_timestamp 
    AFTER UPDATE ON bottle 
    FOR EACH ROW 
    BEGIN 
        UPDATE bottle SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_formula_timestamp 
    AFTER UPDATE ON formula 
    FOR EACH ROW 
    BEGIN 
        UPDATE formula SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER update_catalog_timestamp 
    AFTER UPDATE ON catalog 
    FOR EACH ROW 
    BEGIN 
        UPDATE catalog SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

-- ============================================================================
-- VIEWS for Easy Querying
-- ============================================================================

-- Complete Product View (Catalog with all related data joined)
CREATE VIEW v_catalog_complete AS
SELECT 
    c.*,
    b.bottle_name as bottle_full_name,
    b.size_oz as bottle_size_oz,
    b.shape as bottle_shape,
    b.material as bottle_material,
    b.length_in as bottle_length_in,
    b.width_in as bottle_width_in,
    b.height_in as bottle_height_in,
    b.weight_lbs as bottle_weight_lbs,
    b.label_size as bottle_label_size,
    f.guaranteed_analysis as formula_guaranteed_analysis,
    f.npk as formula_npk,
    f.derived_from as formula_derived_from,
    f.storage_warranty_precautionary_metals as formula_storage_info,
    f.filler as formula_filler,
    br.brand_address,
    br.brand_website,
    br.brand_email,
    cl.closure_supplier,
    cl.closure_description
FROM catalog c
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN brand br ON c.brand_name = br.brand_name
LEFT JOIN closure cl ON c.closure_name = cl.closure_name;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

