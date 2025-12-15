"""
AWS Lambda Handler for Selection Module CRUD Operations
Connects to PostgreSQL RDS for product selection management
"""

import json
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime, date
from decimal import Decimal
import os
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Database configuration
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

# Forecast API configuration
FORECAST_API_URL = os.environ.get('FORECAST_API_URL', 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com')

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def get_forecast_data(asin):
    """
    Fetch forecast data from the forecast API endpoint
    Returns dict with avg_daily_sales and weekly_forecast_avg
    """
    try:
        url = f"{FORECAST_API_URL}/forecast/{asin}"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {
                'avg_daily_sales': data.get('avg_daily_sales', 0),
                'weekly_forecast_avg': data.get('weekly_forecast_avg', 0),
                'daily_forecast_avg': data.get('daily_forecast_avg', 0)
            }
    except (urllib.error.URLError, urllib.error.HTTPError, Exception) as e:
        # If forecast API fails, return 0 (will use fallback in queries)
        print(f"Forecast API error for {asin}: {str(e)}")
        return {
            'avg_daily_sales': 0,
            'weekly_forecast_avg': 0,
            'daily_forecast_avg': 0
        }

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def cors_response(status_code, body):
    """Create CORS-enabled response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
        },
        'body': json.dumps(body, default=decimal_default)
    }

def get_selections(event):
    """GET /selection - List all products from catalog for selection view, grouped by product name"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Fetch all catalog products with selection-relevant fields
        cursor.execute("""
            SELECT 
                id,
                notes->>'status' as status,
                seller_account as account,
                brand_name as brand,
                product_name as product,
                size,
                child_asin,
                parent_asin,
                CAST(notes->>'searchVol' as INTEGER) as "searchVol",
                COALESCE(notes->>'actionType', 'launch') as "actionType",
                notes->>'templateId' as "templateId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM catalog
            ORDER BY product_name, size, created_at DESC
        """)
        
        products = cursor.fetchall()
        
        # Group products by product name (combine variations)
        grouped = {}
        for row in products:
            product = dict(row)
            product_name = product.get('product')
            
            # Skip if no product name
            if not product_name:
                continue
            
            if product_name not in grouped:
                # First entry for this product
                grouped[product_name] = {
                    'id': product.get('id'),
                    'status': product.get('status'),
                    'account': product.get('account'),
                    'brand': product.get('brand'),
                    'product': product_name,
                    'searchVol': product.get('searchVol') or 0,
                    'actionType': product.get('actionType'),
                    'templateId': product.get('templateId'),
                    'createdAt': product.get('createdAt').isoformat() if product.get('createdAt') else None,
                    'updatedAt': product.get('updatedAt').isoformat() if product.get('updatedAt') else None,
                    'variations': [],
                    'variationCount': 0
                }
            
            # Always add to variations array (even if size is null)
            grouped[product_name]['variations'].append({
                'id': product.get('id'),
                'size': product.get('size') or '',
                'childAsin': product.get('child_asin'),
                'parentAsin': product.get('parent_asin')
            })
            grouped[product_name]['variationCount'] += 1
        
        # Convert to list and add variation count info
        result = []
        for product_name, product_data in grouped.items():
            # Show variation count in product name if > 1
            if product_data['variationCount'] > 1:
                product_data['displayName'] = f"{product_name} ({product_data['variationCount']} variations)"
            else:
                product_data['displayName'] = product_name
            result.append(product_data)
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def create_selection(event):
    """POST /selection - Create new product in catalog"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        if not body.get('product'):
            return cors_response(400, {
                'success': False,
                'error': 'Product name is required'
            })
        
        if not body.get('status'):
            return cors_response(400, {
                'success': False,
                'error': 'Status is required'
            })
        
        # Build notes JSON for status, searchVol, actionType, templateId
        notes_data = {
            'status': body.get('status'),
            'searchVol': body.get('searchVol', 0),
            'actionType': body.get('actionType', 'launch'),
            'templateId': body.get('templateId')
        }
        
        # Insert product into catalog
        cursor.execute("""
            INSERT INTO catalog (
                product_name, seller_account, brand_name, marketplace,
                notes, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING id, product_name, seller_account, brand_name,
                      notes, created_at, updated_at
        """, (
            body.get('product'),
            body.get('account', ''),
            body.get('brand', ''),
            'Amazon',
            json.dumps(notes_data),
            datetime.now(),
            datetime.now()
        ))
        
        result = cursor.fetchone()
        conn.commit()
        
        # Format response
        product = {
            'id': result['id'],
            'product': result['product_name'],
            'account': result['seller_account'],
            'brand': result['brand_name'],
            'status': notes_data['status'],
            'searchVol': notes_data['searchVol'],
            'actionType': notes_data['actionType'],
            'templateId': notes_data['templateId'],
            'createdAt': result['created_at'].isoformat() if result.get('created_at') else None,
            'updatedAt': result['updated_at'].isoformat() if result.get('updated_at') else None
        }
        
        cursor.close()
        conn.close()
        
        return cors_response(201, {
            'success': True,
            'data': product
        })
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return cors_response(500, {
            'success': False,
            'error': str(e)
        })

def update_selection(event):
    """PUT /selection/{id} - Update product in catalog"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        # Build notes JSON
        notes_data = {
            'status': body.get('status'),
            'searchVol': body.get('searchVol', 0),
            'actionType': body.get('actionType', 'launch'),
            'templateId': body.get('templateId')
        }
        
        # Update product in catalog
        cursor.execute("""
            UPDATE catalog
            SET product_name = %s,
                seller_account = %s,
                brand_name = %s,
                notes = %s::jsonb,
                updated_at = %s
            WHERE id = %s
            RETURNING id, product_name, seller_account, brand_name,
                      notes, created_at, updated_at
        """, (
            body.get('product'),
            body.get('account', ''),
            body.get('brand', ''),
            json.dumps(notes_data),
            datetime.now(),
            product_id
        ))
        
        result = cursor.fetchone()
        
        if not result:
            conn.rollback()
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        conn.commit()
        
        # Format response
        product = {
            'id': result['id'],
            'product': result['product_name'],
            'account': result['seller_account'],
            'brand': result['brand_name'],
            'status': notes_data['status'],
            'searchVol': notes_data['searchVol'],
            'actionType': notes_data['actionType'],
            'templateId': notes_data['templateId'],
            'createdAt': result['created_at'].isoformat() if result.get('created_at') else None,
            'updatedAt': result['updated_at'].isoformat() if result.get('updated_at') else None
        }
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': product
        })
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return cors_response(500, {
            'success': False,
            'error': str(e)
        })

def delete_selection(event):
    """DELETE /selection/{id} - Delete product from catalog"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        product_id = event['pathParameters']['id']
        
        # Delete product from catalog
        cursor.execute("DELETE FROM catalog WHERE id = %s", (product_id,))
        
        if cursor.rowcount == 0:
            conn.rollback()
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'message': 'Product deleted successfully'
        })
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return cors_response(500, {
            'success': False,
            'error': str(e)
        })

def launch_product(event):
    """PATCH /selection/{id}/launch - Mark product as launched (ready for full details)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        
        # Get product from catalog
        cursor.execute("""
            SELECT id, product_name, notes FROM catalog WHERE id = %s
        """, (product_id,))
        
        product = cursor.fetchone()
        
        if not product:
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        # Update notes to mark as launched
        notes = product['notes'] if isinstance(product['notes'], dict) else {}
        notes['actionType'] = 'launched'
        
        cursor.execute("""
            UPDATE catalog
            SET notes = %s::jsonb,
                updated_at = %s
            WHERE id = %s
        """, (json.dumps(notes), datetime.now(), product_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'message': 'Product marked as launched',
            'productId': product_id
        })
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return cors_response(500, {
            'success': False,
            'error': str(e)
        })

