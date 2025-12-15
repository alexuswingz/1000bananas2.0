-- Migration 016: Add label check status tracking to shipment_products
-- Allows tracking which products have been confirmed/counted during label check

-- Add label_check_status column to shipment_products
ALTER TABLE shipment_products 
ADD COLUMN IF NOT EXISTS label_check_status VARCHAR(50) DEFAULT NULL;
-- Values: NULL (not started), 'confirmed' (quick confirm), 'counted' (full count with verify)

-- Add label_check_count column to store the counted inventory (when counted)
ALTER TABLE shipment_products 
ADD COLUMN IF NOT EXISTS label_check_count INTEGER DEFAULT NULL;

-- Add label_check_at timestamp
ALTER TABLE shipment_products 
ADD COLUMN IF NOT EXISTS label_check_at TIMESTAMP DEFAULT NULL;

-- Create index for filtering by label check status
CREATE INDEX IF NOT EXISTS idx_shipment_products_label_check 
ON shipment_products(shipment_id, label_check_status);

-- Comments
COMMENT ON COLUMN shipment_products.label_check_status IS 'Label check status: NULL (not started), confirmed (quick confirm), counted (full count verified)';
COMMENT ON COLUMN shipment_products.label_check_count IS 'Counted label inventory value when user does full count';
COMMENT ON COLUMN shipment_products.label_check_at IS 'Timestamp when label check was completed';



