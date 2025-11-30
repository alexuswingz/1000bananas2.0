import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Database connection parameters
DB_HOST = os.environ.get('DB_HOST', 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com')
DB_NAME = os.environ.get('DB_NAME', 'postgres')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')

def run_migration():
    """Run the box cycle count column fix migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            cursor_factory=RealDictCursor
        )
        
        cursor = conn.cursor()
        
        print("Connected to database successfully")
        print(f"Running migration: 010_fix_box_cycle_count_column.sql")
        
        # Read and execute the migration SQL
        with open('migrations/010_fix_box_cycle_count_column.sql', 'r') as f:
            sql = f.read()
        
        cursor.execute(sql)
        conn.commit()
        
        print("\n✅ Migration completed successfully!")
        
        # Verify the change
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'box_cycle_count_lines'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\n📋 box_cycle_count_lines table columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error running migration: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_migration()

