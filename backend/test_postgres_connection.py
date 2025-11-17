"""
Test PostgreSQL RDS Connection
Quick script to verify database connectivity and data integrity
"""

from db_config import get_connection

def test_connection():
    """Test database connection"""
    print("Testing PostgreSQL RDS Connection...")
    print("-" * 60)
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        print("[OK] Connected successfully!")
        print()
        
        # Test 1: Count records in each table
        print("[INFO] Record Counts:")
        tables = ['brand', 'kit', 'bag', 'closure', 'finished_goods', 'bottle', 'formula', 'catalog']
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table:20} {count:6} records")
        
        print()
        
        # Test 2: Sample product query
        print("[INFO] Sample Products:")
        cursor.execute("""
            SELECT product_name, size, price, brand_name 
            FROM catalog 
            WHERE price IS NOT NULL 
            ORDER BY price DESC 
            LIMIT 5
        """)
        
        products = cursor.fetchall()
        for product in products:
            name, size, price, brand = product
            print(f"  ${price:.2f} - {name} ({size}) - {brand}")
        
        print()
        
        # Test 3: Join query with relationships
        print("[INFO] Testing Relationships:")
        cursor.execute("""
            SELECT 
                c.product_name,
                b.bottle_name,
                f.npk,
                br.brand_name
            FROM catalog c
            LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
            LEFT JOIN formula f ON c.formula_name = f.formula
            LEFT JOIN brand br ON c.brand_name = br.brand_name
            LIMIT 3
        """)
        
        results = cursor.fetchall()
        for result in results:
            prod_name, bottle, npk, brand = result
            print(f"  {prod_name[:30]:30} | {bottle or 'N/A':20} | {npk or 'N/A':10}")
        
        print()
        print("[OK] All tests passed!")
        print("-" * 60)
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_connection()
    exit(0 if success else 1)

