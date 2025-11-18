"""
Script to extract product-to-formula mapping from Excel and create JSON file
This allows review before updating the database
"""

import pandas as pd
import json
from collections import defaultdict

def extract_formula_mapping():
    """
    Read Excel file and create JSON mapping of products to formulas
    """
    
    print("Reading Excel file: 1000 Bananas Database (2).xlsx")
    
    try:
        # Read Excel file - first check the structure
        excel_file = '1000 Bananas Database (2).xlsx'
        
        # Read all sheets to see what's available
        excel_data_preview = pd.read_excel(excel_file, sheet_name=None, header=None, nrows=5)
        
        print(f"\nFound {len(excel_data_preview)} sheet(s):")
        for sheet_name in excel_data_preview.keys():
            print(f"  - {sheet_name}")
        
        # Find the catalog sheet
        sheet_names_to_try = ['CatalogDataBase', 'Catalog', 'Products', 'Database', 'Main']
        sheet_used = None
        
        for sheet_name in sheet_names_to_try:
            if sheet_name in excel_data_preview:
                sheet_used = sheet_name
                break
        
        if sheet_used is None:
            # Use first sheet
            sheet_used = list(excel_data_preview.keys())[0]
        
        print(f"\nUsing sheet: {sheet_used}")
        
        # Read the first few rows to understand the header structure
        preview_df = excel_data_preview[sheet_used]
        print(f"\nFirst 5 rows to understand structure:")
        for idx, row in preview_df.iterrows():
            print(f"  Row {idx}: {list(row[:15])}...")  # Show first 15 columns
        
        # The Excel has multi-row headers. The actual column names are in row 4 (0-indexed)
        print(f"\nReading with header at row 4...")
        catalog_sheet = pd.read_excel(excel_file, sheet_name=sheet_used, header=4)
        
        print(f"   Total rows: {len(catalog_sheet)}")
        
        # Display all columns
        print(f"\nAll columns in sheet ({len(catalog_sheet.columns)}):")
        for idx, col in enumerate(catalog_sheet.columns, 1):
            print(f"  {idx:2}. {col}")
        
        # Identify relevant columns
        product_name_col = None
        formula_col = None
        child_asin_col = None
        size_col = None
        brand_col = None
        
        for col in catalog_sheet.columns:
            col_lower = col.lower()
            if 'product name' in col_lower or 'product_name' in col_lower:
                product_name_col = col
            elif col_lower == 'formula' and formula_col is None:
                # Prioritize exact "Formula" column over "Formula Name"
                formula_col = col
            elif 'formula name' in col_lower or 'formula_name' in col_lower:
                if formula_col is None:  # Only use if Formula column not found
                    formula_col = col
            elif 'child asin' in col_lower or 'child_asin' in col_lower or 'childasin' in col_lower:
                child_asin_col = col
            elif col_lower == 'size' and size_col is None:
                size_col = col
            elif 'brand' in col_lower and 'name' in col_lower:
                brand_col = col
        
        print(f"\nIdentified columns:")
        print(f"  - Product Name: {product_name_col}")
        print(f"  - Formula: {formula_col}")
        print(f"  - Brand: {brand_col}")
        print(f"  - Child ASIN: {child_asin_col}")
        print(f"  - Size: {size_col}")
        
        if not product_name_col:
            print("\nERROR: Could not find Product Name column!")
            print("\nPlease check the column names above and update the script if needed.")
            return None
        
        if not formula_col:
            print("\nERROR: Could not find Formula column!")
            print("\nPlease check the column names above and update the script if needed.")
            return None
        
        # Extract mapping
        print(f"\nExtracting product-to-formula mapping...")
        
        mapping_list = []
        products_with_formula = 0
        products_without_formula = 0
        unique_products = set()
        unique_formulas = set()
        
        for idx, row in catalog_sheet.iterrows():
            product_name = row[product_name_col]
            formula = row[formula_col]
            
            # Skip if product name is null
            if pd.isna(product_name):
                continue
            
            product_name_str = str(product_name).strip()
            unique_products.add(product_name_str)
            
            # Get additional info
            size = str(row[size_col]).strip() if size_col and not pd.isna(row[size_col]) else None
            child_asin = str(row[child_asin_col]).strip() if child_asin_col and not pd.isna(row[child_asin_col]) else None
            brand = str(row[brand_col]).strip() if brand_col and not pd.isna(row[brand_col]) else None
            
            # Check if formula exists
            if pd.isna(formula) or str(formula).strip() == '' or str(formula).lower() == 'nan':
                products_without_formula += 1
                formula_str = None
            else:
                formula_str = str(formula).strip()
                unique_formulas.add(formula_str)
                products_with_formula += 1
            
            # Create mapping entry
            entry = {
                "product_name": product_name_str,
                "size": size,
                "child_asin": child_asin,
                "brand": brand,
                "formula": formula_str
            }
            
            mapping_list.append(entry)
        
        # Create summary
        summary = {
            "total_rows": len(mapping_list),
            "products_with_formula": products_with_formula,
            "products_without_formula": products_without_formula,
            "unique_products": len(unique_products),
            "unique_formulas": len(unique_formulas),
            "excel_file": excel_file,
            "sheet_used": sheet_used
        }
        
        # Group by product name for easier review
        products_by_name = defaultdict(list)
        for entry in mapping_list:
            products_by_name[entry["product_name"]].append({
                "size": entry["size"],
                "child_asin": entry["child_asin"],
                "brand": entry["brand"],
                "formula": entry["formula"]
            })
        
        # Create final output
        output = {
            "summary": summary,
            "mapping": {
                "by_product_name": dict(products_by_name),
                "all_rows": mapping_list
            },
            "unique_formulas": sorted(list(unique_formulas))
        }
        
        # Save to JSON
        output_file = 'formula_mapping_extracted.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"\nExtraction complete!")
        print(f"\nSummary:")
        print(f"  - Total rows: {len(mapping_list)}")
        print(f"  - Products with formula: {products_with_formula}")
        print(f"  - Products without formula: {products_without_formula}")
        print(f"  - Unique products: {len(unique_products)}")
        print(f"  - Unique formulas: {len(unique_formulas)}")
        
        print(f"\nSaved to: {output_file}")
        
        # Show sample of formulas found
        if unique_formulas:
            print(f"\nSample formulas found:")
            for formula in sorted(list(unique_formulas))[:20]:
                count = sum(1 for entry in mapping_list if entry["formula"] == formula)
                print(f"  - {formula} ({count} products)")
            if len(unique_formulas) > 20:
                print(f"  ... and {len(unique_formulas) - 20} more")
        
        # Show sample of products
        print(f"\nSample products:")
        for product_name in sorted(list(unique_products))[:10]:
            variants = products_by_name[product_name]
            formulas = set(v["formula"] for v in variants if v["formula"])
            formula_display = ", ".join(formulas) if formulas else "No formula"
            print(f"  - {product_name} ({len(variants)} variants) -> {formula_display}")
        
        return output_file
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    print("=" * 80)
    print("FORMULA MAPPING EXTRACTOR")
    print("=" * 80)
    result = extract_formula_mapping()
    if result:
        print(f"\nDone! Review the JSON file before updating the database.")
        print(f"\nNext steps:")
        print(f"  1. Review: {result}")
        print(f"  2. Verify the mappings are correct")
        print(f"  3. Run: python map_formulas_from_excel.py (to update database)")
    else:
        print(f"\nExtraction failed. Please check the error messages above.")
    print("=" * 80)

