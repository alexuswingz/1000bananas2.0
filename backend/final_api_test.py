import requests
import json

API_BASE = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com'

print("=" * 80)
print("Final API Verification")
print("=" * 80)

# Test the inventory endpoint
print("\n🧪 Testing GET /production/products/inventory")
response = requests.get(f'{API_BASE}/production/products/inventory')
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    products = data.get('data', [])
    print(f"✅ Got {len(products)} products")
    
    # Check specific products mentioned in the screenshot
    cherry_tree = [p for p in products if 'Cherry Tree' in p.get('product_name', '') and p.get('size') == '8oz']
    christmas = [p for p in products if 'Christmas Cactus' in p.get('product_name', '')]
    
    if cherry_tree:
        p = cherry_tree[0]
        print(f"\n🌳 Cherry Tree Fertilizer (8oz):")
        print(f"   ASIN: {p.get('child_asin')}")
        print(f"   Bottle: {p.get('bottle_name')} → {p.get('bottle_inventory')} units")
        print(f"   Closure: {p.get('closure_name')} → {p.get('closure_inventory')} units")
        print(f"   Label: {p.get('label_location')} → {p.get('label_inventory')} units")
        print(f"   Formula: {p.get('formula_name')} → {p.get('formula_gallons_available')} gal")
        print(f"   ✅ Max Units: {p.get('max_units_producible')}")
    
    if christmas:
        p = christmas[0]
        print(f"\n🎄 Christmas Cactus Fertilizer ({p.get('size')}):")
        print(f"   ASIN: {p.get('child_asin')}")
        print(f"   Bottle: {p.get('bottle_name')} → {p.get('bottle_inventory')} units")
        print(f"   Closure: {p.get('closure_name')} → {p.get('closure_inventory')} units")
        print(f"   Label: {p.get('label_location')} → {p.get('label_inventory')} units")
        print(f"   Formula: {p.get('formula_name')} → {p.get('formula_gallons_available')} gal")
        print(f"   ✅ Max Units: {p.get('max_units_producible')}")
    
    # Count products with max_units = 0
    zero_max = [p for p in products if p.get('max_units_producible', 0) == 0]
    print(f"\n\n📊 Products with max_units = 0: {len(zero_max)} out of {len(products)}")
    
    if len(zero_max) > 0:
        print("\n  Sample products still with 0 max:")
        for p in zero_max[:5]:
            print(f"    {p.get('product_name')} ({p.get('size')})")
            if not p.get('bottle_name') or p.get('bottle_inventory', 0) == 0:
                print(f"      🔴 Bottle issue")
            if not p.get('closure_name') or p.get('closure_inventory', 0) == 0:
                print(f"      🔴 Closure issue")
            if not p.get('label_location') or p.get('label_inventory', 0) == 0:
                print(f"      🔴 Label issue")
            if not p.get('formula_name') or p.get('formula_gallons_available', 0) == 0:
                print(f"      🔴 Formula issue")
else:
    print(f"❌ Error: {response.text[:500]}")

print("\n" + "=" * 80)
print("🎯 Next Steps:")
print("=" * 80)
print("1. Ensure CORS is enabled in API Gateway for this route")
print("2. Deploy the API in API Gateway")
print("3. Hard refresh browser (Ctrl+Shift+R)")
print("4. Check browser console for CORS errors")
print()


