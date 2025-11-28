"""
Initialize closure_inventory table from Excel file data
Reads from '1000 Bananas Database (3).xlsx' ClosureDatabase sheet
"""

import psycopg2
import pandas as pd
from psycopg2.extras import RealDictCursor

# Database configuration
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def initialize_closure_inventory_from_excel():
    """Initialize closure_inventory from Excel file"""
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
        
        # Read Excel file
        print("Reading Excel file...")
        df = pd.read_excel('1000 Bananas Database (3).xlsx', sheet_name='ClosureDatabase', header=1)
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        print(f"Found {len(df)} closures in Excel")
        
        # Insert into closure_inventory
        inserted = 0
        updated = 0
        skipped = 0
        
        for _, row in df.iterrows():
            closure_name = str(row.get('Closure Name', '')).strip()
            if not closure_name or closure_name == 'nan':
                skipped += 1
                continue
            
            # Get inventory values from Excel
            warehouse_qty = row.get('Warehouse Inventory')
            supplier_qty = row.get('Supplier Inventory')
            
            # Convert to int, handling NaN and None
            try:
                warehouse_qty = int(warehouse_qty) if pd.notna(warehouse_qty) else 0
            except (ValueError, TypeError):
                warehouse_qty = 0
            
            try:
                supplier_qty = int(supplier_qty) if pd.notna(supplier_qty) else 0
            except (ValueError, TypeError):
                supplier_qty = 0
            
            try:
                # Check if closure exists in closure table
                cursor.execute("SELECT closure_name FROM closure WHERE closure_name = %s", (closure_name,))
                closure_exists = cursor.fetchone()
                
                if not closure_exists:
                    print(f"⚠️  Closure '{closure_name}' not found in closure table, skipping...")
                    skipped += 1
                    continue
                
                # Insert or update closure_inventory
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
                
                if cursor.rowcount > 0:
                    if cursor.rowcount == 1:
                        inserted += 1
                        print(f"✅ Inserted: {closure_name} (warehouse: {warehouse_qty}, supplier: {supplier_qty})")
                    else:
                        updated += 1
                        print(f"🔄 Updated: {closure_name} (warehouse: {warehouse_qty}, supplier: {supplier_qty})")
                        
            except Exception as e:
                skipped += 1
                print(f"⚠️  Skipped {closure_name}: {str(e)}")
        
        conn.commit()
        print(f"\n✅ Initialization complete!")
        print(f"   - Inserted: {inserted}")
        print(f"   - Updated: {updated}")
        print(f"   - Skipped: {skipped}")
        
        # Verify
        cursor.execute("SELECT COUNT(*) as count FROM closure_inventory")
        count = cursor.fetchone()['count']
        print(f"   - Total in closure_inventory: {count}")
        
        # Show sample
        cursor.execute("""
            SELECT ci.closure_name, ci.warehouse_quantity, ci.supplier_quantity
            FROM closure_inventory ci
            ORDER BY ci.closure_name
            LIMIT 5
        """)
        print("\n   Sample closure inventory:")
        for row in cursor.fetchall():
            print(f"      {row['closure_name']}: Warehouse={row['warehouse_quantity']}, Supplier={row['supplier_quantity']}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    initialize_closure_inventory_from_excel()

