"""
Script to map formula names from Excel to catalog database
Reads the 1000 Bananas Database (2).xlsx and updates the catalog table with formula_name
"""

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from db_config import DB_CONFIG

def map_formulas_from_excel():
    """
    Read Excel file and update catalog table with formula names
    """
    
    # Read Excel file
    print("Reading Excel file...")
    try:
        excel_file = '1000 Bananas Database (2).xlsx'
        sheet_name = 'CatalogDataBase'
        
        # Read with header at row 4 (0-indexed)
        print(f"Reading sheet: {sheet_name}")
        catalog_sheet = pd.read_excel(excel_file, sheet_name=sheet_name, header=4)
        
        print(f"Total rows: {len(catalog_sheet)}")
        
        # Display column names
        print(f"\nColumns found ({len(catalog_sheet.columns)}):")
        for col in catalog_sheet.columns[:25]:  # Show first 25 columns
            print(f"  - {col}")
        
        # Look for relevant columns
        product_name_col = None
        formula_col = None
        child_asin_col = None
        size_col = None
        
        for col in catalog_sheet.columns:
            col_lower = col.lower()
            if 'product name' in col_lower:
                product_name_col = col
            elif col_lower == 'formula' and formula_col is None:
                formula_col = col
            elif 'child asin' in col_lower:
                child_asin_col = col
            elif col_lower == 'size' and size_col is None:
                size_col = col
        
        print(f"\nIdentified columns:")
        print(f"  - Product Name: {product_name_col}")
        print(f"  - Formula: {formula_col}")
        print(f"  - Child ASIN: {child_asin_col}")
        print(f"  - Size: {size_col}")
        
        if not product_name_col:
            print("\nERROR: Could not find Product Name column")
            return
        
        if not formula_col:
            print("\nERROR: Could not find Formula column")
            return
        
        # Connect to database
        print("\nConnecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current catalog data
        print("Fetching current catalog data...")
        cursor.execute("""
            SELECT id, product_name, size, child_asin, formula_name
            FROM catalog
            ORDER BY id
        """)
        catalog_db = cursor.fetchall()
        print(f"Found {len(catalog_db)} products in database")
        
        # Create mapping dictionary from Excel
        print("\nCreating formula mapping from Excel...")
        excel_mapping = {}
        
        for idx, row in catalog_sheet.iterrows():
            product_name = row[product_name_col]
            formula = row[formula_col]
            
            # Skip if product name or formula is null/empty
            if pd.isna(product_name) or pd.isna(formula) or str(formula).strip() == '':
                continue
            
            # Create key based on product name and size (if available)
            key_parts = [str(product_name).strip()]
            
            if size_col and not pd.isna(row[size_col]):
                key_parts.append(str(row[size_col]).strip())
            elif child_asin_col and not pd.isna(row[child_asin_col]):
                key_parts.append(str(row[child_asin_col]).strip())
            
            key = '|'.join(key_parts)
            excel_mapping[key] = str(formula).strip()
        
        print(f"Created mapping for {len(excel_mapping)} products")
        
        # Update database
        print("\nUpdating catalog with formula names...")
        updated_count = 0
        not_found_count = 0
        already_set_count = 0
        
        for product in catalog_db:
            # Try to find matching formula
            key_options = [
                f"{product['product_name']}|{product['size']}" if product['size'] else None,
                f"{product['product_name']}|{product['child_asin']}" if product['child_asin'] else None,
                product['product_name']
            ]
            
            formula_name = None
            for key in key_options:
                if key and key in excel_mapping:
                    formula_name = excel_mapping[key]
                    break
            
            if formula_name:
                # Check if already set
                if product['formula_name'] == formula_name:
                    already_set_count += 1
                    continue
                
                # Update
                cursor.execute("""
                    UPDATE catalog
                    SET formula_name = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (formula_name, product['id']))
                updated_count += 1
                if updated_count <= 20:  # Only print first 20
                    print(f"  Updated #{product['id']}: {product['product_name']} ({product['size']}) -> {formula_name}")
            else:
                not_found_count += 1
                if not_found_count <= 10:  # Only print first 10
                    print(f"  No formula found for: {product['product_name']} ({product['size']})")
        
        # Commit changes
        conn.commit()
        
        # Summary
        print(f"\nSummary:")
        print(f"  Updated: {updated_count}")
        print(f"  Already set: {already_set_count}")
        print(f"  Not found in Excel: {not_found_count}")
        print(f"  Total products: {len(catalog_db)}")
        
        cursor.close()
        conn.close()
        
        print("\nDone! Formula mappings have been updated in the database.")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 80)
    print("FORMULA MAPPING - DATABASE UPDATE")
    print("=" * 80)
    map_formulas_from_excel()
    print("=" * 80)

