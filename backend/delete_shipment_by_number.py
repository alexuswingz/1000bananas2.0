#!/usr/bin/env python3
"""
Delete shipment by number
"""
import psycopg2

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def delete_shipment():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM shipments WHERE shipment_number = '2025.11.30'")
        deleted = cursor.rowcount
        conn.commit()
        
        print(f"✅ Deleted {deleted} shipment(s) with number '2025.11.30'")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    delete_shipment()