def get_development(event):
    """GET /products/development - List products for development view with section statuses"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Fetch all catalog products INCLUDING status from notes
        cursor.execute("""
            SELECT 
                id,
                product_name,
                brand_name,
                seller_account,
                size,
                notes->>'status' as status,
                
                -- Essential Info fields
                marketplace, country, type, formula_name, upc,
                
                -- Formula/Form fields
                guaranteed_analysis, npk, derived_from, msds,
                
                -- Design fields
                product_image_url, label_ai_file, label_print_ready_pdf,
                stock_image, six_sided_image_front,
                
                -- Listing fields
                title, bullets, description, parent_asin, child_asin,
                parent_sku_final, child_sku_final,
                
                -- Production fields
                packaging_name, closure_name, case_size, units_per_case,
                
                -- Pack/Packaging fields
                product_dimensions_length_in, product_dimensions_width_in,
                product_dimensions_height_in, product_dimensions_weight_lbs,
                
                -- Labels fields
                label_size, label_location, tps_directions,
                
                -- Ads/Marketing fields
                core_competitor_asins, core_keywords, price,
                
                created_at,
                updated_at
            FROM catalog
            WHERE product_name IS NOT NULL
            ORDER BY product_name, size
        """)
        
        products = cursor.fetchall()
        
        # Group by product name and evaluate status for each section
        grouped = {}
        
        for row in products:
            product = dict(row)
            product_name = product.get('product_name')
            
            if not product_name:
                continue
            
            if product_name not in grouped:
                # Evaluate Essential Info status
                essential_fields = ['marketplace', 'country', 'brand_name', 'product_name', 'type']
                essential_filled = sum(1 for f in essential_fields if product.get(f))
                essential_status = 'completed' if essential_filled == len(essential_fields) else ('inProgress' if essential_filled > 0 else 'pending')
                
                # Evaluate Formula status
                form_fields = ['formula_name', 'guaranteed_analysis', 'npk', 'derived_from']
                form_filled = sum(1 for f in form_fields if product.get(f))
                form_status = 'completed' if form_filled >= 3 else ('inProgress' if form_filled > 0 else 'pending')
                
                # Evaluate Design status
                design_fields = ['product_image_url', 'label_ai_file', 'label_print_ready_pdf', 'stock_image']
                design_filled = sum(1 for f in design_fields if product.get(f))
                design_status = 'completed' if design_filled >= 3 else ('inProgress' if design_filled > 0 else 'pending')
                
                # Evaluate Listing status
                listing_fields = ['title', 'bullets', 'description', 'parent_asin', 'child_asin']
                listing_filled = sum(1 for f in listing_fields if product.get(f))
                listing_status = 'completed' if listing_filled >= 4 else ('inProgress' if listing_filled > 0 else 'pending')
                
                # Evaluate Production status
                prod_fields = ['packaging_name', 'closure_name', 'case_size', 'units_per_case']
                prod_filled = sum(1 for f in prod_fields if product.get(f))
                prod_status = 'completed' if prod_filled >= 3 else ('inProgress' if prod_filled > 0 else 'pending')
                
                # Evaluate Pack/Dimensions status
                pack_fields = ['product_dimensions_length_in', 'product_dimensions_width_in', 'product_dimensions_height_in', 'product_dimensions_weight_lbs']
                pack_filled = sum(1 for f in pack_fields if product.get(f))
                pack_status = 'completed' if pack_filled == 4 else ('inProgress' if pack_filled > 0 else 'pending')
                
                # Evaluate Labels status
                label_fields = ['label_size', 'label_location', 'tps_directions']
                label_filled = sum(1 for f in label_fields if product.get(f))
                label_status = 'completed' if label_filled >= 2 else ('inProgress' if label_filled > 0 else 'pending')
                
                # Evaluate Ads/Marketing status
                ads_fields = ['core_competitor_asins', 'core_keywords', 'price']
                ads_filled = sum(1 for f in ads_fields if product.get(f))
                ads_status = 'completed' if ads_filled >= 2 else ('inProgress' if ads_filled > 0 else 'pending')
                
                grouped[product_name] = {
                    'id': product.get('id'),
                    'status': product.get('status'),  # ADD STATUS HERE
                    'account': product.get('seller_account') or '',
                    'brand': product.get('brand_name') or '',
                    'product': product_name,
                    'essentialInfo': essential_status,
                    'form': form_status,
                    'design': design_status,
                    'listing': listing_status,
                    'prod': prod_status,
                    'pack': pack_status,
                    'labels': label_status,
                    'ads': ads_status,
                    'createdAt': product.get('created_at').isoformat() if product.get('created_at') else None,
                    'updatedAt': product.get('updated_at').isoformat() if product.get('updated_at') else None
                }
        
        result = list(grouped.values())
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def get_catalog_parents(event):
    """GET /products/catalog - Get all parent products (grouped by product name)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Fetch unique products (parent view)
        cursor.execute("""
            SELECT DISTINCT ON (product_name)
                id,
                marketplace,
                seller_account,
                brand_name,
                product_name,
                parent_asin,
                created_at,
                updated_at
            FROM catalog
            WHERE product_name IS NOT NULL
            ORDER BY product_name, created_at DESC
        """)
        
        products = cursor.fetchall()
        
        result = []
        for row in products:
            product = dict(row)
            result.append({
                'id': product.get('id'),
                'marketplace': product.get('marketplace') or 'Amazon',
                'account': product.get('seller_account') or '',
                'brand': product.get('brand_name') or '',
                'product': product.get('product_name') or '',
                'parentAsin': product.get('parent_asin') or '',
                'createdAt': product.get('created_at').isoformat() if product.get('created_at') else None,
                'updatedAt': product.get('updated_at').isoformat() if product.get('updated_at') else None
            })
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def get_catalog_children(event):
    """GET /products/catalog/children - Get all child products (all variations)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Fetch all variations (child view)
        cursor.execute("""
            SELECT 
                id,
                marketplace,
                seller_account,
                brand_name,
                product_name,
                size,
                child_asin,
                child_sku_final,
                created_at,
                updated_at
            FROM catalog
            WHERE product_name IS NOT NULL
            ORDER BY product_name, 
                CASE 
                    WHEN size = '8oz' THEN 1
                    WHEN size = '16oz' THEN 2
                    WHEN size = 'Quart' THEN 3
                    WHEN size = '32oz' THEN 4
                    WHEN size = 'Gallon' THEN 5
                    WHEN size = '5 Gallon' THEN 6
                    ELSE 7
                END
        """)
        
        products = cursor.fetchall()
        
        result = []
        for row in products:
            product = dict(row)
            product_display = product.get('product_name') or ''
            size = product.get('size')
            if size:
                product_display = f"{product_display} - {size}"
            
            result.append({
                'id': product.get('id'),
                'marketplace': product.get('marketplace') or 'Amazon',
                'account': product.get('seller_account') or '',
                'brand': product.get('brand_name') or '',
                'product': product_display,
                'childAsin': product.get('child_asin') or '',
                'childSku': product.get('child_sku_final') or '',
                'createdAt': product.get('created_at').isoformat() if product.get('created_at') else None,
                'updatedAt': product.get('updated_at').isoformat() if product.get('updated_at') else None
            })
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def get_catalog_detail(event):
    """GET /products/catalog/{id} - Get detailed product info with all fields"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        
        # Fetch product from catalog with all details and complete formula data
        cursor.execute("""
            SELECT 
                c.*,
                f.guaranteed_analysis as formula_guaranteed_analysis,
                f.npk as formula_npk,
                f.derived_from as formula_derived_from,
                f.storage_warranty_precautionary_metals as formula_storage_warranty,
                f.tps_guaranteed_analysis as formula_tps_guaranteed_analysis,
                f.tps_npk as formula_tps_npk,
                f.tps_derived_from as formula_tps_derived_from,
                f.tps_storage_warranty_precautionary_metals as formula_tps_storage_warranty
            FROM catalog c
            LEFT JOIN formula f ON c.formula_name = f.formula
            WHERE c.id = %s
        """, (product_id,))
        
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        # Convert to dict
        product = dict(result)
        product_name = product.get('product_name')
        
        # Fetch all variations for this product (by product_name) with complete formula data
        cursor.execute("""
            SELECT 
                c.*,
                f.guaranteed_analysis as var_guaranteed_analysis,
                f.npk as var_npk,
                f.derived_from as var_derived_from,
                f.storage_warranty_precautionary_metals as var_storage_warranty,
                f.tps_guaranteed_analysis as var_tps_guaranteed_analysis,
                f.tps_npk as var_tps_npk,
                f.tps_derived_from as var_tps_derived_from,
                f.tps_storage_warranty_precautionary_metals as var_tps_storage_warranty
            FROM catalog c
            LEFT JOIN formula f ON c.formula_name = f.formula
            WHERE c.product_name = %s
            ORDER BY 
                CASE 
                    WHEN c.size = '8oz' THEN 1
                    WHEN c.size = '16oz' THEN 2
                    WHEN c.size = 'Quart' THEN 3
                    WHEN c.size = '32oz' THEN 4
                    WHEN c.size = 'Gallon' THEN 5
                    WHEN c.size = '5 Gallon' THEN 6
                    ELSE 7
                END,
                c.size
        """, (product_name,))
        
        variations_results = cursor.fetchall()
        
        # Add variations to product data with complete information
        product['variations'] = []
        for var in variations_results:
            var_dict = dict(var)
            product['variations'].append(var_dict)
        
        # Structure the response for the listing detail tabs
        response_data = {
            'id': product.get('id'),
            'productName': product.get('product_name'),
            'brandName': product.get('brand_name'),
            'sellerAccount': product.get('seller_account'),
            
            # Essential Info Tab
            'essentialInfo': {
                'marketplace': product.get('marketplace'),
                'country': product.get('country'),
                'brandName': product.get('brand_name'),
                'productName': product.get('product_name'),
                'size': product.get('size'),
                'type': product.get('type'),
                'formulaName': product.get('formula_name'),
                'parentAsin': product.get('parent_asin'),
                'childAsin': product.get('child_asin'),
                'parentSku': product.get('parent_sku_final'),
                'childSku': product.get('child_sku_final'),
                'upc': product.get('upc')
            },
            
            # Product Images Tab
            'productImages': {
                'productImageUrl': product.get('product_image_url'),
                'basicWrapUrl': product.get('basic_wrap_url'),
                'plantBehindProductUrl': product.get('plant_behind_product_url'),
                'triBottleWrapUrl': product.get('tri_bottle_wrap_url')
            },
            
            # Slides Tab (6-sided images + Amazon slides)
            'slides': {
                'productImage': product.get('product_image_url'),
                'front': product.get('six_sided_image_front'),
                'back': product.get('six_sided_image_back'),
                'left': product.get('six_sided_image_left'),
                'right': product.get('six_sided_image_right'),
                'top': product.get('six_sided_image_top'),
                'bottom': product.get('six_sided_image_bottom'),
                'amazonSlide1': product.get('amazon_slide_1'),
                'amazonSlide2': product.get('amazon_slide_2'),
                'amazonSlide3': product.get('amazon_slide_3'),
                'amazonSlide4': product.get('amazon_slide_4'),
                'amazonSlide5': product.get('amazon_slide_5'),
                'amazonSlide6': product.get('amazon_slide_6'),
                'amazonSlide7': product.get('amazon_slide_7')
            },
            
            # A+ Content Tab
            'aplus': {
                'module1': product.get('amazon_a_plus_slide_1'),
                'module2': product.get('amazon_a_plus_slide_2'),
                'module3': product.get('amazon_a_plus_slide_3'),
                'module4': product.get('amazon_a_plus_slide_4'),
                'module5': product.get('amazon_a_plus_slide_5'),
                'module6': product.get('amazon_a_plus_slide_6')
            },
            
            # Finished Goods Specs Tab
            'finishedGoods': {
                'packagingName': product.get('packaging_name'),
                'closureName': product.get('closure_name'),
                'labelSize': product.get('label_size'),
                'labelLocation': product.get('label_location'),
                'caseSize': product.get('case_size'),
                'unitsPerCase': product.get('units_per_case'),
                'productDimensions': {
                    'length': product.get('product_dimensions_length_in'),
                    'width': product.get('product_dimensions_width_in'),
                    'height': product.get('product_dimensions_height_in'),
                    'weight': product.get('product_dimensions_weight_lbs')
                },
                'unitsSold30Days': product.get('units_sold_30_days'),
                'formula': {
                    'guaranteedAnalysis': product.get('formula_tps_guaranteed_analysis') or product.get('formula_tps_nutrients_guaranteed_analysis') or product.get('formula_bloom_city_guaranteed_analysis'),
                    'npk': product.get('formula_tps_npk') or product.get('formula_tps_nutrients_npk') or product.get('formula_bloom_city_npk'),
                    'derivedFrom': product.get('formula_tps_derived_from') or product.get('formula_tps_nutrients_derived_from') or product.get('formula_bloom_city_derived_from'),
                    'msds': product.get('msds'),
                    'storageWarranty': product.get('formula_tps_storage_warranty') or product.get('formula_tps_nutrients_storage_warranty') or product.get('formula_bloom_city_storage')
                }
            },
            
            # PDP Setup Tab (Listing Copy)
            'pdpSetup': {
                'title': product.get('title'),
                'bullets': product.get('bullets'),
                'description': product.get('description'),
                'searchTerms': product.get('search_terms'),
                'coreKeywords': product.get('core_keywords'),
                'otherKeywords': product.get('other_keywords'),
                'coreCompetitorAsins': product.get('core_competitor_asins'),
                'otherCompetitorAsins': product.get('other_competitor_asins')
            },
            
            # Stock Image Tab
            'stockImage': {
                'stockImage': product.get('stock_image'),
                'mainImage': product.get('product_image_url')
            },
            
            # Label Tab
            'label': {
                'labelImage': product.get('stock_image'),
                'labelAiFile': product.get('label_ai_file'),
                'labelPrintReadyPdf': product.get('label_print_ready_pdf')
            },
            
            # Label Copy Tab
            'labelCopy': {
                'leftSideBenefitGraphic': product.get('tps_left_side_benefit_graphic'),
                'directions': product.get('tps_directions'),
                'growingRecommendations': product.get('tps_growing_recommendations'),
                'qrCodeSection': product.get('qr_code_section'),
                'website': product.get('website'),
                'productTitle': product.get('product_title'),
                'centerBenefitStatement': product.get('center_benefit_statement'),
                'sizeCopyForLabel': product.get('size_copy_for_label'),
                'rightSideBenefitGraphic': product.get('right_side_benefit_graphic'),
                'ingredientStatement': product.get('ingredient_statement'),
                'tpsGuaranteedAnalysis': product.get('tps_guaranteed_analysis'),
                'tpsNpk': product.get('tps_npk'),
                'tpsDerivedFrom': product.get('tps_derived_from'),
                'tpsStorageWarrantyPrecautionaryMetals': product.get('tps_storage_warranty_precautionary_metals'),
                'tpsAddress': product.get('tps_address')
            },
            
            # Website Tab
            'website': {
                'websiteUrl': product.get('website'),
                'tbd': product.get('tbd')
            },
            
            # Formula Tab - Complete formula data from relationship
            'formula': {
                'formulaId': product.get('formula_id'),
                'formulaName': product.get('formula_name'),
                'category': product.get('formula_category'),
                'type': product.get('formula_type'),
                'filter': product.get('formula_filter'),
                'brands': {
                    'brand1': product.get('formula_brand_1'),
                    'brand2': product.get('formula_brand_2'),
                    'brand3': product.get('formula_brand_3'),
                    'brand4': product.get('formula_brand_4')
                },
                'tps': {
                    'guaranteedAnalysis': product.get('formula_tps_guaranteed_analysis'),
                    'npk': product.get('formula_tps_npk'),
                    'derivedFrom': product.get('formula_tps_derived_from'),
                    'storageWarranty': product.get('formula_tps_storage_warranty')
                },
                'tpsNutrients': {
                    'guaranteedAnalysis': product.get('formula_tps_nutrients_guaranteed_analysis'),
                    'npk': product.get('formula_tps_nutrients_npk'),
                    'derivedFrom': product.get('formula_tps_nutrients_derived_from'),
                    'storageWarranty': product.get('formula_tps_nutrients_storage_warranty')
                },
                'bloomCity': {
                    'npk': product.get('formula_bloom_city_npk'),
                    'ingredients': product.get('formula_bloom_city_ingredients'),
                    'guaranteedAnalysis': product.get('formula_bloom_city_guaranteed_analysis'),
                    'derivedFrom': product.get('formula_bloom_city_derived_from'),
                    'storage': product.get('formula_bloom_city_storage'),
                    'metals': product.get('formula_bloom_city_metals'),
                    'precautionaryStatements': product.get('formula_bloom_city_precautionary_statements')
                },
                'msds': product.get('msds')
            },
            
            # Vine Tab
            'vine': {
                'vineEnrolled': bool(product.get('vine_status')) if product.get('vine_status') else False,
                'vineStatus': product.get('vine_status'),
                'vineNotes': product.get('vine_program_notes'),
                'vineDate': product.get('vine_launch_date').isoformat() if product.get('vine_launch_date') else None,
                'unitsEnrolled': product.get('units_enrolled'),
                'vineReviews': product.get('vine_reviews'),
                'starRating': float(product.get('star_rating')) if product.get('star_rating') else None
            },
            
            # Variations
            'variations': product['variations'],
            
            'createdAt': product.get('created_at').isoformat() if product.get('created_at') else None,
            'updatedAt': product.get('updated_at').isoformat() if product.get('updated_at') else None
        }
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': response_data
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def update_catalog(event):
    """PUT /products/catalog/{id} - Update catalog product details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        
        # Map frontend fields to database columns
        field_mapping = {
            # Essential Info
            'marketplace': 'marketplace',
            'country': 'country',
            'brandName': 'brand_name',
            'productName': 'product_name',
            'size': 'size',
            'type': 'type',
            'formulaName': 'formula_name',
            'parentAsin': 'parent_asin',
            'childAsin': 'child_asin',
            'parentSku': 'parent_sku_final',
            'childSku': 'child_sku_final',
            'upc': 'upc',
            
            # Slides
            'productImage': 'product_image_url',
            'sixSidedFront': 'six_sided_image_front',
            'sixSidedBack': 'six_sided_image_back',
            'sixSidedLeft': 'six_sided_image_left',
            'sixSidedRight': 'six_sided_image_right',
            'sixSidedTop': 'six_sided_image_top',
            'sixSidedBottom': 'six_sided_image_bottom',
            
            # A+ Content
            'aplusModule1': 'aplus_module_1',
            'aplusModule2': 'aplus_module_2',
            'aplusModule3': 'aplus_module_3',
            'aplusModule4': 'aplus_module_4',
            
            # Finished Goods
            'packagingName': 'packaging_name',
            'closureName': 'closure_name',
            'labelSize': 'label_size',
            'labelLocation': 'label_location',
            'caseSize': 'case_size',
            'unitsPerCase': 'units_per_case',
            'productDimensionsLength': 'product_dimensions_length_in',
            'productDimensionsWidth': 'product_dimensions_width_in',
            'productDimensionsHeight': 'product_dimensions_height_in',
            'productDimensionsWeight': 'product_dimensions_weight_lbs',
            
            # PDP Setup
            'title': 'title',
            'bullets': 'bullets',
            'description': 'description',
            'searchTerms': 'search_terms',
            'coreKeywords': 'core_keywords',
            'otherKeywords': 'other_keywords',
            'coreCompetitorAsins': 'core_competitor_asins',
            'otherCompetitorAsins': 'other_competitor_asins'
        }
        
        for key, db_field in field_mapping.items():
            if key in body:
                update_fields.append(f"{db_field} = %s")
                values.append(body[key])
        
        # Handle vine data in notes field
        if 'vineEnrolled' in body or 'vineDate' in body:
            cursor.execute("SELECT notes FROM catalog WHERE id = %s", (product_id,))
            result = cursor.fetchone()
            notes = result['notes'] if result and isinstance(result['notes'], dict) else {}
            
            if 'vineEnrolled' in body:
                notes['vineEnrolled'] = body['vineEnrolled']
            if 'vineDate' in body:
                notes['vineDate'] = body['vineDate']
            
            update_fields.append("notes = %s::jsonb")
            values.append(json.dumps(notes))
        
        # Always update updated_at
        update_fields.append("updated_at = %s")
        values.append(datetime.now())
        
        # Add product_id to values
        values.append(product_id)
        
        if not update_fields:
            return cors_response(400, {
                'success': False,
                'error': 'No fields to update'
            })
        
        # Execute update
        query = f"""
            UPDATE catalog
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, product_name, brand_name, seller_account, updated_at
        """
        
        cursor.execute(query, values)
        result = cursor.fetchone()
        
        if not result:
            conn.rollback()
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'message': 'Product updated successfully',
            'data': {
            'id': result['id'],
                'productName': result['product_name'],
                'brandName': result['brand_name'],
                'sellerAccount': result['seller_account'],
            'updatedAt': result['updated_at'].isoformat() if result.get('updated_at') else None
        }
        })
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

# ============================================
# FORMULA CRUD ENDPOINTS
# ============================================

def get_all_formulas(event):
    """GET /team-workspaces/formula - Get all formulas"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT *
            FROM formula
            ORDER BY formula ASC
        """)
        
        formulas = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': [dict(row) for row in formulas],
            'count': len(formulas)
        })
        
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_formula_by_id(event):
    """GET /team-workspaces/formula/{id} - Get a specific formula by ID"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Extract formula ID from path
        path = event.get('path') or event.get('rawPath', '')
        formula_id = path.split('/')[-1]
        
        cursor.execute("""
            SELECT *
            FROM formula
            WHERE id = %s
        """, (formula_id,))
        
        formula = cursor.fetchone()
        
        if not formula:
            return cors_response(404, {
                'success': False,
                'error': f'Formula with ID {formula_id} not found'
            })
        
        return cors_response(200, {
            'success': True,
            'data': dict(formula)
        })
        
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_formula(event):
    """POST /team-workspaces/formula - Create a new formula"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Required fields
        formula_name = body.get('formula')
        if not formula_name:
            return cors_response(400, {
                'success': False,
                'error': 'Formula name is required'
            })
        
        # Build dynamic INSERT query
        columns = []
        values = []
        placeholders = []
        
        for key, value in body.items():
            if key not in ['id', 'created_at', 'updated_at']:  # Skip system fields
                # Handle special column names with quotes
                if "'" in key:
                    columns.append(f'"{key}"')
                else:
                    columns.append(key)
                values.append(value)
                placeholders.append('%s')
        
        columns_str = ', '.join(columns)
        placeholders_str = ', '.join(placeholders)
        
        # Insert new formula
        cursor.execute(f"""
            INSERT INTO formula ({columns_str})
            VALUES ({placeholders_str})
            RETURNING *
        """, tuple(values))
        
        new_formula = cursor.fetchone()
        conn.commit()
        
        return cors_response(201, {
            'success': True,
            'data': dict(new_formula),
            'message': 'Formula created successfully'
        })
        
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_formula(event):
    """PUT /team-workspaces/formula/{id} - Update an existing formula"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Extract formula ID from path
        path = event.get('path') or event.get('rawPath', '')
        formula_id = path.split('/')[-1]
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Build dynamic UPDATE query based on provided fields
        update_fields = []
        values = []
        
        for key, value in body.items():
            if key not in ['id', 'created_at', 'updated_at']:  # Skip system fields
                # Handle special column names with quotes
                if "'" in key:
                    update_fields.append(f'"{key}" = %s')
                else:
                    update_fields.append(f"{key} = %s")
                values.append(value)
        
        if not update_fields:
            return cors_response(400, {
                'success': False,
                'error': 'No fields to update'
            })
        
        # Add formula_id to values
        values.append(formula_id)
        
        # Execute update
        query = f"""
            UPDATE formula
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        cursor.execute(query, values)
        updated_formula = cursor.fetchone()
        
        if not updated_formula:
            return cors_response(404, {
                'success': False,
                'error': f'Formula with ID {formula_id} not found'
            })
        
        conn.commit()
        
        return cors_response(200, {
            'success': True,
            'data': dict(updated_formula),
            'message': 'Formula updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def delete_formula(event):
    """DELETE /team-workspaces/formula/{id} - Delete a formula"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Extract formula ID from path
        path = event.get('path') or event.get('rawPath', '')
        formula_id = path.split('/')[-1]
        
        # Check if formula exists
        cursor.execute("SELECT id, formula FROM formula WHERE id = %s", (formula_id,))
        formula = cursor.fetchone()
        
        if not formula:
            return cors_response(404, {
                'success': False,
                'error': f'Formula with ID {formula_id} not found'
            })
        
        # Delete the formula
        cursor.execute("DELETE FROM formula WHERE id = %s", (formula_id,))
        conn.commit()
        
        return cors_response(200, {
            'success': True,
            'message': f'Formula "{formula["formula"]}" deleted successfully',
            'deletedId': formula_id
        })
        
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# SUPPLY CHAIN - BOTTLE ENDPOINTS
# ============================================

def get_bottle_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT bi.*, b.bottles_per_minute, b.max_warehouse_inventory,
                   b.units_per_pallet, b.units_per_case, b.cases_per_pallet,
                   b.supplier, b.moq, b.lead_time_weeks
            FROM bottle_inventory bi
            LEFT JOIN bottle b ON bi.bottle_name = b.bottle_name
            ORDER BY bi.bottle_name
        """)
        inventory = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in inventory]})
    finally:
        cursor.close()
        conn.close()

def get_bottle_forecast_requirements(event):
    """GET /supply-chain/bottles/forecast-requirements - Calculate bottle requirements based on forecast API"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get query params for forecast period (default 120 days DOI goal)
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('doi_goal', 120))
        safety_buffer = float(query_params.get('safety_buffer', 0.85))  # Default 85% max capacity
        
        # Get all products grouped by bottle type
        cursor.execute("""
            SELECT 
                c.packaging_name as bottle_name,
                c.child_asin,
                c.product_name,
                c.size,
                b.max_warehouse_inventory,
                bi.warehouse_quantity as current_inventory
            FROM catalog c
            LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
            LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
            WHERE c.packaging_name IS NOT NULL
            ORDER BY c.packaging_name
        """)
        
        products = cursor.fetchall()
        
        # Fetch forecast data CONCURRENTLY for all ASINs
        forecast_cache = {}
        unique_asins = [p.get('child_asin') for p in products if p.get('child_asin')]
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_asin = {executor.submit(get_forecast_data, asin): asin for asin in unique_asins}
            for future in as_completed(future_to_asin):
                asin = future_to_asin[future]
                try:
                    forecast_cache[asin] = future.result()
                except Exception:
                    forecast_cache[asin] = {'daily_forecast_avg': 0, 'weekly_forecast_avg': 0}
        
        # Group by bottle and calculate forecasts from cached data
        bottle_data = {}
        for product in products:
            bottle_name = product['bottle_name']
            asin = product['child_asin']
            
            if bottle_name not in bottle_data:
                bottle_data[bottle_name] = {
                    'bottle_name': bottle_name,
                    'max_warehouse_inventory': product['max_warehouse_inventory'],
                    'current_inventory': product['current_inventory'] or 0,
                    'forecasted_units_needed': 0,
                    'products': []
                }
            
            # Get forecast from cache
            if asin and asin in forecast_cache:
                forecast = forecast_cache[asin]
                daily_forecast = forecast.get('daily_forecast_avg', 0) or forecast.get('avg_daily_sales', 0)
                units_needed = daily_forecast * doi_goal
                
                bottle_data[bottle_name]['forecasted_units_needed'] += units_needed
                bottle_data[bottle_name]['products'].append({
                    'product_name': product['product_name'],
                    'size': product['size'],
                    'daily_forecast_rate': round(daily_forecast, 2)
                })
        
        # Calculate recommended order quantities
        results = []
        for bottle_name, data in bottle_data.items():
            current_inv = data['current_inventory']
            forecasted = data['forecasted_units_needed']
            max_inventory = data['max_warehouse_inventory'] or 999999
            
            # Calculate available capacity
            available_capacity = max(0, (max_inventory * safety_buffer) - current_inv) if max_inventory < 999999 else 999999
            
            # Calculate recommended order quantity (capped by available capacity)
            recommended_qty = max(0, forecasted - current_inv)
            if max_inventory < 999999:
                recommended_qty = min(recommended_qty, available_capacity)
            
            results.append({
                'bottle_name': bottle_name,
                'max_warehouse_inventory': max_inventory,
                'current_inventory': current_inv,
                'forecasted_units_needed': round(forecasted, 2),
                'available_capacity': available_capacity,
                'recommended_order_qty': round(recommended_qty, 2),
                'products_using_bottle': data['products']
            })
        
        return cors_response(200, {
            'success': True,
            'data': results,
            'doi_goal': doi_goal,
            'safety_buffer': safety_buffer,
            'safety_buffer_pct': int(safety_buffer * 100)
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_bottle_orders(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM bottle_orders ORDER BY order_date DESC")
        orders = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in orders]})
    finally:
        cursor.close()
        conn.close()

def get_bottle_order_by_id(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        
        # First get the base order to find the order number
        cursor.execute("SELECT order_number, supplier FROM bottle_orders WHERE id = %s", (order_id,))
        base_order = cursor.fetchone()
        
        if not base_order:
            return cors_response(404, {'success': False, 'error': 'Order not found'})
        
        order_number = base_order['order_number']
        supplier = base_order['supplier']
        
        # Extract base order number (remove bottle suffix if present)
        base_order_number = order_number.split('-')[0]
        
        # Fetch all orders with the same base order number
        cursor.execute("""
            SELECT bo.*, b.units_per_pallet, b.units_per_case, b.cases_per_pallet
            FROM bottle_orders bo
            LEFT JOIN bottle b ON bo.bottle_name = b.bottle_name
            WHERE bo.order_number LIKE %s
            ORDER BY bo.bottle_name
        """, (f"{base_order_number}%",))
        
        order_lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'id': order_id,
                'order_number': base_order_number,
                'supplier': supplier,
                'lines': [dict(line) for line in order_lines]
            }
        })
    finally:
        cursor.close()
        conn.close()

