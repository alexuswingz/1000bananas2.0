"""
Migrate catalog.notes column from TEXT to JSONB
This is required for the Selection module to store structured data
"""

from db_config import get_connection

def migrate_notes_column():
    """Convert notes column from TEXT to JSONB"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        print("[INFO] Starting migration of catalog.notes column...")
        
        # Check if notes column is already JSONB
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'catalog' AND column_name = 'notes'
        """)
        
        result = cursor.fetchone()
        if result and result[0] == 'jsonb':
            print("[OK] Column is already JSONB type")
            cursor.close()
            conn.close()
            return
        
        # Drop dependent views first
        print("[INFO] Dropping dependent views...")
        cursor.execute("""
            DROP VIEW IF EXISTS v_catalog_complete CASCADE
        """)
        
        # Alter column type to JSONB
        print("[INFO] Converting notes column to JSONB...")
        cursor.execute("""
            ALTER TABLE catalog 
            ALTER COLUMN notes TYPE JSONB 
            USING CASE 
                WHEN notes IS NULL OR notes = '' THEN '{}'::jsonb
                WHEN notes::text ~ '^{.*}$' THEN notes::jsonb
                ELSE json_build_object('text', notes)::jsonb
            END
        """)
        
        conn.commit()
        print("[OK] Successfully migrated notes column to JSONB")
        
        # Verify the change
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'catalog' AND column_name = 'notes'
        """)
        
        result = cursor.fetchone()
        print(f"[INFO] Current data type: {result[0]}")
        
        cursor.close()
        conn.close()
        
        print("[OK] Migration complete!")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    migrate_notes_column()

