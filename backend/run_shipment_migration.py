"""
Run migration 011: Create shipment tables for production planning
"""
import psycopg2

# RDS connection config
RDS_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def run_migration():
    """Run shipment tables migration"""
    
    print("=" * 80)
    print("CREATING SHIPMENT TABLES (Migration 011)")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Read migration file
        print("Reading migration file...")
        with open('migrations/011_create_shipment_tables.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        print("Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print()
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'shipments', 'shipment_products', 'shipment_formulas'
            )
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"✅ Tables created: {len(tables)}")
        for (table_name,) in tables:
            # Get column count
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
            """)
            col_count = cursor.fetchone()[0]
            
            # Get row count
            cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            row_count = cursor.fetchone()[0]
            
            print(f"   ✓ {table_name} ({col_count} columns, {row_count} rows)")
        
        print()
        
        # Verify view was created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'v_shipment_details'
        """)
        view = cursor.fetchone()
        
        if view:
            print("✅ View created: v_shipment_details")
        
        print()
        
        # Verify functions were created
        cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name IN (
                'update_shipment_timestamp',
                'update_shipment_totals',
                'aggregate_shipment_formulas'
            )
            ORDER BY routine_name
        """)
        functions = cursor.fetchall()
        
        if functions:
            print(f"✅ Functions created: {len(functions)}")
            for (func_name,) in functions:
                print(f"   ✓ {func_name}()")
        
        print()
        
        # Verify triggers were created
        cursor.execute("""
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE '%shipment%'
            ORDER BY event_object_table, trigger_name
        """)
        triggers = cursor.fetchall()
        
        if triggers:
            print(f"✅ Triggers created: {len(triggers)}")
            for (trigger_name, table_name) in triggers:
                print(f"   ✓ {trigger_name} on {table_name}")
        
        print()
        
        cursor.close()
        conn.close()
        
        print("=" * 80)
        print("✅ SHIPMENT TABLES READY")
        print("=" * 80)
        print()
        print("Tables:")
        print("  • shipments - Main shipment records")
        print("  • shipment_products - Products in each shipment")
        print("  • shipment_formulas - Formula aggregations per shipment")
        print()
        print("View:")
        print("  • v_shipment_details - Complete shipment data with inventory")
        print()
        print("Functions:")
        print("  • aggregate_shipment_formulas(shipment_id) - Aggregate formula needs")
        print("  • update_shipment_totals() - Auto-calculate totals")
        print()
        print("Next steps:")
        print("  1. Add backend API endpoints in lambda_function.py")
        print("  2. Connect frontend to real data")
        print("  3. Test shipment creation workflow")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_migration()



