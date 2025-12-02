import psycopg2

conn = psycopg2.connect(
    host='bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    port=5432,
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

print("=" * 80)
print("Verifying All Catalog Mappings")
print("=" * 80)

# Count products with missing components
cursor.execute("""
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN packaging_name IS NULL THEN 1 END) as missing_bottle,
        COUNT(CASE WHEN closure_name IS NULL THEN 1 END) as missing_closure,
        COUNT(CASE WHEN formula_name IS NULL THEN 1 END) as missing_formula,
        COUNT(CASE WHEN label_location IS NULL THEN 1 END) as missing_label
    FROM catalog
    WHERE child_asin IS NOT NULL
""")

stats = cursor.fetchone()
print(f"\n📊 Catalog Statistics:")
print(f"  Total Products: {stats[0]}")
print(f"  Missing Bottles: {stats[1]}")
print(f"  Missing Closures: {stats[2]}")
print(f"  Missing Formulas: {stats[3]}")
print(f"  Missing Labels: {stats[4]}")

# If there are still missing closures, fix them
if stats[2] > 0:
    print(f"\n⚠️  Still {stats[2]} products with missing closures")
    
    # Get default closure for each bottle type
    cursor.execute("""
        SELECT packaging_name, closure_name
        FROM (
            SELECT 
                packaging_name, 
                closure_name,
                COUNT(*) as usage_count,
                ROW_NUMBER() OVER (PARTITION BY packaging_name ORDER BY COUNT(*) DESC) as rn
            FROM catalog
            WHERE packaging_name IS NOT NULL 
            AND closure_name IS NOT NULL
            GROUP BY packaging_name, closure_name
        ) ranked
        WHERE rn = 1
    """)
    
    default_closures = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Update products with missing closures
    cursor.execute("""
        SELECT id, product_name, size, packaging_name
        FROM catalog
        WHERE closure_name IS NULL
        AND packaging_name IS NOT NULL
    """)
    
    missing_products = cursor.fetchall()
    fixed = 0
    
    for pid, pname, size, bottle in missing_products:
        if bottle in default_closures:
            cursor.execute("""
                UPDATE catalog
                SET closure_name = %s
                WHERE id = %s
            """, (default_closures[bottle], pid))
            print(f"    ✅ Fixed: {pname} ({size})")
            fixed += 1
    
    conn.commit()
    print(f"\n  ✅ Fixed {fixed} more products")

# Show products with max_units = 0 due to missing components
print("\n\n❌ Products with max_units = 0 (need attention):")
cursor.execute("""
    SELECT 
        c.product_name,
        c.size,
        c.child_asin,
        CASE WHEN c.packaging_name IS NULL THEN 'Missing Bottle' 
             WHEN bi.warehouse_quantity IS NULL OR bi.warehouse_quantity = 0 THEN 'No Bottle Inventory'
             ELSE 'OK' END as bottle_status,
        CASE WHEN c.closure_name IS NULL THEN 'Missing Closure'
             WHEN ci.warehouse_quantity IS NULL OR ci.warehouse_quantity = 0 THEN 'No Closure Inventory'
             ELSE 'OK' END as closure_status,
        CASE WHEN c.label_location IS NULL THEN 'Missing Label'
             WHEN li.warehouse_inventory IS NULL OR li.warehouse_inventory = 0 THEN 'No Label Inventory'
             ELSE 'OK' END as label_status,
        CASE WHEN c.formula_name IS NULL THEN 'Missing Formula'
             WHEN fi.gallons_available IS NULL OR fi.gallons_available = 0 THEN 'No Formula Inventory'
             ELSE 'OK' END as formula_status
    FROM catalog c
    LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
    LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
    LEFT JOIN label_inventory li ON c.label_location = li.label_location
    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
    WHERE c.child_asin IS NOT NULL
    AND (
        c.packaging_name IS NULL OR bi.warehouse_quantity IS NULL OR bi.warehouse_quantity = 0 OR
        c.closure_name IS NULL OR ci.warehouse_quantity IS NULL OR ci.warehouse_quantity = 0 OR
        c.label_location IS NULL OR li.warehouse_inventory IS NULL OR li.warehouse_inventory = 0 OR
        c.formula_name IS NULL OR fi.gallons_available IS NULL OR fi.gallons_available = 0
    )
    LIMIT 20
""")

problem_products = cursor.fetchall()
print(f"  Found {len(problem_products)} products with issues:")
for row in problem_products:
    print(f"\n  {row[0]} ({row[1]}) - ASIN: {row[2]}")
    if row[3] != 'OK':
        print(f"    🔴 Bottle: {row[3]}")
    if row[4] != 'OK':
        print(f"    🔴 Closure: {row[4]}")
    if row[5] != 'OK':
        print(f"    🔴 Label: {row[5]}")
    if row[6] != 'OK':
        print(f"    🔴 Formula: {row[6]}")

cursor.close()
conn.close()

print("\n" + "=" * 80)


