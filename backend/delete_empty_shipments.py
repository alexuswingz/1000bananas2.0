#!/usr/bin/env python3
"""
Delete empty shipments (no products added)
"""
import psycopg2

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def delete_empty_shipments():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # Delete shipments with 0 units
        cursor.execute("DELETE FROM shipments WHERE total_units = 0 OR total_units IS NULL")
        deleted = cursor.rowcount
        conn.commit()
        
        print(f"✅ Deleted {deleted} empty shipment(s)")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    delete_empty_shipments()



