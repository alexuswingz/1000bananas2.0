-- Fix: Set consistent max_warehouse_inventory for bottles of the same size
-- Run this in your PostgreSQL database

-- 16oz bottles should all have max 3300
UPDATE bottle 
SET max_warehouse_inventory = 3300
WHERE bottle_name LIKE '%16oz%';

-- 8oz bottles should all have max 58240
UPDATE bottle 
SET max_warehouse_inventory = 58240
WHERE bottle_name LIKE '%8oz%';

-- 3oz bottles should all have max 8370
UPDATE bottle 
SET max_warehouse_inventory = 8370
WHERE bottle_name LIKE '%3oz%';

-- 6oz bottles should all have max 6768
UPDATE bottle 
SET max_warehouse_inventory = 6768
WHERE bottle_name LIKE '%6oz%';

-- Quart bottles should all have max 8640
UPDATE bottle 
SET max_warehouse_inventory = 8640
WHERE bottle_name LIKE '%Quart%';

-- Gallon bottles should all have max 2304
UPDATE bottle 
SET max_warehouse_inventory = 2304
WHERE bottle_name LIKE '%Gallon%';

-- Verify the changes
SELECT bottle_name, max_warehouse_inventory, warehouse_quantity
FROM bottle
ORDER BY bottle_name;

