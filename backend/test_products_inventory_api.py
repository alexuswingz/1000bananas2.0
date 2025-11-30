#!/usr/bin/env python3
"""
Test the /production/products/inventory endpoint directly
"""
import requests
import json

API_URL = "https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com/production/products/inventory"

def test_api():
    print(f"Testing API: {API_URL}")
    print("=" * 100)
    
    response = requests.get(API_URL)
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success'):
            products = data.get('data', [])
            print(f"\n✅ Success! Found {len(products)} products")
            
            # Find Cherry Tree products
            cherry_tree = [p for p in products if 'Cherry Tree' in p.get('product_name', '')]
            
            if cherry_tree:
                print(f"\n📦 Cherry Tree Fertilizer Products:")
                print("=" * 100)
                for product in cherry_tree:
                    print(f"\nProduct: {product.get('product_name')} ({product.get('size')})")
                    print(f"ASIN: {product.get('child_asin')}")
                    print(f"Bottle: {product.get('bottle_name')} (Inventory: {product.get('bottle_inventory')})")
                    print(f"Closure: {product.get('closure_name')} (Inventory: {product.get('closure_inventory')})")
                    print(f"Label: {product.get('label_location')} (Inventory: {product.get('label_inventory')})")
                    print(f"Formula: {product.get('formula_name')} (Gallons: {product.get('formula_gallons_available')})")
                    print(f"Gallons/Unit: {product.get('gallons_per_unit')}")
                    print(f"MAX PRODUCIBLE: {product.get('max_units_producible')} units")
            else:
                print("\n❌ No Cherry Tree products found in response")
                print("\nSample product (first 3):")
                for p in products[:3]:
                    print(f"- {p.get('product_name')} ({p.get('size')})")
        else:
            print(f"\n❌ API returned error: {data.get('error')}")
    else:
        print(f"\n❌ HTTP Error: {response.status_code}")
        print(f"Response: {response.text[:500]}")

if __name__ == '__main__':
    test_api()

