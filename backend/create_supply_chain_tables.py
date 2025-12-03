"""
Create supply chain order tables (bottle, closure, box orders + inventories)
"""
import psycopg2

# RDS connection config
RDS_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def create_tables():
    """Create supply chain order and inventory tables"""
    
    print("=" * 80)
    print("CREATING SUPPLY CHAIN TABLES")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Read migration file
        print("Reading migration file...")
        with open('migrations/006_create_supply_chain_orders.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        print("Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print()
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'bottle_orders', 'closure_orders', 'box_orders',
                'bottle_inventory', 'closure_inventory', 'box_inventory'
            )
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"✅ Tables created: {len(tables)}")
        for (table_name,) in tables:
            # Get row count
            cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            count = cursor.fetchone()[0]
            print(f"   ✓ {table_name} ({count} rows)")
        
        print()
        
        # Check if bottle inventory was initialized
        cursor.execute("SELECT COUNT(*) FROM bottle_inventory")
        bottle_inv_count = cursor.fetchone()[0]
        
        if bottle_inv_count > 0:
            print(f"✅ Bottle inventory initialized with {bottle_inv_count} bottles")
            
            # Show sample
            cursor.execute("""
                SELECT bottle_name, warehouse_quantity, supplier_quantity
                FROM bottle_inventory
                LIMIT 5
            """)
            print("\n   Sample bottle inventory:")
            for row in cursor.fetchall():
                print(f"      {row[0]}: Warehouse={row[1]}, Supplier={row[2]}")
        
        print()
        
        cursor.close()
        conn.close()
        
        print("=" * 80)
        print("✅ SUPPLY CHAIN TABLES READY")
        print("=" * 80)
        print()
        print("Created:")
        print("  • bottle_orders (order tracking)")
        print("  • closure_orders (order tracking)")
        print("  • box_orders (order tracking)")
        print("  • bottle_inventory (warehouse stock)")
        print("  • closure_inventory (warehouse stock)")
        print("  • box_inventory (warehouse stock)")
        print()
        print("Next step: Build Lambda API endpoints")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_tables()



