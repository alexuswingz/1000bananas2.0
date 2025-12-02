#!/usr/bin/env python3
"""
Check inventory levels for Cherry Tree Fertilizer components
"""
import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def check_inventory():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check Cherry Tree 8oz (the one shown in screenshot)
        cursor.execute("""
            SELECT 
                c.id,
                c.product_name,
                c.size,
                c.packaging_name as bottle_name,
                c.closure_name,
                c.formula_name,
                c.label_location,
                bi.warehouse_quantity as bottle_inventory,
                ci.warehouse_quantity as closure_inventory,
                li.warehouse_inventory as label_inventory,
                fi.gallons_available as formula_inventory
            FROM catalog c
            LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
            LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
            LEFT JOIN label_inventory li ON c.label_location = li.label_location
            LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
            WHERE c.product_name ILIKE '%Cherry Tree%'
               OR c.product_name ILIKE '%Christmas Cactus%'
            ORDER BY c.product_name, c.size
        """)
        
        products = cursor.fetchall()
        
        print("\n" + "=" * 120)
        print("INVENTORY CHECK FOR CHERRY TREE / CHRISTMAS CACTUS PRODUCTS")
        print("=" * 120)
        
        for product in products:
            print(f"\n📦 {product['product_name']} ({product['size']})")
            print(f"   Bottle: {product['bottle_name']}")
            print(f"      Inventory: {product['bottle_inventory'] or 0} units")
            print(f"   Closure: {product['closure_name']}")
            print(f"      Inventory: {product['closure_inventory'] or 0} units")
            print(f"   Label: {product['label_location'] or 'NOT MAPPED'}")
            print(f"      Inventory: {product['label_inventory'] or 0} units")
            print(f"   Formula: {product['formula_name']}")
            print(f"      Inventory: {product['formula_inventory'] or 0} gallons")
            
            # Calculate max producible
            bottle_inv = product['bottle_inventory'] or 0
            closure_inv = product['closure_inventory'] or 0
            label_inv = product['label_inventory'] or 0
            formula_inv = product['formula_inventory'] or 0
            
            # Calculate gallons per unit based on size
            size = product['size']
            if size == '8oz':
                gallons_per_unit = 0.0625
            elif size == '16oz':
                gallons_per_unit = 0.125
            elif size in ('Quart', '32oz'):
                gallons_per_unit = 0.25
            elif size == 'Gallon':
                gallons_per_unit = 1.0
            elif size == '5 Gallon':
                gallons_per_unit = 5.0
            else:
                gallons_per_unit = 0.25
            
            formula_units = int(formula_inv / gallons_per_unit) if gallons_per_unit > 0 else 0
            max_producible = min(bottle_inv, closure_inv, label_inv, formula_units)
            
            print(f"\n   📊 MAX PRODUCIBLE: {max_producible} units")
            print(f"      Limited by: ", end='')
            if max_producible == bottle_inv:
                print("🔴 BOTTLES")
            elif max_producible == closure_inv:
                print("🔴 CLOSURES")
            elif max_producible == label_inv:
                print("🔴 LABELS")
            elif max_producible == formula_units:
                print("🔴 FORMULA")
            else:
                print("N/A")
        
        print("\n" + "=" * 120)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    check_inventory()


