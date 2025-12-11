-- Migration 015: Create Label Formulas table for weight-to-labels conversion
-- Formula from 1000 Bananas Database > LabelFormulas sheet:
-- labels = (gram_weight - core_weight) / grams_per_label

-- Table for label weight conversion formulas
CREATE TABLE IF NOT EXISTS label_formulas (
    id SERIAL PRIMARY KEY,
    label_size VARCHAR(100) NOT NULL,  -- e.g., '5" x 8"', '4.5" x 3.375"', etc.
    core_weight_grams DECIMAL(10,2) NOT NULL,  -- Weight of the empty roll core in grams
    grams_per_label DECIMAL(10,4) NOT NULL,  -- Weight per single label in grams
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(label_size)
);

-- Create index for quick lookup by label size
CREATE INDEX IF NOT EXISTS idx_label_formulas_size ON label_formulas(label_size);

-- Insert label formulas from 1000 Bananas Database > LabelFormulas sheet
-- Formula: labels = (gram_weight - core_weight) / grams_per_label
INSERT INTO label_formulas (label_size, core_weight_grams, grams_per_label, notes)
VALUES 
    -- From Excel: (gram weight - 71) / 3.35
    ('5" x 8"', 71, 3.35, 'Standard gallon bottle label'),
    -- From Excel: (gram weight - 36) / 1.2  
    ('4.5" x 3.375"', 36, 1.2, 'Small bottle label'),
    -- From Excel: (gram weight - 68) / 2
    ('5.375" x 4.5"', 68, 2, 'Standard quart bottle label'),
    ('5.375 x 4.5', 68, 2, 'Standard quart bottle label (alternate format)'),
    -- From Excel: (gram weight - 74) / 3.8
    ('7.5" x 6"', 74, 3.8, 'Large bottle/kit label')
ON CONFLICT (label_size) DO UPDATE SET
    core_weight_grams = EXCLUDED.core_weight_grams,
    grams_per_label = EXCLUDED.grams_per_label,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

-- Add comments
COMMENT ON TABLE label_formulas IS 'Stores label weight-to-count conversion formulas for inventory counting';
COMMENT ON COLUMN label_formulas.core_weight_grams IS 'Weight of the empty cardboard/plastic roll core';
COMMENT ON COLUMN label_formulas.grams_per_label IS 'Weight in grams for each individual label';
