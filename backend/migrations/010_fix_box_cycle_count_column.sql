-- Migration: Fix box_cycle_count_lines table column name
-- Change box_name to box_type to match the box_inventory table

-- Check if box_name column exists and rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'box_cycle_count_lines' 
        AND column_name = 'box_name'
    ) THEN
        ALTER TABLE box_cycle_count_lines 
        RENAME COLUMN box_name TO box_type;
        
        RAISE NOTICE 'Column box_name renamed to box_type in box_cycle_count_lines table';
    ELSE
        RAISE NOTICE 'Column box_name does not exist, skipping rename';
    END IF;
END $$;

-- Verify the change
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'box_cycle_count_lines'
AND column_name IN ('box_name', 'box_type');











