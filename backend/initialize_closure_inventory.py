"""
Initialize closure_inventory table from closure table
Similar to how bottle_inventory was initialized
"""

import psycopg2
from psycopg2.extras import RealDictCursor

# Database configuration
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def initialize_closure_inventory():
    """Initialize closure_inventory from closure table"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if closure_inventory table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'closure_inventory'
            );
        """)
        table_exists = cursor.fetchone()['exists']
        
        if not table_exists:
            print("❌ closure_inventory table does not exist. Please run migration 006 first.")
            return
        
        # Get all closures from closure table
        cursor.execute("""
            SELECT DISTINCT closure_name
            FROM closure
            WHERE closure_name IS NOT NULL
        """)
        closures = cursor.fetchall()
        
        print(f"Found {len(closures)} closures to initialize")
        
        # Insert into closure_inventory (initialize with 0 if not exists)
        inserted = 0
        skipped = 0
        
        for closure in closures:
            closure_name = closure['closure_name']
            warehouse_qty = 0  # Initialize with 0
            supplier_qty = 0   # Initialize with 0
            
            try:
                cursor.execute("""
                    INSERT INTO closure_inventory (
                        closure_name, 
                        warehouse_quantity, 
                        supplier_quantity
                    )
                    VALUES (%s, %s, %s)
                    ON CONFLICT (closure_name) DO UPDATE SET
                        warehouse_quantity = COALESCE(EXCLUDED.warehouse_quantity, closure_inventory.warehouse_quantity),
                        supplier_quantity = COALESCE(EXCLUDED.supplier_quantity, closure_inventory.supplier_quantity)
                """, (closure_name, warehouse_qty, supplier_qty))
                inserted += 1
                print(f"✅ Initialized: {closure_name} (warehouse: {warehouse_qty}, supplier: {supplier_qty})")
            except Exception as e:
                skipped += 1
                print(f"⚠️  Skipped {closure_name}: {str(e)}")
        
        conn.commit()
        print(f"\n✅ Initialization complete!")
        print(f"   - Inserted/Updated: {inserted}")
        print(f"   - Skipped: {skipped}")
        
        # Verify
        cursor.execute("SELECT COUNT(*) as count FROM closure_inventory")
        count = cursor.fetchone()['count']
        print(f"   - Total in closure_inventory: {count}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    initialize_closure_inventory()

