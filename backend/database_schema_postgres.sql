-- ============================================================================
-- 1000 Bananas Database Schema for PostgreSQL
-- AWS RDS PostgreSQL Database for Amazon Product Management
-- ============================================================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS catalog CASCADE;
DROP TABLE IF EXISTS formula CASCADE;
DROP TABLE IF EXISTS bottle CASCADE;
DROP TABLE IF EXISTS bag CASCADE;
DROP TABLE IF EXISTS kit CASCADE;
DROP TABLE IF EXISTS closure CASCADE;
DROP TABLE IF EXISTS finished_goods CASCADE;
DROP TABLE IF EXISTS brand CASCADE;

-- ============================================================================
-- REFERENCE TABLES (No dependencies)
-- ============================================================================

-- Brand Database (Reference Table)
CREATE TABLE brand (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    brand_address TEXT,
    brand_website VARCHAR(255),
    brand_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kit Database (Reference Table)
CREATE TABLE kit (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    packaging_name VARCHAR(255) NOT NULL UNIQUE,
    box_size VARCHAR(100),
    units_per_case DECIMAL(10,2),
    box_weight_lbs DECIMAL(10,2),
    boxes_per_pallet DECIMAL(10,2),
    length_in DECIMAL(10,2),
    width_in DECIMAL(10,2),
    height_in DECIMAL(10,2),
    weight_lbs DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bag Database (Reference Table)
CREATE TABLE bag (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    packaging_name VARCHAR(255) NOT NULL UNIQUE,
    box_size VARCHAR(100),
    units_per_case DECIMAL(10,2),
    box_weight_lbs DECIMAL(10,2),
    boxes_per_pallet DECIMAL(10,2),
    length_in DECIMAL(10,2),
    width_in DECIMAL(10,2),
    height_in DECIMAL(10,2),
    weight_lbs DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closure Database (Reference Table)
CREATE TABLE closure (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    closure_name VARCHAR(255) NOT NULL,
    closure_supplier VARCHAR(255),
    closure_part_number VARCHAR(255),
    closure_description TEXT,
    lead_time_weeks DECIMAL(10,2),
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
    id SERIAL PRIMARY KEY,
    finished_good_name VARCHAR(255) NOT NULL UNIQUE,
    box_size VARCHAR(100),
    units_per_case DECIMAL(10,2),
    units_per_gallon DECIMAL(10,2),
    box_weight_lbs DECIMAL(10,2),
    boxes_per_pallet DECIMAL(10,2),
    single_box_pallet_share DECIMAL(10,4),
    replenishment_strategy VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bottle Database (Reference Table with Sections)
CREATE TABLE bottle (
    id SERIAL PRIMARY KEY,
    
    -- Core Data
    bottle_name VARCHAR(255) NOT NULL UNIQUE,
    bottle_image TEXT,
    size_oz DECIMAL(10,2),
    shape VARCHAR(100),
    color VARCHAR(100),
    thread_type VARCHAR(100),
    cap_size VARCHAR(100),
    material VARCHAR(100),
    supplier VARCHAR(255),
    packaging_part_number VARCHAR(255),
    description TEXT,
    brand VARCHAR(255),
    
    -- Supplier Info
    lead_time_weeks DECIMAL(10,2),
    moq INTEGER,
    units_per_pallet INTEGER,
    units_per_case INTEGER,
    cases_per_pallet INTEGER,
    
    -- Finished Goods
    box_size VARCHAR(100),
    finished_units_per_case DECIMAL(10,2),
    units_per_gallon DECIMAL(10,2),
    box_weight_lbs DECIMAL(10,2),
    boxes_per_pallet DECIMAL(10,2),
    single_box_pallet_share DECIMAL(10,4),
    replenishment_strategy VARCHAR(100),
    
    -- Dimensions
    length_in DECIMAL(10,2),
    width_in DECIMAL(10,2),
    height_in DECIMAL(10,2),
    weight_lbs DECIMAL(10,2),
    label_size VARCHAR(100),
    
    -- Inventory
    supplier_order_strategy VARCHAR(100),
    supplier_inventory INTEGER,
    warehouse_inventory INTEGER,
    max_warehouse_inventory INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Formula Database (Reference Table)
CREATE TABLE formula (
    id SERIAL PRIMARY KEY,
    formula VARCHAR(255) NOT NULL UNIQUE,
    guaranteed_analysis TEXT,
    npk VARCHAR(100),
    derived_from TEXT,
    storage_warranty_precautionary_metals TEXT,
    filler VARCHAR(255),
    tps_guaranteed_analysis TEXT,
    tps_npk VARCHAR(100),
    tps_derived_from TEXT,
    tps_storage_warranty_precautionary_metals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CATALOG DATABASE (Main Product Table with Foreign Keys)
-- ============================================================================

CREATE TABLE catalog (
    id SERIAL PRIMARY KEY,
    
    -- Product Images Section
    product_image_url TEXT,
    basic_wrap_url TEXT,
    plant_behind_product_url TEXT,
    tri_bottle_wrap_url TEXT,
    
    -- Core Product Info Section
    date_added DATE,
    marketplace VARCHAR(100),
    seller_account VARCHAR(255),
    country VARCHAR(10),
    brand_name VARCHAR(255),
    product_name VARCHAR(500) NOT NULL,
    size VARCHAR(100),
    type VARCHAR(100),
    
    -- Packaging Section
    packaging_name VARCHAR(255),
    closure_name VARCHAR(255),
    label_size VARCHAR(100),
    label_location VARCHAR(255),
    case_size VARCHAR(100),
    units_per_case DECIMAL(10,2),
    filter VARCHAR(255),
    upc VARCHAR(100),
    upc_image_file TEXT,
    parent_asin VARCHAR(50),
    child_asin VARCHAR(50),
    parent_sku_final VARCHAR(255),
    child_sku_final VARCHAR(255),
    
    -- Formula Section (Foreign Key Reference)
    formula_name VARCHAR(255),
    
    -- Formula Detail Fields (Denormalized for catalog-specific data)
    msds TEXT,
    guaranteed_analysis TEXT,
    npk VARCHAR(100),
    derived_from TEXT,
    storage_warranty_precautionary_metals TEXT,
    units_sold_30_days INTEGER,
    vine_notes TEXT,
    brand_tailor_discount VARCHAR(100),
    
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
    tps_npk VARCHAR(100),
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
    product_dimensions_length_in DECIMAL(10,2),
    product_dimensions_width_in DECIMAL(10,2),
    product_dimensions_height_in DECIMAL(10,2),
    product_dimensions_weight_lbs DECIMAL(10,2),
    six_sided_image_front TEXT,
    six_sided_image_left TEXT,
    six_sided_image_back TEXT,
    six_sided_image_right TEXT,
    six_sided_image_top TEXT,
    six_sided_image_bottom TEXT,
    
    -- Price Section
    price DECIMAL(10,2),
    
    -- Listing Copy Section
    title TEXT,
    bullets TEXT,
    description TEXT,
    
    -- Vine Section
    vine_status VARCHAR(100),
    vine_launch_date DATE,
    units_enrolled INTEGER,
    vine_reviews INTEGER,
    star_rating DECIMAL(3,2),
    vine_program_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

