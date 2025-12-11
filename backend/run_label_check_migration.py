"""
Run the label check status migration
Adds label_check_status, label_check_count, and label_check_at columns to shipment_products
"""

import psycopg2
import sys
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def run_migration():
    """Run the label check status migration"""
    print("=" * 80)
    print("RUNNING LABEL CHECK STATUS MIGRATION")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("[OK] Connected to database")
        print()
        
        # Read migration file
        migration_path = os.path.join(script_dir, 'migrations', '016_add_label_check_status.sql')
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        print("[*] Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("[OK] Migration executed successfully")
        print()
        
        # Verify columns were added
        print("[*] Verifying columns...")
        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'shipment_products' 
            AND column_name IN ('label_check_status', 'label_check_count', 'label_check_at')
            ORDER BY column_name
        """)
        results = cursor.fetchall()
        
        expected_columns = ['label_check_status', 'label_check_count', 'label_check_at']
        found_columns = [row[0] for row in results]
        
        for col in expected_columns:
            if col in found_columns:
                row = next(r for r in results if r[0] == col)
                print(f"   [OK] shipment_products.{col}: {row[1]} (nullable: {row[3]}, default: {row[2]})")
            else:
                print(f"   [FAIL] shipment_products.{col}: NOT FOUND")
        
        # Verify index
        print()
        print("[*] Verifying index...")
        cursor.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'shipment_products' 
            AND indexname = 'idx_shipment_products_label_check'
        """)
        index_result = cursor.fetchone()
        if index_result:
            print(f"   [OK] Index {index_result[0]} created")
        else:
            print(f"   [FAIL] Index idx_shipment_products_label_check: NOT FOUND")
        
        print()
        print("=" * 80)
        print("MIGRATION COMPLETE")
        print("=" * 80)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    run_migration()

