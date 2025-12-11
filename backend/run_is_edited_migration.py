"""
Run the is_edited column migration
Adds is_edited field to all order tables
"""

import psycopg2
import sys

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def run_migration():
    """Run the is_edited migration"""
    print("=" * 80)
    print("RUNNING IS_EDITED MIGRATION")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        print()
        
        # Read migration file
        with open('migrations/012_add_is_edited_to_orders.sql', 'r') as f:
            migration_sql = f.read()
        
        print("📄 Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration executed successfully")
        print()
        
        # Verify columns were added
        tables = ['bottle_orders', 'closure_orders', 'box_orders', 'label_orders']
        print("🔍 Verifying columns...")
        for table in tables:
            cursor.execute(f"""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = '{table}' AND column_name = 'is_edited'
            """)
            result = cursor.fetchone()
            if result:
                print(f"   ✓ {table}.is_edited: {result[1]} (default: {result[2]})")
            else:
                print(f"   ✗ {table}.is_edited: NOT FOUND")
        
        print()
        print("=" * 80)
        print("MIGRATION COMPLETE")
        print("=" * 80)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    run_migration()



