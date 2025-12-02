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
print("Checking and Fixing Missing Closures in Catalog")
print("=" * 80)

# Find products with missing closures
cursor.execute("""
    SELECT id, product_name, brand_name, size, packaging_name, closure_name
    FROM catalog
    WHERE closure_name IS NULL
    AND packaging_name IS NOT NULL
    LIMIT 20
""")

missing = cursor.fetchall()
print(f"\n❌ Found {len(missing)} products with missing closures:")
for row in missing:
    print(f"  ID {row[0]}: {row[1]} ({row[2]}, {row[3]}) - Bottle: {row[4]}")

# Get common bottle-closure mappings
print("\n\n📋 Common Bottle → Closure Mappings:")
cursor.execute("""
    SELECT packaging_name, closure_name, COUNT(*) as count
    FROM catalog
    WHERE packaging_name IS NOT NULL 
    AND closure_name IS NOT NULL
    GROUP BY packaging_name, closure_name
    ORDER BY packaging_name, count DESC
""")

mappings = {}
for row in cursor.fetchall():
    bottle = row[0]
    closure = row[1]
    count = row[2]
    if bottle not in mappings:
        mappings[bottle] = closure
    print(f"  {bottle} → {closure} ({count} products)")

# Apply common mappings
print("\n\n🔧 Applying Closure Mappings:")
updates = 0
for product_id, product_name, brand, size, bottle, _ in missing:
    if bottle in mappings:
        closure = mappings[bottle]
        cursor.execute("""
            UPDATE catalog
            SET closure_name = %s
            WHERE id = %s
        """, (closure, product_id))
        print(f"  ✅ {product_name} ({size}): {bottle} → {closure}")
        updates += 1
    else:
        print(f"  ⚠️  {product_name} ({size}): No mapping for {bottle}")

conn.commit()

print(f"\n\n✅ Updated {updates} products")

# Verify - check products that now have closures
print("\n\n🔍 Verification - Sample Products Now:")
cursor.execute("""
    SELECT 
        c.product_name,
        c.size,
        c.packaging_name,
        c.closure_name,
        LEAST(
            COALESCE(bi.warehouse_quantity, 0),
            COALESCE(ci.warehouse_quantity, 0),
            COALESCE(li.warehouse_inventory, 0),
            CASE 
                WHEN c.size = 'Gallon' THEN FLOOR(COALESCE(fi.gallons_available, 0) / 1.0)
                ELSE FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
            END
        ) as max_units
    FROM catalog c
    LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
    LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
    LEFT JOIN label_inventory li ON c.label_location = li.label_location
    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
    WHERE c.product_name = 'Acid Loving Plants'
    AND c.size = 'Gallon'
""")

for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")
    print(f"    Bottle: {row[2]}")
    print(f"    Closure: {row[3]}")
    print(f"    ✅ Max Units: {row[4]}")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("✅ Closure mappings fixed!")
print("=" * 80)


