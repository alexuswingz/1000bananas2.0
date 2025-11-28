"""
Import production planning data from Excel to database
Updates bottle and finished_goods tables with BPM and inventory data
"""
import pandas as pd
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

def import_bottle_bpm_data():
    """Import BPM and max inventory data for bottles"""
    print("=" * 80)
    print("IMPORTING BOTTLE PRODUCTION DATA")
    print("=" * 80)
    print()
    
    # Read bottle CSV
    df = pd.read_csv('bottle_database_updated.csv')
    
    # First row contains column names
    columns = df.iloc[0].tolist()
    data = df.iloc[1:].reset_index(drop=True)
    
    # Map column names
    bottle_name_idx = 0
    bpm_idx = columns.index('Packaging Bottles per Minute (BPM)')
    max_inv_idx = columns.index('Max Warehouse Inventory')
    
    # Prepare update data
    updates = []
    for i, row in data.iterrows():
        bottle_name = row.iloc[bottle_name_idx]
        bpm = row.iloc[bpm_idx]
        max_inv = row.iloc[max_inv_idx]
        
        # Skip if no bottle name
        if pd.isna(bottle_name) or str(bottle_name).strip() == '':
            continue
        
        # Convert to int, handle NaN
        bpm_val = int(float(bpm)) if not pd.isna(bpm) else None
        max_inv_val = int(float(max_inv)) if not pd.isna(max_inv) else None
        
        updates.append({
            'bottle_name': str(bottle_name).strip(),
            'bpm': bpm_val,
            'max_inventory': max_inv_val
        })
        
        print(f"   {bottle_name}: BPM={bpm_val}, Max Inventory={max_inv_val}")
    
    print(f"\n   Total: {len(updates)} bottles to update")
    print()
    
    return updates

def import_finished_goods_bpm():
    """Import BPM data for finished goods"""
    print("=" * 80)
    print("IMPORTING FINISHED GOODS PRODUCTION DATA")
    print("=" * 80)
    print()
    
    # Read finished goods CSV
    df = pd.read_csv('finished_goods_updated.csv')
    
    # Prepare update data
    updates = []
    for i, row in df.iterrows():
        packaging_name = row['Packaging Name (Finished Goods)']
        bpm = row['Max Packaging per Minute (BPM)']
        
        # Skip if no name or BPM
        if pd.isna(packaging_name) or pd.isna(bpm):
            continue
        
        bpm_val = int(float(bpm))
        packaging_name_clean = str(packaging_name).strip()
        
        updates.append({
            'finished_good_name': packaging_name_clean,
            'bpm': bpm_val
        })
        
        print(f"   {packaging_name_clean}: BPM={bpm_val}")
    
    print(f"\n   Total: {len(updates)} finished goods to update")
    print()
    
    return updates

def update_database(bottle_updates, fg_updates, dry_run=True):
    """Update database with production data"""
    
    if dry_run:
        print("=" * 80)
        print("DRY RUN MODE - No changes will be made")
        print("=" * 80)
        print()
        print(f"Would update {len(bottle_updates)} bottles")
        print(f"Would update {len(fg_updates)} finished goods")
        return
    
    print("=" * 80)
    print("UPDATING DATABASE")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Update bottles
        print(f"Updating {len(bottle_updates)} bottles...")
        for update in bottle_updates:
            cursor.execute("""
                UPDATE bottle
                SET bottles_per_minute = %s,
                    max_warehouse_inventory = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE bottle_name = %s
            """, (update['bpm'], update['max_inventory'], update['bottle_name']))
            
            if cursor.rowcount > 0:
                print(f"   Updated: {update['bottle_name']}")
            else:
                print(f"   NOT FOUND: {update['bottle_name']}")
        
        print()
        
        # Update finished goods
        print(f"Updating {len(fg_updates)} finished goods...")
        for update in fg_updates:
            cursor.execute("""
                UPDATE finished_goods
                SET max_packaging_per_minute = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE finished_good_name = %s
            """, (update['bpm'], update['finished_good_name']))
            
            if cursor.rowcount > 0:
                print(f"   Updated: {update['finished_good_name']}")
            else:
                print(f"   NOT FOUND: {update['finished_good_name']}")
        
        conn.commit()
        print()
        print("Database updated successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

def run_migration():
    """Run the migration SQL"""
    print("=" * 80)
    print("RUNNING MIGRATION")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Read migration file
        with open('migrations/003_add_production_columns.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        cursor.execute(migration_sql)
        conn.commit()
        
        print("Migration completed successfully!")
        print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    import sys
    
    # Check for dry-run flag
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    run_migration_flag = '--migrate' in sys.argv or '-m' in sys.argv
    
    if run_migration_flag:
        print("\nRunning migration first...\n")
        run_migration()
    
    # Import data
    bottle_updates = import_bottle_bpm_data()
    fg_updates = import_finished_goods_bpm()
    
    # Update database
    update_database(bottle_updates, fg_updates, dry_run=dry_run)
    
    if dry_run:
        print()
        print("To actually update the database, run:")
        print("   python import_production_data.py --migrate")
        print()
        print("This will:")
        print("   1. Run the migration to add new columns")
        print("   2. Import the production data from CSV files")

