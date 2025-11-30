-- Migration: Add cycle count tables for bottles, closures, and boxes
-- Run this in PostgreSQL database

-- ============================================
-- BOTTLE CYCLE COUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS bottle_cycle_counts (
    id SERIAL PRIMARY KEY,
    count_date DATE NOT NULL,
    counted_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bottle_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    cycle_count_id INTEGER REFERENCES bottle_cycle_counts(id) ON DELETE CASCADE,
    bottle_name VARCHAR(255) NOT NULL,
    expected_quantity INTEGER DEFAULT 0,
    counted_quantity INTEGER DEFAULT 0,
    variance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLOSURE CYCLE COUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS closure_cycle_counts (
    id SERIAL PRIMARY KEY,
    count_date DATE NOT NULL,
    counted_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS closure_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    cycle_count_id INTEGER REFERENCES closure_cycle_counts(id) ON DELETE CASCADE,
    closure_name VARCHAR(255) NOT NULL,
    expected_quantity INTEGER DEFAULT 0,
    counted_quantity INTEGER DEFAULT 0,
    variance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOX CYCLE COUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS box_cycle_counts (
    id SERIAL PRIMARY KEY,
    count_date DATE NOT NULL,
    counted_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS box_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    cycle_count_id INTEGER REFERENCES box_cycle_counts(id) ON DELETE CASCADE,
    box_type VARCHAR(255) NOT NULL,
    expected_quantity INTEGER DEFAULT 0,
    counted_quantity INTEGER DEFAULT 0,
    variance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bottle_cycle_counts_date ON bottle_cycle_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_bottle_cycle_counts_status ON bottle_cycle_counts(status);
CREATE INDEX IF NOT EXISTS idx_bottle_cycle_count_lines_count_id ON bottle_cycle_count_lines(cycle_count_id);

CREATE INDEX IF NOT EXISTS idx_closure_cycle_counts_date ON closure_cycle_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_closure_cycle_counts_status ON closure_cycle_counts(status);
CREATE INDEX IF NOT EXISTS idx_closure_cycle_count_lines_count_id ON closure_cycle_count_lines(cycle_count_id);

CREATE INDEX IF NOT EXISTS idx_box_cycle_counts_date ON box_cycle_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_box_cycle_counts_status ON box_cycle_counts(status);
CREATE INDEX IF NOT EXISTS idx_box_cycle_count_lines_count_id ON box_cycle_count_lines(cycle_count_id);

-- Verify tables created
SELECT 'Bottle Cycle Count Tables' as category, 
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bottle_cycle_counts') as header_table,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bottle_cycle_count_lines') as lines_table
UNION ALL
SELECT 'Closure Cycle Count Tables',
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'closure_cycle_counts'),
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'closure_cycle_count_lines')
UNION ALL
SELECT 'Box Cycle Count Tables',
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'box_cycle_counts'),
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'box_cycle_count_lines');

