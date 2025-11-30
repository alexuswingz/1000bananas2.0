#!/usr/bin/env python3
"""
Clean up duplicate/test shipments
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

def cleanup_shipments():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Find all shipments
        cursor.execute("""
            SELECT id, shipment_number, shipment_date, status, total_units, created_at
            FROM shipments
            ORDER BY created_at DESC
        """)
        
        shipments = cursor.fetchall()
        
        print("\n" + "=" * 100)
        print(f"Found {len(shipments)} shipments:")
        print("=" * 100)
        
        for shipment in shipments:
            print(f"\nID: {shipment['id']}")
            print(f"Number: {shipment['shipment_number']}")
            print(f"Date: {shipment['shipment_date']}")
            print(f"Status: {shipment['status']}")
            print(f"Total Units: {shipment['total_units']}")
            print(f"Created: {shipment['created_at']}")
        
        # Ask user what to do
        print("\n" + "=" * 100)
        choice = input("\nOptions:\n1. Delete ALL shipments\n2. Delete empty shipments (0 units)\n3. Delete specific shipment by ID\n4. Exit\n\nChoice (1-4): ")
        
        if choice == '1':
            confirm = input("\n⚠️  Delete ALL shipments? This cannot be undone! (yes/no): ")
            if confirm.lower() == 'yes':
                cursor.execute("DELETE FROM shipments")
                conn.commit()
                print(f"✅ Deleted all {len(shipments)} shipments")
            else:
                print("❌ Cancelled")
        
        elif choice == '2':
            cursor.execute("DELETE FROM shipments WHERE total_units = 0 OR total_units IS NULL")
            deleted = cursor.rowcount
            conn.commit()
            print(f"✅ Deleted {deleted} empty shipments")
        
        elif choice == '3':
            shipment_id = input("\nEnter shipment ID to delete: ")
            cursor.execute("DELETE FROM shipments WHERE id = %s", (shipment_id,))
            if cursor.rowcount > 0:
                conn.commit()
                print(f"✅ Deleted shipment ID {shipment_id}")
            else:
                print(f"❌ Shipment ID {shipment_id} not found")
        
        else:
            print("👋 Exiting without changes")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    cleanup_shipments()

