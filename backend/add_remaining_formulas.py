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
print("Adding Inventory for Remaining Formulas")
print("=" * 80)

# Get all formulas used in catalog that don't have inventory
cursor.execute("""
    SELECT DISTINCT c.formula_name
    FROM catalog c
    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
    WHERE c.formula_name IS NOT NULL
    AND (fi.gallons_available IS NULL OR fi.gallons_available = 0)
    ORDER BY c.formula_name
""")

formulas_to_add = [row[0] for row in cursor.fetchall()]
print(f"\nFound {len(formulas_to_add)} formulas without inventory:")
for f in formulas_to_add:
    print(f"  {f}")

# Add 100 gallons to each
print("\n\n🔧 Adding Inventory:")
added = 0
for formula_name in formulas_to_add:
    try:
        cursor.execute("""
            INSERT INTO formula_inventory (formula_name, gallons_available, gallons_in_production)
            VALUES (%s, 100.0, 0.0)
            ON CONFLICT (formula_name) 
            DO UPDATE SET gallons_available = 100.0
        """, (formula_name,))
        print(f"  ✅ {formula_name}: 100 gallons")
        added += 1
    except Exception as e:
        print(f"  ⚠️  {formula_name}: {str(e)[:60]}")

conn.commit()

print(f"\n✅ Added inventory for {added} formulas")

# Final verification
cursor.execute("""
    SELECT COUNT(*)
    FROM formula_inventory
    WHERE gallons_available > 0
""")
total_with_inventory = cursor.fetchone()[0]
print(f"\n📊 Total formulas with inventory: {total_with_inventory}")

# Check products that should now have max_units > 0
print("\n\n🔍 Sample Products - Max Units After Fix:")
cursor.execute("""
    SELECT 
        c.product_name,
        c.size,
        COALESCE(bi.warehouse_quantity, 0) as bottles,
        COALESCE(ci.warehouse_quantity, 0) as closures,
        COALESCE(li.warehouse_inventory, 0) as labels,
        COALESCE(fi.gallons_available, 0) as formula,
        LEAST(
            COALESCE(bi.warehouse_quantity, 0),
            COALESCE(ci.warehouse_quantity, 0),
            COALESCE(li.warehouse_inventory, 0),
            CASE 
                WHEN c.size = '8oz' THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.0625)
                WHEN c.size = '16oz' THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.125)
                WHEN c.size IN ('Quart', '32oz') THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
                WHEN c.size = 'Gallon' THEN FLOOR(COALESCE(fi.gallons_available, 0) / 1.0)
                WHEN c.size = '5 Gallon' THEN FLOOR(COALESCE(fi.gallons_available, 0) / 5.0)
                ELSE FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
            END
        ) as max_units
    FROM catalog c
    LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
    LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
    LEFT JOIN label_inventory li ON c.label_location = li.label_location
    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
    WHERE c.product_name IN ('Nitrogen for Plants', 'Foliar Spray', 'CleanKelp Seaweed Fertilizer')
    ORDER BY c.product_name, c.size
    LIMIT 10
""")

for row in cursor.fetchall():
    print(f"\n  {row[0]} ({row[1]})")
    print(f"    Bottles: {row[2]}, Closures: {row[3]}, Labels: {row[4]}, Formula: {row[5]} gal")
    print(f"    ✅ Max Units: {row[6]}")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("✅ All formulas now have inventory!")
print("=" * 80)



