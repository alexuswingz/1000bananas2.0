"""
Run cycle count tables migration for bottles, closures, and boxes
"""
import psycopg2

DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def run_migration():
    print("=" * 80)
    print("CREATING CYCLE COUNT TABLES")
    print("=" * 80)
    print()
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # Read SQL file
        with open('migrations/009_create_cycle_count_tables.sql', 'r') as f:
            sql = f.read()
        
        # Execute SQL
        cursor.execute(sql)
        conn.commit()
        
        print("✅ All cycle count tables created successfully!")
        print()
        
        # Verify
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name LIKE '%cycle_count%' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print("Tables created:")
        for table in tables:
            print(f"  - {table[0]}")
        
        print()
        print("=" * 80)
        print("✅ MIGRATION COMPLETE")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    run_migration()

