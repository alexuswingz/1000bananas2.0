"""
Migrate SQLite database to PostgreSQL RDS
Reads from local database.db and writes to AWS RDS PostgreSQL
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import os
from datetime import datetime

# PostgreSQL RDS Configuration
PG_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

SQLITE_DB = 'database.db'

def connect_postgres():
    """Connect to PostgreSQL RDS"""
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        print(f"[OK] Connected to PostgreSQL RDS: {PG_CONFIG['host']}")
        return conn
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        raise

def connect_sqlite():
    """Connect to SQLite database"""
    if not os.path.exists(SQLITE_DB):
        raise FileNotFoundError(f"SQLite database not found: {SQLITE_DB}")
    
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    print(f"[OK] Connected to SQLite: {SQLITE_DB}")
    return conn

def create_schema(pg_conn):
    """Create PostgreSQL schema from SQL file"""
    print("[INFO] Creating PostgreSQL schema...")
    
    with open('database_schema_postgres.sql', 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    cursor = pg_conn.cursor()
    cursor.execute(schema_sql)
    pg_conn.commit()
    cursor.close()
    
    print("[OK] Schema created successfully\n")

def migrate_table(sqlite_conn, pg_conn, table_name, columns):
    """Generic function to migrate a table from SQLite to PostgreSQL"""
    print(f"[INFO] Migrating {table_name}...")
    
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Fetch all data from SQLite
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"[WARNING] No data found in {table_name}")
        return 0
    
    # Prepare INSERT statement (skip 'id' as it's auto-generated)
    cols_without_id = [col for col in columns if col != 'id']
    placeholders = ', '.join(['%s'] * len(cols_without_id))
    insert_sql = f"INSERT INTO {table_name} ({', '.join(cols_without_id)}) VALUES ({placeholders})"
    
    # Prepare data for batch insert with type conversion
    data_to_insert = []
    for row in rows:
        row_dict = dict(row)
        values = []
        for col in cols_without_id:
            val = row_dict[col]
            # Convert empty strings to None for proper NULL handling
            if val == '' or val == '??':
                val = None
            # Remove commas from numbers (e.g., "25,000" -> "25000")
            elif isinstance(val, str) and ',' in val:
                try:
                    # Try to convert to number after removing commas
                    val = val.replace(',', '')
                    if '.' in val:
                        val = float(val)
                    else:
                        val = int(val)
                except (ValueError, AttributeError):
                    # If conversion fails, keep as string
                    pass
            values.append(val)
        data_to_insert.append(tuple(values))
    
    # Batch insert
    execute_batch(pg_cursor, insert_sql, data_to_insert, page_size=100)
    pg_conn.commit()
    
    pg_cursor.close()
    sqlite_cursor.close()
    
    print(f"[OK] Migrated {len(data_to_insert)} records from {table_name}\n")
    return len(data_to_insert)

def migrate_all_data(sqlite_conn, pg_conn):
    """Migrate all tables from SQLite to PostgreSQL"""
    print("="*80)
    print("MIGRATING DATA FROM SQLITE TO POSTGRESQL")
    print("="*80)
    print()
    
    stats = {}
    
    # Define tables and their columns (in order, excluding auto-generated fields)
    tables = {
        'brand': ['brand_name', 'brand_address', 'brand_website', 'brand_email', 'created_at', 'updated_at'],
        'kit': ['category', 'packaging_name', 'box_size', 'units_per_case', 'box_weight_lbs', 
                'boxes_per_pallet', 'length_in', 'width_in', 'height_in', 'weight_lbs', 
                'created_at', 'updated_at'],
        'bag': ['category', 'packaging_name', 'box_size', 'units_per_case', 'box_weight_lbs', 
                'boxes_per_pallet', 'length_in', 'width_in', 'height_in', 'weight_lbs', 
                'created_at', 'updated_at'],
        'closure': ['category', 'closure_name', 'closure_supplier', 'closure_part_number', 
                    'closure_description', 'lead_time_weeks', 'moq', 'units_per_pallet', 
                    'units_per_case', 'cases_per_pallet', 'created_at', 'updated_at'],
        'finished_goods': ['finished_good_name', 'box_size', 'units_per_case', 'units_per_gallon', 
                          'box_weight_lbs', 'boxes_per_pallet', 'single_box_pallet_share', 
                          'replenishment_strategy', 'created_at', 'updated_at'],
        'bottle': ['bottle_name', 'bottle_image', 'size_oz', 'shape', 'color', 'thread_type', 
                   'cap_size', 'material', 'supplier', 'packaging_part_number', 'description', 
                   'brand', 'lead_time_weeks', 'moq', 'units_per_pallet', 'units_per_case', 
                   'cases_per_pallet', 'box_size', 'finished_units_per_case', 'units_per_gallon', 
                   'box_weight_lbs', 'boxes_per_pallet', 'single_box_pallet_share', 
                   'replenishment_strategy', 'length_in', 'width_in', 'height_in', 'weight_lbs', 
                   'label_size', 'supplier_order_strategy', 'supplier_inventory', 
                   'warehouse_inventory', 'max_warehouse_inventory', 'created_at', 'updated_at'],
        'formula': ['formula', 'guaranteed_analysis', 'npk', 'derived_from', 
                   'storage_warranty_precautionary_metals', 'filler', 'tps_guaranteed_analysis', 
                   'tps_npk', 'tps_derived_from', 'tps_storage_warranty_precautionary_metals', 
                   'created_at', 'updated_at'],
        'catalog': ['product_image_url', 'basic_wrap_url', 'plant_behind_product_url', 
                   'tri_bottle_wrap_url', 'date_added', 'marketplace', 'seller_account', 
                   'country', 'brand_name', 'product_name', 'size', 'type', 'packaging_name', 
                   'closure_name', 'label_size', 'label_location', 'case_size', 'units_per_case', 
                   'filter', 'upc', 'upc_image_file', 'parent_asin', 'child_asin', 
                   'parent_sku_final', 'child_sku_final', 'formula_name', 'msds', 
                   'guaranteed_analysis', 'npk', 'derived_from', 
                   'storage_warranty_precautionary_metals', 'units_sold_30_days', 'vine_notes', 
                   'brand_tailor_discount', 'core_competitor_asins', 'other_competitor_asins', 
                   'core_keywords', 'other_keywords', 'notes', 'stock_image', 'label_ai_file', 
                   'label_print_ready_pdf', 'tps_left_side_benefit_graphic', 'tps_directions', 
                   'tps_growing_recommendations', 'qr_code_section', 'website', 'product_title', 
                   'center_benefit_statement', 'size_copy_for_label', 'right_side_benefit_graphic', 
                   'ingredient_statement', 'tps_guaranteed_analysis', 'tps_npk', 'tps_derived_from', 
                   'tps_storage_warranty_precautionary_metals', 'tps_address', 'amazon_slide_1', 
                   'amazon_slide_2', 'amazon_slide_3', 'amazon_slide_4', 'amazon_slide_5', 
                   'amazon_slide_6', 'amazon_slide_7', 'amazon_a_plus_slide_1', 
                   'amazon_a_plus_slide_2', 'amazon_a_plus_slide_3', 'amazon_a_plus_slide_4', 
                   'amazon_a_plus_slide_5', 'amazon_a_plus_slide_6', 'tbd', 
                   'product_dimensions_length_in', 'product_dimensions_width_in', 
                   'product_dimensions_height_in', 'product_dimensions_weight_lbs', 
                   'six_sided_image_front', 'six_sided_image_left', 'six_sided_image_back', 
                   'six_sided_image_right', 'six_sided_image_top', 'six_sided_image_bottom', 
                   'price', 'title', 'bullets', 'description', 'vine_status', 'vine_launch_date', 
                   'units_enrolled', 'vine_reviews', 'star_rating', 'vine_program_notes', 
                   'created_at', 'updated_at']
    }
    
    # Migrate tables in order (reference tables first)
    for table_name, columns in tables.items():
        count = migrate_table(sqlite_conn, pg_conn, table_name, columns)
        stats[table_name] = count
    
    return stats

def verify_migration(pg_conn):
    """Verify the migration by counting records"""
    print("="*80)
    print("MIGRATION VERIFICATION")
    print("="*80)
    
    cursor = pg_conn.cursor()
    
    tables = ['brand', 'kit', 'bag', 'closure', 'finished_goods', 'bottle', 'formula', 'catalog']
    
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table.upper():20} {count:6} records")
    
    cursor.close()
    print("="*80)

def main():
    """Main migration process"""
    print("="*80)
    print("SQLITE TO POSTGRESQL MIGRATION")
    print("="*80)
    print()
    print(f"Source:      SQLite ({SQLITE_DB})")
    print(f"Destination: PostgreSQL RDS")
    print(f"Host:        {PG_CONFIG['host']}")
    print(f"Database:    {PG_CONFIG['database']}")
    print()
    
    try:
        # Connect to both databases
        sqlite_conn = connect_sqlite()
        pg_conn = connect_postgres()
        
        # Create PostgreSQL schema
        create_schema(pg_conn)
        
        # Migrate all data
        stats = migrate_all_data(sqlite_conn, pg_conn)
        
        # Verify migration
        verify_migration(pg_conn)
        
        # Close connections
        sqlite_conn.close()
        pg_conn.close()
        
        print()
        print("[SUCCESS] Migration completed successfully!")
        print()
        print("Summary:")
        for table, count in stats.items():
            print(f"  {table}: {count} records")
        print()
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())

