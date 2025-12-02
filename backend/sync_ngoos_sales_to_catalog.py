"""
Sync Ngoos Sales Data to Sales Metrics Table
=============================================
This script fetches sales metrics from Ngoos API and populates the sales_metrics
table (separate from catalog) for accurate bottle forecast calculations.

Usage:
    python sync_ngoos_sales_to_catalog.py
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from datetime import datetime
import time

# Database connection (matches lambda_function.py)
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

# Ngoos API
NGOOS_API_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com'


def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(**DB_CONFIG)


def fetch_ngoos_metrics(asin, days=30):
    """
    Fetch sales metrics from Ngoos API for a specific ASIN
    
    Args:
        asin: Product ASIN
        days: Number of days (default 30)
        
    Returns:
        dict: Metrics data including units_sold
    """
    try:
        url = f'{NGOOS_API_URL}/metrics/{asin}?days={days}'
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            print(f"  ⚠️  Failed to fetch metrics for {asin}: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"  ⚠️  Error fetching metrics for {asin}: {str(e)}")
        return None


def sync_sales_data():
    """
    Main function to sync sales data from Ngoos to sales_metrics table
    """
    print("=" * 60)
    print("🔄 Syncing Ngoos Sales Data to Sales Metrics Table")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get all products with ASINs
        print("📦 Fetching products from catalog...")
        cursor.execute("""
            SELECT 
                c.id as catalog_id,
                c.product_name,
                c.size,
                c.child_asin,
                sm.units_sold_30_days as current_units_sold
            FROM catalog c
            LEFT JOIN sales_metrics sm ON c.id = sm.catalog_id
            WHERE c.child_asin IS NOT NULL
            ORDER BY c.product_name, c.size
        """)
        
        products = cursor.fetchall()
        print(f"✅ Found {len(products)} products with ASINs")
        print()
        
        updated_count = 0
        inserted_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, product in enumerate(products, 1):
            catalog_id = product['catalog_id']
            asin = product['child_asin']
            product_name = product['product_name']
            size = product['size']
            current_units = product['current_units_sold']
            
            print(f"[{idx}/{len(products)}] Processing: {product_name} ({size}) - ASIN: {asin}")
            
            # Fetch metrics from Ngoos
            metrics = fetch_ngoos_metrics(asin, days=30)
            
            if metrics and 'units_sold' in metrics:
                units_sold = int(metrics['units_sold'])
                sales = float(metrics.get('sales', 0))
                sessions = int(metrics.get('sessions', 0))
                conversion_rate = float(metrics.get('conversion_rate', 0))
                
                # Upsert into sales_metrics table
                cursor.execute("""
                    INSERT INTO sales_metrics (
                        catalog_id,
                        child_asin,
                        units_sold_30_days,
                        sales_30_days,
                        sessions_30_days,
                        conversion_rate_30_days,
                        last_synced_at,
                        updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (catalog_id) 
                    DO UPDATE SET
                        child_asin = EXCLUDED.child_asin,
                        units_sold_30_days = EXCLUDED.units_sold_30_days,
                        sales_30_days = EXCLUDED.sales_30_days,
                        sessions_30_days = EXCLUDED.sessions_30_days,
                        conversion_rate_30_days = EXCLUDED.conversion_rate_30_days,
                        last_synced_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                """, (catalog_id, asin, units_sold, sales, sessions, conversion_rate))
                
                result = cursor.fetchone()
                was_inserted = result['inserted']
                
                if was_inserted:
                    print(f"  ✨ Inserted: {units_sold} units (new record)")
                    inserted_count += 1
                else:
                    change_icon = "✨" if current_units != units_sold else "✓"
                    print(f"  {change_icon} Updated: {current_units or 0} → {units_sold} units")
                    updated_count += 1
                
                # Commit every 10 products to avoid connection timeout
                if (idx % 10 == 0):
                    conn.commit()
                    print(f"  💾 Committed batch (progress: {idx}/{len(products)})")
                
            else:
                print(f"  ⚠️  No metrics found - skipping")
                skipped_count += 1
            
            # Small delay to avoid overwhelming the API
            time.sleep(0.1)
            print()
        
        # Final commit for remaining items
        conn.commit()
        print("💾 Final commit completed")
        
        # Print summary
        print("=" * 60)
        print("📊 Sync Summary")
        print("=" * 60)
        print(f"✨ Inserted: {inserted_count} new records")
        print(f"✅ Updated: {updated_count} existing records")
        print(f"⚠️  Skipped: {skipped_count} products (no metrics)")
        print(f"❌ Errors: {error_count} products")
        print()
        
        # Show some statistics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT c.id) as total_products,
                COUNT(sm.id) as products_with_sales,
                SUM(sm.units_sold_30_days) as total_units_sold,
                AVG(sm.units_sold_30_days) as avg_units_per_product,
                MAX(sm.last_synced_at) as last_sync_time
            FROM catalog c
            LEFT JOIN sales_metrics sm ON c.id = sm.catalog_id
            WHERE c.child_asin IS NOT NULL
        """)
        
        stats = cursor.fetchone()
        print("📈 Sales Metrics Statistics:")
        print(f"  Total Products in Catalog: {stats['total_products']}")
        print(f"  Products with Sales Data: {stats['products_with_sales']}")
        print(f"  Total Units Sold (30 days): {stats['total_units_sold'] or 0:,.0f}")
        print(f"  Average Units per Product: {stats['avg_units_per_product'] or 0:.1f}")
        if stats['last_sync_time']:
            print(f"  Last Sync: {stats['last_sync_time']}")
        print()
        
        print("✅ Sync completed successfully!")
        print("💡 Tip: Sales metrics are now stored in the 'sales_metrics' table")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during sync: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    sync_sales_data()

