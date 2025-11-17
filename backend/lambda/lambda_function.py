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

# Database configuration
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

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
        # Fetch all catalog products
        cursor.execute("""
            SELECT 
                id,
                product_name,
                brand_name,
                seller_account,
                size,
                
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
        
        else:
            return cors_response(404, {
                'success': False,
                'error': f'Route not found: {http_method} {path}',
                'debug': {
                    'event_keys': list(event.keys()),
                    'http_method': http_method,
                    'path': path
                }
            })
            
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

