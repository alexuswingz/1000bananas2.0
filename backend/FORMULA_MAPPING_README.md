# Formula Mapping Script

## Overview
This script maps formula names from the Excel file (`1000 Bananas Database (2).xlsx`) to the `catalog` table in PostgreSQL.

## Database Structure

### Current Setup
- **catalog table**: Contains `formula_name` field (VARCHAR)
- **formula table**: Contains formula details with `formula` as primary key
- **Relationship**: `LEFT JOIN formula f ON c.formula_name = f.formula`

### How It Works
1. The `catalog` table has a `formula_name` column that stores the formula identifier (e.g., "F.10-10-10")
2. The `formula` table contains detailed information about each formula
3. When querying catalog data, the backend joins with the formula table to get complete formula details

## Running the Script

### Prerequisites
```bash
pip install pandas openpyxl psycopg2-binary
```

### Execute
```bash
cd backend
python map_formulas_from_excel.py
```

### What the Script Does

1. **Reads Excel File**
   - Opens `1000 Bananas Database (2).xlsx`
   - Identifies the main catalog sheet
   - Finds relevant columns: Product Name, Formula, Size, Child ASIN

2. **Creates Mapping**
   - Extracts product-to-formula relationships
   - Uses Product Name + Size/Child ASIN as unique identifiers
   - Builds mapping dictionary

3. **Updates Database**
   - Connects to PostgreSQL
   - Fetches current catalog data
   - Matches products with formulas
   - Updates `formula_name` field in catalog table

4. **Reports Results**
   - Number of products updated
   - Number already correctly mapped
   - Number not found in Excel

## Expected Output

```
📖 Reading Excel file...
✅ Found 1 sheets:
  - Sheet1 (500 rows)

📋 Using sheet: Sheet1

📊 Columns found (50):
  - Product Name
  - Formula Name
  - Size
  - Child ASIN
  ...

🔍 Identified columns:
  - Product Name: Product Name
  - Formula: Formula Name
  - Child ASIN: Child ASIN
  - Size: Size

🔌 Connecting to database...
📥 Fetching current catalog data...
✅ Found 709 products in database

🗺️  Creating formula mapping from Excel...
✅ Created mapping for 450 products

🔄 Updating catalog with formula names...
  ✓ Updated #1: African Violet Fertilizer (Gallon) → F.African Violet
  ✓ Updated #2: African Violet Fertilizer (Quart) → F.African Violet
  ...

📊 Summary:
  ✅ Updated: 450
  ℹ️  Already set: 50
  ⚠️  Not found in Excel: 209
  📦 Total products: 709

✨ Done!
```

## Backend API Impact

Once formulas are mapped, the backend API will automatically include formula data:

### Example Response
```json
{
  "success": true,
  "data": {
    "essentialInfo": {
      "formulaName": "F.10-10-10"
    },
    "formula": {
      "formulaName": "F.10-10-10",
      "category": "Plant",
      "type": "Liquid",
      "tps": {
        "guaranteedAnalysis": "GUARANTEED ANALYSIS\\nTotal Nitrogen...",
        "npk": "10 - 10 - 10",
        "derivedFrom": "DERIVED FROM: ascophyllum nodosum...",
        "storageWarranty": "STORAGE: Store in a cool and dark place..."
      }
    }
  }
}
```

## Verification

After running the script, verify the mapping:

```sql
-- Check updated products
SELECT 
    id, 
    product_name, 
    size, 
    formula_name
FROM catalog
WHERE formula_name IS NOT NULL
ORDER BY product_name, size
LIMIT 20;

-- Check products still missing formulas
SELECT 
    id, 
    product_name, 
    size, 
    child_asin
FROM catalog
WHERE formula_name IS NULL
ORDER BY product_name, size;

-- Verify formula relationships work
SELECT 
    c.product_name,
    c.size,
    c.formula_name,
    f.category,
    f.type,
    f.tps_npk
FROM catalog c
LEFT JOIN formula f ON c.formula_name = f.formula
WHERE c.formula_name IS NOT NULL
LIMIT 10;
```

## Troubleshooting

### Column Not Found
If the script can't find the Formula column:
1. Check the Excel file manually
2. Look for variations: "Formula", "Formula Name", "Form", etc.
3. Update the script's column detection logic if needed

### No Matches
If no products are matched:
1. Check if Product Names in Excel match database exactly
2. Verify Size values match between Excel and database
3. Try using Child ASIN as fallback identifier

### Database Connection Error
1. Verify PostgreSQL is running
2. Check `db_config.py` settings
3. Ensure you have write permissions

## Manual Mapping

If the script doesn't work, you can manually map formulas:

```sql
-- Example: Map all "10-10-10 Fertilizer" products to F.10-10-10
UPDATE catalog
SET formula_name = 'F.10-10-10'
WHERE product_name = '10-10-10 Fertilizer';

-- Example: Map by product name pattern
UPDATE catalog
SET formula_name = 'F.African Violet'
WHERE product_name LIKE '%African Violet%';

-- Example: Map specific product by Child ASIN
UPDATE catalog
SET formula_name = 'F.Monstera'
WHERE child_asin = 'B0BRTK1P8Z';
```

