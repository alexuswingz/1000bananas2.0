# Backend - 1000 Bananas Database

## Overview

This backend contains your product data from the 1000 Bananas catalog, now hosted on **AWS RDS PostgreSQL** with proper relationships and indexed for performance.

## Database

- **Type**: PostgreSQL (AWS RDS)
- **Host**: `bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com`
- **Port**: 5432
- **Database**: `postgres`
- **Records**: 910 products + reference data
- **Schema**: `database_schema_postgres.sql`
- **Backup**: `database.db` (SQLite backup)

### Tables

| Table | Records | Description |
|-------|---------|-------------|
| `catalog` | 910 | Complete product catalog with 15 sectioned data areas |
| `bottle` | 9 | Bottle specifications (dimensions, suppliers, inventory) |
| `formula` | 78 | Product formulas (guaranteed analysis, NPK, storage) |
| `brand` | 8 | Brand information (addresses, websites, emails) |
| `closure` | 8 | Closure/cap specifications |
| `bag` | 5 | Bag packaging specifications |
| `kit` | 3 | Kit packaging specifications |
| `finished_goods` | 17 | Finished goods specifications |

### Relationships

```
catalog.packaging_name → bottle.bottle_name
catalog.formula_name → formula.formula
catalog.brand_name → brand.brand_name
catalog.closure_name → closure.closure_name
```

## Files

### Essential Files

- `database.db` - The SQLite database
- `database_schema.sql` - Complete schema definition
- `import_to_sqlite.py` - Import script (reusable for updates)
- `requirements.txt` - Python dependencies
- `DATABASE_COMPLETE.md` - Full documentation with examples
- `1000 Bananas Database (2).xlsx` - Original source data

### JSON Exports (`json_exports/`)

Clean, structured JSON files for backup and reference:
- `catalog_database_clean.json` (3.5 MB) - All 910 products
- `bottle_database_clean.json` - 9 bottles (sectioned)
- `formula_database_clean.json` - 78 formulas
- `brand_database_clean.json` - 8 brands
- `closure_database_clean.json` - 8 closures
- `bag_database_clean.json` - 5 bags
- `kit_database_clean.json` - 3 kits
- `finished_goods_database_clean.json` - 17 items

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Connect to Database

```python
from db_config import get_connection

# Connect to PostgreSQL
conn = get_connection()
cursor = conn.cursor()

# Query products
cursor.execute("SELECT * FROM catalog LIMIT 10")
products = cursor.fetchall()

cursor.close()
conn.close()
```

Or manually:

```python
import psycopg2

conn = psycopg2.connect(
    host='bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    port=5432,
    database='postgres',
    user='postgres',
    password='postgres'
)
```

### 3. Re-migrate to PostgreSQL (if needed)

```bash
python migrate_to_postgres.py
```

This will:
- Drop all existing PostgreSQL tables
- Recreate the schema on RDS
- Import all data from SQLite
- Verify the migration

To rebuild SQLite from JSON:

```bash
python import_to_sqlite.py
```

## Example Queries

### Get Product with Relationships

```sql
SELECT 
    c.product_name,
    c.size,
    c.price,
    b.bottle_name,
    b.length_in AS bottle_length,
    b.width_in AS bottle_width,
    b.height_in AS bottle_height,
    f.guaranteed_analysis,
    f.npk,
    br.brand_address
FROM catalog c
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN brand br ON c.brand_name = br.brand_name
WHERE c.brand_name = 'TPS Plant Foods'
LIMIT 10;
```

### Count Products by Brand

```sql
SELECT 
    brand_name, 
    COUNT(*) as product_count
FROM catalog
GROUP BY brand_name
ORDER BY product_count DESC;
```

### Find Products by Size

```sql
SELECT 
    product_name,
    size,
    price,
    parent_asin,
    child_asin
FROM catalog
WHERE size = 'Gallon'
ORDER BY product_name;
```

## Next Steps

✅ Database created and populated
✅ JSON backups available
✅ Schema documented

**Ready for:**
- API endpoint development (Flask/FastAPI)
- Frontend integration
- Data analysis and reporting
- Production deployment

## Notes

- Foreign key relationships are defined but not enforced (for flexibility)
- All dates are in ISO format (YYYY-MM-DD)
- NULL values preserved for empty fields
- Timestamps track creation and updates automatically
- Indexes created on all frequently queried fields

