-- ============================================================================
-- Migration 013: Create Sales Metrics Table
-- ============================================================================
-- Purpose: Store product sales metrics from Ngoos API separately from catalog
-- This keeps catalog clean and allows for historical sales tracking
-- ============================================================================

-- Create sales_metrics table
CREATE TABLE IF NOT EXISTS sales_metrics (
    id SERIAL PRIMARY KEY,
    
    -- Link to catalog
    catalog_id INTEGER REFERENCES catalog(id) ON DELETE CASCADE,
    child_asin VARCHAR(50),
    
    -- Sales Data (from Ngoos API)
    units_sold_30_days INTEGER,
    sales_30_days DECIMAL(10,2),
    sessions_30_days INTEGER,
    conversion_rate_30_days DECIMAL(5,2),
    
    -- Additional Metrics (optional, can expand later)
    units_sold_7_days INTEGER,
    units_sold_90_days INTEGER,
    average_selling_price DECIMAL(10,2),
    
    -- Sync metadata
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_from VARCHAR(50) DEFAULT 'ngoos-api',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per catalog item
    UNIQUE(catalog_id)
);

-- Create indexes for performance
CREATE INDEX idx_sales_metrics_catalog_id ON sales_metrics(catalog_id);
CREATE INDEX idx_sales_metrics_asin ON sales_metrics(child_asin);
CREATE INDEX idx_sales_metrics_last_synced ON sales_metrics(last_synced_at);

-- Create view for easy querying (catalog + sales metrics)
-- Note: If catalog has units_sold_30_days, this will use sales_metrics value instead
CREATE OR REPLACE VIEW v_catalog_with_sales AS
SELECT 
    c.id,
    c.product_image_url,
    c.basic_wrap_url,
    c.plant_behind_product_url,
    c.tri_bottle_wrap_url,
    c.date_added,
    c.marketplace,
    c.seller_account,
    c.country,
    c.brand_name,
    c.product_name,
    c.size,
    c.type,
    c.packaging_name,
    c.closure_name,
    c.label_size,
    c.label_location,
    c.case_size,
    c.units_per_case,
    c.filter,
    c.upc,
    c.upc_image_file,
    c.parent_asin,
    c.child_asin,
    c.parent_sku_final,
    c.child_sku_final,
    c.formula_name,
    c.msds,
    c.guaranteed_analysis,
    c.npk,
    c.derived_from,
    c.storage_warranty_precautionary_metals,
    -- Use sales_metrics units_sold instead of catalog
    sm.units_sold_30_days,
    sm.sales_30_days,
    sm.sessions_30_days,
    sm.conversion_rate_30_days,
    sm.units_sold_7_days,
    sm.units_sold_90_days,
    sm.average_selling_price,
    sm.last_synced_at as sales_last_synced,
    
    -- Calculate daily sales rate
    CASE 
        WHEN sm.units_sold_30_days > 0 THEN sm.units_sold_30_days / 30.0
        ELSE 0
    END as daily_sales_rate,
    
    -- Calculate monthly sales rate  
    CASE 
        WHEN sm.units_sold_30_days > 0 THEN sm.units_sold_30_days
        ELSE 0
    END as monthly_sales_rate,
    
    -- Rest of catalog columns
    c.vine_notes,
    c.brand_tailor_discount,
    c.core_competitor_asins,
    c.other_competitor_asins,
    c.core_keywords,
    c.other_keywords,
    c.notes,
    c.stock_image,
    c.label_ai_file,
    c.label_print_ready_pdf,
    c.created_at,
    c.updated_at
    
FROM catalog c
LEFT JOIN sales_metrics sm ON c.id = sm.catalog_id;

-- Add comment
COMMENT ON TABLE sales_metrics IS 'Stores product sales metrics synced from Ngoos API';
COMMENT ON COLUMN sales_metrics.catalog_id IS 'Foreign key to catalog table';
COMMENT ON COLUMN sales_metrics.units_sold_30_days IS 'Units sold in last 30 days from Ngoos';
COMMENT ON COLUMN sales_metrics.last_synced_at IS 'Last time metrics were synced from Ngoos API';

-- ============================================================================
-- Migration Complete
-- ============================================================================

