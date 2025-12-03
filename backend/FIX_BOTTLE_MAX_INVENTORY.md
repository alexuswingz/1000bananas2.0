# Fix Bottle Max Inventory Inconsistency

## Problem

Some bottles of the same size have different `max_warehouse_inventory` values:

```
16oz Round Cylinder Clear:  null
16oz Round Cylinder White:  3300  ✓
16oz Square Cylinder Clear: null
16oz Square Cylinder White: 3300  ✓
```

This causes the inventory percentage to show "Unlimited" instead of calculating correctly.

## Solution

Run the SQL script to standardize max values by size:

```bash
psql -h bananas-db.cf6s2y8ae04j.ap-southeast-2.amazonaws.com \
     -U postgres \
     -d postgres \
     -f backend/fix_bottle_max_inventory.sql
```

Or run directly in PostgreSQL:

```sql
-- 16oz bottles → 3300
UPDATE bottle SET max_warehouse_inventory = 3300 WHERE bottle_name LIKE '%16oz%';

-- 8oz bottles → 58240
UPDATE bottle SET max_warehouse_inventory = 58240 WHERE bottle_name LIKE '%8oz%';

-- 3oz bottles → 8370
UPDATE bottle SET max_warehouse_inventory = 8370 WHERE bottle_name LIKE '%3oz%';

-- 6oz bottles → 6768
UPDATE bottle SET max_warehouse_inventory = 6768 WHERE bottle_name LIKE '%6oz%';

-- Quart bottles → 8640
UPDATE bottle SET max_warehouse_inventory = 8640 WHERE bottle_name LIKE '%Quart%';

-- Gallon bottles → 2304
UPDATE bottle SET max_warehouse_inventory = 2304 WHERE bottle_name LIKE '%Gallon%';
```

## Expected Result

After running the fix:

| Bottle Size | Max Warehouse Inventory |
|-------------|------------------------|
| 3oz | 8,370 |
| 6oz | 6,768 |
| 8oz | 58,240 |
| 16oz | 3,300 |
| Quart | 8,640 |
| Gallon | 2,304 |

## Verification

```sql
SELECT bottle_name, max_warehouse_inventory, warehouse_quantity
FROM bottle
ORDER BY bottle_name;
```

All bottles of the same size should have the same max value.

## Alternative: Update via API

If you don't have direct database access, you can add an admin endpoint in Lambda:

```python
def fix_bottle_max_inventory(event):
    """Admin endpoint to standardize max inventory by size"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        updates = {
            '3oz': 8370,
            '6oz': 6768,
            '8oz': 58240,
            '16oz': 3300,
            'Quart': 8640,
            'Gallon': 2304,
        }
        
        for size, max_inv in updates.items():
            cursor.execute("""
                UPDATE bottle 
                SET max_warehouse_inventory = %s 
                WHERE bottle_name LIKE %s
            """, (max_inv, f'%{size}%'))
        
        conn.commit()
        return cors_response(200, {'success': True, 'message': 'Updated all bottle max inventories'})
    except Exception as e:
        conn.rollback()
        return cors_response(500, {'success': False, 'error': str(e)})
    finally:
        cursor.close()
        conn.close()
```

Then call: `POST /admin/fix-bottle-max-inventory`



