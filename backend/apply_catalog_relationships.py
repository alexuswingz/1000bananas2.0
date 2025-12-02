"""
Apply catalog relationships migration
Adds foreign key constraints to connect catalog with bottle, formula, closure, brand
"""
import psycopg2
import os

# RDS connection config
RDS_CONFIG = {
    'host': os.getenv('RDS_HOST', 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com'),
    'port': int(os.getenv('RDS_PORT', '5432')),
    'database': os.getenv('RDS_DATABASE', 'postgres'),
    'user': os.getenv('RDS_USER', 'postgres'),
    'password': os.getenv('RDS_PASSWORD', 'postgres')
}

def check_current_relationships():
    """Check current catalog relationships before migration"""
    print("=" * 80)
    print("CHECKING CURRENT CATALOG RELATIONSHIPS")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Check invalid packaging_name references
        cursor.execute("""
            SELECT COUNT(*) as invalid_count
            FROM catalog 
            WHERE packaging_name IS NOT NULL 
            AND packaging_name NOT IN (SELECT bottle_name FROM bottle)
        """)
        invalid_bottles = cursor.fetchone()[0]
        print(f"Invalid packaging_name references: {invalid_bottles}")
        
        # Check invalid formula_name references
        cursor.execute("""
            SELECT COUNT(*) as invalid_count
            FROM catalog 
            WHERE formula_name IS NOT NULL 
            AND formula_name NOT IN (SELECT formula FROM formula)
        """)
        invalid_formulas = cursor.fetchone()[0]
        print(f"Invalid formula_name references: {invalid_formulas}")
        
        # Check invalid closure_name references
        cursor.execute("""
            SELECT COUNT(*) as invalid_count
            FROM catalog 
            WHERE closure_name IS NOT NULL 
            AND closure_name NOT IN (SELECT closure_name FROM closure)
        """)
        invalid_closures = cursor.fetchone()[0]
        print(f"Invalid closure_name references: {invalid_closures}")
        
        # Check invalid brand_name references
        cursor.execute("""
            SELECT COUNT(*) as invalid_count
            FROM catalog 
            WHERE brand_name IS NOT NULL 
            AND brand_name NOT IN (SELECT brand_name FROM brand)
        """)
        invalid_brands = cursor.fetchone()[0]
        print(f"Invalid brand_name references: {invalid_brands}")
        
        print()
        print(f"Total invalid references: {invalid_bottles + invalid_formulas + invalid_closures + invalid_brands}")
        print()
        
        if invalid_bottles + invalid_formulas + invalid_closures + invalid_brands > 0:
            print("These invalid references will be set to NULL before adding foreign keys.")
            print("This preserves catalog data while ensuring referential integrity.")
        else:
            print("All references are valid! Safe to add foreign keys.")
        
        print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

def apply_migration(dry_run=True):
    """Apply the catalog relationships migration"""
    
    if dry_run:
        print("=" * 80)
        print("DRY RUN MODE - No changes will be made")
        print("=" * 80)
        print()
        print("Migration would:")
        print("  1. Clean invalid references (set to NULL)")
        print("  2. Add foreign key constraints:")
        print("     - catalog.packaging_name → bottle.bottle_name")
        print("     - catalog.formula_name → formula.formula")
        print("     - catalog.closure_name → closure.closure_name")
        print("     - catalog.brand_name → brand.brand_name")
        print("  3. Add performance indexes")
        print("  4. Create v_production_planning view")
        print()
        return
    
    print("=" * 80)
    print("APPLYING CATALOG RELATIONSHIPS MIGRATION")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Read migration file
        with open('migrations/005_add_catalog_relationships.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        print("Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print()
        
        # Verify foreign keys were added
        cursor.execute("""
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'catalog'::regclass 
            AND contype = 'f'
        """)
        fkeys = cursor.fetchall()
        
        print(f"Foreign keys added: {len(fkeys)}")
        for fkey_name, fkey_type in fkeys:
            print(f"  ✓ {fkey_name}")
        print()
        
        # Verify view was created
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.views 
            WHERE table_name = 'v_production_planning'
        """)
        view_exists = cursor.fetchone()[0]
        
        if view_exists:
            print("✅ Production planning view created")
            
            # Show sample from view
            cursor.execute("""
                SELECT product_name, bottle_name, bpm, formula_name, 
                       packaging_bpm, formula_gallons_available
                FROM v_production_planning 
                LIMIT 5
            """)
            print()
            print("Sample data from v_production_planning:")
            for row in cursor.fetchall():
                print(f"  {row[0]}: Bottle={row[1]}, BPM={row[2]}, Formula={row[3]}")
        
        print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    import sys
    
    # Check current state
    check_current_relationships()
    
    # Check for dry-run flag
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    
    # Apply migration
    apply_migration(dry_run=dry_run)
    
    if dry_run:
        print()
        print("To actually apply the migration, run:")
        print("   python apply_catalog_relationships.py")


