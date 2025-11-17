"""
Test script for Listing Module API Endpoints
Tests the new /products/listing endpoints locally
"""

import json
from lambda_function import lambda_handler

def print_response(response):
    """Pretty print API response"""
    print(f"Status Code: {response['statusCode']}")
    print(f"Response Body:")
    body = json.loads(response['body'])
    print(json.dumps(body, indent=2))
    print("\n" + "="*80 + "\n")

def test_get_listing():
    """Test GET /products/listing"""
    print("TEST 1: Get Listing Dashboard Products")
    print("-" * 80)
    
    event = {
        'httpMethod': 'GET',
        'path': '/products/listing',
        'pathParameters': None,
        'body': None
    }
    
    response = lambda_handler(event, None)
    print_response(response)

def test_get_listing_detail(product_id=1):
    """Test GET /products/listing/{id}"""
    print(f"TEST 2: Get Product Details (ID: {product_id})")
    print("-" * 80)
    
    event = {
        'httpMethod': 'GET',
        'path': f'/products/listing/{product_id}',
        'pathParameters': {'id': str(product_id)},
        'body': None
    }
    
    response = lambda_handler(event, None)
    print_response(response)

def test_update_listing(product_id=1):
    """Test PUT /products/listing/{id}"""
    print(f"TEST 3: Update Product (ID: {product_id})")
    print("-" * 80)
    
    update_data = {
        'title': 'Updated Product Title',
        'vineEnrolled': True,
        'vineDate': '2024-11-17',
        'sixSidedFront': 'https://example.com/new-front-image.jpg'
    }
    
    event = {
        'httpMethod': 'PUT',
        'path': f'/products/listing/{product_id}',
        'pathParameters': {'id': str(product_id)},
        'body': json.dumps(update_data)
    }
    
    response = lambda_handler(event, None)
    print_response(response)

def test_invalid_product_id():
    """Test GET with invalid product ID"""
    print("TEST 4: Get Product Details (Invalid ID)")
    print("-" * 80)
    
    event = {
        'httpMethod': 'GET',
        'path': '/products/listing/99999',
        'pathParameters': {'id': '99999'},
        'body': None
    }
    
    response = lambda_handler(event, None)
    print_response(response)

def test_update_partial(product_id=1):
    """Test partial update - only update specific fields"""
    print(f"TEST 5: Partial Update (ID: {product_id})")
    print("-" * 80)
    
    update_data = {
        'aplusModule1': 'New A+ Module 1 Content',
        'searchTerms': 'updated search terms, keyword1, keyword2'
    }
    
    event = {
        'httpMethod': 'PUT',
        'path': f'/products/listing/{product_id}',
        'pathParameters': {'id': str(product_id)},
        'body': json.dumps(update_data)
    }
    
    response = lambda_handler(event, None)
    print_response(response)

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*80)
    print("LISTING MODULE API ENDPOINT TESTS")
    print("="*80 + "\n")
    
    try:
        # Test 1: Get all listing products
        test_get_listing()
        
        # Test 2: Get product details
        test_get_listing_detail(product_id=1)
        
        # Test 3: Update product (full)
        test_update_listing(product_id=1)
        
        # Test 4: Invalid product ID
        test_invalid_product_id()
        
        # Test 5: Partial update
        test_update_partial(product_id=1)
        
        print("="*80)
        print("ALL TESTS COMPLETED")
        print("="*80)
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    # Make sure you're in the lambda directory when running this
    import sys
    import os
    
    # Add lambda directory to path
    lambda_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, lambda_dir)
    
    print("Note: Make sure you have access to the PostgreSQL database before running tests.")
    print("Press Enter to continue or Ctrl+C to cancel...")
    input()
    
    run_all_tests()

