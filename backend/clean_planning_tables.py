"""
Script to clean production planning tables in RDS
Clears: shipments, shipment_products, shipment_formulas
"""

import psycopg2

# Database configuration (same as Lambda)
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def clean_planning_tables():
    """Clean all production planning related tables"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        print("🧹 Cleaning production planning tables...")
        
        # Delete in order due to foreign key constraints
        # First delete child tables, then parent tables
        
        # 1. Delete shipment formulas (aggregated formula data)
        cursor.execute("DELETE FROM shipment_formulas")
        formulas_deleted = cursor.rowcount
        print(f"  ✓ Deleted {formulas_deleted} rows from shipment_formulas")
        
        # 2. Delete shipment products
        cursor.execute("DELETE FROM shipment_products")
        products_deleted = cursor.rowcount
        print(f"  ✓ Deleted {products_deleted} rows from shipment_products")
        
        # 3. Delete shipments (main table)
        cursor.execute("DELETE FROM shipments")
        shipments_deleted = cursor.rowcount
        print(f"  ✓ Deleted {shipments_deleted} rows from shipments")
        
        # Commit the transaction
        conn.commit()
        
        print("\n✅ Production planning tables cleaned successfully!")
        print(f"   Total rows deleted:")
        print(f"   - Shipments: {shipments_deleted}")
        print(f"   - Shipment Products: {products_deleted}")
        print(f"   - Shipment Formulas: {formulas_deleted}")
        
        # Reset sequences (auto-increment IDs) back to 1
        print("\n🔄 Resetting ID sequences...")
        cursor.execute("ALTER SEQUENCE IF EXISTS shipments_id_seq RESTART WITH 1")
        cursor.execute("ALTER SEQUENCE IF EXISTS shipment_products_id_seq RESTART WITH 1")
        cursor.execute("ALTER SEQUENCE IF EXISTS shipment_formulas_id_seq RESTART WITH 1")
        conn.commit()
        print("  ✓ ID sequences reset to 1")
        
        print("\n🎉 Database is now clean and ready for fresh production planning!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error cleaning tables: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Confirmation prompt
    print("=" * 60)
    print("⚠️  WARNING: This will DELETE ALL production planning data!")
    print("   Tables to be cleared:")
    print("   - shipments")
    print("   - shipment_products")
    print("   - shipment_formulas")
    print("=" * 60)
    
    confirm = input("\nType 'YES' to confirm deletion: ")
    
    if confirm == 'YES':
        clean_planning_tables()
    else:
        print("\n❌ Operation cancelled. No data was deleted.")

