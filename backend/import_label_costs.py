"""
Import label costs data from Excel to database
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

def parse_label_costs():
    """Parse label costs from CSV"""
    print("=" * 80)
    print("PARSING LABEL COSTS DATA")
    print("=" * 80)
    print()
    
    df = pd.read_csv('label_costs.csv')
    
    # First row has column names
    # Expected columns: Size, Amount, Amount, Price, per amount, NaN, Fees, Amount, ...
    
    label_costs = []
    
    # Skip first row (headers)
    for i, row in df.iloc[1:].iterrows():
        # Parse row
        size = row.iloc[0]  # e.g., "5" x 8""
        quantity_range = row.iloc[1]  # e.g., "<20" or ">=20"
        quantity = row.iloc[2]  # e.g., 3000, 6000
        price = row.iloc[3]  # e.g., 334.91
        per_amount = row.iloc[4]  # e.g., "/thousand"
        
        # Skip if missing data
        if pd.isna(size) or pd.isna(quantity) or pd.isna(price):
            continue
        
        # Convert values
        size_clean = str(size).strip()
        quantity_val = int(float(quantity))
        price_val = float(price)
        
        # Determine min/max quantity based on range
        if '<' in str(quantity_range):
            # Less than 20 products
            min_qty = 0
            max_qty = 19
        elif '>=' in str(quantity_range):
            # 20 or more products
            min_qty = 20
            max_qty = 999999
        else:
            # Unknown range, skip
            continue
        
        label_costs.append({
            'label_size': size_clean,
            'min_quantity': min_qty,
            'max_quantity': max_qty,
            'quantity_level': quantity_val,
            'price_per_thousand': price_val
        })
        
        print(f"   {size_clean}: {min_qty}-{max_qty} products, {quantity_val:,} labels @ ${price_val}/thousand")
    
    print(f"\n   Total: {len(label_costs)} pricing tiers")
    print()
    
    return label_costs

def import_label_costs(dry_run=True):
    """Import label costs to database"""
    
    costs = parse_label_costs()
    
    if dry_run:
        print("=" * 80)
        print("DRY RUN MODE - No changes will be made")
        print("=" * 80)
        print()
        print(f"Would import {len(costs)} label cost entries")
        return
    
    print("=" * 80)
    print("IMPORTING TO DATABASE")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Clear existing label costs
        cursor.execute("DELETE FROM label_costs")
        print("Cleared existing label costs")
        print()
        
        # Insert new costs (only first entry per size/range to avoid duplicates)
        seen = set()
        for cost in costs:
            key = (cost['label_size'], cost['min_quantity'], cost['max_quantity'])
            if key in seen:
                continue  # Skip duplicate size/range combinations
            seen.add(key)
            
            cursor.execute("""
                INSERT INTO label_costs 
                (label_size, min_quantity, max_quantity, price_per_thousand, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                cost['label_size'],
                cost['min_quantity'],
                cost['max_quantity'],
                cost['price_per_thousand'],
                f"Base price for {cost['quantity_level']:,} labels"
            ))
        
        conn.commit()
        print(f"Imported {len(costs)} label cost entries")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

def run_migration():
    """Run the migration SQL"""
    print("=" * 80)
    print("RUNNING LABEL ORDERS MIGRATION")
    print("=" * 80)
    print()
    
    try:
        conn = psycopg2.connect(**RDS_CONFIG)
        cursor = conn.cursor()
        
        # Read migration file
        with open('migrations/004_create_label_orders.sql', 'r') as f:
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
    
    # Check for flags
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    run_migration_flag = '--migrate' in sys.argv or '-m' in sys.argv
    
    if run_migration_flag:
        print("\nRunning migration first...\n")
        run_migration()
    
    # Import costs
    import_label_costs(dry_run=dry_run)
    
    if dry_run:
        print()
        print("To actually update the database, run:")
        print("   python import_label_costs.py --migrate")

