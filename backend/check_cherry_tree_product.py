#!/usr/bin/env python3
"""
Check and fix the Cherry Tree Fertilizer product mappings
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

def check_and_fix_product():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Find Cherry Tree Fertilizer products
        cursor.execute("""
            SELECT id, product_name, brand_name, size, 
                   packaging_name, closure_name, formula_name,
                   child_asin, child_sku_final
            FROM catalog
            WHERE product_name ILIKE '%Cherry Tree%'
               OR product_name ILIKE '%Christmas Cactus%'
            ORDER BY brand_name, product_name, size
        """)
        
        products = cursor.fetchall()
        
        print(f"\nFound {len(products)} Cherry Tree/Christmas Cactus products:")
        print("=" * 100)
        
        for product in products:
            print(f"\nID: {product['id']}")
            print(f"Product: {product['brand_name']} - {product['product_name']} ({product['size']})")
            print(f"ASIN: {product['child_asin']}")
            print(f"SKU: {product['child_sku_final']}")
            print(f"Bottle: {product['packaging_name'] or 'MISSING ❌'}")
            print(f"Closure: {product['closure_name'] or 'MISSING ❌'}")
            print(f"Formula: {product['formula_name'] or 'MISSING ❌'}")
            
            # Suggest bottle and closure based on size
            if not product['packaging_name'] or not product['closure_name']:
                size = product['size']
                suggested_bottle = None
                suggested_closure = None
                
                if size == '8oz':
                    suggested_bottle = '8 oz Standard Round Bottle'
                    suggested_closure = '24/410 Cap'
                elif size == '16oz':
                    suggested_bottle = '16 oz Standard Round Bottle'
                    suggested_closure = '28/400 Cap'
                elif size in ('Quart', '32oz'):
                    suggested_bottle = 'Quart Standard Handle Bottle'
                    suggested_closure = '38/400 Cap'
                elif size == 'Gallon':
                    suggested_bottle = 'Gallon Standard Handle Bottle'
                    suggested_closure = '38/400 Cap'
                elif size == '5 Gallon':
                    suggested_bottle = '5 Gallon Pail'
                    suggested_closure = '5 Gallon Pail Lid'
                
                if suggested_bottle and suggested_closure:
                    print(f"\n   SUGGESTION:")
                    print(f"   Bottle: {suggested_bottle}")
                    print(f"   Closure: {suggested_closure}")
                    
                    # Update the product
                    updates = []
                    values = []
                    
                    if not product['packaging_name']:
                        updates.append("packaging_name = %s")
                        values.append(suggested_bottle)
                    
                    if not product['closure_name']:
                        updates.append("closure_name = %s")
                        values.append(suggested_closure)
                    
                    if updates:
                        values.append(product['id'])
                        update_query = f"""
                            UPDATE catalog
                            SET {', '.join(updates)}
                            WHERE id = %s
                        """
                        
                        cursor.execute(update_query, values)
                        print(f"   ✅ FIXED!")
        
        conn.commit()
        print(f"\n" + "=" * 100)
        print(f"✅ All Cherry Tree/Christmas Cactus products checked and fixed!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    check_and_fix_product()