def create_bottle_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        
        # Check if this is a batch order (multiple bottles) or single order
        bottles = data.get('bottles')
        
        if bottles and isinstance(bottles, list) and len(bottles) > 0:
            # Batch order creation - multiple bottles in one order
            base_order_number = data.get('order_number')
            supplier = data.get('supplier')
            order_date = data.get('order_date')
            expected_delivery_date = data.get('expected_delivery_date')
            
            # Generate unique batch ID for this order
            batch_id = str(uuid.uuid4())[:8]  # Use first 8 chars of UUID for uniqueness
            
            created_orders = []
            
            for idx, bottle_item in enumerate(bottles):
                # Create unique order number for each bottle variant
                bottle_name = bottle_item.get('bottle_name')
                quantity_ordered = bottle_item.get('quantity_ordered', 0)
                
                # Skip items with 0 quantity
                if quantity_ordered <= 0:
                    continue
                
                # Generate unique order number: base-batchid-index
                # This ensures uniqueness even if same order number is reused
                unique_order_number = f"{base_order_number}-{batch_id}-{idx}"
                
                cursor.execute("""
                    INSERT INTO bottle_orders (order_number, bottle_name, supplier, order_date,
                                               expected_delivery_date, quantity_ordered, cost_per_unit,
                                               total_cost, status, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """, (unique_order_number, bottle_name, supplier,
                      order_date, expected_delivery_date,
                      quantity_ordered, bottle_item.get('cost_per_unit'),
                      bottle_item.get('total_cost'), bottle_item.get('status', 'pending'), 
                      bottle_item.get('notes')))
                
                order = cursor.fetchone()
                created_orders.append(dict(order))
            
            conn.commit()
            return cors_response(201, {
                'success': True, 
                'data': created_orders,
                'count': len(created_orders),
                'base_order_number': base_order_number
            })
        else:
            # Single order creation (legacy support)
            cursor.execute("""
                INSERT INTO bottle_orders (order_number, bottle_name, supplier, order_date,
                                           expected_delivery_date, quantity_ordered, cost_per_unit,
                                           total_cost, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (data.get('order_number'), data.get('bottle_name'), data.get('supplier'),
                  data.get('order_date'), data.get('expected_delivery_date'),
                  data.get('quantity_ordered'), data.get('cost_per_unit'),
                  data.get('total_cost'), data.get('status', 'pending'), data.get('notes')))
            order = cursor.fetchone()
            conn.commit()
            return cors_response(201, {'success': True, 'data': dict(order)})
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def update_bottle_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        # Get current order to check quantities
        cursor.execute("SELECT quantity_ordered, quantity_received FROM bottle_orders WHERE id = %s", (order_id,))
        current_order = cursor.fetchone()
        
        qty_received = data.get('quantity_received')
        bottle_name = data.get('bottle_name')
        new_status = data.get('status')
        
        # Determine if this is partial receive
        if qty_received is not None and current_order:
            qty_ordered = current_order['quantity_ordered']
            
            # Validate: cannot receive more than ordered
            if qty_received > qty_ordered:
                return cors_response(400, {
                    'success': False,
                    'error': f'Cannot receive {qty_received} units. Maximum is {qty_ordered} units ordered.'
                })
            
            # If received quantity is less than ordered, it's partial
            if qty_received < qty_ordered:
                new_status = 'partial'
            elif qty_received >= qty_ordered and new_status != 'archived':
                new_status = 'received'
        
        # If receiving (received or partial), update inventory
        if new_status in ['received', 'partial'] and qty_received is not None and qty_received > 0 and bottle_name:
            # Get previous received quantity to calculate delta
            prev_received = current_order['quantity_received'] if current_order else 0
            qty_to_add = qty_received - prev_received
            
            # Only add positive delta to prevent duplicates or negative additions
            if qty_to_add > 0:
                cursor.execute("""
                    UPDATE bottle_inventory 
                    SET warehouse_quantity = warehouse_quantity + %s
                    WHERE bottle_name = %s
                """, (qty_to_add, bottle_name))
        
        cursor.execute("""
            UPDATE bottle_orders 
            SET status = COALESCE(%s, status),
                actual_delivery_date = COALESCE(%s, actual_delivery_date),
                quantity_received = COALESCE(%s, quantity_received),
                is_edited = COALESCE(%s, is_edited)
            WHERE id = %s RETURNING *
        """, (new_status, data.get('actual_delivery_date'), 
              qty_received, data.get('is_edited'), order_id))
        
        order = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(order)}) if order else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

def update_bottle_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        inventory_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        cursor.execute("""
            UPDATE bottle_inventory 
            SET warehouse_quantity = COALESCE(%s, warehouse_quantity),
                supplier_quantity = COALESCE(%s, supplier_quantity)
            WHERE id = %s RETURNING *
        """, (data.get('warehouse_quantity'), data.get('supplier_quantity'), inventory_id))
        inventory = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(inventory)}) if inventory else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

# ============================================
# SUPPLY CHAIN - CLOSURE ENDPOINTS
# ============================================

def get_closure_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT ci.*, c.closure_supplier as supplier, c.moq, c.lead_time_weeks,
                   c.units_per_pallet, c.units_per_case, c.cases_per_pallet
            FROM closure_inventory ci
            LEFT JOIN closure c ON ci.closure_name = c.closure_name
            ORDER BY ci.closure_name
        """)
        inventory = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in inventory]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_closure_forecast_requirements(event):
    """GET /supply-chain/closures/forecast-requirements - Calculate closure requirements based on forecast API"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get query params for forecast period (default 120 days DOI goal)
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('doi_goal', 120))
        safety_buffer = float(query_params.get('safety_buffer', 0.85))  # Default 85% max capacity
        
        # Get all products grouped by closure type
        cursor.execute("""
            SELECT 
                c.closure_name,
                c.child_asin,
                c.product_name,
                c.size,
                cl.moq,
                cl.lead_time_weeks,
                ci.warehouse_quantity as current_inventory
            FROM catalog c
            LEFT JOIN closure cl ON c.closure_name = cl.closure_name
            LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
            WHERE c.closure_name IS NOT NULL
            ORDER BY c.closure_name
        """)
        
        products = cursor.fetchall()
        
        # Fetch forecast data CONCURRENTLY for all ASINs
        forecast_cache = {}
        unique_asins = [p.get('child_asin') for p in products if p.get('child_asin')]
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_asin = {executor.submit(get_forecast_data, asin): asin for asin in unique_asins}
            for future in as_completed(future_to_asin):
                asin = future_to_asin[future]
                try:
                    forecast_cache[asin] = future.result()
                except Exception:
                    forecast_cache[asin] = {'daily_forecast_avg': 0, 'weekly_forecast_avg': 0}
        
        # Group by closure and calculate forecasts from cached data
        closure_data = {}
        for product in products:
            closure_name = product['closure_name']
            asin = product['child_asin']
            
            if closure_name not in closure_data:
                closure_data[closure_name] = {
                    'closure_name': closure_name,
                    'moq': product['moq'],
                    'lead_time_weeks': product['lead_time_weeks'],
                    'current_inventory': product['current_inventory'] or 0,
                    'forecasted_units_needed': 0,
                    'products': []
                }
            
            # Get forecast from cache
            if asin and asin in forecast_cache:
                forecast = forecast_cache[asin]
                daily_forecast = forecast.get('daily_forecast_avg', 0) or forecast.get('avg_daily_sales', 0)
                weekly_forecast = forecast.get('weekly_forecast_avg', 0)
                units_needed = daily_forecast * doi_goal
                
                closure_data[closure_name]['forecasted_units_needed'] += units_needed
                closure_data[closure_name]['products'].append({
                    'product_name': product['product_name'],
                    'size': product['size'],
                    'avg_weekly_forecast': round(weekly_forecast, 2),
                    'daily_forecast_rate': round(daily_forecast, 2)
                })
        
        # Calculate recommended order quantities
        results = []
        for closure_name, data in closure_data.items():
            current_inv = data['current_inventory']
            forecasted = data['forecasted_units_needed']
            recommended_qty = max(0, forecasted - current_inv)
            
            results.append({
                'closure_name': closure_name,
                'moq': data['moq'],
                'lead_time_weeks': data['lead_time_weeks'],
                'current_inventory': current_inv,
                'forecasted_units_needed': round(forecasted, 2),
                'recommended_order_qty': round(recommended_qty, 2),
                'products_using_closure': data['products']
            })
        
        return cors_response(200, {
            'success': True,
            'data': results,
            'doi_goal': doi_goal,
            'safety_buffer': safety_buffer,
            'safety_buffer_pct': int(safety_buffer * 100)
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_closure_orders(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM closure_orders ORDER BY order_date DESC")
        orders = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in orders]})
    finally:
        cursor.close()
        conn.close()

def get_closure_order_by_id(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        
        # First get the base order to find the order number
        cursor.execute("SELECT order_number, supplier FROM closure_orders WHERE id = %s", (order_id,))
        base_order = cursor.fetchone()
        
        if not base_order:
            return cors_response(404, {'success': False, 'error': 'Order not found'})
        
        order_number = base_order['order_number']
        supplier = base_order['supplier']
        
        # Extract base order number (remove closure suffix if present)
        base_order_number = order_number.split('-')[0]
        
        # Fetch all orders with the same base order number
        cursor.execute("""
            SELECT co.*, c.units_per_pallet, c.units_per_case, c.cases_per_pallet
            FROM closure_orders co
            LEFT JOIN closure c ON co.closure_name = c.closure_name
            WHERE co.order_number LIKE %s
            ORDER BY co.closure_name
        """, (f"{base_order_number}%",))
        
        order_lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'id': order_id,
                'order_number': base_order_number,
                'supplier': supplier,
                'lines': [dict(line) for line in order_lines]
            }
        })
    finally:
        cursor.close()
        conn.close()

def create_closure_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        cursor.execute("""
            INSERT INTO closure_orders (order_number, closure_name, supplier, order_date,
                                       expected_delivery_date, quantity_ordered, cost_per_unit,
                                       total_cost, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (data.get('order_number'), data.get('closure_name'), data.get('supplier'),
              data.get('order_date'), data.get('expected_delivery_date'),
              data.get('quantity_ordered'), data.get('cost_per_unit'),
              data.get('total_cost'), data.get('status', 'pending'), data.get('notes')))
        order = cursor.fetchone()
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(order)})
    finally:
        cursor.close()
        conn.close()

def update_closure_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        # Get current order to check quantities
        cursor.execute("SELECT quantity_ordered, quantity_received FROM closure_orders WHERE id = %s", (order_id,))
        current_order = cursor.fetchone()
        
        qty_received = data.get('quantity_received')
        closure_name = data.get('closure_name')
        new_status = data.get('status')
        
        # Determine if this is partial receive
        if qty_received is not None and current_order:
            qty_ordered = current_order['quantity_ordered']
            
            # Validate: cannot receive more than ordered
            if qty_received > qty_ordered:
                return cors_response(400, {
                    'success': False,
                    'error': f'Cannot receive {qty_received} units. Maximum is {qty_ordered} units ordered.'
                })
            
            # If received quantity is less than ordered, it's partial
            if qty_received < qty_ordered:
                new_status = 'partial'
            elif qty_received >= qty_ordered and new_status != 'archived':
                new_status = 'received'
        
        # If receiving (received or partial), update inventory
        if new_status in ['received', 'partial'] and qty_received is not None and qty_received > 0 and closure_name:
            # Get previous received quantity to calculate delta
            prev_received = current_order['quantity_received'] if current_order else 0
            qty_to_add = qty_received - prev_received
            
            # Only add positive delta to prevent duplicates or negative additions
            if qty_to_add > 0:
                cursor.execute("""
                    UPDATE closure_inventory 
                    SET warehouse_quantity = warehouse_quantity + %s
                    WHERE closure_name = %s
                """, (qty_to_add, closure_name))
        
        cursor.execute("""
            UPDATE closure_orders 
            SET status = COALESCE(%s, status),
                actual_delivery_date = COALESCE(%s, actual_delivery_date),
                quantity_received = COALESCE(%s, quantity_received)
            WHERE id = %s RETURNING *
        """, (new_status, data.get('actual_delivery_date'), 
              qty_received, order_id))
        
        order = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(order)}) if order else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

def update_closure_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        inventory_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        cursor.execute("""
            UPDATE closure_inventory 
            SET warehouse_quantity = COALESCE(%s, warehouse_quantity),
                supplier_quantity = COALESCE(%s, supplier_quantity)
            WHERE id = %s RETURNING *
        """, (data.get('warehouse_quantity'), data.get('supplier_quantity'), inventory_id))
        inventory = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(inventory)}) if inventory else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

# ============================================
# SUPPLY CHAIN - BOX ENDPOINTS
# ============================================

def get_box_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT bi.*, b.supplier, b.moq, b.lead_time_weeks,
                   b.units_per_pallet
            FROM box_inventory bi
            LEFT JOIN box b ON bi.box_type = b.box_size
            ORDER BY bi.box_type
        """)
        inventory = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in inventory]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_box_forecast_requirements(event):
    """GET /supply-chain/boxes/forecast-requirements - Calculate box requirements based on forecast API"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get query params for forecast period (default 120 days DOI goal)
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('doi_goal', 120))
        safety_buffer = float(query_params.get('safety_buffer', 0.85))  # Default 85% max capacity
        
        # Get all products and box inventory
        cursor.execute("""
            SELECT 
                c.child_asin,
                b.box_size as box_type,
                b.moq,
                b.lead_time_weeks,
                bi.warehouse_quantity as current_inventory
            FROM catalog c
            CROSS JOIN box b
            LEFT JOIN box_inventory bi ON b.box_size = bi.box_type
            ORDER BY b.box_size
        """)
        
        rows = cursor.fetchall()
        
        # Get all unique ASINs
        cursor.execute("SELECT DISTINCT child_asin FROM catalog WHERE child_asin IS NOT NULL")
        asins = [row['child_asin'] for row in cursor.fetchall()]
        
        # Fetch forecast data CONCURRENTLY for all ASINs
        forecast_cache = {}
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_asin = {executor.submit(get_forecast_data, asin): asin for asin in asins}
            for future in as_completed(future_to_asin):
                asin = future_to_asin[future]
                try:
                    forecast_cache[asin] = future.result()
                except Exception:
                    forecast_cache[asin] = {'daily_forecast_avg': 0, 'weekly_forecast_avg': 0}
        
        # Calculate total forecasted units from cached data
        total_forecasted_units = 0
        for asin, forecast in forecast_cache.items():
            daily_forecast = forecast.get('daily_forecast_avg', 0) or forecast.get('avg_daily_sales', 0)
            total_forecasted_units += daily_forecast * doi_goal
        
        # Estimate cases needed (assuming 6 units per case on average)
        forecasted_cases = total_forecasted_units / 6.0
        
        # Get unique box types and calculate requirements
        cursor.execute("""
            SELECT 
                b.box_size as box_type,
                b.moq,
                b.lead_time_weeks,
                bi.warehouse_quantity as current_inventory
            FROM box b
            LEFT JOIN box_inventory bi ON b.box_size = bi.box_type
            ORDER BY b.box_size
        """)
        
        boxes = cursor.fetchall()
        results = []
        
        for box in boxes:
            current_inv = box['current_inventory'] or 0
            recommended_qty = max(0, round(forecasted_cases - current_inv))
            
            results.append({
                'box_type': box['box_type'],
                'moq': box['moq'],
                'lead_time_weeks': box['lead_time_weeks'],
                'current_inventory': current_inv,
                'forecasted_cases_needed': round(forecasted_cases),
                'recommended_order_qty': recommended_qty
            })
        
        return cors_response(200, {
            'success': True,
            'data': results,
            'doi_goal': doi_goal,
            'safety_buffer': safety_buffer,
            'safety_buffer_pct': int(safety_buffer * 100),
            'note': 'Box forecasts are estimated based on total production needs (not product-specific)'
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_box_orders(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM box_orders ORDER BY order_date DESC")
        orders = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in orders]})
    finally:
        cursor.close()
        conn.close()

def get_box_order_by_id(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        
        # First get the base order to find the order number
        cursor.execute("SELECT order_number, supplier FROM box_orders WHERE id = %s", (order_id,))
        base_order = cursor.fetchone()
        
        if not base_order:
            return cors_response(404, {'success': False, 'error': 'Order not found'})
        
        order_number = base_order['order_number']
        supplier = base_order['supplier']
        
        # Extract base order number (remove box suffix if present)
        base_order_number = order_number.split('-')[0]
        
        # Fetch all orders with the same base order number
        cursor.execute("""
            SELECT bo.*, b.units_per_pallet
            FROM box_orders bo
            LEFT JOIN box b ON bo.box_type = b.box_size
            WHERE bo.order_number LIKE %s
            ORDER BY bo.box_type
        """, (f"{base_order_number}%",))
        
        order_lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'id': order_id,
                'order_number': base_order_number,
                'supplier': supplier,
                'lines': [dict(line) for line in order_lines]
            }
        })
    finally:
        cursor.close()
        conn.close()

