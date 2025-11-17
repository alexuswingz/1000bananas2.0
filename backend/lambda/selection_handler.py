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

def get_catalog_by_id(event):
    """GET /products/catalog/{id} - Get single product with all variations"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        
        # Fetch product from catalog
        cursor.execute("""
            SELECT * FROM catalog WHERE id = %s
        """, (product_id,))
        
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return cors_response(404, {
                'success': False,
                'error': 'Product not found'
            })
        
        # Convert to dict - decimal_default will handle type conversions
        product = dict(result)
        product_name = product.get('product_name')
        
        # Fetch all variations for this product (by product_name)
        cursor.execute("""
            SELECT 
                id, size, packaging_name, closure_name, label_size,
                parent_asin, child_asin, parent_sku_final, child_sku_final,
                upc, price, label_location, case_size, units_per_case
            FROM catalog 
            WHERE product_name = %s
            ORDER BY 
                CASE 
                    WHEN size = '8oz' THEN 1
                    WHEN size = '16oz' THEN 2
                    WHEN size = 'Quart' THEN 3
                    WHEN size = '32oz' THEN 4
                    WHEN size = 'Gallon' THEN 5
                    WHEN size = '5 Gallon' THEN 6
                    ELSE 7
                END,
                size
        """, (product_name,))
        
        variations_results = cursor.fetchall()
        
        # Add variations to product data
        product['all_variations'] = []
        for var in variations_results:
            var_dict = dict(var)
            product['all_variations'].append(var_dict)
        
        cursor.close()
        conn.close()
        
        return cors_response(200, {
            'success': True,
            'data': product
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

def update_catalog_full(event):
    """PUT /products/catalog/{id} - Update full catalog product details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        product_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        
        field_mapping = {
            'product_name': 'product_name',
            'seller_account': 'seller_account',
            'brand_name': 'brand_name',
            'marketplace': 'marketplace',
            'country': 'country',
            'type': 'type',
            'formula_name': 'formula_name',
            'upc': 'upc',
            'parent_sku_final': 'parent_sku_final',
            'child_sku_final': 'child_sku_final',
            'core_competitor_asins': 'core_competitor_asins',
            'other_competitor_asins': 'other_competitor_asins',
            'core_keywords': 'core_keywords',
            'other_keywords': 'other_keywords',
            'notes': 'notes',
        }
        
        for key, db_field in field_mapping.items():
            if key in body:
                update_fields.append(f"{db_field} = %s")
                values.append(body[key])
        
        # Mark as launched in notes
        cursor.execute("SELECT notes FROM catalog WHERE id = %s", (product_id,))
        result = cursor.fetchone()
        if result:
            notes = result['notes'] if isinstance(result['notes'], dict) else {}
            notes['actionType'] = 'launched'
            update_fields.append("notes = %s::jsonb")
            values.append(json.dumps(notes))
        
        # Always update updated_at
        update_fields.append("updated_at = %s")
        values.append(datetime.now())
        
        # Add product_id to values
        values.append(product_id)
        
        # Execute update
        query = f"""
            UPDATE catalog
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, product_name, seller_account, brand_name, created_at, updated_at
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
        
        # Format response
        product = {
            'id': result['id'],
            'product': result['product_name'],
            'account': result['seller_account'],
            'brand': result['brand_name'],
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
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
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
        
        elif http_method == 'GET' and '/catalog/' in path:
            return get_catalog_by_id(event)
        
        elif http_method == 'PUT' and '/catalog/' in path:
            return update_catalog_full(event)
        
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

