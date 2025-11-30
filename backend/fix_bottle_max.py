"""
Fix bottle max_warehouse_inventory values to be consistent by size
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection config
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def fix_bottle_max_inventory():
    """Update all bottles to have consistent max_warehouse_inventory by size"""
    
    print("=" * 80)
    print("FIXING BOTTLE MAX WAREHOUSE INVENTORY")
    print("=" * 80)
    print()
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Define max inventory by size - use specific patterns to avoid substring matches
        size_updates = [
            ('16oz', 3300),
            ('8oz', 58240),
            ('6oz', 6768),
            ('3oz', 8370),
            ('Quart', 8640),
            ('Gallon', 2304),
        ]
        
        print("Updating max_warehouse_inventory for each bottle size...")
        print()
        
        for size, max_inv in size_updates:
            # Use word boundary pattern: only match if it's the start of the name
            if 'oz' in size:
                # For oz sizes, match "Xoz " (with space after) to avoid substring matches
                pattern = f'{size} %'
            else:
                pattern = f'%{size}%'
            
            cursor.execute("""
                UPDATE bottle 
                SET max_warehouse_inventory = %s 
                WHERE bottle_name LIKE %s
                RETURNING bottle_name, max_warehouse_inventory
            """, (max_inv, pattern))
            
            updated = cursor.fetchall()
            print(f"✓ {size} bottles → {max_inv:,}")
            for row in updated:
                print(f"  - {row['bottle_name']}: {row['max_warehouse_inventory']:,}")
            print()
        
        conn.commit()
        
        print("=" * 80)
        print("VERIFYING CHANGES")
        print("=" * 80)
        print()
        
        cursor.execute("""
            SELECT b.bottle_name, 
                   bi.warehouse_quantity,
                   b.max_warehouse_inventory
            FROM bottle b
            LEFT JOIN bottle_inventory bi ON b.bottle_name = bi.bottle_name
            ORDER BY b.bottle_name
        """)
        
        all_bottles = cursor.fetchall()
        
        print(f"{'Bottle Name':<40} {'Current':<12} {'Max':<12}")
        print("-" * 80)
        for bottle in all_bottles:
            current = f"{bottle['warehouse_quantity']:,}" if bottle['warehouse_quantity'] else 'N/A'
            max_val = f"{bottle['max_warehouse_inventory']:,}" if bottle['max_warehouse_inventory'] else 'NULL'
            print(f"{bottle['bottle_name']:<40} {current:<12} {max_val:<12}")
        
        print()
        print("=" * 80)
        print("✅ SUCCESS: All bottle max inventories updated!")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print()
        print("=" * 80)
        print("❌ ERROR")
        print("=" * 80)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    fix_bottle_max_inventory()

