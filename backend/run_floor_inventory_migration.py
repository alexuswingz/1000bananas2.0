#!/usr/bin/env python3
"""
Floor Inventory Migration Runner
Executes migration 012 to create floor inventory tables (sellables, shiners, unused formulas)
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create a database connection"""
    RDS_CONFIG = {
        'host': os.getenv('RDS_HOST', 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com'),
        'port': int(os.getenv('RDS_PORT', '5432')),
        'database': os.getenv('RDS_DATABASE', 'postgres'),
        'user': os.getenv('RDS_USER', 'postgres'),
        'password': os.getenv('RDS_PASSWORD', 'postgres')
    }
    return psycopg2.connect(**RDS_CONFIG)

def run_migration():
    """Execute the floor inventory migration"""
    print("=" * 80)
    print("Running Floor Inventory Migration (012)")
    print("=" * 80)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Read migration file
        with open('migrations/012_create_floor_inventory_tables.sql', 'r') as f:
            migration_sql = f.read()
        
        print("\n📝 Executing migration SQL...")
        
        # Execute migration
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration executed successfully!")
        
        # Verify tables were created
        print("\n🔍 Verifying tables...")
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('shiners')
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n✅ Found {len(tables)} table(s):")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        # Verify views were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_sellables', 'v_unused_formulas')
            ORDER BY table_name;
        """)
        
        views = cursor.fetchall()
        print(f"\n✅ Found {len(views)} view(s):")
        for view in views:
            print(f"   - {view['table_name']}")
        
        # Check shiners table structure
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'shiners'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print(f"\n📊 Shiners table columns ({len(columns)}):")
        for col in columns:
            print(f"   - {col['column_name']}: {col['data_type']}")
        
        print("\n" + "=" * 80)
        print("✅ Floor Inventory Migration Complete!")
        print("=" * 80)
        print("\n🎯 Next Steps:")
        print("   1. Deploy Lambda function with new endpoints")
        print("   2. Add routes to API Gateway:")
        print("      - GET  /production/floor-inventory/sellables")
        print("      - GET  /production/floor-inventory/shiners")
        print("      - POST /production/floor-inventory/shiners")
        print("      - GET  /production/floor-inventory/unused-formulas")
        print("   3. Test Floor Inventory views in frontend")
        print()
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    run_migration()

