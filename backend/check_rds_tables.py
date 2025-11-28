import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# RDS connection config
RDS_CONFIG = {
    'host': os.getenv('RDS_HOST', 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com'),
    'port': int(os.getenv('RDS_PORT', '5432')),
    'database': os.getenv('RDS_DATABASE', 'postgres'),
    'user': os.getenv('RDS_USER', 'postgres'),
    'password': os.getenv('RDS_PASSWORD', 'postgres')
}

def check_database():
    """Check all tables and their row counts in RDS database."""
    try:
        # Connect to RDS
        print(f"🔌 Connecting to RDS: {RDS_CONFIG['host']}/{RDS_CONFIG['database']}")
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)
        tables = cursor.fetchall()
        
        print(f"\n📊 Found {len(tables)} tables in database:\n")
        print("=" * 80)
        
        for (table_name,) in tables:
            # Get row count
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            count = cursor.fetchone()[0]
            
            # Get column names
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                ORDER BY ordinal_position
                LIMIT 10;
            """)
            columns = [col[0] for col in cursor.fetchall()]
            
            print(f"📋 {table_name}")
            print(f"   Rows: {count:,}")
            print(f"   Columns: {', '.join(columns[:5])}")
            if len(columns) > 5:
                print(f"            {', '.join(columns[5:10])}")
            print()
        
        print("=" * 80)
        
        # Check for supply chain related tables specifically
        supply_chain_keywords = ['bottle', 'closure', 'box', 'label', 'order', 'shipment', 'inventory']
        print("\n🔍 Supply Chain Related Tables:")
        for (table_name,) in tables:
            if any(keyword in table_name.lower() for keyword in supply_chain_keywords):
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                count = cursor.fetchone()[0]
                print(f"   ✓ {table_name} ({count:,} rows)")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Database check complete!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_database()