def create_box_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        cursor.execute("""
            INSERT INTO box_orders (order_number, box_type, supplier, order_date,
                                   expected_delivery_date, quantity_ordered, cost_per_unit,
                                   total_cost, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (data.get('order_number'), data.get('box_type'), 
              data.get('supplier'), data.get('order_date'), data.get('expected_delivery_date'),
              data.get('quantity_ordered'), data.get('cost_per_unit'),
              data.get('total_cost'), data.get('status', 'pending'), data.get('notes')))
        order = cursor.fetchone()
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(order)})
    finally:
        cursor.close()
        conn.close()

def update_box_order(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        # Get current order to check quantities
        cursor.execute("SELECT quantity_ordered, quantity_received FROM box_orders WHERE id = %s", (order_id,))
        current_order = cursor.fetchone()
        
        qty_received = data.get('quantity_received')
        box_type = data.get('box_type')
        new_status = data.get('status')
        
        # Determine if this is partial receive
        if qty_received is not None and current_order:
            qty_ordered = current_order['quantity_ordered']
            
            # Validate: cannot receive more than ordered
            if qty_received > qty_ordered:
                return cors_response(400, {
                    'success': False,
                    'error': f'Cannot receive {qty_received} units. Maximum is {qty_ordered} units ordered.'
                })
            
            # If received quantity is less than ordered, it's partial
            if qty_received < qty_ordered:
                new_status = 'partial'
            elif qty_received >= qty_ordered and new_status != 'archived':
                new_status = 'received'
        
        # If receiving (received or partial), update inventory
        if new_status in ['received', 'partial'] and qty_received is not None and qty_received > 0 and box_type:
            # Get previous received quantity to calculate delta
            prev_received = current_order['quantity_received'] if current_order else 0
            qty_to_add = qty_received - prev_received
            
            # Only add positive delta to prevent duplicates or negative additions
            if qty_to_add > 0:
                cursor.execute("""
                    UPDATE box_inventory 
                    SET warehouse_quantity = warehouse_quantity + %s
                    WHERE box_type = %s
                """, (qty_to_add, box_type))
        
        cursor.execute("""
            UPDATE box_orders 
            SET status = COALESCE(%s, status),
                actual_delivery_date = COALESCE(%s, actual_delivery_date),
                quantity_received = COALESCE(%s, quantity_received)
            WHERE id = %s RETURNING *
        """, (new_status, data.get('actual_delivery_date'), 
              qty_received, order_id))
        
        order = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(order)}) if order else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

def update_box_inventory(event):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        inventory_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        # Only update supplier_quantity (warehouse is read-only)
        cursor.execute("""
            UPDATE box_inventory 
            SET supplier_quantity = COALESCE(%s, supplier_quantity)
            WHERE id = %s RETURNING *
        """, (data.get('supplier_quantity'), inventory_id))
        inventory = cursor.fetchone()
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(inventory)}) if inventory else cors_response(404, {'success': False, 'error': 'Not found'})
    finally:
        cursor.close()
        conn.close()

# ============================================
# SUPPLY CHAIN - LABEL ENDPOINTS
# ============================================

def get_label_forecast_requirements(event):
    """GET /supply-chain/labels/forecast-requirements - Calculate label requirements based on forecast API (CONCURRENT)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get query params for forecast period (default 120 days DOI goal)
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('doi_goal', 120))
        safety_buffer = float(query_params.get('safety_buffer', 0.85))  # Default 85% max capacity
        
        # Get all labels with their product mappings
        cursor.execute("""
            SELECT 
                li.product_name,
                li.bottle_size,
                li.label_location,
                li.supplier,
                li.moq,
                li.lead_time_weeks,
                li.warehouse_inventory as current_inventory,
                c.child_asin
            FROM label_inventory li
            LEFT JOIN catalog c ON li.product_name = c.product_name AND li.bottle_size = c.size
            ORDER BY li.product_name, li.bottle_size
        """)
        
        labels = cursor.fetchall()
        
        # Fetch forecast data CONCURRENTLY
        forecast_cache = {}
        unique_asins = [label.get('child_asin') for label in labels if label.get('child_asin')]
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_asin = {executor.submit(get_forecast_data, asin): asin for asin in unique_asins}
            for future in as_completed(future_to_asin):
                asin = future_to_asin[future]
                try:
                    forecast_cache[asin] = future.result()
                except Exception:
                    forecast_cache[asin] = {'daily_forecast_avg': 0, 'weekly_forecast_avg': 0}
        
        # Build results with cached forecast data
        results = []
        for label in labels:
            asin = label.get('child_asin')
            current_inventory = label.get('current_inventory') or 0
            
            # Get forecast data from cache
            if asin and asin in forecast_cache:
                forecast = forecast_cache[asin]
                daily_forecast = forecast.get('daily_forecast_avg', 0) or forecast.get('avg_daily_sales', 0)
                weekly_forecast = forecast.get('weekly_forecast_avg', 0)
            else:
                daily_forecast = 0
                weekly_forecast = 0
            
            # Calculate forecasted units needed for DOI goal
            forecasted_units_needed = daily_forecast * doi_goal
            recommended_order_qty = max(0, forecasted_units_needed - current_inventory)
            
            results.append({
                'product_name': label.get('product_name'),
                'bottle_size': label.get('bottle_size'),
                'label_location': label.get('label_location'),
                'supplier': label.get('supplier'),
                'moq': label.get('moq'),
                'lead_time_weeks': label.get('lead_time_weeks'),
                'current_inventory': current_inventory,
                'forecasted_units_needed': round(forecasted_units_needed, 2),
                'recommended_order_qty': round(recommended_order_qty, 2),
                'avg_weekly_forecast': round(weekly_forecast, 2),
                'daily_sales_rate': round(daily_forecast, 2)
            })
        
        return cors_response(200, {
            'success': True,
            'data': results,
            'doi_goal': doi_goal,
            'safety_buffer': safety_buffer,
            'safety_buffer_pct': int(safety_buffer * 100)
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_inventory(event):
    """GET /supply-chain/labels/inventory - Get all label inventory sorted by lowest inventory first"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Query labels sorted by warehouse_inventory ascending (lowest first)
        cursor.execute("""
            SELECT 
                li.id,
                li.brand_name,
                li.product_name,
                li.bottle_size,
                COALESCE(li.label_size, c.label_size) as label_size,
                li.label_location,
                li.label_status,
                li.warehouse_inventory,
                li.inbound_quantity,
                li.supplier,
                li.moq,
                li.lead_time_weeks,
                li.last_count_date,
                li.google_drive_link,
                li.created_at,
                li.updated_at,
                li.notes,
                c.child_asin
            FROM label_inventory li
            LEFT JOIN catalog c ON c.label_location = li.label_location
            ORDER BY li.warehouse_inventory ASC, li.brand_name, li.product_name, li.bottle_size
        """)
        
        labels = cursor.fetchall()
        
        # Convert to list of dicts
        results = []
        for label in labels:
            results.append({
                'id': label.get('id'),
                'brand_name': label.get('brand_name'),
                'product_name': label.get('product_name'),
                'bottle_size': label.get('bottle_size'),
                'label_size': label.get('label_size'),
                'label_location': label.get('label_location'),
                'label_status': label.get('label_status'),
                'warehouse_inventory': label.get('warehouse_inventory'),
                'inbound_quantity': label.get('inbound_quantity'),
                'supplier': label.get('supplier'),
                'moq': label.get('moq'),
                'lead_time_weeks': label.get('lead_time_weeks'),
                'last_count_date': label.get('last_count_date'),
                'google_drive_link': label.get('google_drive_link'),
                'created_at': label.get('created_at'),
                'updated_at': label.get('updated_at'),
                'notes': label.get('notes'),
                'child_asin': label.get('child_asin')
            })
        
        return cors_response(200, {'success': True, 'data': results})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_inventory_by_id(event):
    """GET /supply-chain/labels/inventory/{id} - Get specific label"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        label_id = event['pathParameters']['id']
        cursor.execute("SELECT * FROM label_inventory WHERE id = %s", (label_id,))
        label = cursor.fetchone()
        
        if not label:
            return cors_response(404, {'success': False, 'error': 'Label not found'})
        
        return cors_response(200, {'success': True, 'data': dict(label)})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_label_inventory(event):
    """PUT /supply-chain/labels/inventory/{id} - Update label inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        label_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE label_inventory 
            SET warehouse_inventory = COALESCE(%s, warehouse_inventory),
                inbound_quantity = COALESCE(%s, inbound_quantity),
                label_status = COALESCE(%s, label_status),
                google_drive_link = COALESCE(%s, google_drive_link),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (data.get('warehouse_inventory'), data.get('inbound_quantity'),
              data.get('label_status'), data.get('google_drive_link'),
              data.get('notes'), label_id))
        
        label = cursor.fetchone()
        conn.commit()
        
        if not label:
            return cors_response(404, {'success': False, 'error': 'Label not found'})
        
        return cors_response(200, {'success': True, 'data': dict(label)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_label_inventory_by_location(event):
    """PUT /supply-chain/labels/inventory/by-location - Update label inventory by label_location
    
    Used by Label Check in production planning to update inventory after counting.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        label_location = data.get('label_location')
        
        if not label_location:
            return cors_response(400, {
                'success': False,
                'error': 'label_location is required'
            })
        
        warehouse_inventory = data.get('warehouse_inventory')
        if warehouse_inventory is None:
            return cors_response(400, {
                'success': False,
                'error': 'warehouse_inventory is required'
            })
        
        cursor.execute("""
            UPDATE label_inventory 
            SET warehouse_inventory = %s,
                last_count_date = CURRENT_DATE,
                updated_at = CURRENT_TIMESTAMP
            WHERE label_location = %s
            RETURNING *
        """, (warehouse_inventory, label_location))
        
        label = cursor.fetchone()
        conn.commit()
        
        if not label:
            return cors_response(404, {
                'success': False,
                'error': f'Label inventory not found for location: {label_location}'
            })
        
        return cors_response(200, {
            'success': True,
            'data': dict(label),
            'message': f'Label inventory updated for {label_location}'
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_orders(event):
    """GET /supply-chain/labels/orders - Get all label orders"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Check for status query parameter
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')
        
        print(f"Fetching label orders, status_filter: {status_filter}")
        
        if status_filter:
            cursor.execute("SELECT * FROM label_orders WHERE status = %s ORDER BY order_date DESC", (status_filter,))
        else:
            cursor.execute("SELECT * FROM label_orders ORDER BY order_date DESC")
        orders = cursor.fetchall()
        
        print(f"Found {len(orders)} label orders")
        
        return cors_response(200, {'success': True, 'data': [dict(row) for row in orders]})
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"ERROR in get_label_orders: {error_msg}")
        print(f"Traceback: {traceback.format_exc()}")
        
        # If table doesn't exist, return empty array instead of error
        if 'does not exist' in error_msg or 'relation' in error_msg:
            print("Table label_orders doesn't exist yet, returning empty array")
            return cors_response(200, {'success': True, 'data': []})
        
        return cors_response(500, {
            'success': False,
            'error': error_msg,
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_order_by_id(event):
    """GET /supply-chain/labels/orders/{id} - Get order with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        
        # Get order header
        cursor.execute("SELECT * FROM label_orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return cors_response(404, {'success': False, 'error': 'Order not found'})
        
        # Get order lines
        cursor.execute("""
            SELECT * FROM label_order_lines 
            WHERE order_id = %s 
            ORDER BY id
        """, (order_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                **dict(order),
                'lines': [dict(line) for line in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_label_order(event):
    """POST /supply-chain/labels/orders - Create order with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        lines = data.get('lines', [])
        
        # Create order header
        cursor.execute("""
            INSERT INTO label_orders (
                order_number, supplier, order_date, expected_delivery_date,
                total_quantity, total_cost, status, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (
            data.get('order_number'),
            data.get('supplier', 'Richmark Label'),
            data.get('order_date'),
            data.get('expected_delivery_date'),
            data.get('total_quantity', 0),
            data.get('total_cost', 0),
            data.get('status', 'pending'),
            data.get('notes')
        ))
        order = cursor.fetchone()
        order_id = order['id']
        
        # Create order lines
        for line in lines:
            cursor.execute("""
                INSERT INTO label_order_lines (
                    order_id, brand_name, product_name, bottle_size, label_size,
                    quantity_ordered, cost_per_label, line_total, google_drive_link
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                order_id,
                line.get('brand_name'),
                line.get('product_name'),
                line.get('bottle_size'),
                line.get('label_size'),
                line.get('quantity_ordered', 0),
                line.get('cost_per_label', 0),
                line.get('line_total', 0),
                line.get('google_drive_link')
            ))
        
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(order)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_label_order(event):
    """PUT /supply-chain/labels/orders/{id} - Update order (receive, status, etc.)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        order_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        # Get current order
        cursor.execute("SELECT * FROM label_orders WHERE id = %s", (order_id,))
        current_order = cursor.fetchone()
        
        if not current_order:
            return cors_response(404, {'success': False, 'error': 'Order not found'})
        
        # Update order header
        cursor.execute("""
            UPDATE label_orders 
            SET status = COALESCE(%s, status),
                actual_delivery_date = COALESCE(%s, actual_delivery_date),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (
            data.get('status'),
            data.get('actual_delivery_date'),
            data.get('notes'),
            order_id
        ))
        order = cursor.fetchone()
        
        # If receiving, update line items and inventory
        if data.get('status') in ['received', 'partial']:
            line_updates = data.get('line_updates', [])
            
            # If status is 'received' and no line_updates, receive ALL items
            if data.get('status') == 'received' and not line_updates:
                # Get all order lines
                cursor.execute("""
                    SELECT * FROM label_order_lines 
                    WHERE order_id = %s
                """, (order_id,))
                all_lines = cursor.fetchall()
                
                # Receive all items at full quantity
                for line in all_lines:
                    qty_ordered = line['quantity_ordered'] or 0
                    prev_received = line['quantity_received'] or 0
                    qty_to_add = qty_ordered - prev_received
                    
                    if qty_to_add > 0:
                        # Log what we're updating
                        print(f"Updating label inventory: {line['brand_name']} - {line['product_name']} - {line['bottle_size']} + {qty_to_add}")
                        
                        # Try to update inventory first
                        cursor.execute("""
                            UPDATE label_inventory 
                            SET warehouse_inventory = warehouse_inventory + %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE brand_name = %s 
                            AND product_name = %s 
                            AND bottle_size = %s
                        """, (qty_to_add, line['brand_name'], line['product_name'], line['bottle_size']))
                        
                        rows_affected = cursor.rowcount
                        print(f"Label inventory update affected {rows_affected} rows")
                        
                        # If no rows updated, inventory record doesn't exist - create it
                        if rows_affected == 0:
                            print(f"Creating new label inventory record for {line['brand_name']} - {line['product_name']} - {line['bottle_size']}")
                            cursor.execute("""
                                INSERT INTO label_inventory 
                                (brand_name, product_name, bottle_size, warehouse_inventory, inbound_quantity, supplier, label_status, updated_at)
                                VALUES (%s, %s, %s, %s, 0, %s, 'Up to Date', CURRENT_TIMESTAMP)
                            """, (line['brand_name'], line['product_name'], line['bottle_size'], qty_to_add, 
                                  current_order['supplier']))
                        
                        # Update line received quantity
                        cursor.execute("""
                            UPDATE label_order_lines 
                            SET quantity_received = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (qty_ordered, line['id']))
            else:
                # Partial receive - only update specified lines
                for line_update in line_updates:
                    line_id = line_update.get('id')
                    qty_received = line_update.get('quantity_received', 0)
                    
                    # Update line
                    cursor.execute("""
                        SELECT * FROM label_order_lines WHERE id = %s
                    """, (line_id,))
                    line = cursor.fetchone()
                    
                    if line and qty_received > 0:
                        # Calculate delta to add
                        prev_received = line['quantity_received'] or 0
                        qty_to_add = qty_received - prev_received
                        
                        if qty_to_add > 0:
                            # Log what we're updating
                            print(f"Partial receive - Updating label inventory: {line['brand_name']} - {line['product_name']} - {line['bottle_size']} + {qty_to_add}")
                            
                            # Try to update inventory first
                            cursor.execute("""
                                UPDATE label_inventory 
                                SET warehouse_inventory = warehouse_inventory + %s,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE brand_name = %s 
                                AND product_name = %s 
                                AND bottle_size = %s
                            """, (qty_to_add, line['brand_name'], line['product_name'], line['bottle_size']))
                            
                            rows_affected = cursor.rowcount
                            print(f"Label inventory update affected {rows_affected} rows")
                            
                            # If no rows updated, inventory record doesn't exist - create it
                            if rows_affected == 0:
                                print(f"Creating new label inventory record for {line['brand_name']} - {line['product_name']} - {line['bottle_size']}")
                                cursor.execute("""
                                    INSERT INTO label_inventory 
                                    (brand_name, product_name, bottle_size, warehouse_inventory, inbound_quantity, supplier, label_status, updated_at)
                                    VALUES (%s, %s, %s, %s, 0, %s, 'Up to Date', CURRENT_TIMESTAMP)
                                """, (line['brand_name'], line['product_name'], line['bottle_size'], qty_to_add, 
                                      current_order['supplier']))
                        
                        # Update line received quantity
                        cursor.execute("""
                            UPDATE label_order_lines 
                            SET quantity_received = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (qty_received, line_id))
        
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(order)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_costs(event):
    """GET /supply-chain/labels/costs - Get label pricing tiers"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Check for size query parameter
        query_params = event.get('queryStringParameters') or {}
        size_filter = query_params.get('size')
        
        if size_filter:
            cursor.execute("""
                SELECT * FROM label_costs 
                WHERE label_size = %s 
                ORDER BY min_quantity ASC
            """, (size_filter,))
        else:
            cursor.execute("SELECT * FROM label_costs ORDER BY label_size, min_quantity ASC")
        costs = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in costs]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# LABEL CYCLE COUNTS
# ============================================

def get_label_cycle_counts(event):
    """GET /supply-chain/labels/cycle-counts - Get all cycle counts"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM label_cycle_counts 
            ORDER BY count_date DESC, id DESC
        """)
        counts = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in counts]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_cycle_count_by_id(event):
    """GET /supply-chain/labels/cycle-counts/{id} - Get cycle count with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        # Get count header
        cursor.execute("SELECT * FROM label_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        # Get count lines
        cursor.execute("""
            SELECT * FROM label_cycle_count_lines 
            WHERE cycle_count_id = %s 
            ORDER BY brand_name, product_name, bottle_size
        """, (count_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'count': dict(count),
                'lines': [dict(row) for row in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_cycle_count_by_id(event):
    """GET /supply-chain/labels/cycle-counts/{id} - Get cycle count with lines"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        # Get cycle count header
        cursor.execute("SELECT * FROM label_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        # Get count lines
        cursor.execute("""
            SELECT * FROM label_cycle_count_lines 
            WHERE cycle_count_id = %s 
            ORDER BY id
        """, (count_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                **dict(count),
                'lines': [dict(line) for line in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_label_cycle_count(event):
    """POST /supply-chain/labels/cycle-counts - Create new cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        lines = data.get('lines', [])
        
        # Create cycle count header
        cursor.execute("""
            INSERT INTO label_cycle_counts (
                count_date, counted_by, status, notes
            )
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (
            data.get('count_date'),
            data.get('counted_by'),
            data.get('status', 'draft'),
            data.get('notes')
        ))
        count = cursor.fetchone()
        count_id = count['id']
        
        # Create count lines
        for line in lines:
            # Get expected quantity from inventory
            cursor.execute("""
                SELECT warehouse_inventory FROM label_inventory 
                WHERE brand_name = %s 
                AND product_name = %s 
                AND bottle_size = %s
            """, (line.get('brand_name'), line.get('product_name'), line.get('bottle_size')))
            
            inv = cursor.fetchone()
            expected_qty = inv['warehouse_inventory'] if inv else 0
            counted_qty = line.get('counted_quantity', 0)
            variance = counted_qty - expected_qty
            
            cursor.execute("""
                INSERT INTO label_cycle_count_lines (
                    cycle_count_id, brand_name, product_name, bottle_size,
                    expected_quantity, counted_quantity, variance
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                count_id,
                line.get('brand_name'),
                line.get('product_name'),
                line.get('bottle_size'),
                expected_qty,
                counted_qty,
                variance
            ))
        
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_label_cycle_count(event):
    """PUT /supply-chain/labels/cycle-counts/{id} - Update cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE label_cycle_counts 
            SET status = COALESCE(%s, status),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (data.get('status'), data.get('notes'), count_id))
        
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        # If lines are provided, delete existing and insert new ones
        lines = data.get('lines', [])
        if lines:
            # Delete existing lines
            cursor.execute("""
                DELETE FROM label_cycle_count_lines WHERE cycle_count_id = %s
            """, (count_id,))
            
            # Insert new lines
            for line in lines:
                # Get expected quantity from inventory
                cursor.execute("""
                    SELECT warehouse_inventory FROM label_inventory 
                    WHERE brand_name = %s 
                    AND product_name = %s 
                    AND bottle_size = %s
                """, (line.get('brand_name'), line.get('product_name'), line.get('bottle_size')))
                
                inv = cursor.fetchone()
                expected_qty = inv['warehouse_inventory'] if inv else 0
                counted_qty = line.get('counted_quantity', 0)
                variance = counted_qty - expected_qty
                
                cursor.execute("""
                    INSERT INTO label_cycle_count_lines (
                        cycle_count_id, brand_name, product_name, bottle_size,
                        expected_quantity, counted_quantity, variance
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    count_id,
                    line.get('brand_name'),
                    line.get('product_name'),
                    line.get('bottle_size'),
                    expected_qty,
                    counted_qty,
                    variance
                ))
        
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def complete_label_cycle_count(event):
    """POST /supply-chain/labels/cycle-counts/{id}/complete - Complete count and update inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        # Get cycle count
        cursor.execute("SELECT * FROM label_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        if count['status'] == 'completed':
            return cors_response(400, {'success': False, 'error': 'Cycle count already completed'})
        
        # Get all count lines
        cursor.execute("""
            SELECT * FROM label_cycle_count_lines WHERE cycle_count_id = %s
        """, (count_id,))
        lines = cursor.fetchall()
        
        # Update inventory for each line
        for line in lines:
            cursor.execute("""
                UPDATE label_inventory 
                SET warehouse_inventory = %s,
                    last_count_date = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE brand_name = %s 
                AND product_name = %s 
                AND bottle_size = %s
            """, (
                line['counted_quantity'],
                count['count_date'],
                line['brand_name'],
                line['product_name'],
                line['bottle_size']
            ))
        
        # Mark cycle count as completed
        cursor.execute("""
            UPDATE label_cycle_counts 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (count_id,))
        
        updated_count = cursor.fetchone()
        conn.commit()
        
        return cors_response(200, {'success': True, 'data': dict(updated_count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# BOTTLE CYCLE COUNTS
# ============================================

def get_bottle_cycle_counts(event):
    """GET /supply-chain/bottles/cycle-counts - Get all cycle counts"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM bottle_cycle_counts 
            ORDER BY count_date DESC, id DESC
        """)
        counts = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in counts]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_bottle_cycle_count_by_id(event):
    """GET /supply-chain/bottles/cycle-counts/{id} - Get cycle count with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM bottle_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        cursor.execute("""
            SELECT * FROM bottle_cycle_count_lines 
            WHERE cycle_count_id = %s 
            ORDER BY bottle_name
        """, (count_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'count': dict(count),
                'lines': [dict(row) for row in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_bottle_cycle_count(event):
    """POST /supply-chain/bottles/cycle-counts - Create new cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        lines = data.get('lines', [])
        
        cursor.execute("""
            INSERT INTO bottle_cycle_counts (
                count_date, counted_by, status, notes
            )
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (
            data.get('count_date'),
            data.get('counted_by'),
            data.get('status', 'draft'),
            data.get('notes')
        ))
        count = cursor.fetchone()
        count_id = count['id']
        
        for line in lines:
            cursor.execute("""
                SELECT warehouse_quantity FROM bottle_inventory 
                WHERE bottle_name = %s
            """, (line.get('bottle_name'),))
            
            inv = cursor.fetchone()
            expected_qty = inv['warehouse_quantity'] if inv else 0
            counted_qty = line.get('counted_quantity', 0)
            variance = counted_qty - expected_qty
            
            cursor.execute("""
                INSERT INTO bottle_cycle_count_lines (
                    cycle_count_id, bottle_name,
                    expected_quantity, counted_quantity, variance
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                count_id,
                line.get('bottle_name'),
                expected_qty,
                counted_qty,
                variance
            ))
        
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_bottle_cycle_count(event):
    """PUT /supply-chain/bottles/cycle-counts/{id} - Update cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE bottle_cycle_counts 
            SET status = COALESCE(%s, status),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (data.get('status'), data.get('notes'), count_id))
        
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        lines = data.get('lines', [])
        if lines:
            cursor.execute("DELETE FROM bottle_cycle_count_lines WHERE cycle_count_id = %s", (count_id,))
            
            for line in lines:
                cursor.execute("""
                    SELECT warehouse_quantity FROM bottle_inventory 
                    WHERE bottle_name = %s
                """, (line.get('bottle_name'),))
                
                inv = cursor.fetchone()
                expected_qty = inv['warehouse_quantity'] if inv else 0
                counted_qty = line.get('counted_quantity', 0)
                variance = counted_qty - expected_qty
                
                cursor.execute("""
                    INSERT INTO bottle_cycle_count_lines (
                        cycle_count_id, bottle_name,
                        expected_quantity, counted_quantity, variance
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (count_id, line.get('bottle_name'), expected_qty, counted_qty, variance))
        
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def complete_bottle_cycle_count(event):
    """POST /supply-chain/bottles/cycle-counts/{id}/complete - Complete count and update inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM bottle_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        if count['status'] == 'completed':
            return cors_response(400, {'success': False, 'error': 'Cycle count already completed'})
        
        cursor.execute("""
            SELECT * FROM bottle_cycle_count_lines WHERE cycle_count_id = %s
        """, (count_id,))
        lines = cursor.fetchall()
        
        for line in lines:
            cursor.execute("""
                UPDATE bottle_inventory 
                SET warehouse_quantity = %s,
                    last_count_date = %s,
                    last_updated = CURRENT_TIMESTAMP
                WHERE bottle_name = %s
            """, (
                line['counted_quantity'],
                count['count_date'],
                line['bottle_name']
            ))
        
        cursor.execute("""
            UPDATE bottle_cycle_counts 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (count_id,))
        
        updated_count = cursor.fetchone()
        conn.commit()
        
        return cors_response(200, {'success': True, 'data': dict(updated_count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# CLOSURE CYCLE COUNTS
# ============================================

def get_closure_cycle_counts(event):
    """GET /supply-chain/closures/cycle-counts - Get all cycle counts"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM closure_cycle_counts 
            ORDER BY count_date DESC, id DESC
        """)
        counts = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in counts]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_closure_cycle_count_by_id(event):
    """GET /supply-chain/closures/cycle-counts/{id} - Get cycle count with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM closure_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        cursor.execute("""
            SELECT * FROM closure_cycle_count_lines 
            WHERE cycle_count_id = %s 
            ORDER BY closure_name
        """, (count_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'count': dict(count),
                'lines': [dict(row) for row in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_closure_cycle_count(event):
    """POST /supply-chain/closures/cycle-counts - Create new cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        lines = data.get('lines', [])
        
        cursor.execute("""
            INSERT INTO closure_cycle_counts (
                count_date, counted_by, status, notes
            )
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (
            data.get('count_date'),
            data.get('counted_by'),
            data.get('status', 'draft'),
            data.get('notes')
        ))
        count = cursor.fetchone()
        count_id = count['id']
        
        for line in lines:
            cursor.execute("""
                SELECT warehouse_quantity FROM closure_inventory 
                WHERE closure_name = %s
            """, (line.get('closure_name'),))
            
            inv = cursor.fetchone()
            expected_qty = inv['warehouse_quantity'] if inv else 0
            counted_qty = line.get('counted_quantity', 0)
            variance = counted_qty - expected_qty
            
            cursor.execute("""
                INSERT INTO closure_cycle_count_lines (
                    cycle_count_id, closure_name,
                    expected_quantity, counted_quantity, variance
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                count_id,
                line.get('closure_name'),
                expected_qty,
                counted_qty,
                variance
            ))
        
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_closure_cycle_count(event):
    """PUT /supply-chain/closures/cycle-counts/{id} - Update cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE closure_cycle_counts 
            SET status = COALESCE(%s, status),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (data.get('status'), data.get('notes'), count_id))
        
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        lines = data.get('lines', [])
        if lines:
            cursor.execute("DELETE FROM closure_cycle_count_lines WHERE cycle_count_id = %s", (count_id,))
            
            for line in lines:
                cursor.execute("""
                    SELECT warehouse_quantity FROM closure_inventory 
                    WHERE closure_name = %s
                """, (line.get('closure_name'),))
                
                inv = cursor.fetchone()
                expected_qty = inv['warehouse_quantity'] if inv else 0
                counted_qty = line.get('counted_quantity', 0)
                variance = counted_qty - expected_qty
                
                cursor.execute("""
                    INSERT INTO closure_cycle_count_lines (
                        cycle_count_id, closure_name,
                        expected_quantity, counted_quantity, variance
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (count_id, line.get('closure_name'), expected_qty, counted_qty, variance))
        
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def complete_closure_cycle_count(event):
    """POST /supply-chain/closures/cycle-counts/{id}/complete - Complete count and update inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM closure_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        if count['status'] == 'completed':
            return cors_response(400, {'success': False, 'error': 'Cycle count already completed'})
        
        cursor.execute("""
            SELECT * FROM closure_cycle_count_lines WHERE cycle_count_id = %s
        """, (count_id,))
        lines = cursor.fetchall()
        
        for line in lines:
            cursor.execute("""
                UPDATE closure_inventory 
                SET warehouse_quantity = %s,
                    last_count_date = %s,
                    last_updated = CURRENT_TIMESTAMP
                WHERE closure_name = %s
            """, (
                line['counted_quantity'],
                count['count_date'],
                line['closure_name']
            ))
        
        cursor.execute("""
            UPDATE closure_cycle_counts 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (count_id,))
        
        updated_count = cursor.fetchone()
        conn.commit()
        
        return cors_response(200, {'success': True, 'data': dict(updated_count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# BOX CYCLE COUNTS
# ============================================

def get_box_cycle_counts(event):
    """GET /supply-chain/boxes/cycle-counts - Get all cycle counts"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM box_cycle_counts 
            ORDER BY count_date DESC, id DESC
        """)
        counts = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in counts]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_box_cycle_count_by_id(event):
    """GET /supply-chain/boxes/cycle-counts/{id} - Get cycle count with line items"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM box_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        cursor.execute("""
            SELECT * FROM box_cycle_count_lines 
            WHERE cycle_count_id = %s 
            ORDER BY box_type
        """, (count_id,))
        lines = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': {
                'count': dict(count),
                'lines': [dict(row) for row in lines]
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_box_cycle_count(event):
    """POST /supply-chain/boxes/cycle-counts - Create new cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        data = json.loads(event.get('body', '{}'))
        lines = data.get('lines', [])
        
        cursor.execute("""
            INSERT INTO box_cycle_counts (
                count_date, counted_by, status, notes
            )
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (
            data.get('count_date'),
            data.get('counted_by'),
            data.get('status', 'draft'),
            data.get('notes')
        ))
        count = cursor.fetchone()
        count_id = count['id']
        
        for line in lines:
            cursor.execute("""
                SELECT warehouse_quantity FROM box_inventory 
                WHERE box_type = %s
            """, (line.get('box_type'),))
            
            inv = cursor.fetchone()
            expected_qty = inv['warehouse_quantity'] if inv else 0
            counted_qty = line.get('counted_quantity', 0)
            variance = counted_qty - expected_qty
            
            cursor.execute("""
                INSERT INTO box_cycle_count_lines (
                    cycle_count_id, box_type,
                    expected_quantity, counted_quantity, variance
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                count_id,
                line.get('box_type'),
                expected_qty,
                counted_qty,
                variance
            ))
        
        conn.commit()
        return cors_response(201, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_box_cycle_count(event):
    """PUT /supply-chain/boxes/cycle-counts/{id} - Update cycle count"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        data = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE box_cycle_counts 
            SET status = COALESCE(%s, status),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (data.get('status'), data.get('notes'), count_id))
        
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        lines = data.get('lines', [])
        if lines:
            cursor.execute("DELETE FROM box_cycle_count_lines WHERE cycle_count_id = %s", (count_id,))
            
            for line in lines:
                cursor.execute("""
                    SELECT warehouse_quantity FROM box_inventory 
                    WHERE box_type = %s
                """, (line.get('box_type'),))
                
                inv = cursor.fetchone()
                expected_qty = inv['warehouse_quantity'] if inv else 0
                counted_qty = line.get('counted_quantity', 0)
                variance = counted_qty - expected_qty
                
                cursor.execute("""
                    INSERT INTO box_cycle_count_lines (
                        cycle_count_id, box_type,
                        expected_quantity, counted_quantity, variance
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (count_id, line.get('box_type'), expected_qty, counted_qty, variance))
        
        conn.commit()
        return cors_response(200, {'success': True, 'data': dict(count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def complete_box_cycle_count(event):
    """POST /supply-chain/boxes/cycle-counts/{id}/complete - Complete count and update inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        count_id = event['pathParameters']['id']
        
        cursor.execute("SELECT * FROM box_cycle_counts WHERE id = %s", (count_id,))
        count = cursor.fetchone()
        
        if not count:
            return cors_response(404, {'success': False, 'error': 'Cycle count not found'})
        
        if count['status'] == 'completed':
            return cors_response(400, {'success': False, 'error': 'Cycle count already completed'})
        
        cursor.execute("""
            SELECT * FROM box_cycle_count_lines WHERE cycle_count_id = %s
        """, (count_id,))
        lines = cursor.fetchall()
        
        for line in lines:
            cursor.execute("""
                UPDATE box_inventory 
                SET warehouse_quantity = %s,
                    last_count_date = %s,
                    last_updated = CURRENT_TIMESTAMP
                WHERE box_type = %s
            """, (
                line['counted_quantity'],
                count['count_date'],
                line['box_type']
            ))
        
        cursor.execute("""
            UPDATE box_cycle_counts 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        """, (count_id,))
        
        updated_count = cursor.fetchone()
        conn.commit()
        
        return cors_response(200, {'success': True, 'data': dict(updated_count)})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# LABEL FORMULAS (WEIGHT-TO-LABELS CONVERSION)
# ============================================

def get_label_formulas(event):
    """GET /supply-chain/labels/formulas - Get all label formulas for weight-to-labels conversion
    
    Formula from 1000 Bananas Database > LabelFormulas:
    labels = (gram_weight - core_weight_grams) / grams_per_label
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT 
                id,
                label_size,
                core_weight_grams,
                grams_per_label,
                notes,
                created_at,
                updated_at
            FROM label_formulas
            ORDER BY label_size
        """)
        formulas = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': formulas
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_formula_by_size(event):
    """GET /supply-chain/labels/formulas/{label_size} - Get formula for specific label size
    
    Formula: labels = (gram_weight - core_weight_grams) / grams_per_label
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get label_size from path or query params
        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        label_size = path_params.get('label_size') or query_params.get('label_size')
        
        if not label_size:
            return cors_response(400, {
                'success': False,
                'error': 'label_size parameter is required'
            })
        
        cursor.execute("""
            SELECT 
                id,
                label_size,
                core_weight_grams,
                grams_per_label,
                notes
            FROM label_formulas
            WHERE label_size = %s
        """, (label_size,))
        formula = cursor.fetchone()
        
        if not formula:
            # Return default formula if not found (5" x 8" default)
            return cors_response(200, {
                'success': True,
                'data': {
                    'label_size': label_size,
                    'core_weight_grams': 71,
                    'grams_per_label': 3.35,
                    'notes': 'Default formula - not found in database'
                }
            })
        
        return cors_response(200, {
            'success': True,
            'data': formula
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_label_formula_by_location(event):
    """GET /supply-chain/labels/formulas/by-location - Get formula by label location
    
    Formula: labels = (gram_weight - core_weight_grams) / grams_per_label
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query_params = event.get('queryStringParameters') or {}
        label_location = query_params.get('label_location')
        
        if not label_location:
            return cors_response(400, {
                'success': False,
                'error': 'label_location parameter is required'
            })
        
        # First get the label_size from label_inventory using label_location
        cursor.execute("""
            SELECT label_size FROM label_inventory 
            WHERE label_location = %s
            LIMIT 1
        """, (label_location,))
        inv_result = cursor.fetchone()
        
        label_size = inv_result.get('label_size') if inv_result else None
        
        if label_size:
            # Get formula by label_size
            cursor.execute("""
                SELECT 
                    id,
                    label_size,
                    core_weight_grams,
                    grams_per_label,
                    notes
                FROM label_formulas
                WHERE label_size = %s
            """, (label_size,))
            formula = cursor.fetchone()
            
            if formula:
                return cors_response(200, {
                    'success': True,
                    'data': formula
                })
        
        # Return default formula if not found (5" x 8" default)
        return cors_response(200, {
            'success': True,
            'data': {
                'label_location': label_location,
                'label_size': label_size,
                'core_weight_grams': 71,
                'grams_per_label': 3.35,
                'notes': 'Default formula - label size not found or no formula defined'
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_label_formula(event):
    """PUT /supply-chain/labels/formulas/{id} - Update label formula"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        formula_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            UPDATE label_formulas 
            SET label_size = COALESCE(%s, label_size),
                core_weight_grams = COALESCE(%s, core_weight_grams),
                grams_per_label = COALESCE(%s, grams_per_label),
                notes = COALESCE(%s, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
        """, (
            body.get('label_size'),
            body.get('core_weight_grams'),
            body.get('grams_per_label'),
            body.get('notes'),
            formula_id
        ))
        
        updated = cursor.fetchone()
        conn.commit()
        
        if not updated:
            return cors_response(404, {'success': False, 'error': 'Formula not found'})
        
        return cors_response(200, {'success': True, 'data': updated})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_label_formula(event):
    """POST /supply-chain/labels/formulas - Create new label formula
    
    Formula: labels = (gram_weight - core_weight_grams) / grams_per_label
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        body = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            INSERT INTO label_formulas 
            (label_size, core_weight_grams, grams_per_label, notes)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """, (
            body.get('label_size'),
            body.get('core_weight_grams', 71),
            body.get('grams_per_label', 3.35),
            body.get('notes')
        ))
        
        created = cursor.fetchone()
        conn.commit()
        
        return cors_response(201, {'success': True, 'data': created})
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# LABEL DOI (DAYS OF INVENTORY) CALCULATION
# ============================================

def calculate_label_doi(event):
    """GET /supply-chain/labels/doi - Calculate DOI for all labels"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('goal', 196))
        
        # Get all labels with inventory
        cursor.execute("""
            SELECT * FROM label_inventory 
            ORDER BY brand_name, product_name, bottle_size
        """)
        labels = cursor.fetchall()
        
        results = []
        for label in labels:
            # TODO: Get daily usage from sales data or N-GOOS
            # For now, using a placeholder calculation
            daily_usage = 10  # Placeholder
            
            current_inv = label['warehouse_inventory'] or 0
            inbound = label['inbound_quantity'] or 0
            total_available = current_inv + inbound
            
            if daily_usage > 0:
                doi = total_available / daily_usage
                status = 'good' if doi >= doi_goal else 'low'
                shortage = max(0, doi_goal - doi)
            else:
                doi = float('inf')
                status = 'no_usage_data'
                shortage = 0
            
            results.append({
                'id': label['id'],
                'brand_name': label['brand_name'],
                'product_name': label['product_name'],
                'bottle_size': label['bottle_size'],
                'current_inventory': current_inv,
                'inbound': inbound,
                'daily_usage': daily_usage,
                'doi_days': doi if doi != float('inf') else None,
                'doi_goal': doi_goal,
                'status': status,
                'shortage_in_days': shortage
            })
        
        return cors_response(200, {'success': True, 'data': results})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def calculate_label_doi_by_id(event):
    """GET /supply-chain/labels/doi/{id} - Calculate DOI for specific label"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        label_id = event['pathParameters']['id']
        query_params = event.get('queryStringParameters') or {}
        doi_goal = int(query_params.get('goal', 196))
        
        # Get label
        cursor.execute("SELECT * FROM label_inventory WHERE id = %s", (label_id,))
        label = cursor.fetchone()
        
        if not label:
            return cors_response(404, {'success': False, 'error': 'Label not found'})
        
        # TODO: Get daily usage from sales data or N-GOOS
        daily_usage = 10  # Placeholder
        
        current_inv = label['warehouse_inventory'] or 0
        inbound = label['inbound_quantity'] or 0
        total_available = current_inv + inbound
        
        if daily_usage > 0:
            doi = total_available / daily_usage
            status = 'good' if doi >= doi_goal else 'low'
            shortage = max(0, doi_goal - doi)
        else:
            doi = float('inf')
            status = 'no_usage_data'
            shortage = 0
        
        result = {
            'id': label['id'],
            'brand_name': label['brand_name'],
            'product_name': label['product_name'],
            'bottle_size': label['bottle_size'],
            'current_inventory': current_inv,
            'inbound': inbound,
            'daily_usage': daily_usage,
            'doi_days': doi if doi != float('inf') else None,
            'doi_goal': doi_goal,
            'status': status,
            'shortage_in_days': shortage
        }
        
        return cors_response(200, {'success': True, 'data': result})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# PRODUCTION PLANNING ENDPOINTS
# ============================================

def get_production_planning(event):
    """GET /production/planning - Get production planning data"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Use the v_production_planning view
        # Priority: Items with sales activity first, then by higher sales, then by lower inventory
        cursor.execute("""
            SELECT * FROM v_production_planning
            ORDER BY 
                CASE WHEN COALESCE(units_sold_30_days, 0) > 0 THEN 0 ELSE 1 END ASC,
                COALESCE(units_sold_30_days, 0) DESC,
                COALESCE(bottle_current_inventory, 0) ASC,
                product_name
        """)
        planning_data = cursor.fetchall()
        return cors_response(200, {'success': True, 'data': [dict(row) for row in planning_data]})
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def calculate_production_time(event):
    """GET /production/calculate-time?product={product}&units={units} - Calculate production time"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query_params = event.get('queryStringParameters') or {}
        product_name = query_params.get('product')
        units = int(query_params.get('units', 0))
        
        if not product_name or units <= 0:
            return cors_response(400, {
                'success': False,
                'error': 'Product name and units (positive integer) are required'
            })
        
        # Get BPM from catalog/bottle relationship
        cursor.execute("""
            SELECT b.packaging_bottles_per_minute, fg.max_packaging_per_minute
            FROM catalog c
            LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
            LEFT JOIN finished_goods fg ON c.product_name = fg.product_name
            WHERE c.product_name = %s
            LIMIT 1
        """, (product_name,))
        
        result = cursor.fetchone()
        
        if not result:
            return cors_response(404, {
                'success': False,
                'error': f'Product "{product_name}" not found'
            })
        
        bpm = result.get('packaging_bottles_per_minute') or result.get('max_packaging_per_minute') or 1
        minutes = units / bpm if bpm > 0 else 0
        hours = minutes / 60
        days = hours / 8  # Assuming 8-hour work days
        
        return cors_response(200, {
            'success': True,
            'data': {
                'product': product_name,
                'units': units,
                'bpm': float(bpm),
                'minutes': round(minutes, 2),
                'hours': round(hours, 2),
                'days': round(days, 2)
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_warehouse_capacity(event):
    """GET /production/warehouse-capacity - Get warehouse capacity data"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get capacity from bottles, closures, boxes, and finished goods
        cursor.execute("""
            SELECT 
                'bottles' as type,
                SUM(max_warehouse_inventory) as total_capacity,
                SUM(warehouse_inventory) as current_usage
            FROM bottle
            WHERE max_warehouse_inventory IS NOT NULL
            UNION ALL
            SELECT 
                'finished_goods' as type,
                NULL as total_capacity,
                NULL as current_usage
            FROM finished_goods
            LIMIT 1
        """)
        
        # For now, return a simple structure
        # This can be expanded based on actual requirements
        return cors_response(200, {
            'success': True,
            'data': {
                'bottles': {
                    'capacity': 0,  # Will be calculated from bottle.max_warehouse_inventory
                    'used': 0       # Will be calculated from bottle_inventory
                },
                'finished_goods': {
                    'capacity': 0,
                    'used': 0
                }
            }
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

# ============================================
# SHIPMENT ENDPOINTS
# ============================================

def get_shipments(event):
    """GET /production/shipments - Get all shipments"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query_params = event.get('queryStringParameters') or {}
        status = query_params.get('status')
        
        query = """
            SELECT 
                id,
                shipment_number,
                shipment_date,
                shipment_type,
                marketplace,
                account,
                location,
                status,
                add_products_completed,
                formula_check_completed,
                formula_check_comment,
                label_check_completed,
                label_check_comment,
                sort_products_completed,
                sort_formulas_completed,
                book_shipment_completed,
                carrier,
                total_units,
                total_boxes,
                total_palettes,
                estimated_hours,
                created_by,
                created_at,
                updated_at
            FROM shipments
        """
        
        if status:
            query += " WHERE status = %s"
            cursor.execute(query + " ORDER BY created_at DESC, id DESC", (status,))
        else:
            cursor.execute(query + " ORDER BY created_at DESC, id DESC")
        
        shipments = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': shipments
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_shipment_by_id(event):
    """GET /production/shipments/{id} - Get shipment details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        
        # Get shipment
        cursor.execute("""
            SELECT * FROM shipments WHERE id = %s
        """, (shipment_id,))
        shipment = cursor.fetchone()
        
        if not shipment:
            return cors_response(404, {
                'success': False,
                'error': 'Shipment not found'
            })
        
        # Get products
        cursor.execute("""
            SELECT * FROM shipment_products WHERE shipment_id = %s
        """, (shipment_id,))
        products = cursor.fetchall()
        
        shipment['products'] = products
        
        return cors_response(200, {
            'success': True,
            'data': shipment
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def create_shipment(event):
    """POST /production/shipments - Create new shipment"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        body = json.loads(event.get('body', '{}'))
        
        cursor.execute("""
            INSERT INTO shipments (
                shipment_number,
                shipment_date,
                shipment_type,
                marketplace,
                account,
                location,
                created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            body.get('shipment_number'),
            body.get('shipment_date'),
            body.get('shipment_type', 'AWD'),
            body.get('marketplace', 'Amazon'),
            body.get('account'),
            body.get('location'),
            body.get('created_by', 'system')
        ))
        
        shipment = cursor.fetchone()
        conn.commit()
        
        return cors_response(201, {
            'success': True,
            'data': shipment
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_shipment(event):
    """PUT /production/shipments/{id} - Update shipment"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        # Check if we're booking the shipment (4th tab completion)
        # This is when we should deduct inventory
        booking_shipment = body.get('book_shipment_completed') == True
        
        if booking_shipment:
            # First check if shipment is already booked to prevent double deduction
            cursor.execute("""
                SELECT book_shipment_completed FROM shipments WHERE id = %s
            """, (shipment_id,))
            current_shipment = cursor.fetchone()
            
            if current_shipment and current_shipment['book_shipment_completed']:
                # Already booked, don't deduct again
                booking_shipment = False
        
        # Build dynamic UPDATE query
        update_fields = []
        values = []
        
        # Get existing columns in shipments table to handle migrations gracefully
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'shipments'
        """)
        existing_columns = {row['column_name'] for row in cursor.fetchall()}
        
        allowed_fields = [
            'shipment_number', 'shipment_date', 'shipment_type', 
            'marketplace', 'account', 'location', 'status',
            'add_products_completed', 'formula_check_completed',
            'formula_check_comment', 'label_check_completed',
            'label_check_comment', 'sort_products_completed',
            'sort_formulas_completed', 'book_shipment_completed', 
            'notes', 'carrier'
        ]
        
        # Only allow fields that exist in the database
        allowed_fields = [f for f in allowed_fields if f in existing_columns]
        
        for field in allowed_fields:
            if field in body:
                update_fields.append(f"{field} = %s")
                values.append(body[field])
        
        if not update_fields:
            return cors_response(400, {
                'success': False,
                'error': 'No valid fields to update'
            })
        
        values.append(shipment_id)
        
        query = f"""
            UPDATE shipments 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        cursor.execute(query, values)
        shipment = cursor.fetchone()
        
        # If booking shipment, deduct inventory for all products
        if booking_shipment:
            # Get all products in this shipment
            cursor.execute("""
                SELECT 
                    sp.quantity,
                    sp.label_location,
                    sp.brand_name,
                    sp.product_name,
                    sp.size,
                    sp.bottle_name,
                    sp.closure_name,
                    sp.formula_name,
                    sp.formula_gallons_needed,
                    sp.boxes_needed,
                    sp.box_type
                FROM shipment_products sp
                WHERE sp.shipment_id = %s
            """, (shipment_id,))
            
            products = cursor.fetchall()
            
            for product in products:
                quantity = product['quantity'] or 0
                
                # Deduct labels from label_inventory
                # Match by unique key (brand_name, product_name, bottle_size) for accuracy
                if product['brand_name'] and product['product_name'] and product['size']:
                    cursor.execute("""
                        UPDATE label_inventory 
                        SET warehouse_inventory = GREATEST(0, warehouse_inventory - %s)
                        WHERE brand_name = %s 
                        AND product_name = %s 
                        AND bottle_size = %s
                    """, (quantity, product['brand_name'], product['product_name'], product['size']))
                # Fallback to label_location if brand/product/size not available
                elif product['label_location']:
                    cursor.execute("""
                        UPDATE label_inventory 
                        SET warehouse_inventory = GREATEST(0, warehouse_inventory - %s)
                        WHERE label_location = %s
                    """, (quantity, product['label_location']))
                
                # Deduct bottles from bottle_inventory
                if product['bottle_name']:
                    cursor.execute("""
                        UPDATE bottle_inventory 
                        SET warehouse_quantity = GREATEST(0, warehouse_quantity - %s)
                        WHERE bottle_name = %s
                    """, (quantity, product['bottle_name']))
                
                # Deduct closures from closure_inventory
                if product['closure_name']:
                    cursor.execute("""
                        UPDATE closure_inventory 
                        SET warehouse_quantity = GREATEST(0, warehouse_quantity - %s)
                        WHERE closure_name = %s
                    """, (quantity, product['closure_name']))
                
                # Deduct formula from formula_inventory
                if product['formula_name'] and product['formula_gallons_needed']:
                    cursor.execute("""
                        UPDATE formula_inventory 
                        SET gallons_available = GREATEST(0, gallons_available - %s)
                        WHERE formula_name = %s
                    """, (product['formula_gallons_needed'], product['formula_name']))
                
                # Deduct boxes from box_inventory
                if product['box_type'] and product['boxes_needed']:
                    cursor.execute("""
                        UPDATE box_inventory 
                        SET warehouse_quantity = GREATEST(0, warehouse_quantity - %s)
                        WHERE box_type = %s
                    """, (product['boxes_needed'], product['box_type']))
        
        conn.commit()
        
        return cors_response(200, {
            'success': True,
            'data': shipment,
            'inventory_deducted': booking_shipment
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def delete_shipment(event):
    """DELETE /production/shipments/{id} - Delete a shipment and restore inventory if booked"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Extract shipment ID from pathParameters or from path directly
        path_params = event.get('pathParameters') or {}
        if 'id' in path_params:
            shipment_id = path_params['id']
        else:
            # Extract from path: /production/shipments/{id}
            path = event.get('path') or event.get('rawPath', '')
            path_parts = path.split('/')
            # Find 'shipments' and get the next part
            for i, part in enumerate(path_parts):
                if part == 'shipments' and i + 1 < len(path_parts):
                    shipment_id = path_parts[i + 1]
                    break
            else:
                return cors_response(400, {'success': False, 'error': 'Could not extract shipment ID from path'})
        
        # Check if shipment exists and if it was booked
        cursor.execute("""
            SELECT id, book_shipment_completed 
            FROM shipments 
            WHERE id = %s
        """, (shipment_id,))
        shipment = cursor.fetchone()
        
        if not shipment:
            return cors_response(404, {
                'success': False,
                'error': 'Shipment not found'
            })
        
        # If shipment was booked, restore inventory before deleting
        if shipment.get('book_shipment_completed'):
            # Get all products in this shipment to restore inventory
            cursor.execute("""
                SELECT 
                    sp.quantity,
                    sp.label_location,
                    sp.brand_name,
                    sp.product_name,
                    sp.size,
                    sp.bottle_name,
                    sp.closure_name,
                    sp.formula_name,
                    sp.formula_gallons_needed,
                    sp.boxes_needed,
                    sp.box_type
                FROM shipment_products sp
                WHERE sp.shipment_id = %s
            """, (shipment_id,))
            
            products = cursor.fetchall()
            
            for product in products:
                quantity = product['quantity'] or 0
                
                # Restore labels to label_inventory
                # Match by unique key (brand_name, product_name, bottle_size) for accuracy
                if product['brand_name'] and product['product_name'] and product['size']:
                    cursor.execute("""
                        UPDATE label_inventory 
                        SET warehouse_inventory = warehouse_inventory + %s
                        WHERE brand_name = %s 
                        AND product_name = %s 
                        AND bottle_size = %s
                    """, (quantity, product['brand_name'], product['product_name'], product['size']))
                # Fallback to label_location if brand/product/size not available
                elif product['label_location']:
                    cursor.execute("""
                        UPDATE label_inventory 
                        SET warehouse_inventory = warehouse_inventory + %s
                        WHERE label_location = %s
                    """, (quantity, product['label_location']))
                
                # Restore bottles to bottle_inventory
                if product['bottle_name']:
                    cursor.execute("""
                        UPDATE bottle_inventory 
                        SET warehouse_quantity = warehouse_quantity + %s
                        WHERE bottle_name = %s
                    """, (quantity, product['bottle_name']))
                
                # Restore closures to closure_inventory
                if product['closure_name']:
                    cursor.execute("""
                        UPDATE closure_inventory 
                        SET warehouse_quantity = warehouse_quantity + %s
                        WHERE closure_name = %s
                    """, (quantity, product['closure_name']))
                
                # Restore formula to formula_inventory
                if product['formula_name'] and product['formula_gallons_needed']:
                    cursor.execute("""
                        UPDATE formula_inventory 
                        SET gallons_available = gallons_available + %s
                        WHERE formula_name = %s
                    """, (product['formula_gallons_needed'], product['formula_name']))
                
                # Restore boxes to box_inventory
                if product['box_type'] and product['boxes_needed']:
                    cursor.execute("""
                        UPDATE box_inventory 
                        SET warehouse_quantity = warehouse_quantity + %s
                        WHERE box_type = %s
                    """, (product['boxes_needed'], product['box_type']))
        
        # Delete shipment (CASCADE will handle related records in shipment_products and shipment_formulas)
        cursor.execute("DELETE FROM shipments WHERE id = %s", (shipment_id,))
        conn.commit()
        
        return cors_response(200, {
            'success': True,
            'message': 'Shipment deleted successfully',
            'inventory_restored': shipment.get('book_shipment_completed', False)
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def add_shipment_products(event):
    """POST /production/shipments/{id}/products - Add products to shipment"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        products = body.get('products', [])
        
        added_products = []
        supply_warnings = []
        
        for product in products:
            catalog_id = product['catalog_id']
            quantity = product['quantity']
            
            # Determine if catalog_id is an integer ID or an ASIN string
            # ASINs start with 'B0' and are alphanumeric, IDs are integers
            is_asin = isinstance(catalog_id, str) and (catalog_id.startswith('B0') or not catalog_id.isdigit())
            
            # Get catalog data with inventory levels
            if is_asin:
                # Look up by child_asin
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.product_name,
                        c.brand_name,
                        c.size,
                        c.child_asin,
                        c.child_sku_final,
                        c.units_per_case,
                        c.packaging_name as bottle_name,
                        c.formula_name,
                        c.closure_name,
                        c.label_location,
                        c.case_size as box_type,
                        b.size_oz,
                        b.bottles_per_minute,
                        -- Inventory levels
                        COALESCE(bi.warehouse_quantity, 0) as bottle_inventory,
                        COALESCE(ci.warehouse_quantity, 0) as closure_inventory,
                        COALESCE(li.warehouse_inventory, 0) as label_inventory,
                        COALESCE(fi.gallons_available, 0) as formula_gallons_available,
                        -- Calculate max producible
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
                        ) as max_units_producible
                    FROM catalog c
                    LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
                    LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
                    LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
                    LEFT JOIN label_inventory li ON c.label_location = li.label_location
                    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
                    WHERE c.child_asin = %s
                """, (catalog_id,))
            else:
                # Look up by integer ID
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.product_name,
                        c.brand_name,
                        c.size,
                        c.child_asin,
                        c.child_sku_final,
                        c.units_per_case,
                        c.packaging_name as bottle_name,
                        c.formula_name,
                        c.closure_name,
                        c.label_location,
                        c.case_size as box_type,
                        b.size_oz,
                        b.bottles_per_minute,
                        -- Inventory levels
                        COALESCE(bi.warehouse_quantity, 0) as bottle_inventory,
                        COALESCE(ci.warehouse_quantity, 0) as closure_inventory,
                        COALESCE(li.warehouse_inventory, 0) as label_inventory,
                        COALESCE(fi.gallons_available, 0) as formula_gallons_available,
                        -- Calculate max producible
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
                        ) as max_units_producible
                    FROM catalog c
                    LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
                    LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
                    LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
                    LEFT JOIN label_inventory li ON c.label_location = li.label_location
                    LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
                    WHERE c.id = %s
                """, (int(catalog_id),))
            
            catalog_data = cursor.fetchone()
            
            if not catalog_data:
                continue
            
            # Check supply chain availability
            max_producible = catalog_data['max_units_producible']
            if quantity > max_producible:
                supply_warnings.append({
                    'product': catalog_data['product_name'],
                    'size': catalog_data['size'],
                    'requested': quantity,
                    'max_available': max_producible,
                    'bottles': catalog_data['bottle_inventory'],
                    'closures': catalog_data['closure_inventory'],
                    'labels': catalog_data['label_inventory'],
                    'formula_gallons': float(catalog_data['formula_gallons_available'])
                })
            
            # Calculate needs
            units_per_case = float(catalog_data['units_per_case'] or 1)
            boxes_needed = int(quantity / units_per_case) + (1 if quantity % units_per_case > 0 else 0)
            
            # Calculate formula gallons (size_oz / 128 = gallons)
            size_oz = float(catalog_data['size_oz'] or 0)
            formula_gallons = (quantity * size_oz) / 128.0
            
            # Calculate production time
            bpm = float(catalog_data['bottles_per_minute'] or 30)
            production_minutes = quantity / bpm if bpm > 0 else 0
            
            # Insert product - use the actual database ID from catalog_data, not the passed-in ID/ASIN
            actual_catalog_id = catalog_data['id']
            
            cursor.execute("""
                INSERT INTO shipment_products (
                    shipment_id,
                    catalog_id,
                    product_name,
                    brand_name,
                    size,
                    child_asin,
                    child_sku,
                    quantity,
                    units_per_case,
                    boxes_needed,
                    bottle_name,
                    formula_name,
                    closure_name,
                    label_location,
                    box_type,
                    formula_gallons_needed,
                    bottles_needed,
                    closures_needed,
                    labels_needed,
                    bottles_per_minute,
                    production_time_minutes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING *
            """, (
                shipment_id,
                actual_catalog_id,
                catalog_data['product_name'],
                catalog_data['brand_name'],
                catalog_data['size'],
                catalog_data['child_asin'],
                catalog_data['child_sku_final'],
                quantity,
                units_per_case,
                boxes_needed,
                catalog_data['bottle_name'],
                catalog_data['formula_name'],
                catalog_data['closure_name'],
                catalog_data['label_location'],
                catalog_data['box_type'],
                formula_gallons,
                quantity,
                quantity,
                quantity,
                bpm,
                production_minutes
            ))
            
            added_products.append(cursor.fetchone())
        
        # Aggregate formulas
        cursor.execute("SELECT aggregate_shipment_formulas(%s)", (shipment_id,))
        
        conn.commit()
        
        response_data = {
            'success': True,
            'data': added_products,
            'supply_warnings': supply_warnings if supply_warnings else None
        }
        
        # If there are supply warnings, add a warning message
        if supply_warnings:
            response_data['message'] = f'⚠️ Warning: {len(supply_warnings)} product(s) exceed available inventory'
        
        return cors_response(201, response_data)
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_shipment_formula_check(event):
    """GET /production/shipments/{id}/formula-check - Get formula aggregation"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        
        cursor.execute("""
            SELECT 
                sf.id,
                sf.shipment_id,
                sf.formula_name,
                sf.total_gallons_needed,
                sf.total_products,
                sf.vessel_type,
                sf.vessel_quantity,
                sf.vessel_size_gallons,
                sf.formula_available,
                sf.gallons_allocated,
                COALESCE(sf.is_checked, FALSE) as is_checked,
                COALESCE(sf.notes, '') as notes,
                sf.checked_at,
                sf.checked_by,
                sf.created_at,
                sf.updated_at,
                fi.gallons_available,
                fi.gallons_allocated as fi_gallons_allocated,
                (fi.gallons_available - COALESCE(fi.gallons_allocated, 0)) as gallons_free
            FROM shipment_formulas sf
            LEFT JOIN formula_inventory fi ON sf.formula_name = fi.formula_name
            WHERE sf.shipment_id = %s
            ORDER BY sf.formula_name
        """, (shipment_id,))
        
        formulas = cursor.fetchall()
        
        # Check for shortages and ensure proper defaults
        for formula in formulas:
            gallons_free = formula.get('gallons_free') or 0
            gallons_needed = formula.get('total_gallons_needed') or 0
            formula['has_shortage'] = gallons_needed > gallons_free
            formula['shortage_amount'] = max(0, gallons_needed - gallons_free)
            # Ensure is_checked is boolean, not None
            formula['is_checked'] = bool(formula.get('is_checked', False))
            # Ensure notes is string, not None
            formula['notes'] = formula.get('notes') or ''
        
        return cors_response(200, {
            'success': True,
            'data': formulas
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_shipment_formula_check(event):
    """PUT /production/shipments/{id}/formula-check - Update formula check status
    
    Updates checked status and notes for formulas in a shipment.
    Body: {
        checked_formula_ids: [1, 2, 3],  // IDs of formulas that are checked
        formula_notes: { "1": "note1", "2": "note2" },  // Notes keyed by formula ID
        uncheck_formula_ids: [4, 5]  // Optional: IDs to explicitly uncheck
    }
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Extract shipment ID from pathParameters or from path directly
        path_params = event.get('pathParameters') or {}
        if 'id' in path_params:
            shipment_id = path_params['id']
        else:
            # Extract from path: /production/shipments/{id}/formula-check
            path = event.get('path') or event.get('rawPath', '')
            path_parts = path.split('/')
            # Find 'shipments' and get the next part
            for i, part in enumerate(path_parts):
                if part == 'shipments' and i + 1 < len(path_parts):
                    shipment_id = path_parts[i + 1]
                    break
            else:
                return cors_response(400, {'success': False, 'error': 'Could not extract shipment ID from path'})
        
        body = json.loads(event.get('body', '{}'))
        
        checked_formula_ids = body.get('checked_formula_ids', [])
        uncheck_formula_ids = body.get('uncheck_formula_ids', [])
        formula_notes = body.get('formula_notes', {})
        checked_by = body.get('checked_by')
        
        # Check if new columns exist (migration may not have run yet)
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'shipment_formulas'
        """)
        existing_columns = {row['column_name'] for row in cursor.fetchall()}
        has_is_checked = 'is_checked' in existing_columns
        has_notes = 'notes' in existing_columns
        
        # Update checked formulas (only if columns exist)
        if checked_formula_ids and has_is_checked:
            cursor.execute("""
                UPDATE shipment_formulas
                SET is_checked = TRUE,
                    checked_at = CURRENT_TIMESTAMP,
                    checked_by = %s
                WHERE shipment_id = %s AND id = ANY(%s)
            """, (checked_by, shipment_id, checked_formula_ids))
        
        # Update unchecked formulas (only if columns exist)
        if uncheck_formula_ids and has_is_checked:
            cursor.execute("""
                UPDATE shipment_formulas
                SET is_checked = FALSE,
                    checked_at = NULL,
                    checked_by = NULL
                WHERE shipment_id = %s AND id = ANY(%s)
            """, (shipment_id, uncheck_formula_ids))
        
        # Update notes for each formula (only if column exists)
        if has_notes:
            for formula_id, note in formula_notes.items():
                cursor.execute("""
                    UPDATE shipment_formulas
                    SET notes = %s
                    WHERE shipment_id = %s AND id = %s
                """, (note, shipment_id, formula_id))
        
        conn.commit()
        
        # Return updated formula check data
        cursor.execute("""
            SELECT 
                sf.id,
                sf.shipment_id,
                sf.formula_name,
                sf.total_gallons_needed,
                sf.total_products,
                sf.vessel_type,
                sf.vessel_quantity,
                sf.vessel_size_gallons,
                sf.formula_available,
                sf.gallons_allocated,
                COALESCE(sf.is_checked, FALSE) as is_checked,
                COALESCE(sf.notes, '') as notes,
                sf.checked_at,
                sf.checked_by,
                sf.created_at,
                sf.updated_at,
                fi.gallons_available,
                fi.gallons_allocated as fi_gallons_allocated,
                (fi.gallons_available - COALESCE(fi.gallons_allocated, 0)) as gallons_free
            FROM shipment_formulas sf
            LEFT JOIN formula_inventory fi ON sf.formula_name = fi.formula_name
            WHERE sf.shipment_id = %s
            ORDER BY sf.formula_name
        """, (shipment_id,))
        
        formulas = cursor.fetchall()
        
        # Check for shortages and ensure proper defaults
        for formula in formulas:
            gallons_free = formula.get('gallons_free') or 0
            gallons_needed = formula.get('total_gallons_needed') or 0
            formula['has_shortage'] = gallons_needed > gallons_free
            formula['shortage_amount'] = max(0, gallons_needed - gallons_free)
            # Ensure is_checked is boolean, not None
            formula['is_checked'] = bool(formula.get('is_checked', False))
            # Ensure notes is string, not None
            formula['notes'] = formula.get('notes') or ''
        
        return cors_response(200, {
            'success': True,
            'data': formulas,
            'message': 'Formula check status updated'
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_labels_availability(event):
    """GET /production/labels/availability - Get available labels for all label_locations
    
    Calculates: Total Labels - Labels Committed in Active Shipments
    Active shipments = status NOT IN ('shipped', 'received', 'archived')
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get optional exclude_shipment_id to exclude current shipment from calculation
        query_params = event.get('queryStringParameters') or {}
        exclude_shipment_id = query_params.get('exclude_shipment_id')
        
        # Debug: Log what's committed in active shipments
        cursor.execute("""
            SELECT 
                sp.label_location,
                sp.labels_needed,
                sp.quantity,
                sp.product_name,
                s.id as shipment_id,
                s.status as shipment_status
            FROM shipment_products sp
            JOIN shipments s ON sp.shipment_id = s.id
            WHERE s.status NOT IN ('shipped', 'received', 'archived')
            AND sp.label_location IS NOT NULL
            ORDER BY sp.label_location
        """)
        debug_committed = cursor.fetchall()
        print(f"DEBUG - Committed labels in active shipments: {len(debug_committed)} records")
        for row in debug_committed[:10]:  # Log first 10
            print(f"  {row['label_location']}: {row['labels_needed']} labels for {row['product_name']} (shipment {row['shipment_id']}, status: {row['shipment_status']})")
        
        # Get all label_locations with their total inventory and committed labels
        cursor.execute("""
            WITH committed_labels AS (
                SELECT 
                    sp.label_location,
                    SUM(COALESCE(sp.labels_needed, sp.quantity)) as total_committed
                FROM shipment_products sp
                JOIN shipments s ON sp.shipment_id = s.id
                WHERE s.status NOT IN ('shipped', 'received', 'archived')
                AND sp.label_location IS NOT NULL
                """ + (f"AND s.id != %s" if exclude_shipment_id else "") + """
                GROUP BY sp.label_location
            )
            SELECT 
                li.id,
                li.label_location,
                li.brand_name,
                li.product_name,
                li.bottle_size,
                li.warehouse_inventory as total_inventory,
                COALESCE(cl.total_committed, 0) as labels_committed,
                li.warehouse_inventory - COALESCE(cl.total_committed, 0) as labels_available
            FROM label_inventory li
            LEFT JOIN committed_labels cl ON li.label_location = cl.label_location
            WHERE li.label_location IS NOT NULL
            ORDER BY li.brand_name, li.product_name, li.bottle_size
        """, (exclude_shipment_id,) if exclude_shipment_id else ())
        
        labels = cursor.fetchall()
        
        # Debug logging
        print(f"DEBUG - Labels availability: {len(labels)} label_locations found")
        for lbl in labels[:5]:
            print(f"  {lbl['label_location']}: total={lbl['total_inventory']}, committed={lbl['labels_committed']}, available={lbl['labels_available']}")
        
        # Create a lookup map by label_location
        availability_map = {}
        for label in labels:
            loc = label['label_location']
            if loc:
                if loc not in availability_map:
                    availability_map[loc] = {
                        'label_location': loc,
                        'total_inventory': label['total_inventory'] or 0,
                        'labels_committed': label['labels_committed'] or 0,
                        'labels_available': label['labels_available'] or 0,
                        'products_using': []
                    }
                availability_map[loc]['products_using'].append({
                    'brand_name': label['brand_name'],
                    'product_name': label['product_name'],
                    'bottle_size': label['bottle_size']
                })
        
        return cors_response(200, {
            'success': True,
            'data': list(availability_map.values()),
            'by_location': availability_map
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_shipment_products(event):
    """GET /production/shipments/{id}/products - Get shipment products"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        
        # Get products with available inventory (accounting for other shipments)
        cursor.execute("""
            WITH committed_labels AS (
                SELECT 
                    sp.label_location,
                    SUM(COALESCE(sp.labels_needed, sp.quantity)) as total_committed
                FROM shipment_products sp
                JOIN shipments s ON sp.shipment_id = s.id
                WHERE s.status NOT IN ('shipped', 'received', 'archived')
                AND s.id != %s
                AND sp.label_location IS NOT NULL
                GROUP BY sp.label_location
            )
            SELECT 
                sp.*,
                bi.warehouse_quantity as bottles_available,
                ci.warehouse_quantity as closures_available,
                li.warehouse_inventory as labels_total,
                COALESCE(cl.total_committed, 0) as labels_committed_other_shipments,
                li.warehouse_inventory - COALESCE(cl.total_committed, 0) as labels_available
            FROM shipment_products sp
            LEFT JOIN bottle_inventory bi ON sp.bottle_name = bi.bottle_name
            LEFT JOIN closure_inventory ci ON sp.closure_name = ci.closure_name
            LEFT JOIN label_inventory li ON sp.label_location = li.label_location
            LEFT JOIN committed_labels cl ON sp.label_location = cl.label_location
            WHERE sp.shipment_id = %s
            ORDER BY sp.brand_name, sp.product_name, sp.size
        """, (shipment_id, shipment_id))
        
        products = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': products
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def update_shipment_product_label_check(event):
    """PUT /production/shipments/{id}/products/{product_id}/label-check - Update label check status for a product"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        shipment_id = event['pathParameters']['id']
        product_id = event['pathParameters'].get('product_id')
        body = json.loads(event.get('body', '{}'))
        
        status = body.get('status')  # 'confirmed', 'counted', or None (to reset)
        count = body.get('count')  # Only for 'counted' status
        
        # Allow null status to reset the label check
        if status is None:
            # Reset label check status
            cursor.execute("""
                UPDATE shipment_products 
                SET label_check_status = NULL,
                    label_check_count = NULL,
                    label_check_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND shipment_id = %s
                RETURNING *
            """, (product_id, shipment_id))
            
            product = cursor.fetchone()
            conn.commit()
            
            if not product:
                return cors_response(404, {
                    'success': False,
                    'error': f'Product {product_id} not found in shipment {shipment_id}'
                })
            
            return cors_response(200, {
                'success': True,
                'data': dict(product)
            })
        
        if not status:
            return cors_response(400, {
                'success': False,
                'error': 'status is required (confirmed or counted), or null to reset'
            })
        
        if status == 'counted':
            # Update with count value and update label_inventory
            cursor.execute("""
                UPDATE shipment_products 
                SET label_check_status = %s,
                    label_check_count = %s,
                    label_check_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND shipment_id = %s
                RETURNING *
            """, (status, count, product_id, shipment_id))
            
            product = cursor.fetchone()
            
            # Also update label_inventory if count provided and label_location exists
            if count is not None and product and product.get('label_location'):
                cursor.execute("""
                    UPDATE label_inventory 
                    SET warehouse_inventory = %s,
                        last_count_date = CURRENT_DATE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE label_location = %s
                """, (count, product['label_location']))
        else:
            # Just mark as confirmed (no count update)
            cursor.execute("""
                UPDATE shipment_products 
                SET label_check_status = %s,
                    label_check_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND shipment_id = %s
                RETURNING *
            """, (status, product_id, shipment_id))
            
            product = cursor.fetchone()
        
        conn.commit()
        
        if not product:
            return cors_response(404, {
                'success': False,
                'error': f'Product {product_id} not found in shipment {shipment_id}'
            })
        
        return cors_response(200, {
            'success': True,
            'data': dict(product)
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_sellables(event):
    """GET /production/floor-inventory/sellables - Get products ready to manufacture/ship"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM v_sellables
            ORDER BY max_sellable_units DESC, brand_name, product_name, size
        """)
        
        sellables = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': sellables
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_shiners(event):
    """GET /production/floor-inventory/shiners - Get damaged/cosmetic issue products"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get shiners grouped by formula
        cursor.execute("""
            SELECT 
                s.id,
                s.catalog_id,
                s.product_name,
                s.brand_name,
                s.size,
                s.formula_name,
                s.bottle_name,
                s.closure_name,
                s.quantity,
                s.issue_type,
                s.severity,
                s.location,
                s.notes,
                s.can_rework,
                s.created_at,
                s.updated_at
            FROM shiners s
            WHERE s.quantity > 0
            ORDER BY s.formula_name, s.severity DESC, s.quantity DESC
        """)
        
        shiners = cursor.fetchall()
        
        # Group by formula for the view
        formula_groups = {}
        for shiner in shiners:
            formula = shiner['formula_name'] or 'Unknown'
            if formula not in formula_groups:
                formula_groups[formula] = {
                    'formula_name': formula,
                    'total_units': 0,
                    'products': []
                }
            formula_groups[formula]['total_units'] += shiner['quantity']
            formula_groups[formula]['products'].append(shiner)
        
        return cors_response(200, {
            'success': True,
            'data': list(formula_groups.values())
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_unused_formulas(event):
    """GET /production/floor-inventory/unused-formulas - Get formulas with excess inventory"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT * FROM v_unused_formulas
            ORDER BY unused_gallons DESC, formula_name
        """)
        
        unused = cursor.fetchall()
        
        # For each formula, get products that use it
        result = []
        for formula_row in unused:
            formula_name = formula_row['formula_name']
            
            # Get products using this formula (calculate gallons_per_unit from size)
            cursor.execute("""
                SELECT 
                    c.id as catalog_id,
                    c.product_name,
                    c.brand_name,
                    c.size,
                    c.child_asin,
                    CASE 
                        WHEN c.size = '8oz' THEN 0.0625
                        WHEN c.size = '16oz' THEN 0.125
                        WHEN c.size IN ('Quart', '32oz') THEN 0.25
                        WHEN c.size = 'Gallon' THEN 1.0
                        WHEN c.size = '5 Gallon' THEN 5.0
                        ELSE 0.25
                    END as gallons_per_unit,
                    FLOOR(%s / CASE 
                        WHEN c.size = '8oz' THEN 0.0625
                        WHEN c.size = '16oz' THEN 0.125
                        WHEN c.size IN ('Quart', '32oz') THEN 0.25
                        WHEN c.size = 'Gallon' THEN 1.0
                        WHEN c.size = '5 Gallon' THEN 5.0
                        ELSE 0.25
                    END) as potential_units
                FROM catalog c
                WHERE c.formula_name = %s
                ORDER BY c.brand_name, c.product_name, c.size
            """, (formula_row['unused_gallons'], formula_name))
            
            products = cursor.fetchall()
            
            result.append({
                'formula_name': formula_name,
                'total_gallons': float(formula_row['total_gallons']),
                'allocated_gallons': float(formula_row['allocated_gallons']),
                'unused_gallons': float(formula_row['unused_gallons']),
                'gallons_in_production': float(formula_row.get('gallons_in_production') or 0),
                'product_count': formula_row['product_count'],
                'product_names': formula_row['product_names'],
                'last_manufactured': str(formula_row['last_manufactured']) if formula_row.get('last_manufactured') else None,
                'products': products
            })
        
        return cors_response(200, {
            'success': True,
            'data': result
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def add_shiner(event):
    """POST /production/floor-inventory/shiners - Add damaged product to shiners"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        body = json.loads(event.get('body', '{}'))
        
        catalog_id = body.get('catalog_id')
        quantity = body.get('quantity')
        issue_type = body.get('issue_type')
        severity = body.get('severity', 'minor')
        location = body.get('location')
        notes = body.get('notes')
        can_rework = body.get('can_rework', False)
        
        if not catalog_id or not quantity:
            return cors_response(400, {
                'success': False,
                'error': 'catalog_id and quantity are required'
            })
        
        # Get product details from catalog
        cursor.execute("""
            SELECT product_name, brand_name, size, formula_name, packaging_name, closure_name
            FROM catalog
            WHERE id = %s
        """, (catalog_id,))
        
        catalog_item = cursor.fetchone()
        
        if not catalog_item:
            return cors_response(404, {
                'success': False,
                'error': 'Product not found in catalog'
            })
        
        # Insert shiner record
        cursor.execute("""
            INSERT INTO shiners (
                catalog_id, product_name, brand_name, size, formula_name, 
                bottle_name, closure_name, quantity, issue_type, severity, 
                location, notes, can_rework
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            catalog_id,
            catalog_item['product_name'],
            catalog_item['brand_name'],
            catalog_item['size'],
            catalog_item['formula_name'],
            catalog_item['packaging_name'],
            catalog_item['closure_name'],
            quantity,
            issue_type,
            severity,
            location,
            notes,
            can_rework
        ))
        
        shiner_id = cursor.fetchone()['id']
        conn.commit()
        
        return cors_response(201, {
            'success': True,
            'shiner_id': shiner_id,
            'message': 'Shiner added successfully'
        })
    except Exception as e:
        conn.rollback()
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def get_products_inventory(event):
    """GET /production/products/inventory - Get inventory levels for all products with supply chain dependencies"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get all catalog products with complete supply chain inventory
        cursor.execute("""
            SELECT 
                c.id,
                c.child_asin,
                c.child_sku_final,
                c.product_name,
                c.brand_name,
                c.size,
                sm.units_sold_30_days,
                c.units_per_case,
                
                -- Formula details
                c.formula_name,
                CASE 
                    WHEN c.size = '8oz' THEN 0.0625
                    WHEN c.size = '16oz' THEN 0.125
                    WHEN c.size IN ('Quart', '32oz') THEN 0.25
                    WHEN c.size = 'Gallon' THEN 1.0
                    WHEN c.size = '5 Gallon' THEN 5.0
                    ELSE 0.25
                END as gallons_per_unit,
                fi.gallons_available as formula_gallons_available,
                fi.gallons_in_production as formula_gallons_in_production,
                
                -- Bottle details
                c.packaging_name as bottle_name,
                b.size_oz as bottle_size_oz,
                bi.warehouse_quantity as bottle_inventory,
                b.max_warehouse_inventory as bottle_max_inventory,
                
                -- Packaging calculation fields (for pallets, weight, time)
                b.box_weight_lbs,
                b.boxes_per_pallet,
                b.single_box_pallet_share,
                b.bottles_per_minute,
                b.finished_units_per_case,
                
                -- Closure details
                c.closure_name,
                ci.warehouse_quantity as closure_inventory,
                
                -- Label details
                c.label_location,
                c.label_size,
                li.warehouse_inventory as label_inventory,
                
                -- Sales velocity (units per day)
                CASE 
                    WHEN sm.units_sold_30_days > 0 THEN sm.units_sold_30_days / 30.0
                    ELSE 0
                END as daily_sales_velocity,
                
                -- DOI calculation (Days of Inventory)
                CASE 
                    WHEN sm.units_sold_30_days > 0 THEN 
                        (bi.warehouse_quantity / (sm.units_sold_30_days / 30.0))
                    ELSE 9999
                END as days_of_inventory,
                
                -- Supply chain bottlenecks (max units producible with current inventory)
                LEAST(
                    COALESCE(bi.warehouse_quantity, 0),
                    COALESCE(ci.warehouse_quantity, 0),
                    COALESCE(li.warehouse_inventory, 0),
                    CASE 
                        WHEN c.size = '8oz' AND 0.0625 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.0625)
                        WHEN c.size = '16oz' AND 0.125 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.125)
                        WHEN c.size IN ('Quart', '32oz') AND 0.25 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
                        WHEN c.size = 'Gallon' AND 1.0 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 1.0)
                        WHEN c.size = '5 Gallon' AND 5.0 > 0 THEN FLOOR(COALESCE(fi.gallons_available, 0) / 5.0)
                        ELSE FLOOR(COALESCE(fi.gallons_available, 0) / 0.25)
                    END
                ) as max_units_producible
                
            FROM catalog c
            LEFT JOIN sales_metrics sm ON c.id = sm.catalog_id
            LEFT JOIN formula f ON c.formula_name = f.formula
            LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
            LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
            LEFT JOIN bottle_inventory bi ON c.packaging_name = bi.bottle_name
            LEFT JOIN closure_inventory ci ON c.closure_name = ci.closure_name
            LEFT JOIN label_inventory li ON c.label_location = li.label_location
            WHERE c.child_asin IS NOT NULL
            ORDER BY 
                CASE WHEN COALESCE(sm.units_sold_30_days, 0) > 0 THEN 0 ELSE 1 END ASC,
                COALESCE(sm.units_sold_30_days, 0) DESC,
                COALESCE(bi.warehouse_quantity, 0) ASC,
                c.brand_name, c.product_name, c.size
        """)
        
        products = cursor.fetchall()
        
        return cors_response(200, {
            'success': True,
            'data': products
        })
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })
    finally:
        cursor.close()
        conn.close()

def lambda_handler(event, context):
    """Main Lambda handler"""
    
    # Log event for debugging
    print(f"Event: {json.dumps(event)}")
    
    # Handle OPTIONS for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
        path = event.get('path') or event.get('rawPath') or event.get('resource', '')
        
        # Normalize path - remove query string if present
        if '?' in path:
            path = path.split('?')[0]
        
        print(f"Method: {http_method}, Path: {path}")
        
        # Route requests
        if http_method == 'GET' and path.endswith('/selection'):
            return get_selections(event)
        
        elif http_method == 'POST' and path.endswith('/selection'):
            return create_selection(event)
        
        elif http_method == 'PUT' and '/selection/' in path:
            return update_selection(event)
        
        elif http_method == 'DELETE' and '/selection/' in path:
            return delete_selection(event)
        
        elif http_method == 'PATCH' and path.endswith('/launch'):
            return launch_product(event)
        
        elif http_method == 'GET' and path.endswith('/development'):
            return get_development(event)
        
        # Catalog endpoints
        elif http_method == 'GET' and path.endswith('/catalog/children'):
            return get_catalog_children(event)
        
        elif http_method == 'GET' and path.endswith('/catalog') and not '/catalog/' in path:
            return get_catalog_parents(event)
        
        elif http_method == 'GET' and '/catalog/' in path:
            return get_catalog_detail(event)
        
        elif http_method == 'PUT' and '/catalog/' in path:
            return update_catalog(event)
        
        # Formula endpoints
        elif http_method == 'GET' and path.endswith('/formula') and not '/formula/' in path:
            return get_all_formulas(event)
        
        elif http_method == 'GET' and '/formula/' in path:
            return get_formula_by_id(event)
        
        elif http_method == 'POST' and path.endswith('/formula'):
            return create_formula(event)
        
        elif http_method == 'PUT' and '/formula/' in path:
            return update_formula(event)
        
        elif http_method == 'DELETE' and '/formula/' in path:
            return delete_formula(event)
        
        # Supply Chain - Bottles
        elif http_method == 'GET' and ('/bottles/forecast-requirements' in path or path.endswith('/bottles/forecast-requirements')):
            return get_bottle_forecast_requirements(event)
        
        elif http_method == 'GET' and ('/bottles/inventory' in path or path.endswith('/bottles/inventory')):
            return get_bottle_inventory(event)
        
        elif http_method == 'PUT' and '/bottles/inventory/' in path:
            return update_bottle_inventory(event)
        
        elif http_method == 'GET' and '/bottles/orders/' in path and not path.endswith('/bottles/orders'):
            return get_bottle_order_by_id(event)
        
        elif http_method == 'GET' and ('/bottles/orders' in path or path.endswith('/bottles/orders')):
            return get_bottle_orders(event)
        
        elif http_method == 'POST' and ('/bottles/orders' in path or path.endswith('/bottles/orders')):
            return create_bottle_order(event)
        
        elif http_method == 'PUT' and '/bottles/orders/' in path:
            return update_bottle_order(event)
        
        # Supply Chain - Bottles Cycle Counts
        elif http_method == 'GET' and '/bottles/cycle-counts/' in path and not path.endswith('/bottles/cycle-counts'):
            if '/complete' in path:
                return cors_response(405, {'success': False, 'error': 'Use POST for complete'})
            return get_bottle_cycle_count_by_id(event)
        
        elif http_method == 'GET' and ('/bottles/cycle-counts' in path or path.endswith('/bottles/cycle-counts')):
            return get_bottle_cycle_counts(event)
        
        elif http_method == 'POST' and '/bottles/cycle-counts/' in path and '/complete' in path:
            return complete_bottle_cycle_count(event)
        
        elif http_method == 'POST' and ('/bottles/cycle-counts' in path or path.endswith('/bottles/cycle-counts')):
            return create_bottle_cycle_count(event)
        
        elif http_method == 'PUT' and '/bottles/cycle-counts/' in path:
            return update_bottle_cycle_count(event)
        
        # Supply Chain - Closures
        elif http_method == 'GET' and ('/closures/forecast-requirements' in path or path.endswith('/closures/forecast-requirements')):
            return get_closure_forecast_requirements(event)
        
        elif http_method == 'GET' and ('/closures/inventory' in path or path.endswith('/closures/inventory')):
            return get_closure_inventory(event)
        
        elif http_method == 'PUT' and '/closures/inventory/' in path:
            return update_closure_inventory(event)
        
        elif http_method == 'GET' and '/closures/orders/' in path and not path.endswith('/closures/orders'):
            return get_closure_order_by_id(event)
        
        elif http_method == 'GET' and ('/closures/orders' in path or path.endswith('/closures/orders')):
            return get_closure_orders(event)
        
        elif http_method == 'POST' and ('/closures/orders' in path or path.endswith('/closures/orders')):
            return create_closure_order(event)
        
        elif http_method == 'PUT' and '/closures/orders/' in path:
            return update_closure_order(event)
        
        # Supply Chain - Closures Cycle Counts
        elif http_method == 'GET' and '/closures/cycle-counts/' in path and not path.endswith('/closures/cycle-counts'):
            if '/complete' in path:
                return cors_response(405, {'success': False, 'error': 'Use POST for complete'})
            return get_closure_cycle_count_by_id(event)
        
        elif http_method == 'GET' and ('/closures/cycle-counts' in path or path.endswith('/closures/cycle-counts')):
            return get_closure_cycle_counts(event)
        
        elif http_method == 'POST' and '/closures/cycle-counts/' in path and '/complete' in path:
            return complete_closure_cycle_count(event)
        
        elif http_method == 'POST' and ('/closures/cycle-counts' in path or path.endswith('/closures/cycle-counts')):
            return create_closure_cycle_count(event)
        
        elif http_method == 'PUT' and '/closures/cycle-counts/' in path:
            return update_closure_cycle_count(event)
        
        # Supply Chain - Boxes
        elif http_method == 'GET' and ('/boxes/forecast-requirements' in path or path.endswith('/boxes/forecast-requirements')):
            return get_box_forecast_requirements(event)
        
        elif http_method == 'GET' and ('/boxes/inventory' in path or path.endswith('/boxes/inventory')):
            return get_box_inventory(event)
        
        elif http_method == 'PUT' and '/boxes/inventory/' in path:
            return update_box_inventory(event)
        
        elif http_method == 'GET' and '/boxes/orders/' in path and not path.endswith('/boxes/orders'):
            return get_box_order_by_id(event)
        
        elif http_method == 'GET' and ('/boxes/orders' in path or path.endswith('/boxes/orders')):
            return get_box_orders(event)
        
        elif http_method == 'POST' and ('/boxes/orders' in path or path.endswith('/boxes/orders')):
            return create_box_order(event)
        
        elif http_method == 'PUT' and '/boxes/orders/' in path:
            return update_box_order(event)
        
        # Supply Chain - Boxes Cycle Counts
        elif http_method == 'GET' and '/boxes/cycle-counts/' in path and not path.endswith('/boxes/cycle-counts'):
            if '/complete' in path:
                return cors_response(405, {'success': False, 'error': 'Use POST for complete'})
            return get_box_cycle_count_by_id(event)
        
        elif http_method == 'GET' and ('/boxes/cycle-counts' in path or path.endswith('/boxes/cycle-counts')):
            return get_box_cycle_counts(event)
        
        elif http_method == 'POST' and '/boxes/cycle-counts/' in path and '/complete' in path:
            return complete_box_cycle_count(event)
        
        elif http_method == 'POST' and ('/boxes/cycle-counts' in path or path.endswith('/boxes/cycle-counts')):
            return create_box_cycle_count(event)
        
        elif http_method == 'PUT' and '/boxes/cycle-counts/' in path:
            return update_box_cycle_count(event)
        
        # Supply Chain - Labels Inventory
        elif http_method == 'GET' and ('/labels/forecast-requirements' in path or path.endswith('/labels/forecast-requirements')):
            return get_label_forecast_requirements(event)
        
        elif http_method == 'GET' and ('/labels/inventory' in path or path.endswith('/labels/inventory')):
            if '/labels/inventory/' in path and not path.endswith('/labels/inventory'):
                return get_label_inventory_by_id(event)
            return get_label_inventory(event)
        
        elif http_method == 'PUT' and '/labels/inventory/by-location' in path:
            return update_label_inventory_by_location(event)
        
        elif http_method == 'PUT' and '/labels/inventory/' in path:
            return update_label_inventory(event)
        
        # Supply Chain - Labels Orders
        elif http_method == 'GET' and '/labels/orders/' in path and not path.endswith('/labels/orders'):
            return get_label_order_by_id(event)
        
        elif http_method == 'GET' and ('/labels/orders' in path or path.endswith('/labels/orders')):
            return get_label_orders(event)
        
        elif http_method == 'POST' and ('/labels/orders' in path or path.endswith('/labels/orders')):
            return create_label_order(event)
        
        elif http_method == 'PUT' and '/labels/orders/' in path:
            return update_label_order(event)
        
        # Supply Chain - Labels Cycle Counts
        elif http_method == 'GET' and '/labels/cycle-counts/' in path and not path.endswith('/labels/cycle-counts'):
            if '/complete' in path:
                return cors_response(405, {'success': False, 'error': 'Use POST for complete'})
            return get_label_cycle_count_by_id(event)
        
        elif http_method == 'GET' and ('/labels/cycle-counts' in path or path.endswith('/labels/cycle-counts')):
            return get_label_cycle_counts(event)
        
        elif http_method == 'POST' and '/labels/cycle-counts/' in path and '/complete' in path:
            return complete_label_cycle_count(event)
        
        elif http_method == 'POST' and ('/labels/cycle-counts' in path or path.endswith('/labels/cycle-counts')):
            return create_label_cycle_count(event)
        
        elif http_method == 'PUT' and '/labels/cycle-counts/' in path:
            return update_label_cycle_count(event)
        
        # Supply Chain - Labels DOI
        elif http_method == 'GET' and '/labels/doi/' in path and not path.endswith('/labels/doi'):
            return calculate_label_doi_by_id(event)
        
        elif http_method == 'GET' and ('/labels/doi' in path or path.endswith('/labels/doi')):
            return calculate_label_doi(event)
        
        # Supply Chain - Labels Costs
        elif http_method == 'GET' and ('/labels/costs' in path or path.endswith('/labels/costs')):
            return get_label_costs(event)
        
        # Supply Chain - Labels Formulas (weight-to-labels conversion)
        elif http_method == 'GET' and '/labels/formulas/by-location' in path:
            return get_label_formula_by_location(event)
        
        elif http_method == 'GET' and '/labels/formulas/' in path and not path.endswith('/labels/formulas'):
            return get_label_formula_by_size(event)
        
        elif http_method == 'GET' and ('/labels/formulas' in path or path.endswith('/labels/formulas')):
            return get_label_formulas(event)
        
        elif http_method == 'POST' and ('/labels/formulas' in path or path.endswith('/labels/formulas')):
            return create_label_formula(event)
        
        elif http_method == 'PUT' and '/labels/formulas/' in path:
            return update_label_formula(event)
        
        # Production Planning
        elif http_method == 'GET' and path.endswith('/production/planning'):
            return get_production_planning(event)
        
        elif http_method == 'GET' and '/production/calculate-time' in path:
            return calculate_production_time(event)
        
        # Products inventory endpoint (support both URL patterns)
        elif http_method == 'GET' and (path.endswith('/production/products/inventory') or path.endswith('/production/products-inventory')):
            return get_products_inventory(event)
        
        # Floor Inventory endpoints
        elif http_method == 'GET' and path.endswith('/production/floor-inventory/sellables'):
            return get_sellables(event)
        
        elif http_method == 'GET' and path.endswith('/production/floor-inventory/shiners'):
            return get_shiners(event)
        
        elif http_method == 'POST' and path.endswith('/production/floor-inventory/shiners'):
            return add_shiner(event)
        
        elif http_method == 'GET' and path.endswith('/production/floor-inventory/unused-formulas'):
            return get_unused_formulas(event)
        
        # Labels availability endpoint (support both URL patterns)
        elif http_method == 'GET' and (path.endswith('/production/labels/availability') or path.endswith('/production/labels-availability')):
            return get_labels_availability(event)
        
        # Shipment endpoints - formula-check (must come before generic shipment routes)
        elif http_method == 'GET' and '/production/shipments/' in path and '/formula-check' in path:
            print(f"Routing to get_shipment_formula_check")
            return get_shipment_formula_check(event)
        
        elif http_method == 'PUT' and '/production/shipments/' in path and '/formula-check' in path:
            print(f"Routing to update_shipment_formula_check")
            return update_shipment_formula_check(event)
        
        elif http_method == 'GET' and '/production/shipments/' in path and '/products' in path:
            return get_shipment_products(event)
        
        elif http_method == 'PUT' and '/production/shipments/' in path and '/label-check' in path and '/products/' in path:
            return update_shipment_product_label_check(event)
        
        elif http_method == 'POST' and '/production/shipments/' in path and '/products' in path:
            return add_shipment_products(event)
        
        elif http_method == 'GET' and '/production/shipments/' in path:
            return get_shipment_by_id(event)
        
        elif http_method == 'PUT' and '/production/shipments/' in path:
            return update_shipment(event)
        
        elif http_method == 'DELETE' and '/production/shipments/' in path:
            return delete_shipment(event)
        
        elif http_method == 'GET' and path.endswith('/production/shipments'):
            return get_shipments(event)
        
        elif http_method == 'POST' and path.endswith('/production/shipments'):
            return create_shipment(event)
        
        elif http_method == 'GET' and path.endswith('/production/warehouse-capacity'):
            return get_warehouse_capacity(event)
        
        else:
            # Debug: Log all possible path formats
            debug_info = {
                'event_keys': list(event.keys()),
                'http_method': http_method,
                'path': path,
                'path_from_event': event.get('path'),
                'rawPath': event.get('rawPath'),
                'resource': event.get('resource'),
                'requestContext_path': event.get('requestContext', {}).get('path'),
                'requestContext_resourcePath': event.get('requestContext', {}).get('resourcePath'),
            }
            print(f"DEBUG - Route not found. Full event path info: {json.dumps(debug_info, default=str)}")
            return cors_response(404, {
                'success': False,
                'error': f'Route not found: {http_method} {path}',
                'debug': debug_info
            })
            
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

